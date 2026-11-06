// Адаптер: HTTP-вызов функции Яндекса -> обработчики в стиле Vercel (req, res)
const db = require("./api/_db");
const ROUTES = { slots: require("./api/slots"), booking: require("./api/booking"), journal: require("./api/journal"), tg: require("./api/tg") };
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type,x-key", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };

async function setup(req, res) {
  if (!db.authed(req)) return res.status(401).json({ ok: false });
  const base = "https://functions.yandexcloud.net/" + (process.env.FUNCTION_ID || "");
  const r = await db.tg("setWebhook", { url: base + "?r=tg", secret_token: process.env.TG_SECRET, allowed_updates: ["message", "callback_query"], drop_pending_updates: true });
  await db.tg("setMyCommands", { commands: [{ command: "start", description: "Записаться" }, { command: "cancel", description: "Отменить мою запись" }] });
  const me = await db.tg("getMe", {});
  res.status(200).json({ ok: r.ok, description: r.description, bot: me.ok ? me.result.username : me.description });
}
async function ping(req, res) {
  if (!db.authed(req)) return res.status(401).json({ ok: false });
  const me = await db.tg("getMe", {}); const d = await db.load();
  res.status(200).json({ ok: true, telegram: me.ok ? "доступен" : me.description, bookings: d.bookings.length, admins: (d.admins || []).length });
}

exports.handler = async (event, context) => {
  const method = event.httpMethod || "GET";
  if (method === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  db.setToken(context && context.token ? context.token.access_token : "");
  const q = event.queryStringParameters || {};
  const headers = {}; for (const k of Object.keys(event.headers || {})) headers[k.toLowerCase()] = event.headers[k];
  let raw = event.body || ""; if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
  const req = { method, query: q, headers, body: raw };
  const out = { status: 200, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" }, body: "" };
  const res = {
    status(c) { out.status = c; return res; },
    setHeader(k, v) { out.headers[k] = v; },
    json(o) { out.body = JSON.stringify(o); return res; },
    end() { return res; },
  };
  const h = q.r === "setup" ? setup : q.r === "ping" ? ping : ROUTES[q.r];
  if (!h) return { statusCode: 404, headers: out.headers, body: JSON.stringify({ ok: false }) };
  try { await h(req, res); } catch (e) { out.status = 500; out.body = JSON.stringify({ ok: false }); }
  return { statusCode: out.status, headers: out.headers, body: out.body };
};
