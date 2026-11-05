const db = require("./_db");
const SIZES = ["R13","R14","R15","R16","R17","R18","R19","R20","R21","R22","R23"];
const SERVICES = [["complex","Комплекс (смена + балансировка)"],["seasonal","Сезонная смена в сборе"],["balance","Только балансировка"],["repair","Ремонт шины / диска"],["other","Другое"]];
const send = (chat, text, extra) => db.tg("sendMessage", { chat_id: chat, text, parse_mode: "HTML", ...(extra || {}) });
const NOKB = { reply_markup: { remove_keyboard: true } };
const INTRO = "Здравствуйте! Я бот шиномонтажа <b>ПИТ-СТОП</b> (Яхрома, Вокзальная ул., 75, круглосуточно). Запишу вас за минуту и передам мастерам.\n\nКак вас зовут?";

function parseWhen(text) {
  const low = text.toLowerCase(); const tm = text.match(/(\d{1,2})[:\-](\d{2})/) || (text.match(/(?:в|к)\s*(\d{1,2})\s*(?:час|ч\b|$)/i) && [0, text.match(/(?:в|к)\s*(\d{1,2})/i)[1], "00"]);
  const now = db.mskNow(); const p0 = (x) => String(x).padStart(2, "0");
  let m = text.match(/(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?/);
  if (!m && /сегодня|завтра|послезавтра/.test(low)) { const add = /послезавтра/.test(low) ? 2 : /завтра/.test(low) ? 1 : 0; const d = new Date(Date.parse(now.date + "T00:00:00Z") + add * 864e5); m = [0, d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear()]; }
  if (!m || !tm) return null;
  let y = m[3] ? +m[3] : +now.date.slice(0, 4); if (y < 100) y += 2000;
  const p = (x) => String(x).padStart(2, "0");
  let d = `${y}-${p(m[2])}-${p(m[1])}`; if (!m[3] && d < now.date) d = `${y + 1}-${p(m[2])}-${p(m[1])}`;
  const mins = Math.round((+tm[1] * 60 + +tm[2]) / 30) * 30; if (mins >= 1440) return null;
  return { date: d, time: `${p(Math.floor(mins / 60))}:${p(mins % 60)}` };
}
async function finish(chat, s, data) {
  const r = { id: ++data.seq, created: new Date().toISOString(), source: "bot", status: "new", chat, ...s.d };
  r.date = s.d.date; r.time = s.d.time; data.bookings.push(r); delete data.sessions[chat]; return r;
}
module.exports = async (req, res) => {
  if (req.headers["x-telegram-bot-api-secret-token"] !== process.env.TG_SECRET) return res.status(401).end();
  const u = db.body(req);
  try {
    const cb = u.callback_query; const msg = u.message || (cb && cb.message);
    if (!msg) return res.status(200).end();
    const chat = String(msg.chat.id); const text = (u.message && u.message.text || "").trim();
    if (cb) await db.tg("answerCallbackQuery", { callback_query_id: cb.id });
    const input = cb ? cb.data : text;

    if (text === "/start" || text === "/запись") {
      await db.update((d) => { d.sessions[chat] = { step: "name", d: {} }; });
      await send(chat, INTRO, NOKB); return res.status(200).end();
    }
    if (text === "/cancel") {
      const rec = await db.update((d) => { const mine = d.bookings.filter((b) => b.chat === chat && b.status === "new").pop(); if (mine) mine.status = "cancel"; delete d.sessions[chat]; return mine; });
      await send(chat, rec ? "Запись отменена. Будем рады видеть вас снова!" : "Активных записей не нашёл. Чтобы записаться, нажмите /start.", NOKB);
      if (rec) await db.notifyAdmin("<b>Клиент отменил запись</b>\n" + db.fmtB(rec));
      return res.status(200).end();
    }
    const data0 = await db.load(); const s0 = data0.sessions[chat];
    if (!s0) { await send(chat, "Чтобы записаться на шиномонтаж, нажмите /start.", NOKB); return res.status(200).end(); }
    if (!input && !(u.message && u.message.contact)) return res.status(200).end();

    let reply = null, kb = null, done = null;
    await db.update(async (d) => {
      const s = d.sessions[chat]; if (!s) return;
      const v = input;
      if (s.step === "name") { s.d.name = v.slice(0, 60); s.step = "car"; reply = `Приятно познакомиться, ${db.esc(s.d.name)}! Какая марка и модель автомобиля?`; }
      else if (s.step === "car") { s.d.car = v.slice(0, 60); s.step = "size"; reply = "Какой радиус колёс?"; kb = { reply_markup: { inline_keyboard: SIZES.reduce((a, x, i) => { if (i % 4 === 0) a.push([]); a[a.length - 1].push({ text: x, callback_data: x }); return a; }, []) } }; }
      else if (s.step === "size") { if (!SIZES.includes(v.toUpperCase())) { const n = v.match(/\d{2}/); if (!n || +n[0] < 13 || +n[0] > 23) { reply = "Выберите радиус кнопкой или напишите числом (например, 16)."; return; } s.d.size = "R" + n[0]; } else s.d.size = v.toUpperCase(); s.step = "service"; reply = "Что нужно сделать?"; kb = { reply_markup: { inline_keyboard: SERVICES.map(([k, t]) => [{ text: t, callback_data: "svc:" + k }]) } }; }
      else if (s.step === "service") { const f = SERVICES.find(([k]) => "svc:" + k === v); s.d.service = f ? f[1] : v.slice(0, 60); s.step = "when"; reply = "На какое точное время записать? Напишите дату и время, например <code>12.11 15:00</code> или <code>завтра 09:30</code>."; }
      else if (s.step === "when") {
        const w = parseWhen(v); const now = db.mskNow();
        if (!w) { reply = "Нужны точная дата и время, например <code>12.11 15:00</code> или <code>завтра 09:30</code>. Слова вроде «вечером» не подходят."; return; }
        if (w.date + w.time < now.date + now.time) { reply = "Это время уже прошло. Напишите будущую дату и время."; return; }
        if (!db.isFree(d, w.date, w.time)) { const alt = []; for (let k = 1; k <= 8 && alt.length < 3; k++) for (const sg of [1, -1]) { const mm = (+w.time.slice(0, 2) * 60 + +w.time.slice(3) + sg * 30 * k + 1440) % 1440; const tt = String(Math.floor(mm / 60)).padStart(2, "0") + ":" + String(mm % 60).padStart(2, "0"); if (alt.length < 3 && db.isFree(d, w.date, tt) && w.date + tt >= now.date + now.time) alt.push(tt); } reply = "Это время занято." + (alt.length ? " Свободно: " + alt.join(", ") + "." : "") + " Напишите другое время."; return; }
        s.d.date = w.date; s.d.time = w.time; s.step = "phone"; reply = "Оставьте телефон для связи: нажмите кнопку ниже или напишите номер."; kb = { reply_markup: { keyboard: [[{ text: "Поделиться номером", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } }; }
      else if (s.step === "phone") {
        const ph = u.message.contact ? u.message.contact.phone_number : v;
        if (ph.replace(/\D/g, "").length < 10) { reply = "Не хватает цифр. Напишите номер полностью, например +7 916 123-45-67."; return; }
        s.d.phone = ph.slice(0, 30); done = await finish(chat, s, d);
      }
    });
    if (done) {
      await send(chat, "Готово, заявка принята!\n\n" + db.fmtB(done) + "\n\nМастер свяжется с вами. Отменить: /cancel. Телефон: +7 916 169-06-26", NOKB);
      await db.notifyAdmin("<b>Новая запись из бота</b>\n" + db.fmtB(done) + (done.when ? "" : ""));
    } else if (reply) await send(chat, reply, kb || undefined);
  } catch (e) { /* Telegram повторит доставку только при не-200; не зацикливаем */ }
  return res.status(200).end();
};
