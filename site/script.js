function generateSlots(date) {
  const slots = [];
  const start = new Date(date);
  start.setMinutes(0, 0, 0);
  // Сдвигаем к ближайшему чётному часу вперёд (2-часовые окна: 00-02, 02-04, ...)
  const hour = start.getHours();
  const nextEvenHour = hour % 2 === 0 ? hour + 2 : hour + 1;
  start.setHours(nextEvenHour);

  for (let i = 0; i < 12; i++) {
    const slotStart = new Date(start);
    slotStart.setHours(start.getHours() + i * 2);
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(slotStart.getHours() + 2);

    const fmt = (d) => String(d.getHours()).padStart(2, "0") + ":00";
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
