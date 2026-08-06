(function () {
  "use strict";

  function showError(container, message) {
    container.classList.add("qr-generation-error");
    container.textContent = message;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var container = document.getElementById("review-qr");
    if (!container) return;

    var reviewUrl = typeof CONFIG !== "undefined" ? String(CONFIG.REVIEW_FORM_URL || "").trim() : "";
    var label = container.closest(".qr-sign").querySelector("[data-qr-url-label]");
    if (label && reviewUrl) label.textContent = reviewUrl;

    if (!reviewUrl) {
      showError(container, "하차 후기 연결 주소를 확인해 주세요.");
      return;
    }
    if (typeof QRCode === "undefined") {
      showError(container, "QR 코드를 불러오지 못했습니다.");
      return;
    }

    container.innerHTML = "";
    try {
      new QRCode(container, {
        text: reviewUrl,
        width: 220,
        height: 220,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
      container.classList.add("has-qr");
    } catch (error) {
      showError(container, "QR 코드를 만들지 못했습니다.");
    }
  });
})();
