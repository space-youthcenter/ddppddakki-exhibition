(function () {
  "use strict";
  const setText = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value ?? "-"; };
  const render = (reservation) => {
    document.querySelector("#check-in-loading").hidden = true;
    document.querySelector("#check-in-error").hidden = true;
    document.querySelector("#check-in-view").hidden = false;
    setText("[data-checkin-ticket]", reservation.ticketId); setText("[data-checkin-program]", reservation.programName);
    setText("[data-checkin-date]", reservation.date); setText("[data-checkin-time]", reservation.time);
    setText("[data-checkin-name]", reservation.name); setText("[data-checkin-people]", `${reservation.peopleCount}명`);
    setText("[data-checkin-status]", reservation.status);
    const message = document.querySelector("#check-in-message"); const button = document.querySelector("#confirm-check-in");
    button.hidden = reservation.status !== "예약 완료";
    message.dataset.state = reservation.status === "취소" ? "full" : "available";
    message.textContent = reservation.status === "참여 확인" ? "이미 참여 확인된 예약입니다." : reservation.status === "취소" ? "취소된 예약입니다." : "예약 정보를 확인한 뒤 참여 확인 버튼을 눌러주세요.";
  };
  document.addEventListener("DOMContentLoaded", async () => {
    const ticketId = new URLSearchParams(location.search).get("ticketId") || "";
    const button = document.querySelector("#confirm-check-in");
    try {
      if (!ticketId) throw new Error("예약번호가 없습니다.");
      let reservation = await getReservationByTicketId(ticketId); render(reservation);
      button.addEventListener("click", async () => {
        button.disabled = true;
        try { reservation = await updateReservationStatus(ticketId, "참여 확인"); render(reservation); }
        catch (error) { const message = document.querySelector("#check-in-message"); message.dataset.state = "full"; message.textContent = error.message || "참여 상태를 변경하지 못했습니다."; button.disabled = false; }
      });
    } catch (error) { document.querySelector("#check-in-loading").hidden = true; document.querySelector("#check-in-error").hidden = false; document.querySelector("#check-in-error p").textContent = error.message || "QR 또는 예약번호를 다시 확인해 주세요."; }
  });
})();
