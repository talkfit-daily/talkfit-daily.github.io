// YouTube 자막 추출 — YouTube Data API v3

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

  const ytKey = process.env.YOUTUBE_API_KEY;
  if (!ytKey) return res.status(500).json({ error: "서버 설정 오류 (YouTube 키 없음)" });

  try {
    // 1. 영상 제목 가져오기
    let title = "";
    const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${ytKey}`);
    const videoData = await videoRes.json();
    if (videoData.items && videoData.items.length > 0) {
      title = videoData.items[0].snippet.title || "";
    }

    // 2. 자막 목록 가져오기
    const capRes = await fetch(`https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&part=snippet&key=${ytKey}`);
    const capData = await capRes.json();

    if (!capData.items || capData.items.length === 0) {
      return res.status(404).json({ error: "이 영상에는 자막이 없어요." });
    }

    // 한국어 > 영어 > 첫 번째
    const items = capData.items;
    let caption = items.find(c => c.snippet.language === "ko");
    if (!caption) caption = items.find(c => c.snippet.language === "en");
    if (!caption) caption = items[0];

    const lang = caption.snippet.language;
    const captionId = caption.id;

    // 3. 자막 다운로드 (srt 형식)
    const dlRes = await fetch(`https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt&key=${ytKey}`);

    if (!dlRes.ok) {
      // captions.download는 OAuth 필요 → timedtext fallback
      // innertube로 자막 URL 가져오기
      const innerRes = await fetch("https://www.youtube.com/youtubei/v1/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          context: { client: { clientName: "WEB", clientVersion: "2.20241201.00.00", hl: "ko" } }
        })
      });
      const innerData = await innerRes.json();
      const tracks = innerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

      if (tracks && tracks.length > 0) {
        let track = tracks.find(t => t.languageCode === "ko");
        if (!track) track = tracks.find(t => t.languageCode === "en");
        if (!track) track = tracks[0];

        const ttRes = await fetch(track.baseUrl + "&fmt=json3");
        const ttData = await ttRes.json();
        let lines = [];
        if (ttData.events) {
          for (const event of ttData.events) {
            if (event.segs) {
              const text = event.segs.map(s => s.utf8 || "").join("").replace(/\n/g, " ").trim();
              if (text) lines.push(text);
            }
          }
        }

        if (lines.length > 0) {
          let transcript = lines.join("\n");
          if (transcript.length > 2000) transcript = transcript.slice(0, 2000) + "\n...(이하 생략)";
          return res.status(200).json({ title, language: track.languageCode, transcript, videoId });
        }
      }

      // 최후 fallback: Gemini로 영상 음성 인식
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: "Transcribe ALL spoken words from this YouTube video exactly as said. Korean in Korean, English in English. One line per sentence. NO summaries." }] },
              contents: [{ role: "user", parts: [
                { fileData: { fileUri: `https://www.youtube.com/watch?v=${videoId}`, mimeType: "video/mp4" } },
                { text: "이 영상의 모든 대화를 받아적어줘." }
              ] }],
              generationConfig: { maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } },
            }),
          }
        );
        const gData = await geminiRes.json();
        const transcribed = gData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (transcribed) {
          let transcript = transcribed;
          if (transcript.length > 2000) transcript = transcript.slice(0, 2000) + "\n...(이하 생략)";
          return res.status(200).json({ title, language: "auto", transcript, videoId, source: "audio" });
        }
      }

      return res.status(404).json({ error: "자막을 다운로드할 수 없어요." });
    }

    // SRT 파싱
    const srt = await dlRes.text();
    const lines = srt.split("\n").filter(l => l.trim() && !/^\d+$/.test(l.trim()) && !l.includes("-->"));
    let transcript = lines.join("\n");
    if (transcript.length > 2000) transcript = transcript.slice(0, 2000) + "\n...(이하 생략)";

    return res.status(200).json({ title, language: lang, transcript, videoId });
  } catch (err) {
    return res.status(500).json({ error: "오류: " + (err.message || "알 수 없는 오류") });
  }
}
