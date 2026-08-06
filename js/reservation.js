(function () {
  "use strict";

  const readLocal = () => {
    try { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || "[]"); }
    catch (_) { return []; }
  };
  const writeLocal = (items) => localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(items));
  const assertServerConfigured = () => {
    if (!CONFIG.GOOGLE_SCRIPT_URL || CONFIG.GOOGLE_SCRIPT_URL.includes("여기에")) {
      throw new Error("Google Apps Script Web App URL이 아직 설정되지 않았습니다. js/config.js를 확인해 주세요.");
    }
  };
  const apiRequest = async (action, payload = {}) => {
    assertServerConfigured();
    const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload })
    });
    if (!response.ok) throw new Error("예약 서버에 연결하지 못했습니다.");
    let result;
    try { result = await response.json(); }
    catch (_) { throw new Error("예약 서버가 올바른 JSON 응답을 반환하지 않았습니다."); }
    if (!result.success) throw new Error(result.message || "예약 요청을 처리하지 못했습니다.");
    return result.data;
  };
  const makeTicketId = () => {
    const date = new Date();
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    return `DD-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  };
  const getCapacity = (programId, date, time) => {
    const program = CONFIG.PROGRAMS.find((item) => item.id === programId);
    return CONFIG.CAPACITY_BY_SLOT[`${programId}|${date}|${time}`] ?? program?.capacity ?? 0;
  };

  async function createReservation(input) {
    const program = CONFIG.PROGRAMS.find((item) => item.id === input.programId);
    if (!program || !CONFIG.EVENT_DATES.some((item) => item.value === input.date)) throw new Error("예약 가능한 프로그램과 날짜를 선택해 주세요.");
    const now = new Date().toISOString();
    const reservation = {
      ticketId: makeTicketId(), programId: input.programId, programName: program.name,
      date: input.date, time: input.time, name: input.name, checkCode: input.checkCode, contactPhone: input.contactPhone,
      peopleCount: Number(input.peopleCount), status: "예약 완료", createdAt: now, updatedAt: now
    };
    if (!CONFIG.USE_MOCK_DATA) return apiRequest("createReservation", { data: reservation });
    const reservations = readLocal();
    const used = reservations.filter((item) => item.programId === input.programId && item.date === input.date && item.time === input.time && item.status !== "취소").reduce((sum, item) => sum + Number(item.peopleCount), 0);
    if (used + input.peopleCount > getCapacity(input.programId, input.date, input.time)) throw new Error("선택한 시간대의 남은 자리가 부족합니다.");
    reservation.station = program.station;
    reservations.push(reservation);
    writeLocal(reservations);
    return reservation;
  }

  async function getReservationByTicketId(ticketId) {
    if (!CONFIG.USE_MOCK_DATA) return apiRequest("getReservationByTicketId", { ticketId });
    return readLocal().find((item) => item.ticketId.toUpperCase() === String(ticketId).trim().toUpperCase()) || null;
  }

  async function verifyReservation(ticketId, checkCode) {
    if (!CONFIG.USE_MOCK_DATA) return apiRequest("verifyReservation", { ticketId, checkCode });
    return readLocal().find((item) => item.ticketId.toUpperCase() === String(ticketId).trim().toUpperCase() && item.checkCode === String(checkCode).trim()) || null;
  }

  async function getReservations() {
    if (!CONFIG.USE_MOCK_DATA) return apiRequest("getReservations");
    return readLocal();
  }

  async function getSlots() {
    if (!CONFIG.USE_MOCK_DATA) return apiRequest("getSlots");
    return CONFIG.PROGRAMS.flatMap((program) => CONFIG.EVENT_DATES.flatMap((date) => CONFIG.TIME_SLOTS.map((time) => ({
      slotId: `${program.id}-${date.value}-${time.replace(":", "")}`,
      programId: program.id, programName: program.name, date: date.value, time,
      capacity: getCapacity(program.id, date.value, time), isOpen: true
    }))));
  }

  async function getAvailability(programId, date, time) {
    if (!CONFIG.USE_MOCK_DATA) return apiRequest("getAvailability", { programId, date, time });
    const slot = (await getSlots()).find((item) => item.programId === programId && item.date === date && item.time === time);
    if (!slot) throw new Error("해당 시간대 정보를 찾을 수 없습니다.");
    const reservedCount = readLocal().filter((item) => item.programId === programId && item.date === date && item.time === time && item.status !== "취소").reduce((sum, item) => sum + Number(item.peopleCount), 0);
    const remainingCount = Math.max(0, Number(slot.capacity) - reservedCount);
    return { ...slot, reservedCount, remainingCount, isFull: !slot.isOpen || remainingCount <= 0 };
  }

  async function getAvailabilityByDate(programId, date) {
    if (!CONFIG.USE_MOCK_DATA) return apiRequest("getAvailabilityByDate", { programId, date });
    const slots = (await getSlots()).filter((item) => item.programId === programId && item.date === date);
    const reservations = readLocal();
    return slots.map((slot) => {
      const reservedCount = reservations.filter((item) => item.programId === programId && item.date === date && item.time === slot.time && item.status !== "취소").reduce((sum, item) => sum + Number(item.peopleCount), 0);
      const remainingCount = Math.max(0, Number(slot.capacity) - reservedCount);
      return { ...slot, reservedCount, remainingCount, isFull: !slot.isOpen || remainingCount <= 0 };
    });
  }

  async function updateReservationStatus(ticketId, status) {
    if (!CONFIG.USE_MOCK_DATA) return apiRequest("updateReservationStatus", { ticketId, status });
    const reservations = readLocal();
    const target = reservations.find((item) => item.ticketId === ticketId);
    if (!target) throw new Error("예약을 찾을 수 없습니다.");
    target.status = status;
    target.updatedAt = new Date().toISOString();
    writeLocal(reservations);
    return target;
  }

  const cancelReservation = (ticketId) => updateReservationStatus(ticketId, "취소");
  const remainingSeats = async (programId, date, time) => {
    const availability = await getAvailability(programId, date, time);
    return availability.remainingCount;
  };

  Object.assign(window, { createReservation, getReservationByTicketId, verifyReservation, getReservations, getSlots, getAvailability, getAvailabilityByDate, updateReservationStatus, cancelReservation, remainingSeats, ReservationAPI: { createReservation, getReservationByTicketId, verifyReservation, getReservations, getSlots, getAvailability, getAvailabilityByDate, updateReservationStatus, cancelReservation, remainingSeats } });

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#reservation-form");
    if (!form) return;
    const programSelect = form.elements.programId;
    const timeSelect = form.elements.time;
    const dateInput = form.elements.date;
    const availability = document.querySelector("#availability-message");
    const timeslotNotice = document.querySelector("#timeslot-loading-message");
    CONFIG.PROGRAMS.forEach((program) => programSelect.add(new Option(`${program.name} · 정원 ${program.capacity}명`, program.id)));
    CONFIG.EVENT_DATES.forEach((date) => dateInput.add(new Option(date.label, date.value)));
    const peopleSelect = form.elements.peopleCount;
    const submit = form.querySelector("button[type=submit]");
    let currentAvailability = null;
    let availabilityByTime = new Map();

    const showAvailability = async () => {
      if (!programSelect.value || !dateInput.value || !timeSelect.value) { currentAvailability = null; availability.textContent = "프로그램·날짜·시간을 선택하면 정원 현황을 확인할 수 있어요."; submit.disabled = true; return; }
      currentAvailability = availabilityByTime.get(timeSelect.value) || null;
      if (!currentAvailability) { availability.dataset.state = "full"; availability.textContent = "선택한 시간대의 정원 정보를 찾을 수 없습니다."; submit.disabled = true; return; }
      const full = currentAvailability.isFull || !currentAvailability.isOpen;
      availability.textContent = full ? `정원 ${currentAvailability.capacity}명 / 현재 ${currentAvailability.reservedCount}명 예약 / 정원 마감` : `정원 ${currentAvailability.capacity}명 / 현재 ${currentAvailability.reservedCount}명 예약 / 잔여 ${currentAvailability.remainingCount}명`;
      availability.dataset.state = full ? "full" : "available";
      submit.disabled = full || Number(peopleSelect.value) > currentAvailability.remainingCount;
      if (!full && Number(peopleSelect.value) > currentAvailability.remainingCount) availability.textContent += " · 잔여 인원보다 많은 인원은 예약할 수 없습니다.";
    };

    const loadTimeSlots = async () => {
      const previous = timeSelect.value;
      timeSelect.replaceChildren(new Option("시간을 선택해 주세요", ""));
      timeSelect.disabled = true; availabilityByTime = new Map(); currentAvailability = null; submit.disabled = true;
      if (!programSelect.value || !dateInput.value) { timeslotNotice.hidden = true; availability.textContent = "프로그램과 날짜를 선택하면 시간대별 정원 현황이 표시됩니다."; return; }
      timeslotNotice.hidden = false; timeslotNotice.dataset.state = "loading"; timeslotNotice.textContent = "시간대별 잔여 인원을 확인하고 있습니다.";
      try {
        const states = await getAvailabilityByDate(programSelect.value, dateInput.value);
        availabilityByTime = new Map(states.map((state) => [state.time, state]));
        states.forEach((state) => {
          const full = state.isFull || !state.isOpen;
          const label = `${state.time} / 정원 ${state.capacity}명 / 현재 ${state.reservedCount}명 / ${full ? "마감" : `잔여 ${state.remainingCount}명`}`;
          const option = new Option(label, state.time); option.disabled = full; timeSelect.add(option);
        });
        timeSelect.disabled = !states.length;
        timeslotNotice.hidden = true;
        if (states.some((state) => state.time === previous && !state.isFull && state.isOpen)) timeSelect.value = previous;
        availability.textContent = states.length ? "예약 가능한 시간대를 선택해 주세요." : "등록된 시간대가 없습니다. 운영자에게 문의해 주세요.";
        if (timeSelect.value) await showAvailability();
      } catch (_) { timeslotNotice.hidden = false; timeslotNotice.dataset.state = "error"; timeslotNotice.textContent = "시간대 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."; availability.dataset.state = "full"; availability.textContent = "시간대 정보를 다시 불러온 뒤 예약해 주세요."; }
    };
    [programSelect, dateInput].forEach((field) => field.addEventListener("change", loadTimeSlots));
    timeSelect.addEventListener("change", showAvailability);
    peopleSelect.addEventListener("change", showAvailability);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.querySelector("#form-message");
      if (!form.reportValidity()) return;
      submit.disabled = true; submit.textContent = "승차권 발급 중…"; message.textContent = "";
      try {
        const data = new FormData(form);
        const latest = availabilityByTime.get(String(data.get("time")));
        if (!latest || latest.isFull || !latest.isOpen) throw new Error("해당 시간대는 정원 마감되었습니다.");
        if (Number(data.get("peopleCount")) > latest.remainingCount) throw new Error("잔여 인원보다 많은 인원은 예약할 수 없습니다.");
        const reservation = await createReservation({
          programId: data.get("programId"), date: data.get("date"), time: data.get("time"),
          name: String(data.get("name")).trim(), checkCode: String(data.get("checkCode")).trim(), contactPhone: String(data.get("contactPhone")).trim(),
          peopleCount: Number(data.get("peopleCount"))
        });
        location.href = `ticket.html?ticketId=${encodeURIComponent(reservation.ticketId)}`;
      } catch (error) {
        message.textContent = error.message || "예약을 처리하지 못했습니다.";
        submit.textContent = "예약 완료 · 승차권 발급";
        await loadTimeSlots();
      }
    });
  });
})();
