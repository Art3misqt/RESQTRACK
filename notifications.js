(function () {
  "use strict";

  var bell = document.getElementById("btn-alerts");
  if (!bell) return;

  var INCIDENTS = window.RESQTRACK_INCIDENTS || [];
  var REPORTS = [];
  var STORAGE_KEY = "resqtrack.alerts.read";
  var onIncidentsPage = /incidents\.html$/i.test(window.location.pathname);

  function readIds() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Object.prototype.toString.call(parsed) === "[object Array]" ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function markRead(id) {
    var ids = readIds();
    if (ids.indexOf(id) === -1) {
      ids.push(id);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      } catch (error) {}
    }
  }

  function isUnread(inc) {
    return inc.status === "active" && readIds().indexOf(inc.id) === -1;
  }

  function isReportUnread(report) {
    return readIds().indexOf(report.id) === -1;
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

  function fetchReports() {
    return window.fetch("/api/reports")
      .then(function (response) {
        if (!response.ok) return null;
        return response.json();
      })
      .then(function (data) {
        if (data && data.reports) {
          REPORTS = data.reports;
          render();
        }
      })
      .catch(function () {
        /* no server (e.g. opening files directly) \u2014 keep incidents only */
      });
  }

  /* ---------- inject shell markup ---------- */

  var wrap = document.createElement("div");
  wrap.className = "alerts";
  wrap.id = "alerts";
  bell.parentNode.insertBefore(wrap, bell);
  wrap.appendChild(bell);

  var dot = bell.querySelector(".iconbtn__dot");
  if (dot) dot.setAttribute("aria-hidden", "true");

  bell.setAttribute("aria-haspopup", "true");
  bell.setAttribute("aria-expanded", "false");
  bell.setAttribute("aria-controls", "alerts-panel");

  var panel = document.createElement("section");
  panel.className = "alerts__panel";
  panel.id = "alerts-panel";
  panel.setAttribute("aria-label", "Notifications");
  panel.hidden = true;
  panel.innerHTML =
    '<header class="alerts__head">' +
      '<h2 class="alerts__title">Alerts</h2>' +
      '<span class="alerts__count" id="alerts-count"></span>' +
    "</header>" +
    '<ul class="alerts__list" id="alerts-list"></ul>';
  wrap.appendChild(panel);

  var lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.id = "lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Captured image preview");
  lightbox.hidden = true;
  lightbox.innerHTML =
    '<button class="lightbox__close" type="button" id="lightbox-close" aria-label="Close image preview">' +
      '<svg aria-hidden="true"><use href="#i-plus"/></svg>' +
    "</button>" +
    '<figure class="lightbox__figure">' +
      '<img class="lightbox__img" id="lightbox-img" alt="">' +
      '<figcaption class="lightbox__caption" id="lightbox-caption"></figcaption>' +
    "</figure>";
  document.body.appendChild(lightbox);

  var list = panel.querySelector("#alerts-list");
  var countEl = panel.querySelector("#alerts-count");
  var lightboxImg = lightbox.querySelector("#lightbox-img");
  var lightboxCaption = lightbox.querySelector("#lightbox-caption");
  var lightboxClose = lightbox.querySelector("#lightbox-close");

  /* ---------- badge + panel ---------- */

  function unreadCount() {
    var count = 0;
    INCIDENTS.forEach(function (inc) {
      if (isUnread(inc)) count += 1;
    });
    REPORTS.forEach(function (report) {
      if (isReportUnread(report)) count += 1;
    });
    return count;
  }

  function updateBadge() {
    var count = unreadCount();
    if (dot) dot.classList.toggle("is-off", count === 0);
    countEl.textContent = count ? count + " new" : "All read";
    countEl.classList.toggle("is-off", count === 0);
    bell.setAttribute(
      "aria-label",
      count ? "Alerts, " + count + " unread" : "Alerts, all read"
    );
  }

  function openPanel() {
    panel.hidden = false;
    bell.setAttribute("aria-expanded", "true");
    fetchReports();
  }

  function closePanel() {
    panel.hidden = true;
    bell.setAttribute("aria-expanded", "false");
  }

  /* ---------- lightbox ---------- */

  function openLightbox(src, caption) {
    lightboxImg.src = src;
    lightboxImg.alt = caption;
    lightboxCaption.textContent = caption;
    lightbox.hidden = false;
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.removeAttribute("src");
    lightboxImg.alt = "";
    bell.focus();
  }

  window.RESQTRACK_LIGHTBOX = openLightbox;

  /* ---------- rows ---------- */

  function openIncident(inc) {
    markRead(inc.id);
    render();
    closePanel();
    if (onIncidentsPage && typeof window.RESQTRACK_SHOW_INCIDENT === "function") {
      window.RESQTRACK_SHOW_INCIDENT(inc.id);
    } else {
      window.location.href = "incidents.html?incident=" + encodeURIComponent(inc.id);
    }
  }

  function openReport(report) {
    markRead(report.id);
    render();
    closePanel();
    openLightbox(
      report.imageUrl,
      report.type + " \u2014 " + report.id +
        (report.note ? " \u00B7 " + report.note : "") +
        " \u00B7 " + report.reporterName
    );
  }

  function buildReportRow(report) {
    var unread = isReportUnread(report);

    var row = document.createElement("li");
    row.className = "alert alert--report" + (unread ? " is-unread" : "");
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", "Open road accident report image " + report.id);
    row.title = report.type + " \u00B7 " + formatTime(report.createdAt);

    var thumb = document.createElement("img");
    thumb.className = "alert__thumb";
    thumb.src = report.imageUrl;
    thumb.alt = report.type + " photo " + report.id;
    thumb.title = "Preview report image";
    thumb.draggable = false;

    var body = document.createElement("div");
    body.className = "alert__body";

    var title = document.createElement("p");
    title.className = "alert__title";
    title.textContent = report.type;

    var meta = document.createElement("p");
    meta.className = "alert__meta";
    meta.textContent = "REPORT \u00B7 " + report.id + " \u00B7 " +
      report.reporterName + " \u00B7 " + formatTime(report.createdAt);

    body.appendChild(title);
    body.appendChild(meta);

    var unreadDot = document.createElement("span");
    unreadDot.className = "alert__dot";
    unreadDot.setAttribute("aria-hidden", "true");

    row.appendChild(thumb);
    row.appendChild(body);
    row.appendChild(unreadDot);

    thumb.addEventListener("click", function (event) {
      event.stopPropagation();
      openReport(report);
    });

    row.addEventListener("click", function () {
      openReport(report);
    });

    row.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openReport(report);
      }
    });

    return row;
  }

  function buildRow(inc) {
    var unread = isUnread(inc);

    var row = document.createElement("li");
    row.className = "alert" + (unread ? " is-unread" : "");
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute(
      "aria-label",
      "Open captured image for " + inc.type + " " + inc.id + " on the incidents page"
    );
    row.title = inc.statusLabel + " \u00B7 " + inc.time;

    var thumb = document.createElement("img");
    thumb.className = "alert__thumb";
    thumb.src = inc.image;
    thumb.alt = inc.caption || inc.type + " captured image";
    thumb.title = "Preview captured image";
    thumb.draggable = false;

    var body = document.createElement("div");
    body.className = "alert__body";

    var title = document.createElement("p");
    title.className = "alert__title";
    title.textContent = inc.type;

    var meta = document.createElement("p");
    meta.className = "alert__meta";
    meta.textContent = inc.id + " \u00B7 " + inc.statusLabel + " \u00B7 " + inc.place;

    body.appendChild(title);
    body.appendChild(meta);

    var unreadDot = document.createElement("span");
    unreadDot.className = "alert__dot";
    unreadDot.setAttribute("aria-hidden", "true");

    row.appendChild(thumb);
    row.appendChild(body);
    row.appendChild(unreadDot);

    thumb.addEventListener("click", function (event) {
      event.stopPropagation();
      markRead(inc.id);
      render();
      openLightbox(inc.image, inc.id + " \u2014 " + (inc.caption || inc.type));
    });

    row.addEventListener("click", function () {
      openIncident(inc);
    });

    row.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openIncident(inc);
      }
    });

    return row;
  }

  function render() {
    list.innerHTML = "";
    REPORTS.forEach(function (report) {
      list.appendChild(buildReportRow(report));
    });
    INCIDENTS.forEach(function (inc) {
      list.appendChild(buildRow(inc));
    });
    updateBadge();
  }

  render();
  fetchReports();

  /* ---------- wiring ---------- */

  bell.addEventListener("click", function (event) {
    event.stopPropagation();
    if (panel.hidden) {
      openPanel();
    } else {
      closePanel();
    }
  });

  document.addEventListener("click", function (event) {
    if (!panel.hidden && !wrap.contains(event.target)) {
      closePanel();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (!lightbox.hidden) {
      closeLightbox();
      return;
    }
    if (!panel.hidden) closePanel();
  });

  lightboxClose.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("resqtrack:report", fetchReports);
})();
