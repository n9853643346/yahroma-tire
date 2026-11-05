const SLOT_MINUTES = 50;
const SLOTS_SHOWN = 12; // 10 часов вперёд по 30 минут — демо-окно, не вся занятость мастеров

// Прайс для седан/универсал/хэтчбек — те же цифры, что в таблице #services
// (с реального прайс-листа точки). Ключи: сезонная смена, комплекс, балансировка, съём-установка, сборка-разборка.
const PRICE_TABLE = {"sedan": {"R13": {"seasonal": 2000, "complex": 2800, "balance": 250, "mount": 250, "assembly": 200}, "R14": {"seasonal": 2000, "complex": 2800, "balance": 250, "mount": 250, "assembly": 200}, "R15": {"seasonal": 2000, "complex": 2800, "balance": 250, "mount": 250, "assembly": 200}, "R16": {"seasonal": 2200, "complex": 3200, "balance": 300, "mount": 300, "assembly": 250}, "R17": {"seasonal": 2400, "complex": 3400, "balance": 300, "mount": 300, "assembly": 250}, "R18": {"seasonal": 2600, "complex": 3600, "balance": 350, "mount": 300, "assembly": 250}, "R19": {"seasonal": 2600, "complex": 4000, "balance": 350, "mount": 300, "assembly": 250}, "R20": {"seasonal": 3200, "complex": 4600, "balance": 400, "mount": 400, "assembly": 350}, "R21": {"seasonal": 3200, "complex": 4600, "balance": 400, "mount": 400, "assembly": 350}, "R22": {"seasonal": 3200, "complex": 4600, "balance": 400, "mount": 400, "assembly": 350}}, "cross": {"R13": {"seasonal": 2000, "complex": 2800, "balance": 250, "mount": 250, "assembly": 200}, "R14": {"seasonal": 2000, "complex": 2800, "balance": 250, "mount": 250, "assembly": 250}, "R15": {"seasonal": 2000, "complex": 3000, "balance": 250, "mount": 250, "assembly": 250}, "R16": {"seasonal": 2400, "complex": 3400, "balance": 300, "mount": 300, "assembly": 300}, "R17": {"seasonal": 2600, "complex": 3600, "balance": 350, "mount": 300, "assembly": 300}, "R18": {"seasonal": 2600, "complex": 3800, "balance": 400, "mount": 300, "assembly": 300}, "R19": {"seasonal": 3000, "complex": 4200, "balance": 400, "mount": 350, "assembly": 300}, "R20": {"seasonal": 3000, "complex": 4600, "balance": 400, "mount": 350, "assembly": 300}, "R21": {"seasonal": 3600, "complex": 5200, "balance": 500, "mount": 400, "assembly": 400}, "R22": {"seasonal": 3600, "complex": 5200, "balance": 500, "mount": 400, "assembly": 400}, "R23": {"seasonal": 3600, "complex": 5200, "balance": 500, "mount": 400, "assembly": 400}}};

const SERVICE_LABELS = {
  seasonal: "Сезонная смена колёс в сборе",
  complex: "Комплекс (смена + балансировка)",
  balance: "Балансировка",
  mount: "Съём-установка",
  assembly: "Сборка-разборка",
};

function initQuiz() {
  const calcBtn = document.getElementById("quiz-calc");
  const resultEl = document.getElementById("quiz-result");
  if (!calcBtn || !resultEl) return;

  const fmt = (n) => n.toLocaleString("ru-RU");
  function calc() {
    const body = document.getElementById("quiz-body").value;
    const size = document.getElementById("quiz-size").value;
    const service = document.getElementById("quiz-service").value;
    let exMin = 0, exMax = 0, exNames = [];
    document.querySelectorAll("#quiz-extras .ex").forEach((row) => {
      const cb = row.querySelector(".ex-cb");
      if (!cb.checked) return;
      const q = Math.max(1, parseInt(row.querySelector(".ex-q").value, 10) || 1);
      exMin += +cb.dataset.min * q; exMax += +cb.dataset.max * q;
      exNames.push(row.querySelector("span").textContent + (q > 1 ? " ×" + q : ""));
    });
    const exTxt = () => exMin === exMax ? fmt(exMin) : fmt(exMin) + "–" + fmt(exMax);

    if (body === "other") {
      resultEl.innerHTML = `<div class="p">Для микроавтобусов и нестандартных колёс цена считается индивидуально.<br />Позвоните нам: <a href="tel:+79161690626">+7 916 169-06-26</a>${exNames.length ? `<br />Допуслуги отдельно: ${exTxt()} ₽` : ""}</div>`;
      return;
    }
    const price = (PRICE_TABLE[body] || {})[size]?.[service];
    if (!price) {
      resultEl.innerHTML = `<div class="p">Для этого сочетания нужен расчёт — позвоните, уточним: <a href="tel:+79161690626">+7 916 169-06-26</a></div>`;
      return;
    }
    const lo = price + exMin, hi = price + exMax;
    const total = lo === hi ? fmt(lo) : "от " + fmt(lo) + " до " + fmt(hi);
    let lines = `<li>${SERVICE_LABELS[service]}, ${size} <b>${fmt(price)} ₽</b></li>`;
    if (exNames.length) lines += `<li>Допуслуги: ${exNames.join(", ")} <b>${exTxt()} ₽</b></li>`;
    resultEl.innerHTML = `<div class="p"><span class="amount">${total} ₽</span><ul class="sum">${lines}</ul><a href="#booking">Записаться →</a></div>`;
  }
  calcBtn.addEventListener("click", calc);
  document.querySelectorAll("#quiz-extras input").forEach((el) => el.addEventListener("input", () => { if (resultEl.innerHTML.trim()) calc(); }));
  ["quiz-body","quiz-size","quiz-service"].forEach((id) => document.getElementById(id).addEventListener("change", () => { if (resultEl.innerHTML.trim()) calc(); }));
}

