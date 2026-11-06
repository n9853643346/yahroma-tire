// Хранилище: data/data.json в бакете Яндекс Object Storage (доступ по IAM-токену функции)
const BUCKET = process.env.BUCKET || "pitstop-yahroma";
const KEY = "data/data.json";
const URL_ = `https://storage.yandexcloud.net/${BUCKET}/${KEY}`;
let TOKEN = "";
const setToken = (t) => { TOKEN = t; };
const H = () => ({ "X-YaCloud-SubjectToken": TOKEN });
const EMPTY = () => ({ bookings: [], sessions: {}, seq: 0, admins: [] });
async function read() {
  const r = await fetch(URL_, { headers: H() });
  if (r.status === 404) return { data: EMPTY(), etag: null };
  if (!r.ok) throw new Error("s3 read " + r.status);
  const data = await r.json();
  if (!data.admins) data.admins = [];
  return { data, etag: r.headers.get("etag") };
}
async function load() { return (await read()).data; }
async function update(mutator) {
  for (let i = 0; i < 4; i++) {
    const { data, etag } = await read();
    const out = await mutator(data);
    const h = { ...H(), "Content-Type": "application/json" };
    if (etag) h["If-Match"] = etag;
    const r = await fetch(URL_, { method: "PUT", headers: h, body: JSON.stringify(data) });
    if (r.ok) return out;
    if (r.status !== 412 && r.status !== 409) throw new Error("s3 write " + r.status);
  }
  throw new Error("s3 conflict");
}
const abs = (d, t) => { const [y, m, dd] = d.split("-").map(Number); const [h, mi] = t.split(":").map(Number); return Date.UTC(y, m - 1, dd, h, mi) / 60000; };
const posts = (t) => { const h = +t.split(":")[0]; return h >= 8 && h < 22 ? 2 : 1; };
const SLOT = 50;
function busyCount(data, d, t) {
  const a = abs(d, t);
  return data.bookings.filter((b) => b.status !== "cancel" && b.date && b.time && Math.abs(abs(b.date, b.time) - a) < SLOT).length;
}
const isFree = (data, d, t) => busyCount(data, d, t) < posts(t);
const mskNow = () => { const n = new Date(Date.now() + 3 * 3600e3); const p = (x) => String(x).padStart(2, "0"); return { date: `${n.getUTCFullYear()}-${p(n.getUTCMonth() + 1)}-${p(n.getUTCDate())}`, time: `${p(n.getUTCHours())}:${p(n.getUTCMinutes())}` }; };
const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
async function tg(method, payload) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
    return await r.json();
  } catch (e) { return { ok: false, description: String(e.message || e) }; }
}
// Уведомления мастерам: все чаты, зарегистрированные командой /admin <пароль журнала>, плюс ADMIN_CHAT_ID из настроек
async function notifyAdmin(text) {
  let ids = [];
  try { ids = (await load()).admins || []; } catch (e) {}
  if (process.env.ADMIN_CHAT_ID) ids.push(process.env.ADMIN_CHAT_ID);
  ids = [...new Set(ids.map(String))];
  const res = [];
  for (const id of ids) res.push(await tg("sendMessage", { chat_id: id, text, parse_mode: "HTML" }));
  return res;
}
const fmtB = (b) => `${esc(b.name || "—")}, ${esc(b.car || "—")}, ${esc(b.size || "—")}, ${esc(b.service || "—")}\n${esc(b.phone || "—")}\n${b.date ? b.date.split("-").reverse().join(".") + " " + b.time : esc(b.when || "время по звонку")}`;
function authed(req) {
  const k = req.headers["x-key"] || "";
  const real = process.env.JOURNAL_KEY || "";
  return real.length > 5 && k.length === real.length && require("crypto").timingSafeEqual(Buffer.from(k), Buffer.from(real));
}
const body = (req) => (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {});
module.exports = { load, update, isFree, busyCount, posts, mskNow, esc, tg, notifyAdmin, fmtB, authed, body, SLOT, setToken };
