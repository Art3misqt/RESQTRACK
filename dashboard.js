(function () {
  "use strict";

  var AREA_BOUNDS = [[8.32, 123.15], [8.60, 123.40]];
  var HOME_CENTER = [8.5134, 123.2847];
  var HOME_ZOOM = 12;
  var MIN_ZOOM = 11;
  var MAX_ZOOM = 18;
  var BOUNDS_PADDING = [18, 18];

  var mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  var coords = document.getElementById("coords");
  var toastEl = document.getElementById("toast");
  var searchForm = document.getElementById("search-form");
  var searchInput = document.getElementById("search");
  var locateBtn = document.getElementById("map-locate");
  var toastTimer = null;

  var homeBounds = L.latLngBounds(AREA_BOUNDS[0], AREA_BOUNDS[1]);

  var map = L.map(mapEl, {
    zoomControl: false,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    maxBoundsViscosity: 1.0,
    attributionControl: true
  }).setView(HOME_CENTER, HOME_ZOOM);

  map.attributionControl.setPosition("bottomleft");
  map.setMaxBounds(homeBounds.pad(0.05));

  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: MAX_ZOOM,
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
    }
  ).addTo(map);

  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: MAX_ZOOM,
      attribution: "Labels &copy; Esri"
    }
  ).addTo(map);

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("is-on");
    }, 2800);
  }

  function resetView() {
    map.fitBounds(homeBounds, { padding: BOUNDS_PADDING });
  }

  /* ---------- incident pins ---------- */

  function pinIcon(status) {
    return L.divIcon({
      className: "incident-pin incident-pin--" + status,
      html: '<span class="incident-pin__dot"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-pin"/></svg></span>',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -28]
    });
  }

  function addIncidentPin(inc) {
    if (typeof inc.lat !== "number" || typeof inc.lng !== "number") return;
    var marker = L.marker([inc.lat, inc.lng], {
      icon: pinIcon(inc.status),
      title: inc.type + " \u2014 " + inc.id
    }).addTo(map);

    marker.bindPopup(
      '<div class="incpop">' +
        '<p class="incpop__id">' + inc.id + "</p>" +
        '<p class="incpop__title">' + inc.type + "</p>" +
        '<p class="incpop__meta">' + inc.statusLabel + " \u00B7 " + inc.place + "</p>" +
        '<a class="incpop__link" href="incidents.html?incident=' +
          encodeURIComponent(inc.id) + '">View captured image</a>' +
      "</div>"
    );
  }

  var INCIDENTS = window.RESQTRACK_INCIDENTS || [];
  INCIDENTS.forEach(addIncidentPin);

  resetView();

  /* ---------- GPS location ---------- */

  var LOC_ICON = L.divIcon({
    className: "locdot",
    html: "<span></span>",
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  var locMarker = null;
  var locCircle = null;
  var watchId = null;
  var centeredOnce = false;

  function setLocating(on) {
    locateBtn.classList.toggle("is-active", on);
    locateBtn.setAttribute("aria-pressed", on ? "true" : "false");
    locateBtn.setAttribute("aria-label", on ? "Stop live location" : "Show my location");
  }

  function stopLocate() {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
    watchId = null;
    setLocating(false);
  }

  function applyPosition(position) {
    var latlng = [position.coords.latitude, position.coords.longitude];
    var accuracy = Math.max(position.coords.accuracy || 0, 15);

    if (!locMarker) {
      locMarker = L.marker(latlng, {
        icon: LOC_ICON,
        interactive: false,
        keyboard: false
      }).addTo(map);

      locCircle = L.circle(latlng, {
        radius: accuracy,
        color: "#3f8fd0",
        weight: 1.2,
        opacity: 0.7,
        fillColor: "#3f8fd0",
        fillOpacity: 0.12,
        interactive: false
      }).addTo(map);
    } else {
      locMarker.setLatLng(latlng);
      locCircle.setLatLng(latlng);
      locCircle.setRadius(accuracy);
    }

    if (!centeredOnce) {
      centeredOnce = true;
      map.setView(latlng, Math.max(map.getZoom(), 15));
      if (!homeBounds.contains(L.latLng(latlng[0], latlng[1]))) {
        toast("Your location is outside the Katipunan operational area.");
      } else {
        toast("Live location tracking active.");
      }
    }
  }

  function locateError(error) {
    stopLocate();
    if (error && error.code === 1) {
      toast("Location permission denied \u2014 enable GPS access in your browser.");
    } else if (error && error.code === 3) {
      toast("Location request timed out. Try again.");
    } else {
      toast("Location unavailable on this device.");
    }
  }

  locateBtn.addEventListener("click", function () {
    if (watchId !== null) {
      stopLocate();
      toast("Live location tracking stopped.");
      return;
    }
    if (!navigator.geolocation) {
      toast("Geolocation is not supported by this browser.");
      return;
    }
    centeredOnce = false;
    setLocating(true);
    toast("Acquiring GPS location\u2026");
    watchId = navigator.geolocation.watchPosition(
      applyPosition,
      locateError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  });

  /* ---------- controls ---------- */

  document.getElementById("map-in").addEventListener("click", function () {
    if (map.getZoom() >= MAX_ZOOM) {
      toast("Maximum zoom level reached.");
      return;
    }
    map.zoomIn();
  });

  document.getElementById("map-out").addEventListener("click", function () {
    if (map.getZoom() <= MIN_ZOOM) {
      toast("Minimum zoom level reached.");
      return;
    }
    map.zoomOut();
  });

  document.getElementById("map-recenter").addEventListener("click", function () {
    resetView();
    coords.classList.remove("is-ping");
    void coords.offsetWidth;
    coords.classList.add("is-ping");
    toast("Map recentered on Municipality of Katipunan.");
  });

  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var query = searchInput.value.trim();
    toast(
      query
        ? "No live index for \u201C" + query + "\u201D in this prototype."
        : "Enter coordinates, an incident ID, or a responder."
    );
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

  /* ---------- road accident report camera ---------- */

  var reportBtn = document.getElementById("btn-report");
  var camModal = document.getElementById("report-cam");
  var camVideo = document.getElementById("report-video");
  var camShot = document.getElementById("report-shot");
  var camHint = document.getElementById("report-hint");
  var camError = document.getElementById("report-error");
  var camNote = document.getElementById("report-note");
  var camStart = document.getElementById("report-start");
  var camCapture = document.getElementById("report-capture");
  var camSend = document.getElementById("report-send");
  var camClose = document.getElementById("report-close");

  var camStream = null;
  var camShotData = null;

  function camSetError(message) {
    camError.textContent = message || "";
    camError.hidden = !message;
  }

  function stopStream() {
    if (camStream) {
      camStream.getTracks().forEach(function (track) {
        track.stop();
      });
      camStream = null;
    }
  }

  function resetCameraUi() {
    camShotData = null;
    camShot.hidden = true;
    camShot.removeAttribute("src");
    camVideo.hidden = false;
    camNote.value = "";
    camSetError("");
    camHint.textContent = "Start the camera, then capture the accident scene.";
    camHint.hidden = false;
    camStart.hidden = false;
    camStart.disabled = false;
    camCapture.hidden = false;
    camCapture.disabled = true;
    camSend.disabled = true;
    camSend.textContent = "Send report";
  }

  function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("Camera is not supported on this device.");
      return;
    }
    resetCameraUi();
    camModal.hidden = false;
    camClose.focus();
  }

  function closeCamera() {
    stopStream();
    camModal.hidden = true;
  }

  function startCamera() {
    camSetError("");
    camHint.hidden = false;
    camHint.textContent = "Requesting camera\u2026";
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: 640, height: 480 },
      audio: false
    }).then(function (stream) {
      camStream = stream;
      camVideo.srcObject = stream;
      var playing = camVideo.play();
      if (playing && playing.catch) playing.catch(function () {});
      camHint.textContent = "Point at the accident scene and press Capture.";
      camStart.hidden = true;
      camStart.disabled = true;
      camCapture.disabled = false;
    }).catch(function () {
      camHint.hidden = true;
      camSetError("Camera access was denied or unavailable. Enable camera access in your browser, then press Start camera.");
    });
  }

  function capturePhoto() {
    var width = camVideo.videoWidth || 640;
    var height = camVideo.videoHeight || 480;
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(camVideo, 0, 0, width, height);
    camShotData = canvas.toDataURL("image/png");
    camShot.src = camShotData;
    camShot.hidden = false;
    camVideo.hidden = true;
    camHint.textContent = "Review the capture, add a note, then send the report.";
    camCapture.disabled = true;
    camSend.disabled = false;
  }

  function sendReport() {
    if (!camShotData) return;
    camSend.disabled = true;
    camSend.textContent = "Sending\u2026";

    window.fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "Road Accident",
        note: camNote.value.trim(),
        image: camShotData
      })
    }).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (data) {
        return { ok: response.ok, status: response.status, data: data };
      });
    }).then(function (result) {
      camSend.textContent = "Send report";
      if (!result.ok) {
        if (result.status === 401) {
          toast("Session expired \u2014 sign in again.");
          window.setTimeout(function () {
            window.location.href = "index.html";
          }, 1200);
          return;
        }
        camSend.disabled = false;
        camSetError(result.data.error || "Could not send the report.");
        return;
      }
      closeCamera();
      toast("Road accident report sent \u2014 check notifications.");
      document.dispatchEvent(new CustomEvent("resqtrack:report"));
    }).catch(function () {
      camSend.textContent = "Send report";
      camSend.disabled = false;
      camSetError("Could not reach the server. Is it running?");
    });
  }

  if (reportBtn) {
    reportBtn.addEventListener("click", openCamera);
    camClose.addEventListener("click", closeCamera);
    camStart.addEventListener("click", startCamera);
    camCapture.addEventListener("click", capturePhoto);
    camSend.addEventListener("click", sendReport);

    camModal.addEventListener("click", function (event) {
      if (event.target === camModal) closeCamera();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !camModal.hidden) closeCamera();
    });

    window.addEventListener("pagehide", stopStream);
  }
})();
