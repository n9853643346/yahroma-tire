const SLOT_MINUTES = 30;
const SLOTS_SHOWN = 20; // 10 часов вперёд по 30 минут — демо-окно, не вся занятость мастеров

// Прайс для седан/универсал/хэтчбек — те же цифры, что в таблице #services
// (с реального прайс-листа точки). Ключи: сезонная смена, комплекс, балансировка, съём-установка, сборка-разборка.
const PRICE_TABLE = {
  R13: { seasonal: 1800, complex: 2600, balance: 230, mount: 220, assembly: 200 },
  R14: { seasonal: 1800, complex: 2600, balance: 230, mount: 220, assembly: 200 },
  R15: { seasonal: 1840, complex: 2660, balance: 240, mount: 220, assembly: 205 },
  R16: { seasonal: 2120, complex: 3040, balance: 290, mount: 240, assembly: 320 },
  R17: { seasonal: 2220, complex: 3180, balance: 305, mount: 250, assembly: 240 },
  R18: { seasonal: 2360, complex: 3360, balance: 325, mount: 265, assembly: 250 },
  R19: { seasonal: 2600, complex: 3499, balance: 350, mount: 300, assembly: 290 },
  R20: { seasonal: 2760, complex: 4060, balance: 365, mount: 325, assembly: 325 },
  R21: { seasonal: 3000, complex: 4400, balance: 390, mount: 360, assembly: 350 },
  R22: { seasonal: 3160, complex: 4660, balance: 410, mount: 380, assembly: 375 },
};

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

  calcBtn.addEventListener("click", () => {
    const body = document.getElementById("quiz-body").value;
    const size = document.getElementById("quiz-size").value;
    const service = document.getElementById("quiz-service").value;

    if (body === "other") {
      resultEl.innerHTML = `
        <div class="quiz-result-price">
          Для внедорожников, кроссоверов и микроавтобусов цена считается индивидуально.
          <br />Позвоните нам — скажем точно: <a href="tel:+79161690626">+7 916 169-06-26</a>
        </div>`;
      return;
    }

    const price = PRICE_TABLE[size]?.[service];
    if (!price) {
      resultEl.innerHTML = `<div class="quiz-result-price">Не нашли цену для этого сочетания — позвоните, уточним: <a href="tel:+79161690626">+7 916 169-06-26</a></div>`;
      return;
    }

    resultEl.innerHTML = `
      <div class="quiz-result-price">
        <span class="amount">${price} ₽</span>
        ${SERVICE_LABELS[service]}, ${size}
        <br /><a href="#booking">Записаться на это время →</a>
      </div>`;
  });
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
  status.style.color = isError ? "#ff6b6b" : "#a3a8b3";
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
        body: JSON.stringify({ phone, slot, fallback_time: fallbackTime }),
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

function initRatingCounter() {
  const el = document.getElementById("rating-counter");
  if (!el || !("IntersectionObserver" in window)) return;

  const target = parseFloat(el.dataset.target || "5.0");
  let animated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || animated) return;
      animated = true;

      const durationMs = 1200;
      const startTime = performance.now();

      function tick(now) {
        const progress = Math.min((now - startTime) / durationMs, 1);
        const value = (target * progress).toFixed(1);
        el.textContent = value;
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
      observer.disconnect();
    });
  }, { threshold: 0.5 });

  observer.observe(el);
}

document.addEventListener("DOMContentLoaded", () => {
  renderSlots();
  initBookingForm();
  initRatingCounter();
  initQuiz();
});
