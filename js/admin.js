(function () {
  "use strict";
  let reservations = [];
  let slots = [];
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const render = () => {
    const program = document.querySelector("#filter-program").value;
    const date = document.querySelector("#filter-date").value;
    const time = document.querySelector("#filter-time").value;
    const filtered = reservations.filter((item) => (!program || item.programId === program) && (!date || item.date === date) && (!time || item.time === time));
    document.querySelector("#reservation-count").textContent = `${filtered.length}건`;
    const body = document.querySelector("#admin-list");
    body.innerHTML = filtered.length ? filtered.map((item) => `<tr>
      <td><code>${escapeHtml(item.ticketId)}</code></td><td>${escapeHtml(item.programName)}</td>
      <td>${escapeHtml(item.date)}</td><td>${escapeHtml(item.time)}</td><td><strong>${escapeHtml(item.name)}</strong></td>
      <td><code>${escapeHtml(item.checkCode)}</code></td><td><a href="tel:${escapeHtml(item.contactPhone)}">${escapeHtml(item.contactPhone || "-")}</a></td><td>${Number(item.peopleCount)}명</td>
      <td><span class="status-badge status-${item.status === "예약 완료" ? "booked" : item.status === "참여 확인" ? "checked" : "cancelled"}">${escapeHtml(item.status)}</span></td>
      <td>${escapeHtml(item.createdAt || "-")}</td>
      <td class="admin-actions"><button data-action="check" data-id="${escapeHtml(item.ticketId)}" ${item.status === "취소" ? "disabled" : ""}>참여 확인</button><button data-action="cancel" data-id="${escapeHtml(item.ticketId)}" ${item.status === "취소" ? "disabled" : ""}>예약 취소</button></td>
    </tr>`).join("") : `<tr><td colspan="11" class="empty-cell">조건에 맞는 예약이 없습니다.</td></tr>`;
  };
  const renderSlots = () => {
    const program = document.querySelector("#filter-program").value;
    const date = document.querySelector("#filter-date").value;
    const time = document.querySelector("#filter-time").value;
    const filtered = slots.filter((slot) => (!program || slot.programId === program) && (!date || slot.date === date) && (!time || slot.time === time));
    const body = document.querySelector("#slot-list");
    body.innerHTML = filtered.length ? filtered.map((slot) => {
      const reservedCount = reservations.filter((item) => item.programId === slot.programId && item.date === slot.date && item.time === slot.time && item.status !== "취소").reduce((sum, item) => sum + Number(item.peopleCount), 0);
      const remainingCount = Math.max(0, Number(slot.capacity) - reservedCount);
      const full = !slot.isOpen || remainingCount <= 0;
      return `<tr><td>${escapeHtml(slot.date)}</td><td>${escapeHtml(slot.programName)}</td><td>${escapeHtml(slot.time)}</td><td>${Number(slot.capacity)}명</td><td>${reservedCount}명</td><td>${remainingCount}명</td><td><span class="status-badge status-${full ? "cancelled" : "checked"}">${full ? "마감" : "예약 가능"}</span></td></tr>`;
    }).join("") : `<tr><td colspan="7" class="empty-cell">조건에 맞는 시간대가 없습니다.</td></tr>`;
  };
  document.addEventListener("DOMContentLoaded", async () => {
    const programFilter = document.querySelector("#filter-program"); const dateFilter = document.querySelector("#filter-date"); const timeFilter = document.querySelector("#filter-time");
    CONFIG.PROGRAMS.forEach((item) => programFilter.add(new Option(item.name, item.id))); CONFIG.EVENT_DATES.forEach((date) => dateFilter.add(new Option(date.label, date.value))); CONFIG.TIME_SLOTS.forEach((time) => timeFilter.add(new Option(time, time)));
    try { [reservations, slots] = await Promise.all([getReservations(), getSlots()]); render(); renderSlots(); }
    catch (error) { const message = escapeHtml(error.message || "예약 정보를 불러오지 못했습니다."); document.querySelector("#admin-list").innerHTML = `<tr><td colspan="11" class="empty-cell">${message}</td></tr>`; document.querySelector("#slot-list").innerHTML = `<tr><td colspan="7" class="empty-cell">${message}</td></tr>`; }
    [programFilter, dateFilter, timeFilter].forEach((select) => select.addEventListener("change", () => { render(); renderSlots(); }));
    document.querySelector("#admin-list").addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]"); if (!button) return;
      if (button.dataset.action === "cancel" && !confirm("이 예약을 취소할까요?")) return;
      button.disabled = true;
      try {
        await (button.dataset.action === "check" ? updateReservationStatus(button.dataset.id, "참여 확인") : cancelReservation(button.dataset.id));
        reservations = await getReservations(); render(); renderSlots();
      } catch (error) { alert(error.message || "예약 상태를 변경하지 못했습니다."); button.disabled = false; }
    });
  });
})();
