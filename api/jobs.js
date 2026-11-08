// MyWorks (@MyWorksNiki_bot): подборки вакансий для Алекса. Состояние — GitHub pitstop-data/jobs.json.
const GH = () => `https://api.github.com/repos/${process.env.GH_REPO}/contents/jobs.json`;
const GHH = () => ({ Authorization: "Bearer " + process.env.GH_TOKEN, "User-Agent": "jobs", Accept: "application/vnd.github+json" });
const TG = (m) => `https://api.telegram.org/bot${process.env.JB_TOKEN}/${m}`;
async function load() {
  const r = await fetch(GH(), { headers: GHH() });
  if (r.status === 404) return { s: { owner: null, freelance: null, staff: null }, sha: null };
  const j = await r.json();
  return { s: JSON.parse(Buffer.from(j.content, "base64").toString("utf8")), sha: j.sha };
}
async function save(s, sha) {
  await fetch(GH(), { method: "PUT", headers: GHH(), body: JSON.stringify({ message: "jobs state", content: Buffer.from(JSON.stringify(s)).toString("base64"), sha: sha || undefined }) });
}
async function send(chat, text) {
  const t = String(text); const parts = [];
  for (let i = 0; i < t.length; i += 3900) parts.push(t.slice(i, i + 3900));
  for (const p of parts) await fetch(TG("sendMessage"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text: p, parse_mode: "HTML", disable_web_page_preview: true }) });
}
const NAMES = { freelance: "Фриланс", staff: "Штатные вакансии" };
module.exports = async (req, res) => {
  const q = req.query || {};
  if (q.r === "hook" || q.r === "info") {
    if (q.k !== process.env.JB_SETUP) return res.status(401).end();
    const u = q.r === "info" ? TG("getWebhookInfo") : TG("setWebhook") + `?url=${encodeURIComponent("https://pitstop-yahroma.vercel.app/api/jobs")}&secret_token=${process.env.JB_SECRET}&drop_pending_updates=true`;
    const r = await fetch(u); const t = await r.text();
    return res.status(200).send(t.replace(/bot\d+:[\w-]+/g, "bot***"));
  }
  if (q.r === "tg") { // чтение публичного канала через t.me/s (запрос идёт с Vercel)
    if (q.k !== process.env.JB_SETUP) return res.status(401).end();
    const ch = String(q.c || "").replace(/[^\w]/g, "");
    const r = await fetch("https://t.me/s/" + ch, { headers: { "User-Agent": "Mozilla/5.0" } });
    const h = await r.text();
    const posts = [...h.matchAll(/data-post="([^"]+)"[\s\S]*?<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>[\s\S]*?datetime="([^"]+)"/g)]
      .map(m => ({ id: m[1], date: m[3], text: m[2].replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'") }));
    return res.status(200).json({ status: r.status, count: posts.length, posts: posts.slice(-30) });
  }
  if (q.r === "push") { // я присылаю подборку: POST {kind:"freelance"|"staff", text}
    if (q.k !== process.env.JB_SETUP) return res.status(401).end();
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { s, sha } = await load();
    if (!s.owner) return res.status(409).json({ error: "owner not set: send /start to bot" });
    const kind = b.kind === "staff" ? "staff" : "freelance";
    s[kind] = { date: new Date().toISOString(), text: b.text || "" };
    await save(s, sha);
    await send(s.owner, "<b>" + NAMES[kind] + "</b>\n\n" + (b.text || ""));
    return res.status(200).json({ ok: true });
  }
  if (req.headers["x-telegram-bot-api-secret-token"] !== process.env.JB_SECRET) return res.status(401).end();
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const m = b.message; if (!m || !m.text) return res.status(200).end();
  const reply = (t) => res.status(200).json({ method: "sendMessage", chat_id: m.chat.id, text: String(t).slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true });
  const { s, sha } = await load();
  if (!s.owner) { s.owner = m.from.id; await save(s, sha); }
  if (m.from.id !== s.owner) return reply("Это личный бот.");
  const c = m.text.split(" ")[0].split("@")[0];
  if (c === "/start" || c === "/help") return reply("Привет, Алекс! Я MyWorks.\nСюда приходят подборки работы:\n• фриланс — каждый день в 10:00 (МСК)\n• штат (гендиректор и т.п.) — по понедельникам в 10:00\n\n/freelance — последняя подборка фриланса\n/staff — последняя подборка штата");
  if (c === "/freelance" || c === "/staff") {
    const k = c.slice(1); const x = s[k];
    return reply(x ? "<b>" + NAMES[k] + "</b> (" + x.date.slice(0, 10) + ")\n\n" + x.text : "Подборки пока нет — придёт в ближайшее расписание.");
  }
  return reply("Команды: /freelance, /staff");
};
