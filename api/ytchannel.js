// YouTube 채널 검색 + 채널 영상 가져오기

const ALLOWED_ORIGINS = [
  "https://talkfit-daily-github-io.vercel.app",
  "https://talkfit-daily.github.io",
  "http://localhost:3000",
];

export default async function handler(req, res) {
  const origin = req.headers["origin"] || req.headers["referer"] || "";
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));

  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ytKey = process.env.YOUTUBE_API_KEY;
  if (!ytKey) return res.status(500).json({ error: "서버 설정 오류" });

  const { action, query, channelId } = req.body || {};

  try {
    // 채널 검색
    if (action === "search") {
      if (!query) return res.status(400).json({ error: "검색어를 입력해주세요." });
      const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=5&key=${ytKey}`);
      const d = await r.json();
      const channels = (d.items || []).map(function(item) {
        return { id: item.id.channelId, title: item.snippet.title, thumbnail: item.snippet.thumbnails.default.url, description: item.snippet.description.slice(0, 80) };
      });
      return res.status(200).json({ channels });
    }

    // 채널에서 랜덤 영상 가져오기
    if (action === "random") {
      if (!channelId) return res.status(400).json({ error: "channelId가 필요해요." });
      const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=5&videoDuration=medium&key=${ytKey}`);
      const d = await r.json();
      const videos = (d.items || []).map(function(item) {
        return { id: item.id.videoId, title: item.snippet.title, thumbnail: item.snippet.thumbnails.medium.url, date: item.snippet.publishedAt.slice(0, 10) };
      });
      // 최신순 그대로, 상위 3개만
      return res.status(200).json({ videos: videos.slice(0, 3) });
    }

    return res.status(400).json({ error: "action이 필요해요 (search/random)" });
  } catch (err) {
    return res.status(500).json({ error: "오류: " + (err.message || "") });
  }
}