function generateSlots(date) {
  const slots = [];
  const start = new Date(date);
  start.setSeconds(0, 0);
  // Округляем вперёд до ближайших 30 минут — каждый слот фиксированной длины 30 мин
  const minutes = start.getMinutes();
  const roundedMinutes = minutes < 30 ? 30 : 60;
  start.setMinutes(roundedMinutes, 0, 0);

  for (let i = 0; i < SLOTS_SHOWN; i++) {
    const slotStart = new Date(start.getTime() + i * SLOT_MINUTES * 60000);
    const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60000);

    const fmt = (d) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    const dayLabel = slotStart.getDate() === date.getDate() ? "сегодня" : "завтра";

    slots.push({
      label: `${dayLabel} ${fmt(slotStart)}–${fmt(slotEnd)}`,
      value: `${slotStart.toISOString()}–${slotEnd.toISOString()}`,
    });
  }

  return slots;
}

function renderSlots() {
  const container = document.getElementById("slots");
  const hiddenInput = document.getElementById("slot");
  if (!container || !hiddenInput) return;

  const slots = generateSlots(new Date());

  slots.forEach((slot) => {
    const chip = document.createElement("div");
    chip.className = "slot-chip";
    chip.textContent = slot.label;
    chip.dataset.value = slot.value;
    chip.addEventListener("click", () => {
      document.querySelectorAll(".slot-chip").forEach((el) => el.classList.remove("selected"));
      chip.classList.add("selected");
      hiddenInput.value = slot.value;
    });
    container.appendChild(chip);
  });
}

function digitsOnly(str) {
  return (str || "").replace(/\D/g, "");
}

function isValidPhone(str) {
  return digitsOnly(str).length >= 10;
}

function setStatus(text, isError) {
  const status = document.getElementById("booking-status");
  if (!status) return;
  status.textContent = text;
  status.style.color = isError ? "#ff6b6b" : "#ffb347";
}

function initBookingForm() {
  const form = document.getElementById("booking-form");
  const submitBtn = document.getElementById("booking-submit");
  if (!form || !submitBtn) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const phone = document.getElementById("phone").value;
    const slot = document.getElementById("slot").value;
    const fallbackTime = document.getElementById("fallback_time").value;

    if (!isValidPhone(phone)) {
      setStatus("Проверьте номер телефона — похоже, не хватает цифр.", true);
      return;
    }

    submitBtn.disabled = true;
    setStatus("Отправляем заявку…", false);

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: (document.getElementById("name")||{}).value, car: (document.getElementById("car")||{}).value, phone, slot, fallback_time: fallbackTime, time: slot ? (document.querySelector(".slot-chip.selected")||{}).textContent : fallbackTime }),
      });

      if (!res.ok) throw new Error("bad response");

      setStatus("Заявка отправлена, вам перезвонят.", false);
      form.reset();
      document.querySelectorAll(".slot-chip").forEach((el) => el.classList.remove("selected"));
    } catch (err) {
      setStatus("Не получилось отправить онлайн — позвоните нам: +7 916 169-06-26", true);
      submitBtn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on",x===b));document.querySelectorAll(".tp").forEach(t=>t.hidden=t.id!==b.dataset.t);}));
  renderSlots();
  initBookingForm();
  initQuiz();
});
