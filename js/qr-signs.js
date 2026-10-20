(function () {
  "use strict";

  function showError(container, message) {
    container.replaceChildren();
    container.classList.remove("has-qr");
    container.classList.add("qr-generation-error");
    container.removeAttribute("data-qr-content");
    container.textContent = message;
  }

  function destination(container) {
    if (typeof CONFIG === "undefined") throw new Error("연결 주소 설정을 확인해 주세요.");
    const value = container.hasAttribute("data-qr-review")
      ? String(CONFIG.REVIEW_FORM_URL || "").trim()
      : String(CONFIG.SITE_BASE_URL || "").trim().replace(/\/+$/, "") + "/" + container.dataset.qrPage;
    // Printed signs must never point at a file:// or local preview address.
    const url = new URL(value);
    if (url.protocol !== "https:" || /^(localhost|127\.|\[::1\])/.test(url.hostname)) {
      throw new Error("실제 배포된 HTTPS 연결 주소를 확인해 주세요.");
    }
    return url.href;
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".qr-page .auto-qr").forEach(function (container) {
      container.replaceChildren();
      container.classList.remove("has-qr", "qr-generation-error");
      try {
        const url = destination(container);
        if (typeof QRCode === "undefined") throw new Error("QR 코드를 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
        new QRCode(container, {
          text: url,
          width: 512,
          height: 512,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
        // QRCode.js may supply both canvas and image. Show only its canvas.
        if (container.querySelector("canvas")) {
          container.querySelectorAll("img").forEach(function (image) { image.remove(); });
        }
        container.removeAttribute("title"); // The library puts the long URL here.
        container.dataset.qrContent = url;
        container.classList.add("has-qr");
      } catch (error) {
        showError(container, error.message || "QR 코드를 만들지 못했습니다.");
      }
    });
  }, { once: true });
})();
