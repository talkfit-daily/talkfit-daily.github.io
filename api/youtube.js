// YouTube 자막 추출 — YouTube Data API(확인) + Gemini(음성인식)

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

// Edge Runtime — 타임아웃 제한 없음 (무료 플랜에서도 30초+)
export const config = { runtime: "edge" };

export default async function handler(req) {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));

  const headers = {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  if (!allowed) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers });

  const body = await req.json();
  const url = body?.url;
  if (!url) return new Response(JSON.stringify({ error: "YouTube URL이 필요해요." }), { status: 400, headers });

  const videoId = extractVideoId(url);
  if (!videoId) return new Response(JSON.stringify({ error: "올바른 YouTube URL이 아니에요." }), { status: 400, headers });

  const ytKey = process.env.YOUTUBE_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  try {
    // 1. 영상 제목 가져오기 (YouTube Data API)
    let title = "";
    if (ytKey) {
      const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${ytKey}`);
      const vData = await vRes.json();
      title = vData.items?.[0]?.snippet?.title || "";
    }
    if (!title) {
      const oRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oRes.ok) { const od = await oRes.json(); title = od.title || ""; }
    }

    // 2. Gemini로 영상 음성 직접 인식
    if (!geminiKey) return new Response(JSON.stringify({ error: "서버 설정 오류" }), { status: 500, headers });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "You are a precise transcriber. Watch this YouTube video and transcribe ALL spoken dialogue exactly as said. Write Korean parts in Korean, English parts in English. Output ONLY the transcript, one line per sentence. Do NOT summarize, paraphrase, or add commentary. Do NOT add timestamps." }] },
          contents: [{ role: "user", parts: [
            { fileData: { fileUri: `https://www.youtube.com/watch?v=${videoId}`, mimeType: "video/mp4" } },
            { text: "이 영상에서 말하는 내용을 전부 있는 그대로 받아적어줘." }
          ] }],
          generationConfig: { maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } },
        }),
      }
    );

    const gData = await geminiRes.json();
    const transcribed = gData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!transcribed) {
      return new Response(JSON.stringify({ error: "영상 음성을 인식할 수 없어요. 다른 영상을 시도해주세요." }), { status: 404, headers });
    }

    let transcript = transcribed;
    if (transcript.length > 2000) transcript = transcript.slice(0, 2000) + "\n...(이하 생략)";

    return new Response(JSON.stringify({ title, language: "auto", transcript, videoId, source: "audio" }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: "오류: " + (err.message || "") }), { status: 500, headers });
  }
}
