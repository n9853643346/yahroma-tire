const db = require("./_db");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!db.authed(req)) return res.status(401).json({ ok: false });
  try {
    if (req.method === "GET") { const d = await db.load(); return res.status(200).json({ ok: true, bookings: d.bookings, now: db.mskNow() }); }
    const b = db.body(req);
    const out = await db.update((data) => {
      if (b.action === "add") {
        const now = db.mskNow();
        const r = { id: ++data.seq, created: new Date().toISOString(), source: b.walkin ? "walkin" : "master", status: b.walkin ? "came" : "new", name: String(b.name || "").slice(0, 60), car: String(b.car || "").slice(0, 60), size: String(b.size || "").slice(0, 10), service: String(b.service || "").slice(0, 60), phone: String(b.phone || "").slice(0, 30), date: b.date || now.date, time: b.time || now.time };
        if (!b.walkin && !b.force && !db.isFree(data, r.date, r.time)) return { busy: true };
        data.bookings.push(r); return { rec: r };
      }
      const r = data.bookings.find((x) => x.id === b.id);
      if (!r) return { missing: true };
      if (b.action === "status" && ["new", "came", "noshow", "cancel"].includes(b.status)) r.status = b.status;
      if (b.action === "delete") data.bookings = data.bookings.filter((x) => x.id !== b.id);
      return { ok: true };
    });
    if (out.busy) return res.status(409).json({ ok: false, error: "busy" });
    return res.status(200).json({ ok: true, ...out });
  } catch (e) { return res.status(502).json({ ok: false }); }
};
