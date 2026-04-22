// Vercel Serverless - YouTube 자막 추출 (innertube API)

const ALLOWED_ORIGINS = [
  "https://talkfit-daily-github-io.vercel.app",
  "https://talkfit-daily.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
];

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {}
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

export default async function handler(req, res) {
  const origin = req.headers["origin"] || req.headers["referer"] || "";
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));

  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "YouTube URL이 필요해요." });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: "올바른 YouTube URL이 아니에요." });

  try {
    // 1. YouTube 페이지 가져오기
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept": "text/html,application/xhtml+xml"
      }
    });
    const html = await pageRes.text();

    // 영상 제목
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    let title = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : "";

    // captionTracks 추출 (여러 패턴 시도)
    let tracks = null;

    // 패턴 1: "captionTracks":[...]
    const m1 = html.match(/"captionTracks":(\[.*?\])/s);
    if (m1) {
      try { tracks = JSON.parse(m1[1]); } catch {}
    }

    // 패턴 2: captions 객체 내부
    if (!tracks) {
      const m2 = html.match(/playerCaptionsTracklistRenderer.*?"captionTracks":(\[.*?\])/s);
      if (m2) {
        try { tracks = JSON.parse(m2[1]); } catch {}
      }
    }

    if (!tracks || tracks.length === 0) {
      // 자막이 없는 영상 → Gemini로 영상 설명 기반 학습 제공
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: "You extract useful English learning content from YouTube video context. Output Korean text suitable for English learning analysis." }] },
              contents: [{ role: "user", parts: [{ text: `YouTube video title: "${title}", ID: ${videoId}. This video likely teaches English. Generate a realistic Korean conversation (5-8 lines) that would use similar expressions and topics as this video. Output ONLY the Korean conversation text.` }] }],
              generationConfig: { maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
            }),
          }
        );
        const geminiData = await geminiRes.json();
        const generated = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (generated) {
          return res.status(200).json({
            title,
            language: "ko",
            transcript: generated,
            videoId,
            generated: true,
          });
        }
      }
      return res.status(404).json({ error: "이 영상에는 자막이 없어요. 자막이 있는 영상을 넣어주세요." });
    }

    // 한국어 > 영어 > 첫 번째 자막 순서로 선택
    let track = tracks.find(t => t.languageCode === "ko");
    if (!track) track = tracks.find(t => t.languageCode === "en");
    if (!track) track = tracks[0];

    if (!track || !track.baseUrl) {
      return res.status(404).json({ error: "자막을 가져올 수 없어요." });
    }

    // 자막 가져오기 (JSON 형식)
    let lines = [];
    try {
      const captionRes = await fetch(track.baseUrl + "&fmt=json3");
      const captionData = await captionRes.json();
      if (captionData.events) {
        for (const event of captionData.events) {
          if (event.segs) {
            const text = event.segs.map(s => s.utf8 || "").join("").trim();
            if (text && text !== "\n") lines.push(text);
          }
        }
      }
    } catch {}

    // JSON 실패시 XML 형식
    if (lines.length === 0) {
      try {
        const captionRes = await fetch(track.baseUrl);
        const xml = await captionRes.text();
        const matches = xml.matchAll(/<text[^>]*>(.*?)<\/text>/gs);
        for (const m of matches) {
          const text = m[1].replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
          if (text) lines.push(text);
        }
      } catch {}
    }

    if (lines.length === 0) {
      return res.status(404).json({ error: "자막 내용이 비어있어요." });
    }

    let transcript = lines.join("\n");
    if (transcript.length > 2000) transcript = transcript.slice(0, 2000) + "\n...(이하 생략)";

    return res.status(200).json({
      title,
      language: track.languageCode,
      transcript,
      videoId,
    });
  } catch (err) {
    return res.status(500).json({ error: "자막을 가져오는 중 오류가 발생했어요." });
  }
}
