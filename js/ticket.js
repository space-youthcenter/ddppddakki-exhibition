(function () {
  "use strict";
  let renderedQrTicketId = "";
  const setText = (selector, value) => { const el = document.querySelector(selector); if (el) el.textContent = value ?? "-"; };
  const getCheckInUrl = (ticketId) => {
    const configuredBase = String(CONFIG.SITE_BASE_URL || "").replace(/\/$/, "");
    if (configuredBase) return `${configuredBase}/check-in.html?ticketId=${encodeURIComponent(ticketId)}`;
    const fallback = location.protocol === "file:" ? new URL("check-in.html", location.href) : new URL("/check-in.html", location.origin);
    fallback.searchParams.set("ticketId", ticketId);
    return fallback.href;
  };
  const drawTicketCode = (container, ticketId) => {
    const error = document.querySelector("#qr-error");
    if (!container || !ticketId) { if (error) error.hidden = false; return; }
    if (renderedQrTicketId === ticketId && container.querySelector("canvas, img")) return;
    const url = getCheckInUrl(ticketId);
    if (!url || window.QR_LIBRARY_FAILED || typeof QRCode === "undefined") { container.innerHTML = ""; renderedQrTicketId = ""; if (error) error.hidden = false; return; }
    container.innerHTML = "";
    try {
      new QRCode(container, { text: url, width: 220, height: 220, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
      const canvas = container.querySelector("canvas"); const images = [...container.querySelectorAll("img")];
      if (canvas) images.forEach((image) => image.remove());
      else images.slice(1).forEach((image) => image.remove());
      container.dataset.qrContent = url; renderedQrTicketId = ticketId; if (error) error.hidden = true;
    } catch (_) { container.innerHTML = ""; renderedQrTicketId = ""; if (error) error.hidden = false; }
  };
  const renderTicket = (reservation) => {
    const view = document.querySelector("#ticket-view"); const empty = document.querySelector("#ticket-empty");
    if (!reservation) { if (view) view.hidden = true; if (empty) empty.hidden = false; return; }
    if (view) view.hidden = false; if (empty) empty.hidden = true;
    setText("[data-ticket-id]", reservation.ticketId); setText("[data-program]", reservation.programName);
    const program = CONFIG.PROGRAMS.find((item) => item.id === reservation.programId);
    setText("[data-station]", reservation.programId === "visit" ? "강당 체험역" : (reservation.station || program?.station || "체험역")); setText("[data-date]", reservation.date); setText("[data-time]", reservation.time);
    setText("[data-name]", reservation.name); setText("[data-party]", `${reservation.peopleCount}명`); setText("[data-status]", reservation.status);
    drawTicketCode(document.querySelector("#ticket-qr"), reservation.ticketId);
  };
  document.addEventListener("DOMContentLoaded", async () => {
    const ticketPage = document.querySelector("#ticket-view");
    if (ticketPage) {
      try {
        const params = new URLSearchParams(location.search);
        renderTicket(await getReservationByTicketId(params.get("ticketId") || params.get("id") || ""));
      } catch (error) {
        renderTicket(null);
        const emptyMessage = document.querySelector("#ticket-empty p");
        if (emptyMessage) emptyMessage.textContent = error.message || "예약 정보를 불러오지 못했습니다.";
      }
    }
    document.querySelector("#save-ticket")?.addEventListener("click", () => window.print());
    const lookup = document.querySelector("#ticket-lookup-form");
    lookup?.addEventListener("submit", async (event) => {
      event.preventDefault(); const data = new FormData(lookup);
      const message = document.querySelector("#lookup-message");
      const submit = lookup.querySelector("button[type=submit]");
      message.textContent = ""; submit.disabled = true;
      try {
        const result = await verifyReservation(data.get("ticketId"), data.get("checkCode"));
        if (result) location.href = `ticket.html?ticketId=${encodeURIComponent(result.ticketId)}`;
        else message.textContent = "예약 정보를 찾을 수 없습니다. 예약번호와 확인용 번호를 다시 확인해 주세요.";
      } catch (error) {
        message.textContent = error.message || "예약 정보를 찾을 수 없습니다. 예약번호와 확인용 번호를 다시 확인해 주세요.";
      } finally { submit.disabled = false; }
    });
  });
})();
