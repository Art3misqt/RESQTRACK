(function () {
  "use strict";

  var chip = document.getElementById("btn-user");
  var nameEl = document.querySelector(".userchip__name");
  var idEl = document.querySelector(".userchip__id");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("is-on");
    }, 2800);
  }

  function onLoginPage() {
    return /(^|\/)index\.html$/i.test(window.location.pathname) ||
      /\/$/.test(window.location.pathname);
  }

  function showOfflineBanner() {
    if (document.getElementById("offline-banner")) return;
    var banner = document.createElement("p");
    banner.id = "offline-banner";
    banner.className = "offline-banner";
    banner.setAttribute("role", "status");
    banner.textContent =
      "Cannot reach the ResQtrack server \u2014 run npm start and open http://localhost:3000";
    document.body.appendChild(banner);
  }

  function goOffline() {
    applyRoleChrome(null);
    document.dispatchEvent(new CustomEvent("resqtrack:session", {
      detail: { role: null, offline: true }
    }));
    showOfflineBanner();
  }

  function applyRoleChrome(role) {
    if (role === "admin") return;

    var restricted = document.querySelectorAll(
      '.nav__item[href="responders.html"], .nav__item[href="admin.html"], ' +
      '.tabbar__item[href="responders.html"], .tabbar__item[href="admin.html"]'
    );
    Array.prototype.forEach.call(restricted, function (item) {
      item.parentNode.removeChild(item);
    });

    var dashLinks = document.querySelectorAll(
      '.nav__item[href="dashboard.html"], .tabbar__item[href="dashboard.html"]'
    );
    Array.prototype.forEach.call(dashLinks, function (item) {
      item.setAttribute("href", "responder.html");
      item.classList.remove("is-active");
      item.removeAttribute("aria-current");
    });
  }

  window.fetch("/api/session")
    .then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (data) {
        return { ok: response.ok, status: response.status, data: data };
      });
    })
    .then(function (result) {
      if (!result.ok) {
        if (result.status === 401) {
          if (!onLoginPage()) window.location.href = "index.html";
          return;
        }
        goOffline();
        return;
      }
      var user = result.data.user || {};
      if (nameEl && user.fullname) nameEl.textContent = user.fullname;
      if (idEl && user.employeeId) idEl.textContent = "ID: " + user.employeeId;
      if (chip) {
        chip.setAttribute(
          "aria-label",
          "Signed in as " + (user.fullname || "Responder") +
            ", ID " + (user.employeeId || "\u2014") + ". Activate to sign out."
        );
      }
      applyRoleChrome(user.role);
      document.dispatchEvent(new CustomEvent("resqtrack:session", {
        detail: { role: user.role }
      }));
    })
    .catch(function () {
      goOffline();
    });

  if (chip) {
    chip.addEventListener("click", function () {
      if (!window.confirm("Sign out of ResQtrack?")) return;
      window.fetch("/api/logout", { method: "POST" })
        .then(function () {
          window.location.href = "index.html";
        })
        .catch(function () {
          toast("Could not reach the server to sign out.");
        });
    });
  }
})();
