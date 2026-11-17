/* Dialogs and forms. No dependencies. */
(function () {
  // Open/close native <dialog>s. Esc and focus return are handled by the browser.
  document.querySelectorAll("[data-open]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var d = document.getElementById(btn.getAttribute("data-open"));
      if (d && typeof d.showModal === "function") d.showModal();
    });
  });

  document.querySelectorAll("dialog").forEach(function (d) {
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); }); // backdrop click
    d.querySelectorAll("[data-close]").forEach(function (c) {
      c.addEventListener("click", function () { d.close(); });
    });
  });

  var local = location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  function buildMailto(form) {
    var fd = new FormData(form);
    var formName = fd.get("form-name") || "contact";
    var subject = formName === "book-call"
      ? "Tesser \u2014 15-minute creator chat"
      : formName === "waitlist"
      ? "Tesser \u2014 viewer waitlist"
      : "Tesser \u2014 site feedback";
    var lines = [];
    if (fd.get("name")) lines.push("Name / channel: " + fd.get("name"));
    if (fd.get("email")) lines.push("Email: " + fd.get("email"));
    if (fd.get("channel")) lines.push("Channel / series link: " + fd.get("channel"));
    if (fd.get("time")) lines.push("Preferred time: " + fd.get("time"));
    if (fd.get("message")) lines.push("\n" + fd.get("message"));
    return "mailto:?subject=" + encodeURIComponent(subject) +
           "&body=" + encodeURIComponent(lines.join("\n"));
  }

  document.querySelectorAll("form[data-netlify]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form-status") || form.parentElement.querySelector(".form-status");
      var mailto = buildMailto(form);

      if (local) {
        window.location.href = mailto;
        if (status) {
          status.textContent = "Reply to Victor in the Facebook chat that sent you here. This page does not publish an email address.";
        }
        return;
      }

      var data = new URLSearchParams(new FormData(form)).toString();
      fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: data })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          form.reset();
          if (status) status.textContent = form.getAttribute("data-success") || "Thanks. Victor has your note and will reply by email.";
        })
        .catch(function () {
          window.location.href = mailto;
          if (status) {
            status.textContent = "Reply to Victor in the Facebook chat that sent you here. This page does not publish an email address.";
          }
        });
    });
  });
})();
