// Vercel Serverless - YouTube 자막 추출

const ALLOWED_ORIGINS = [
  "https://talkfit-daily-github-io.vercel.app",
  "https://talkfit-daily.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
];

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {}
  // bare ID
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
    // 1. YouTube 페이지에서 자막 트랙 정보 가져오기
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8" }
    });
    const html = await pageRes.text();

    // 영상 제목 추출
    const titleMatch = html.match(/"title":"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : "";

    // captionTracks 추출
    const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
    if (!captionMatch) {
      return res.status(404).json({ error: "이 영상에는 자막이 없어요. 자막이 있는 영상을 넣어주세요." });
    }

    const tracks = JSON.parse(captionMatch[1]);

    // 한국어 자막 우선, 없으면 영어, 없으면 첫 번째
    let track = tracks.find(t => t.languageCode === "ko");
    if (!track) track = tracks.find(t => t.languageCode === "en");
    if (!track) track = tracks[0];

    if (!track || !track.baseUrl) {
      return res.status(404).json({ error: "자막을 가져올 수 없어요." });
    }

    // 2. 자막 XML 가져오기
    const captionRes = await fetch(track.baseUrl + "&fmt=json3");
    const captionData = await captionRes.json();

    // 3. 텍스트 추출
    let lines = [];
    if (captionData.events) {
      for (const event of captionData.events) {
        if (event.segs) {
          const text = event.segs.map(s => s.utf8 || "").join("").trim();
          if (text && text !== "\n") lines.push(text);
        }
      }
    }

    if (lines.length === 0) {
      return res.status(404).json({ error: "자막 내용이 비어있어요." });
    }

    // 최대 2000자로 제한 (너무 긴 영상 대응)
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
