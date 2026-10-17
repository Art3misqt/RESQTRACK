(function () {
  "use strict";

  var form = document.getElementById("login-form");
  if (!form) return;

  var tabs = Array.prototype.slice.call(form.querySelectorAll('[role="tab"]'));
  var notice = document.getElementById("notice");
  var email = document.getElementById("email");
  var password = document.getElementById("password");
  var consent = document.getElementById("consent");
  var toggle = document.getElementById("pw-toggle");
  var submit = document.getElementById("submit");
  var submitLabel = submit.querySelector(".btn__label");
  var submitArrow = submit.querySelector(".btn__arrow");
  var status = document.getElementById("status");
  var registerLink = document.getElementById("register-link");
  var registerNote = document.getElementById("register-note");

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var state = { role: "admin", busy: false };

  function fieldOf(input) {
    return input.closest(".field");
  }

  function setError(input, message) {
    var field = fieldOf(input);
    var box = document.getElementById(input.id + "-error");
    if (!field || !box) return;
    if (message) {
      box.textContent = message;
      box.hidden = false;
      field.classList.add("is-invalid");
      input.setAttribute("aria-invalid", "true");
    } else {
      box.textContent = "";
      box.hidden = true;
      field.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
    }
  }

  function setStatus(message, tone) {
    status.textContent = message || "";
    if (tone) status.setAttribute("data-tone", tone);
    else status.removeAttribute("data-tone");
  }

  function setRole(role, focusTab) {
    state.role = role;
    tabs.forEach(function (tab) {
      var on = tab.dataset.role === role;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      if (on && focusTab) tab.focus();
    });
    notice.setAttribute("aria-labelledby", "tab-" + role);
    form.querySelectorAll("[data-copy]").forEach(function (node) {
      node.hidden = node.dataset.copy !== role;
    });
    email.autocomplete = role === "admin" ? "username" : "email";
    var unit = role === "security" ? "security" : "responder";
    if (registerLink) {
      registerLink.hidden = role === "admin";
      registerLink.setAttribute("href", "register.html?unit=" + unit);
    }
    if (registerNote) registerNote.hidden = role !== "admin";
    setStatus("");
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      setRole(tab.dataset.role, false);
    });
  });

  form.querySelector(".tabs").addEventListener("keydown", function (event) {
    var index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    var next = null;
    if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
    else if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
    else if (event.key === "Home") next = tabs[0];
    else if (event.key === "End") next = tabs[tabs.length - 1];
    if (!next) return;
    event.preventDefault();
    setRole(next.dataset.role, true);
  });

  toggle.addEventListener("click", function () {
    var show = password.type === "password";
    password.type = show ? "text" : "password";
    toggle.setAttribute("aria-pressed", show ? "true" : "false");
    toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    toggle.querySelector(".field__toggle-on").hidden = show;
    toggle.querySelector(".field__toggle-off").hidden = !show;
    password.focus({ preventScroll: true });
  });

  [
    [email, function () {
      return EMAIL_RE.test(email.value.trim()) ? "" : "Enter a valid government email address.";
    }],
    [password, function () {
      return password.value.length >= 8 ? "" : "Password must be at least 8 characters.";
    }]
  ].forEach(function (pair) {
    var input = pair[0];
    var validate = pair[1];
    input.addEventListener("blur", function () {
      if (input.value !== "") setError(input, validate());
    });
    input.addEventListener("input", function () {
      if (fieldOf(input) && fieldOf(input).classList.contains("is-invalid")) {
        setError(input, validate());
      }
    });
  });

  consent.addEventListener("change", function () {
    if (consent.checked) setStatus("");
    setConsentError("");
  });

  function setConsentError(message) {
    var box = document.getElementById("consent-error");
    if (!box) return;
    box.textContent = message || "";
    box.hidden = !message;
    if (message) consent.setAttribute("aria-invalid", "true");
    else consent.removeAttribute("aria-invalid");
  }

  function reset() {
    submit.classList.remove("is-loading", "is-ok", "is-bad");
    submitLabel.textContent = "Login";
    submitArrow.hidden = false;
    submitArrow.querySelector("use").setAttribute("href", "#i-arrow");
    submit.disabled = false;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (state.busy) return;

    var emailError = EMAIL_RE.test(email.value.trim()) ? "" : "Enter a valid government email address.";
    var passwordError = password.value.length >= 8 ? "" : "Password must be at least 8 characters.";
    setError(email, emailError);
    setError(password, passwordError);
    setConsentError(consent.checked ? "" : "Confirm your access terms to continue.");

    var problems = [email, password, consent].filter(function (el, i) {
      return [emailError, passwordError, consent.checked ? "" : "1"][i] !== "";
    });

    if (problems.length) {
      reset();
      setStatus("Check the highlighted fields.", "bad");
      problems[0].focus();
      return;
    }

    state.busy = true;
    reset();
    submit.classList.add("is-loading");
    submit.disabled = true;
    submitLabel.textContent = "Signing in";
    setStatus("Verifying jurisdictional credentials\u2026");

    window.fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value
      })
    }).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (data) {
        return { ok: response.ok, data: data };
      });
    }).then(function (result) {
      state.busy = false;
      if (!result.ok) {
        reset();
        setStatus(result.data.error || "Sign in failed. Please try again.", "bad");
        return;
      }
      submit.disabled = false;
      submit.classList.remove("is-loading");
      submitLabel.textContent = "Access granted";
      submitArrow.hidden = false;
      submitArrow.querySelector("use").setAttribute("href", "#i-check");
      submit.classList.add("is-ok");
      var userRole = (result.data.user && result.data.user.role) || "responder";
      setStatus(
        userRole === "admin"
          ? "LDRRMO-FULL session issued. Redirecting to command console\u2026"
          : state.role === "security"
            ? "SECURITY-L2 session issued. Redirecting to security desk\u2026"
            : "RESPONDER-L2 session issued. Redirecting to dispatch board\u2026",
        "ok"
      );
      window.setTimeout(function () {
        window.location.href = userRole === "admin" ? "dashboard.html" : "responder.html";
      }, 1600);
    }).catch(function () {
      state.busy = false;
      reset();
      setStatus("Could not reach the server. Start it with: node server.js", "bad");
    });
  });

  form.querySelectorAll("[data-stub]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      setStatus(link.dataset.stub + " is not wired up in this prototype.");
    });
  });

  document.querySelectorAll(".responder img").forEach(function (img) {
    var slot = img.closest(".responder");
    img.addEventListener("error", function () {
      img.hidden = true;
      slot.classList.add("is-empty");
    });
    if (img.complete && img.naturalWidth === 0) {
      img.hidden = true;
      slot.classList.add("is-empty");
    }
  });
})();