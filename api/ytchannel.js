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

    // 채널에서 랜덤 영상 가져오기 (Shorts 제외)
    if (action === "random") {
      if (!channelId) return res.status(400).json({ error: "channelId가 필요해요." });
      const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=30&key=${ytKey}`);
      const d = await r.json();
      const videoIds = (d.items || []).map(i => i.id.videoId).filter(Boolean);

      // 영상 길이 조회 → Shorts(60초 미만) 제외
      let videos = [];
      if (videoIds.length > 0) {
        const detailRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds.join(",")}&key=${ytKey}`);
        const detailData = await detailRes.json();
        for (const item of (detailData.items || [])) {
          // ISO 8601 duration 파싱 (PT1M30S → 90초)
          const dur = item.contentDetails?.duration || "";
          const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          const secs = match ? (parseInt(match[1]||0)*3600 + parseInt(match[2]||0)*60 + parseInt(match[3]||0)) : 0;
          if (secs >= 60) { // 60초 이상만 (Shorts 제외)
            videos.push({
              id: item.id,
              title: item.snippet.title,
              thumbnail: item.snippet.thumbnails.medium?.url || "",
              date: item.snippet.publishedAt?.slice(0, 10) || "",
              duration: secs,
            });
          }
        }
      }
      // 랜덤 셔플 후 3개
      for (var i = videos.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = videos[i]; videos[i] = videos[j]; videos[j] = temp;
      }
      return res.status(200).json({ videos: videos.slice(0, 3) });
    }

    return res.status(400).json({ error: "action이 필요해요 (search/random)" });
  } catch (err) {
    return res.status(500).json({ error: "오류: " + (err.message || "") });
  }
}
