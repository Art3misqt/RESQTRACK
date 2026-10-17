(function () {
  "use strict";

  var slider = document.getElementById("threshold");
  if (!slider) return;

  var thresholdNum = document.getElementById("threshold-num");
  var telemetry = document.getElementById("telemetry");
  var saveBtn = document.getElementById("save-btn");
  var saveLabel = document.getElementById("save-label");
  var switches = Array.prototype.slice.call(document.querySelectorAll(".switch"));
  var toastEl = document.getElementById("toast");

  var KEYS = {
    threshold: "resqtrack.settings.threshold",
    telemetry: "resqtrack.settings.telemetry",
    channels: "resqtrack.settings.channels"
  };
  var TELEMETRY_VALUES = ["1", "5", "15", "30"];
  var CHANNEL_DEFAULTS = { terminal: true, push: true, sms: false, digest: false };

  var toastTimer = null;
  var saveTimer = null;

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("is-on");
    }, 2800);
  }

  function restore(key, fallback) {
    try {
      var value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function persist(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {}
  }

  /* ---------- state ---------- */

  function channels() {
    var map = {};
    switches.forEach(function (toggle) {
      map[toggle.dataset.channel] = toggle.classList.contains("is-on");
    });
    return map;
  }

  function persistAll() {
    persist(KEYS.threshold, slider.value);
    persist(KEYS.telemetry, telemetry.value);
    persist(KEYS.channels, JSON.stringify(channels()));
  }

  /* ---------- controls ---------- */

  slider.addEventListener("input", function () {
    thresholdNum.textContent = slider.value;
    persist(KEYS.threshold, slider.value);
  });

  telemetry.addEventListener("change", function () {
    persist(KEYS.telemetry, telemetry.value);
  });

  switches.forEach(function (toggle) {
    toggle.addEventListener("click", function () {
      var on = !toggle.classList.contains("is-on");
      toggle.classList.toggle("is-on", on);
      toggle.setAttribute("aria-checked", on ? "true" : "false");
      persist(KEYS.channels, JSON.stringify(channels()));
    });
  });

  saveBtn.addEventListener("click", function () {
    persistAll();
    window.clearTimeout(saveTimer);
    saveBtn.classList.add("is-saved");
    saveLabel.textContent = "Configuration Saved";
    toast("SYS_CONFIG_v2.4.1 committed to secure storage.");
    saveTimer = window.setTimeout(function () {
      saveBtn.classList.remove("is-saved");
      saveLabel.textContent = "Save Configuration";
    }, 2200);
  });

  /* ---------- shell ---------- */

  document.getElementById("btn-credentials").addEventListener("click", function () {
    toast("Credential re-verification is not wired up in this prototype.");
  });

  document.getElementById("search-form").addEventListener("submit", function (event) {
    event.preventDefault();
    toast("Settings search is not wired up in this prototype.");
  });

  document.getElementById("btn-settings").addEventListener("click", function () {
    toast("You are already on Platform Settings.");
  });

  document.getElementById("btn-help").addEventListener("click", function () {
    toast("Help center is not wired up in this prototype.");
  });

  /* ---------- init ---------- */

  var savedThreshold = parseInt(restore(KEYS.threshold, "7"), 10);
  if (isNaN(savedThreshold) || savedThreshold < 1 || savedThreshold > 10) savedThreshold = 7;
  slider.value = String(savedThreshold);
  thresholdNum.textContent = String(savedThreshold);

  var savedTelemetry = restore(KEYS.telemetry, "1");
  if (TELEMETRY_VALUES.indexOf(savedTelemetry) < 0) savedTelemetry = "1";
  telemetry.value = savedTelemetry;

  var savedChannels = CHANNEL_DEFAULTS;
  try {
    var parsed = JSON.parse(restore(KEYS.channels, ""));
    if (parsed && typeof parsed === "object") savedChannels = parsed;
  } catch (error) {}
  switches.forEach(function (toggle) {
    var channel = toggle.dataset.channel;
    var on = typeof savedChannels[channel] === "boolean"
      ? savedChannels[channel]
      : CHANNEL_DEFAULTS[channel];
    toggle.classList.toggle("is-on", on);
    toggle.setAttribute("aria-checked", on ? "true" : "false");
  });
})();
