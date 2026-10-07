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
    if (!["예약 완료", "참여 확인", "취소"].includes(status)) throw new Error("예약 상태를 확인해 주세요.");
    if (target.status === "취소" && status !== "취소") throw new Error("취소된 예약은 새로 예약해 주세요.");
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

})();
