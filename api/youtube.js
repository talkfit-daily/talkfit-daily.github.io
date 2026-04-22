// Vercel Serverless - YouTube 자막 추출 (innertube API, 빠름)

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
    // 1. 제목 가져오기 (oembed — 빠름)
    let title = "";
    try {
      const oRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oRes.ok) { const od = await oRes.json(); title = od.title || ""; }
    } catch {}

    // 2. innertube API로 자막 트랙 정보 가져오기 (HTML 파싱 불필요)
    const innertubeRes = await fetch("https://www.youtube.com/youtubei/v1/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId,
        context: {
          client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "ko", gl: "KR" }
        }
      })
    });

    const playerData = await innertubeRes.json();
    const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      return res.status(404).json({ error: "이 영상에는 자막이 없어요. 자막이 있는 영상을 넣어주세요." });
    }

    // 한국어 > 영어 > 첫 번째
    let track = captionTracks.find(t => t.languageCode === "ko");
    if (!track) track = captionTracks.find(t => t.languageCode === "en");
    if (!track) track = captionTracks[0];

    // 3. 자막 텍스트 가져오기
    const captionUrl = track.baseUrl + "&fmt=json3";
    const captionRes = await fetch(captionUrl);
    const captionData = await captionRes.json();

    let lines = [];
    if (captionData.events) {
      for (const event of captionData.events) {
        if (event.segs) {
          const text = event.segs.map(s => s.utf8 || "").join("").replace(/\n/g, " ").trim();
          if (text) lines.push(text);
        }
      }
    }

    // JSON 실패시 XML
    if (lines.length === 0) {
      const xmlRes = await fetch(track.baseUrl);
      const xml = await xmlRes.text();
      const matches = [...xml.matchAll(/<text[^>]*>(.*?)<\/text>/gs)];
      for (const m of matches) {
        const text = m[1].replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
        if (text) lines.push(text);
      }
    }

    if (lines.length === 0) {
      return res.status(404).json({ error: "자막 내용이 비어있어요." });
    }

    let transcript = lines.join("\n");
    if (transcript.length > 2000) transcript = transcript.slice(0, 2000) + "\n...(이하 생략)";

    return res.status(200).json({ title, language: track.languageCode, transcript, videoId });
  } catch (err) {
    return res.status(500).json({ error: "자막을 가져오는 중 오류가 발생했어요: " + (err.message || "") });
  }
}
