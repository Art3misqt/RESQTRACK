(function () {
  "use strict";

  var listEl = document.getElementById("myreports-list");
  if (!listEl) return;

  var countEl = document.getElementById("myreports-count");
  var loadingEl = document.getElementById("myreports-loading");
  var emptyEl = document.getElementById("myreports-empty");
  var refreshBtn = document.getElementById("myreports-refresh");
  var toastEl = document.getElementById("toast");

  var REPORTS = [];
  var USER = null;
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

  function formatTime(iso) {
    if (!iso) return "";
    var date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0") + " " +
      String(date.getHours()).padStart(2, "0") + ":" +
      String(date.getMinutes()).padStart(2, "0");
  }

  function requestJson(url) {
    return window.fetch(url).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (data) {
        return { ok: response.ok, status: response.status, data: data };
      });
    });
  }

  function openPreview(report) {
    if (typeof window.RESQTRACK_LIGHTBOX !== "function") {
      toast("Image preview is unavailable right now.");
      return;
    }
    window.RESQTRACK_LIGHTBOX(
      report.imageUrl,
      report.type + " \u2014 " + report.id +
        (report.note ? " \u00B7 " + report.note : "")
    );
  }

  function rowFor(report) {
    var row = document.createElement("li");
    row.className = "myrep";
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", "Preview my report " + report.id);

    var thumb = document.createElement("img");
    thumb.className = "myrep__thumb";
    thumb.src = report.imageUrl;
    thumb.alt = report.type + " photo " + report.id;
    thumb.draggable = false;

    var body = document.createElement("div");
    body.className = "myrep__body";

    var title = document.createElement("p");
    title.className = "myrep__title";
    title.textContent = report.type;

    var meta = document.createElement("p");
    meta.className = "myrep__meta";
    meta.textContent = report.id + " \u00B7 " + formatTime(report.createdAt);

    body.appendChild(title);
    body.appendChild(meta);

    if (report.note) {
      var note = document.createElement("p");
      note.className = "myrep__note";
      note.textContent = report.note;
      body.appendChild(note);
    }

    var view = document.createElement("button");
    view.type = "button";
    view.className = "myrep__view";
    view.textContent = "View";

    function open(event) {
      event.stopPropagation();
      openPreview(report);
    }

    view.addEventListener("click", open);
    row.addEventListener("click", function () {
      openPreview(report);
    });
    row.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPreview(report);
      }
    });

    row.appendChild(thumb);
    row.appendChild(body);
    row.appendChild(view);
    return row;
  }

  function render() {
    var mine = REPORTS.filter(function (report) {
      return USER && report.reporterEmployeeId === USER.employeeId;
    });

    listEl.innerHTML = "";
    mine.forEach(function (report) {
      listEl.appendChild(rowFor(report));
    });

    listEl.hidden = mine.length === 0;
    emptyEl.hidden = mine.length > 0;
    countEl.textContent = mine.length + " sent";
  }

  function load() {
    loadingEl.hidden = false;
    emptyEl.hidden = true;

    requestJson("/api/session").then(function (sessionResult) {
      if (!sessionResult.ok) {
        loadingEl.hidden = true;
        if (sessionResult.status === 401) return;
        toast(sessionResult.data.error || "Could not load your profile.");
        return;
      }
      USER = sessionResult.data.user || null;

      return requestJson("/api/reports").then(function (reportsResult) {
        loadingEl.hidden = true;
        if (!reportsResult.ok) {
          if (reportsResult.status === 401) return;
          toast(reportsResult.data.error || "Could not load your reports.");
          return;
        }
        REPORTS = reportsResult.data.reports || [];
        render();
      });
    }).catch(function () {
      loadingEl.hidden = true;
      toast("Could not reach the server. Start it with: node server.js");
    });
  }

  refreshBtn.addEventListener("click", function () {
    load();
    toast("Refreshing your reports\u2026");
  });

  document.addEventListener("resqtrack:report", load);

  load();
})();
