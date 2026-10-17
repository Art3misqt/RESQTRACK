(function () {
  "use strict";

  var body = document.getElementById("users-body");
  if (!body) return;

  var countEl = document.getElementById("user-count");
  var emptyEl = document.getElementById("users-empty");
  var loadingEl = document.getElementById("users-loading");
  var searchInput = document.getElementById("search");
  var searchForm = document.getElementById("search-form");
  var toastEl = document.getElementById("toast");
  var refreshBtn = document.getElementById("users-refresh");

  var reportsList = document.getElementById("reports-list");
  var reportsCount = document.getElementById("reports-count");
  var reportsLoading = document.getElementById("reports-loading");
  var reportsEmpty = document.getElementById("reports-empty");
  var reportsRefresh = document.getElementById("reports-refresh");

  var REPORTS = [];

  var modal = document.getElementById("captures-modal");
  var modalClose = document.getElementById("captures-close");
  var modalCaption = document.getElementById("captures-caption");
  var shots = {
    front: document.getElementById("capture-front"),
    back: document.getElementById("capture-back"),
    face: document.getElementById("capture-face")
  };

  var USERS = [];
  var toastTimer = null;

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("is-on");
    }, 2800);
  }

  function fmtDate(iso) {
    if (!iso) return "\u2014";
    var date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return date.getFullYear() + "-" +
      String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0");
  }

  function statusPill(user) {
    var pill = document.createElement("span");
    pill.className = "pill pill--" + (user.status === "verified" ? "verified" : "suspended");
    pill.textContent = user.status === "verified" ? "Verified" : "Suspended";
    return pill;
  }

  function actionButton(label, modifier, handler) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adminbtn" + (modifier ? " " + modifier : "");
    btn.textContent = label;
    btn.addEventListener("click", handler);
    return btn;
  }

  function rowFor(user) {
    var row = document.createElement("tr");
    row.className = "history__row";

    var id = document.createElement("td");
    id.className = "history__id";
    id.textContent = user.id;

    var name = document.createElement("td");
    name.textContent = user.fullname;

    var employee = document.createElement("td");
    employee.textContent = user.employeeId || "\u2014";

    var station = document.createElement("td");
    station.textContent = user.station || "\u2014";

    var status = document.createElement("td");
    status.appendChild(statusPill(user));

    var created = document.createElement("td");
    created.textContent = fmtDate(user.createdAt);

    var actions = document.createElement("td");
    actions.className = "history__action";
    var wrap = document.createElement("div");
    wrap.className = "admin-actions";

    if (user.status !== "verified") {
      wrap.appendChild(actionButton("Approve", "adminbtn--go", function () {
        updateStatus(user, "verified");
      }));
    }
    if (user.status !== "suspended") {
      wrap.appendChild(actionButton("Suspend", "", function () {
        updateStatus(user, "suspended");
      }));
    }
    wrap.appendChild(actionButton("Captures", "", function () {
      openCaptures(user);
    }));
    actions.appendChild(wrap);

    row.appendChild(id);
    row.appendChild(name);
    row.appendChild(employee);
    row.appendChild(station);
    row.appendChild(status);
    row.appendChild(created);
    row.appendChild(actions);
    return row;
  }

  function render() {
    var query = searchInput.value.trim().toLowerCase();
    body.innerHTML = "";
    var shown = 0;
    USERS.forEach(function (user) {
      var haystack = (user.fullname + " " + user.email + " " +
        user.employeeId + " " + user.station).toLowerCase();
      if (query && haystack.indexOf(query) === -1) return;
      body.appendChild(rowFor(user));
      shown += 1;
    });
    emptyEl.hidden = shown > 0;
    countEl.textContent = USERS.length + " registered";
  }

  function requestJson(url, options) {
    return window.fetch(url, options).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (data) {
        return { ok: response.ok, status: response.status, data: data };
      });
    });
  }

  function handleAuthError(result) {
    if (result.status !== 401) return false;
    toast("Session expired \u2014 sign in again.");
    window.setTimeout(function () {
      window.location.href = "index.html";
    }, 1200);
    return true;
  }

  function loadUsers() {
    if (loadingEl) loadingEl.hidden = false;
    emptyEl.hidden = true;
    requestJson("/api/users").then(function (result) {
      if (loadingEl) loadingEl.hidden = true;
      if (!result.ok) {
        if (handleAuthError(result)) return;
        toast(result.data.error || "Could not load users.");
        return;
      }
      USERS = result.data.users || [];
      render();
    }).catch(function () {
      if (loadingEl) loadingEl.hidden = true;
      toast("Could not reach the server. Start it with: node server.js");
    });
  }

  function updateStatus(user, status) {
    requestJson("/api/users/" + encodeURIComponent(user.id) + "/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status })
    }).then(function (result) {
      if (!result.ok) {
        if (handleAuthError(result)) return;
        toast(result.data.error || "Update failed.");
        return;
      }
      toast(user.fullname + (status === "verified" ? " approved." : " suspended."));
      loadUsers();
    }).catch(function () {
      toast("Could not reach the server.");
    });
  }

  function fmtStamp(iso) {
    if (!iso) return "\u2014";
    var date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0") + " " +
      String(date.getHours()).padStart(2, "0") + ":" +
      String(date.getMinutes()).padStart(2, "0");
  }

  function openReportPreview(report) {
    if (typeof window.RESQTRACK_LIGHTBOX !== "function") {
      toast("Image preview is unavailable right now.");
      return;
    }
    window.RESQTRACK_LIGHTBOX(
      report.imageUrl,
      report.type + " \u2014 " + report.id + " \u00B7 " + report.reporterName +
        (report.note ? " \u00B7 " + report.note : "")
    );
  }

  function reportRow(report) {
    var row = document.createElement("li");
    row.className = "rpt";

    var thumb = document.createElement("img");
    thumb.className = "rpt__thumb";
    thumb.src = report.imageUrl;
    thumb.alt = report.type + " photo " + report.id;
    thumb.draggable = false;

    var body = document.createElement("div");
    body.className = "rpt__body";

    var title = document.createElement("p");
    title.className = "rpt__title";
    title.textContent = report.type;

    var meta = document.createElement("p");
    meta.className = "rpt__meta";
    meta.textContent = report.id + " \u00B7 " + report.reporterName +
      " \u00B7 " + report.reporterEmployeeId + " \u00B7 " + fmtStamp(report.createdAt);

    body.appendChild(title);
    body.appendChild(meta);

    if (report.note) {
      var note = document.createElement("p");
      note.className = "rpt__note";
      note.textContent = report.note;
      body.appendChild(note);
    }

    var view = actionButton("View", "", function () {
      openReportPreview(report);
    });

    row.appendChild(thumb);
    row.appendChild(body);
    row.appendChild(view);
    return row;
  }

  function renderReports() {
    reportsList.innerHTML = "";
    REPORTS.forEach(function (report) {
      reportsList.appendChild(reportRow(report));
    });
    reportsEmpty.hidden = REPORTS.length > 0;
    reportsCount.textContent = REPORTS.length + " received";
  }

  function loadReports() {
    reportsLoading.hidden = false;
    reportsEmpty.hidden = true;
    requestJson("/api/reports").then(function (result) {
      reportsLoading.hidden = true;
      if (!result.ok) {
        if (handleAuthError(result)) return;
        toast(result.data.error || "Could not load reports.");
        return;
      }
      REPORTS = result.data.reports || [];
      renderReports();
    }).catch(function () {
      reportsLoading.hidden = true;
      toast("Could not reach the server. Start it with: node server.js");
    });
  }

  function openCaptures(user) {
    modalCaption.textContent = user.fullname + " \u00B7 " + user.employeeId + " \u00B7 " + user.station;
    Object.keys(shots).forEach(function (kind) {
      var img = shots[kind];
      img.hidden = false;
      img.src = "/api/users/" + encodeURIComponent(user.id) + "/captures/" + kind;
    });
    modal.hidden = false;
    modalClose.focus();
  }

  function closeCaptures() {
    modal.hidden = true;
    Object.keys(shots).forEach(function (kind) {
      shots[kind].removeAttribute("src");
    });
  }

  Object.keys(shots).forEach(function (kind) {
    shots[kind].addEventListener("error", function () {
      shots[kind].hidden = true;
    });
  });

  modalClose.addEventListener("click", closeCaptures);

  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeCaptures();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) closeCaptures();
  });

  refreshBtn.addEventListener("click", function () {
    loadUsers();
  });

  reportsRefresh.addEventListener("click", function () {
    loadReports();
  });

  searchInput.addEventListener("input", render);

  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    render();
  });

  document.querySelectorAll("[data-stub]").forEach(function (button) {
    button.addEventListener("click", function () {
      toast(button.dataset.stub + " is not wired up in this prototype.");
    });
  });

  document.getElementById("btn-settings").addEventListener("click", function () {
    window.location.href = "settings.html";
  });

  document.getElementById("btn-help").addEventListener("click", function () {
    toast("Help center is not wired up in this prototype.");
  });

  loadUsers();
  loadReports();
})();
