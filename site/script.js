const SLOT_MINUTES = 30;
const SLOTS_SHOWN = 20; // 10 часов вперёд по 30 минут — демо-окно, не вся занятость мастеров

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

document.addEventListener("DOMContentLoaded", () => {
  renderSlots();
  initBookingForm();
});
