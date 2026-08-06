(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof CONFIG === "undefined" || !CONFIG.REVIEW_FORM_URL) return;

    document.querySelectorAll("[data-review-link]").forEach(function (link) {
      link.href = CONFIG.REVIEW_FORM_URL;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
  });
})();
