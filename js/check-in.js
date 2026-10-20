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
    const message = document.querySelector("#check-in-message");
    message.dataset.state = reservation.status === "취소" ? "full" : "available";
    message.textContent = reservation.status === "참여 확인" ? "이미 참여 확인된 예약입니다." : reservation.status === "취소" ? "취소된 예약입니다." : "승차권 정보를 현장 담당자에게 보여주세요. 참여 확인은 담당자가 처리합니다.";
  };
  // Public ticket QR remains read-only. Staff manage status in their private Sheet.
  // This UI restriction is NOT server authorization; apply the Apps Script guard too.
  document.addEventListener("DOMContentLoaded", async () => {
    const ticketId = new URLSearchParams(location.search).get("ticketId") || "";
    try {
      if (!ticketId) throw new Error("예약번호가 없습니다.");
      render(await getReservationByTicketId(ticketId));
    } catch (error) {
      document.querySelector("#check-in-loading").hidden = true;
      document.querySelector("#check-in-error").hidden = false;
      document.querySelector("#check-in-error p").textContent = error.message || "QR 또는 예약번호를 다시 확인해 주세요.";
    }
  });
})();
