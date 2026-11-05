const db = require("./_db");
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  try {
    const b = db.body(req);
    const phone = String(b.phone || "").trim();
    if (phone.replace(/\D/g, "").length < 10) return res.status(400).json({ ok: false, error: "phone" });
    const has = /^\d{4}-\d\d-\d\d$/.test(b.date || "") && /^\d\d:\d\d$/.test(b.time || "");
    const rec = await db.update((data) => {
      if (has && !db.isFree(data, b.date, b.time)) return { busy: true };
      const r = { id: ++data.seq, created: new Date().toISOString(), source: "site", status: "new", name: String(b.name || "").slice(0, 60), car: String(b.car || "").slice(0, 60), size: String(b.size || "").slice(0, 10), service: String(b.service || "").slice(0, 60), phone: phone.slice(0, 30) };
      if (has) { r.date = b.date; r.time = b.time; } else r.when = String(b.fallback_time || "").slice(0, 100);
      data.bookings.push(r);
      return r;
    });
    if (rec.busy) return res.status(409).json({ ok: false, error: "busy" });
    await db.notifyAdmin("<b>Новая запись с сайта</b>\n" + db.fmtB(rec));
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(502).json({ ok: false }); }
};
