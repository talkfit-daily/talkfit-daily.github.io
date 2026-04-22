// YouTube 자막 추출 — innertube + HTML fallback

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

async function fetchWithTimeout(url, opts, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function getCaptionTracks(videoId) {
  // 방법 1: innertube API (빠름, ~1초)
  try {
    const res = await fetchWithTimeout("https://www.youtube.com/youtubei/v1/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId,
        context: { client: { clientName: "WEB", clientVersion: "2.20241201.00.00", hl: "ko", gl: "KR" } }
      })
    }, 4000);
    const data = await res.json();
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (tracks && tracks.length > 0) return { tracks, title: data?.videoDetails?.title || "" };
  } catch {}

  // 방법 2: HTML 페이지 scraping (느리지만 확실, ~5초)
  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "Accept": "text/html",
        "Cookie": "CONSENT=YES+1"
      }
    }, 7000);
    const html = await res.text();

    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : "";

    const m = html.match(/"captionTracks":(\[.*?\])(?=,")/s);
    if (m) {
      const cleaned = m[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"');
      const tracks = JSON.parse(cleaned);
      if (tracks.length > 0) return { tracks, title };
    }
  } catch {}

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
    const result = await getCaptionTracks(videoId);

    if (!result) {
      return res.status(404).json({ error: "이 영상에서 자막을 찾을 수 없어요. 자막이 있는 영상을 시도해주세요." });
    }

    const { tracks, title } = result;

    // 한국어 > 영어 > 첫 번째
    let track = tracks.find(t => t.languageCode === "ko");
    if (!track) track = tracks.find(t => t.languageCode === "en");
    if (!track) track = tracks[0];

    // 자막 텍스트 가져오기
    let lines = [];

    try {
      const cRes = await fetchWithTimeout(track.baseUrl + "&fmt=json3", {}, 3000);
      const cData = await cRes.json();
      if (cData.events) {
        for (const event of cData.events) {
          if (event.segs) {
            const text = event.segs.map(s => s.utf8 || "").join("").replace(/\n/g, " ").trim();
            if (text) lines.push(text);
          }
        }
      }
    } catch {}

    if (lines.length === 0) {
      try {
        const xRes = await fetchWithTimeout(track.baseUrl, {}, 3000);
        const xml = await xRes.text();
        for (const m of xml.matchAll(/<text[^>]*>(.*?)<\/text>/gs)) {
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

    return res.status(200).json({ title, language: track.languageCode, transcript, videoId });
  } catch (err) {
    return res.status(500).json({ error: "오류: " + (err.message || "알 수 없는 오류") });
  }
}
