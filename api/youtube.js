// YouTube 자막 추출 — YouTube Data API (목록) + timedtext (다운로드)

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
  if (!ytKey) return res.status(500).json({ error: "서버 설정 오류" });

  try {
    // 1. 영상 제목 + 자막 목록 동시 호출
    const [videoRes, capRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${ytKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&part=snippet&key=${ytKey}`)
    ]);

    const videoData = await videoRes.json();
    const capData = await capRes.json();

    const title = videoData.items?.[0]?.snippet?.title || "";

    if (!capData.items || capData.items.length === 0) {
      return res.status(404).json({ error: "이 영상에는 자막이 없어요." });
    }

    // 한국어 > 영어 > 첫 번째
    const items = capData.items;
    let caption = items.find(c => c.snippet.language === "ko");
    if (!caption) caption = items.find(c => c.snippet.language === "en");
    if (!caption) caption = items[0];

    const lang = caption.snippet.language;
    const kind = caption.snippet.trackKind; // "asr" = 자동생성, "standard" = 수동

    // 2. timedtext API로 자막 텍스트 가져오기 (API 키 불필요)
    const ttUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}${kind === "asr" ? "&kind=asr" : ""}&fmt=json3`;
    const ttRes = await fetch(ttUrl);
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

    // JSON 실패시 XML
    if (lines.length === 0) {
      const xmlUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}${kind === "asr" ? "&kind=asr" : ""}`;
      const xmlRes = await fetch(xmlUrl);
      const xml = await xmlRes.text();
      for (const m of xml.matchAll(/<text[^>]*>(.*?)<\/text>/gs)) {
        const text = m[1].replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
        if (text) lines.push(text);
      }
    }

    if (lines.length === 0) {
      return res.status(404).json({ error: "자막 텍스트를 가져올 수 없어요." });
    }

    let transcript = lines.join("\n");
    if (transcript.length > 2000) transcript = transcript.slice(0, 2000) + "\n...(이하 생략)";

    return res.status(200).json({ title, language: lang, transcript, videoId });
  } catch (err) {
    return res.status(500).json({ error: "오류: " + (err.message || "") });
  }
}
