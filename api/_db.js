// Хранилище: data.json в приватном репозитории GitHub (с оптимистичной блокировкой по sha)
const API = () => `https://api.github.com/repos/${process.env.GH_REPO}/contents/data.json`;
const H = () => ({ Authorization: "Bearer " + process.env.GH_TOKEN, "User-Agent": "pitstop", Accept: "application/vnd.github+json" });
async function read() {
  const r = await fetch(API(), { headers: H() });
  if (r.status === 404) return { data: { bookings: [], sessions: {}, seq: 0 }, sha: null };
  if (!r.ok) throw new Error("gh read " + r.status);
  const j = await r.json();
  return { data: JSON.parse(Buffer.from(j.content, "base64").toString("utf8")), sha: j.sha };
}
async function load() { return (await read()).data; }
async function update(mutator) {
  for (let i = 0; i < 5; i++) {
    const { data, sha } = await read();
    const out = await mutator(data);
    const body = { message: "update", content: Buffer.from(JSON.stringify(data)).toString("base64") };
    if (sha) body.sha = sha;
    const r = await fetch(API(), { method: "PUT", headers: { ...H(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) return out;
    if (r.status !== 409 && r.status !== 422) throw new Error("gh write " + r.status);
  }
  throw new Error("gh conflict");
}
// Время — московское, строки YYYY-MM-DD и HH:MM
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
  const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return r.json().catch(() => ({}));
}
const notifyAdmin = (text) => tg("sendMessage", { chat_id: process.env.ADMIN_CHAT_ID, text, parse_mode: "HTML" });
const fmtB = (b) => `${esc(b.name || "—")}, ${esc(b.car || "—")}, ${esc(b.size || "—")}, ${esc(b.service || "—")}\n${esc(b.phone || "—")}\n${b.date ? b.date.split("-").reverse().join(".") + " " + b.time : esc(b.when || "время по звонку")}`;
function authed(req) {
  const k = req.headers["x-key"] || "";
  const real = process.env.JOURNAL_KEY || "";
  return real.length > 5 && k.length === real.length && require("crypto").timingSafeEqual(Buffer.from(k), Buffer.from(real));
}
const body = (req) => (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {});
module.exports = { load, update, isFree, busyCount, posts, mskNow, esc, tg, notifyAdmin, fmtB, authed, body, SLOT };
