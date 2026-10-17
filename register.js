(function () {
  "use strict";

  var form = document.getElementById("register-form");
  if (!form) return;

  var fullname = document.getElementById("fullname");
  var email = document.getElementById("email");
  var sex = document.getElementById("sex");
  var age = document.getElementById("age");
  var sexField = document.getElementById("sex-field");
  var ageField = document.getElementById("age-field");
  var idType = document.getElementById("id-type");
  var unit = document.getElementById("unit");
  var employeeId = document.getElementById("employee-id");
  var employeeField = document.getElementById("employee-field");
  var station = document.getElementById("station");
  var stationField = document.getElementById("station-field");
  var password = document.getElementById("password");
  var confirm = document.getElementById("confirm");
  var strength = document.getElementById("strength");
  var toggle = document.getElementById("pw-toggle");

  var dropzone = document.getElementById("dropzone");
  var fileInput = document.getElementById("file-input");
  var fileName = document.getElementById("file-name");

  var faceFrame = document.getElementById("face-frame");
  var faceVideo = document.getElementById("face-video");
  var faceShot = document.getElementById("face-shot");
  var faceCanvas = document.getElementById("face-canvas");
  var faceBadge = document.getElementById("face-badge");
  var faceStart = document.getElementById("face-start");
  var faceCapture = document.getElementById("face-capture");
  var faceRetake = document.getElementById("face-retake");
  var faceError = document.getElementById("face-error");

  var idcamEl = document.getElementById("idcam");
  var idcamError = document.getElementById("idcam-error");
  var idFrontCaption = document.getElementById("idcam-front-caption");
  var idFrontFrame = document.getElementById("idcam-front-frame");
  var idFrontVideo = document.getElementById("idcam-front-video");
  var idFrontShot = document.getElementById("idcam-front-shot");
  var idFrontCanvas = document.getElementById("idcam-front-canvas");
  var idFrontBadge = document.getElementById("idcam-front-badge");
  var idFrontStart = document.getElementById("idcam-front-start");
  var idFrontCapture = document.getElementById("idcam-front-capture");
  var idFrontRetake = document.getElementById("idcam-front-retake");
  var idBackSlot = document.getElementById("idcam-back-slot");
  var idBackFrame = document.getElementById("idcam-back-frame");
  var idBackVideo = document.getElementById("idcam-back-video");
  var idBackShot = document.getElementById("idcam-back-shot");
  var idBackCanvas = document.getElementById("idcam-back-canvas");
  var idBackBadge = document.getElementById("idcam-back-badge");
  var idBackStart = document.getElementById("idcam-back-start");
  var idBackCapture = document.getElementById("idcam-back-capture");
  var idBackRetake = document.getElementById("idcam-back-retake");
  var idRefFront = document.getElementById("id-ref-front");
  var idRefBack = document.getElementById("id-ref-back");
  var idRefBackThumb = document.getElementById("id-ref-back-thumb");
  var idRefHint = document.getElementById("id-ref-hint");

  var consent1 = document.getElementById("consent-1");
  var consent2 = document.getElementById("consent-2");
  var submit = document.getElementById("submit");
  var submitLabel = submit.querySelector(".btn__label");
  var submitArrow = submit.querySelector(".btn__arrow");
  var status = document.getElementById("status");

  var stepItems = Array.prototype.slice.call(form.querySelectorAll("[data-step-item]"));
  var stepPanels = Array.prototype.slice.call(form.querySelectorAll(".step[data-step]"));
  var nextButtons = Array.prototype.slice.call(form.querySelectorAll("[data-next]"));
  var backButtons = Array.prototype.slice.call(form.querySelectorAll("[data-back]"));

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var EMPLOYEE_RE = /^[A-Za-z0-9][A-Za-z0-9-]{3,31}$/;
  var MIN_PASSWORD = 12;
  var MIN_AGE = 18;
  var MAX_AGE = 100;
  var MAX_FILE_BYTES = 15 * 1024 * 1024;
  var FILE_EXT_RE = /\.(pdf|png|jpe?g|p12|crt)$/i;
  var SCAN_MS = 1900;

  var state = {
    busy: false,
    file: null,
    idFrontShot: null,
    idBackShot: null,
    faceShot: null,
    step: 1
  };

  function setError(input, message) {
    var field = input.closest ? input.closest(".field") : null;
    var box = document.getElementById(input.id + "-error");
    if (!box) return;
    box.textContent = message || "";
    box.hidden = !message;
    if (field) field.classList.toggle("is-invalid", !!message);
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  function setStatus(message, tone) {
    status.textContent = message || "";
    if (tone) status.setAttribute("data-tone", tone);
    else status.removeAttribute("data-tone");
  }

  /* ---------- password strength ---------- */

  function scorePassword(value) {
    if (!value) return 0;
    var score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (value.length >= 16) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return score;
  }

  function renderStrength() {
    var value = password.value;
    var meter = strength;
    if (!value) {
      meter.textContent = "";
      meter.setAttribute("data-tone", "idle");
      return;
    }
    var score = scorePassword(value);
    var label;
    var tone;
    if (score >= 6) {
      label = "strong";
      tone = "ok";
    } else if (score >= 4) {
      label = "fair";
      tone = "warn";
    } else if (score >= 2) {
      label = "weak";
      tone = "bad";
    } else {
      label = "very weak";
      tone = "bad";
    }
    meter.textContent = value.length + " \u00b7 " + label.toUpperCase();
    meter.setAttribute("data-tone", tone);
  }

  /* ---------- validators ---------- */

  var checks = [
    [fullname, function () {
      return fullname.value.trim().length >= 2 ? "" : "Enter your full name as it appears on your ID.";
    }],
    [email, function () {
      var v = email.value.trim();
      if (!v) return "Enter your government email address.";
      return EMAIL_RE.test(v) ? "" : "Enter a valid government email address.";
    }],
    [sex, function () {
      if (sexField.hidden) return "";
      return sex.value ? "" : "Select your sex as shown on your valid ID.";
    }],
    [age, function () {
      if (ageField.hidden) return "";
      var v = parseInt(age.value, 10);
      if (age.value.trim() === "" || isNaN(v)) return "Enter your age.";
      if (v < MIN_AGE || v > MAX_AGE) return "Age must be between " + MIN_AGE + " and " + MAX_AGE + ".";
      return "";
    }],
    [idType, function () {
      return idType.value ? "" : "Select the type of ID you are uploading.";
    }],
    [employeeId, function () {
      if (employeeField.hidden) return "";
      var v = employeeId.value.trim();
      if (!v) return "Enter your employee ID.";
      return EMPLOYEE_RE.test(v) ? "" : "Use 4\u201332 letters, digits or hyphens.";
    }],
    [unit, function () {
      return unit.value ? "" : "Select your unit or account type.";
    }],
    [station, function () {
      if (stationField.hidden) return "";
      return station.value ? "" : "Select your station or sub-command jurisdiction.";
    }],
    [password, function () {
      var v = password.value;
      if (!v) return "Create a password.";
      return v.length >= MIN_PASSWORD ? "" : "Password must be at least " + MIN_PASSWORD + " characters.";
    }],
    [confirm, function () {
      var v = confirm.value;
      if (!v) return "Re-enter your password.";
      return v === password.value ? "" : "Passwords do not match.";
    }]
  ];

  function stepFields(step) {
    var isResponder = unit.value !== "security";
    if (step === 1) {
      return isResponder
        ? [fullname, email, sex, age, idType]
        : [fullname, email, idType];
    }
    if (step === 2) {
      return isResponder
        ? [unit, employeeId, station, password, confirm]
        : [unit, password, confirm];
    }
    return [];
  }

  function applyUnit() {
    var isResponder = unit.value !== "security";
    sexField.hidden = !isResponder;
    ageField.hidden = !isResponder;
    employeeField.hidden = !isResponder;
    stationField.hidden = !isResponder;
    [sex, age, employeeId, station].forEach(function (input) {
      if (input.closest(".field").hidden) setError(input, "");
    });
    setStatus("");
  }

  function validatorOf(input) {
    for (var i = 0; i < checks.length; i++) {
      if (checks[i][0] === input) return checks[i][1];
    }
    return function () { return ""; };
  }

  checks.forEach(function (pair) {
    var input = pair[0];
    var validate = pair[1];
    input.addEventListener("blur", function () {
      if (input.value !== "" || input === station) setError(input, validate());
    });
    input.addEventListener("input", function () {
      var field = input.closest ? input.closest(".field") : null;
      if (field && field.classList.contains("is-invalid")) setError(input, validate());
    });
    input.addEventListener("change", function () {
      var field = input.closest ? input.closest(".field") : null;
      if (input === station || (field && field.classList.contains("is-invalid"))) {
        setError(input, validate());
      }
    });
  });

  password.addEventListener("input", renderStrength);
  password.addEventListener("blur", renderStrength);
  password.addEventListener("change", renderStrength);
  renderStrength();

  /* ---------- password reveal ---------- */

  toggle.addEventListener("click", function () {
    var show = password.type === "password";
    password.type = show ? "text" : "password";
    toggle.setAttribute("aria-pressed", show ? "true" : "false");
    toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    toggle.querySelector(".field__toggle-on").hidden = show;
    toggle.querySelector(".field__toggle-off").hidden = !show;
    password.focus({ preventScroll: true });
  });

  /* ---------- wizard navigation ---------- */

  function setStep(step, focus) {
    state.step = step;
    stepPanels.forEach(function (panel) {
      panel.hidden = Number(panel.getAttribute("data-step")) !== step;
    });
    stepItems.forEach(function (item) {
      var index = Number(item.getAttribute("data-step-item"));
      item.classList.toggle("is-active", index === step);
      item.classList.toggle("is-done", index < step);
      if (index === step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    if (step !== 1) {
      idFrontCtl.park();
      idBackCtl.park();
    }
    if (step !== 3) faceCtl.park();
    if (focus) {
      var panel = stepPanels[step - 1];
      var target = panel.querySelector(".field__input, .ghostbtn:not([hidden]), .btn");
      if (target) target.focus();
    }
  }

  function validateStep(step) {
    var failures = [];
    stepFields(step).forEach(function (input) {
      var problem = validatorOf(input)();
      setError(input, problem);
      if (problem) failures.push(input);
    });
    if (step === 1) {
      var needsBack = idType.value !== "passport";
      var captureProblem = "";
      var captureTarget = null;
      if (!state.idFrontShot) {
        captureProblem = needsBack
          ? "Capture the front side of your valid ID before continuing."
          : "Capture the bio page of your passport before continuing.";
        captureTarget = idFrontFocusTarget();
      } else if (needsBack && !state.idBackShot) {
        captureProblem = "Capture the back side of your valid ID before continuing.";
        captureTarget = idBackFocusTarget();
      }
      if (captureProblem) {
        idcamError.textContent = captureProblem;
        idcamError.hidden = false;
        failures.push(captureTarget);
      } else {
        idcamError.textContent = "";
        idcamError.hidden = true;
      }
    }
    if (step === 2) {
      if (!state.file) {
        setError(fileInput, "Upload your official agency ID or certificate.");
        failures.push(dropzone);
      } else {
        setError(fileInput, "");
      }
    }
    return failures;
  }

  function validateConsents() {
    var failures = [];
    [
      [consent1, "You must certify your government affiliation."],
      [consent2, "You must acknowledge the jurisdiction terms."]
    ].forEach(function (pair) {
      var box = document.getElementById(pair[0].id + "-error");
      var problem = pair[0].checked ? "" : pair[1];
      consentError(box, pair[0], problem);
      if (problem) failures.push(pair[0]);
    });
    return failures;
  }

  nextButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var failures = validateStep(state.step);
      if (failures.length) {
        setStatus("Check the highlighted fields.", "bad");
        failures[0].focus();
        return;
      }
      setStatus("");
      setStep(state.step + 1, true);
    });
  });

  backButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setStep(state.step - 1, true);
    });
  });

  /* ---------- agency credentials dropzone ---------- */

  function acceptFile(file) {
    if (!FILE_EXT_RE.test(file.name)) {
      return "Unsupported file type. Upload PDF, PNG, JPG, .p12 or .crt.";
    }
    if (file.size > MAX_FILE_BYTES) {
      return "File is larger than the 15MB limit.";
    }
    return "";
  }

  function showFile(file) {
    state.file = file;
    fileName.textContent = file.name + "  \u00b7  " + Math.max(1, Math.round(file.size / 1024)) + " KB";
    fileName.hidden = false;
  }

  function clearFile() {
    state.file = null;
    fileName.hidden = true;
    fileName.textContent = "";
  }

  function takeFile(file) {
    if (!file) return;
    var problem = acceptFile(file);
    if (problem) {
      clearFile();
      fileInput.value = "";
      setError(fileInput, problem);
      return;
    }
    setError(fileInput, "");
    showFile(file);
  }

  dropzone.addEventListener("click", function () {
    fileInput.click();
  });

  dropzone.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", function () {
    takeFile(fileInput.files && fileInput.files[0]);
  });

  ["dragenter", "dragover"].forEach(function (name) {
    dropzone.addEventListener(name, function (event) {
      event.preventDefault();
      dropzone.classList.add("is-over");
    });
  });

  ["dragleave", "dragend"].forEach(function (name) {
    dropzone.addEventListener(name, function () {
      dropzone.classList.remove("is-over");
    });
  });

  dropzone.addEventListener("drop", function (event) {
    event.preventDefault();
    dropzone.classList.remove("is-over");
    var dt = event.dataTransfer;
    takeFile(dt && dt.files ? dt.files[0] : null);
  });

  /* ---------- camera capture (shared by valid ID and face) ---------- */

  function cameraAvailable() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  function createCapture(config) {
    var controller = { done: false };
    var stream = null;
    var timer = null;
    var stage = "idle";

    function setError(message) {
      config.errorEl.textContent = message || "";
      config.errorEl.hidden = !message;
    }

    function setStage(next) {
      stage = next;
      config.frame.setAttribute("data-state", next);
      config.startBtn.hidden = next !== "idle";
      config.captureBtn.hidden = next !== "live";
      config.retakeBtn.hidden = next !== "done";
      if (next === "done") {
        controller.done = true;
        config.badge.textContent = config.doneBadge;
        config.badge.hidden = false;
      } else if (next === "scanning") {
        config.badge.textContent = "Scanning biometrics\u2026";
        config.badge.hidden = false;
      } else if (next === "live") {
        config.badge.textContent = "Live feed";
        config.badge.hidden = false;
      } else {
        config.badge.hidden = true;
      }
    }

    function stopStream() {
      if (!stream) return;
      stream.getTracks().forEach(function (track) { track.stop(); });
      stream = null;
      config.video.srcObject = null;
      config.video.hidden = true;
    }

    function start() {
      setError("");
      if (config.onStart) config.onStart();
      if (!cameraAvailable()) {
        setError(config.startError);
        return;
      }
      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: config.facingMode || "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      }).then(function (nextStream) {
        stream = nextStream;
        config.video.srcObject = nextStream;
        config.video.hidden = false;
        var played = config.video.play();
        if (played && played.catch) played.catch(function () {});
        setStage("live");
      }).catch(function () {
        setError(config.deniedError);
      });
    }

    function capture() {
      if (!stream) return;
      var width = config.video.videoWidth || 640;
      var height = config.video.videoHeight || 480;
      config.canvas.width = width;
      config.canvas.height = height;
      config.canvas.getContext("2d").drawImage(config.video, 0, 0, width, height);
      var dataUrl = config.canvas.toDataURL("image/png");
      config.shot.src = dataUrl;
      config.shot.hidden = false;
      stopStream();
      setError("");
      if (config.onCaptured) config.onCaptured(dataUrl);
      if (config.scan) {
        setStage("scanning");
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          setStage("done");
        }, config.scanMs);
      } else {
        setStage("done");
      }
    }

    function reset() {
      stopStream();
      window.clearTimeout(timer);
      controller.done = false;
      config.shot.hidden = true;
      config.shot.removeAttribute("src");
      setError("");
      setStage("idle");
      if (config.onReset) config.onReset();
    }

    function park() {
      stopStream();
      if (stage === "live" || stage === "scanning") {
        window.clearTimeout(timer);
        controller.done = false;
        config.shot.hidden = true;
        config.shot.removeAttribute("src");
        setStage("idle");
      }
    }

    config.startBtn.addEventListener("click", start);
    config.captureBtn.addEventListener("click", capture);
    config.retakeBtn.addEventListener("click", function () {
      reset();
      start();
    });

    setStage("idle");
    controller.start = start;
    controller.reset = reset;
    controller.park = park;
    controller.setError = setError;
    return controller;
  }

  function idFrontFocusTarget() {
    if (!idFrontStart.hidden) return idFrontStart;
    if (!idFrontCapture.hidden) return idFrontCapture;
    return idFrontRetake;
  }

  function idBackFocusTarget() {
    if (!idBackStart.hidden) return idBackStart;
    if (!idBackCapture.hidden) return idBackCapture;
    return idBackRetake;
  }

  function faceFocusTarget() {
    if (!faceStart.hidden) return faceStart;
    if (!faceCapture.hidden) return faceCapture;
    return faceRetake;
  }

  /* ---------- valid ID capture (step 1) ---------- */

  var idFrontCtl = createCapture({
    frame: idFrontFrame,
    video: idFrontVideo,
    shot: idFrontShot,
    canvas: idFrontCanvas,
    badge: idFrontBadge,
    startBtn: idFrontStart,
    captureBtn: idFrontCapture,
    retakeBtn: idFrontRetake,
    errorEl: idcamError,
    scan: false,
    facingMode: "environment",
    doneBadge: "ID captured",
    startError: "Capturing your valid ID requires a camera. Use a device with a camera to continue.",
    deniedError: "Camera access was denied or unavailable. Enable camera access in your browser to capture your valid ID.",
    onStart: function () {
      idBackCtl.park();
      faceCtl.park();
    },
    onCaptured: function (dataUrl) {
      state.idFrontShot = dataUrl;
      idRefFront.src = dataUrl;
      idRefFront.hidden = false;
      idRefHint.hidden = true;
      faceCtl.reset();
    },
    onReset: function () {
      state.idFrontShot = null;
      idRefFront.removeAttribute("src");
      idRefFront.hidden = true;
      idRefHint.hidden = false;
    }
  });

  var idBackCtl = createCapture({
    frame: idBackFrame,
    video: idBackVideo,
    shot: idBackShot,
    canvas: idBackCanvas,
    badge: idBackBadge,
    startBtn: idBackStart,
    captureBtn: idBackCapture,
    retakeBtn: idBackRetake,
    errorEl: idcamError,
    scan: false,
    facingMode: "environment",
    doneBadge: "Back captured",
    startError: "Capturing your valid ID requires a camera. Use a device with a camera to continue.",
    deniedError: "Camera access was denied or unavailable. Enable camera access in your browser to capture your valid ID.",
    onStart: function () {
      idFrontCtl.park();
      faceCtl.park();
    },
    onCaptured: function (dataUrl) {
      state.idBackShot = dataUrl;
      idRefBack.src = dataUrl;
      idRefBack.hidden = false;
      idRefBackThumb.hidden = false;
      faceCtl.reset();
    },
    onReset: function () {
      state.idBackShot = null;
      idRefBack.removeAttribute("src");
      idRefBack.hidden = true;
      idRefBackThumb.hidden = true;
    }
  });

  function syncIdType() {
    var twoSided = idType.value !== "passport";
    idFrontCaption.textContent = twoSided ? "Front side" : "Passport bio page";
    idFrontCapture.querySelector("span").textContent = twoSided ? "Capture front" : "Capture bio page";
    idBackSlot.hidden = !twoSided;
    idcamEl.classList.toggle("is-single", !twoSided);
    idFrontCtl.reset();
    idBackCtl.reset();
    faceCtl.reset();
    idRefHint.hidden = false;
    idcamError.textContent = "";
    idcamError.hidden = true;
  }

  idType.addEventListener("change", syncIdType);

  unit.addEventListener("change", applyUnit);

  /* ---------- face recognition (simulated match, step 3) ---------- */

  var faceCtl = createCapture({
    frame: faceFrame,
    video: faceVideo,
    shot: faceShot,
    canvas: faceCanvas,
    badge: faceBadge,
    startBtn: faceStart,
    captureBtn: faceCapture,
    retakeBtn: faceRetake,
    errorEl: faceError,
    scan: true,
    scanMs: SCAN_MS,
    doneBadge: "Identity matched",
    startError: "Face recognition requires a camera. Use a device with a camera to complete verification.",
    deniedError: "Camera access was denied or unavailable. Enable camera access in your browser to complete face verification.",
    onStart: function () {
      idFrontCtl.park();
      idBackCtl.park();
    },
    onCaptured: function (dataUrl) {
      state.faceShot = dataUrl;
    },
    onReset: function () {
      state.faceShot = null;
    }
  });

  /* ---------- consents ---------- */

  function consentError(box, checkbox, message) {
    box.textContent = message || "";
    box.hidden = !message;
    if (message) checkbox.setAttribute("aria-invalid", "true");
    else checkbox.removeAttribute("aria-invalid");
  }

  [consent1, consent2].forEach(function (checkbox) {
    checkbox.addEventListener("change", function () {
      if (checkbox.checked) consentError(document.getElementById(checkbox.id + "-error"), checkbox, "");
      setStatus("");
    });
  });

  /* ---------- submit ---------- */

  function reset() {
    submit.classList.remove("is-loading", "is-ok", "is-bad");
    submitLabel.textContent = "Create account";
    submitArrow.hidden = false;
    submitArrow.querySelector("use").setAttribute("href", "#i-arrow");
    submit.disabled = false;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (state.busy) return;

    var failures = [];
    var failStep = 0;

    [1, 2].forEach(function (step) {
      var stepFailures = validateStep(step);
      if (stepFailures.length && !failStep) {
        failStep = step;
        failures = stepFailures;
      }
    });

    var consentFailures = validateConsents();
    var faceMissing = !faceCtl.done;
    if (faceMissing) {
      faceCtl.setError("Complete face verification against your ID before creating the account.");
    }

    if (failStep || consentFailures.length || faceMissing) {
      reset();
      if (failStep) {
        setStep(failStep, false);
        setStatus("Check the highlighted fields.", "bad");
        failures[0].focus();
      } else if (consentFailures.length) {
        setStatus("Accept the required certifications to continue.", "bad");
        consentFailures[0].focus();
      } else {
        setStatus("Face verification required.", "bad");
        faceFocusTarget().focus();
      }
      return;
    }

    faceCtl.setError("");
    state.busy = true;
    reset();
    submit.classList.add("is-loading");
    submit.disabled = true;
    submitLabel.textContent = "Creating account";
    setStatus("Validating agency credentials\u2026");

    var isResponder = unit.value !== "security";
    var payload = {
      fullname: fullname.value.trim(),
      email: email.value.trim(),
      unit: unit.value,
      password: password.value,
      credentialsFileName: state.file ? state.file.name : "",
      faceVerified: faceCtl.done === true && !!state.faceShot,
      idFrontShot: state.idFrontShot,
      idBackShot: state.idBackShot,
      faceShot: state.faceShot
    };
    if (isResponder) {
      payload.sex = sex.value;
      payload.age = parseInt(age.value, 10);
      payload.employeeId = employeeId.value.trim();
      payload.station = station.value;
    }

    window.fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
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
        setStatus(result.data.error || "Registration failed. Please try again.", "bad");
        return;
      }
      submit.disabled = false;
      submit.classList.remove("is-loading");
      submitLabel.textContent = "Account created";
      submitArrow.hidden = false;
      submitArrow.querySelector("use").setAttribute("href", "#i-check");
      submit.classList.add("is-ok");
      setStatus(
        (payload.employeeId ? payload.employeeId.toUpperCase() : payload.fullname) +
          (result.data.status === "verified"
            ? " registered \u00b7 ID + face verified. Account active \u2014 redirecting to sign in\u2026"
            : " registered \u00b7 Awaiting LDRRMO approval\u2026"),
        "ok"
      );
      window.setTimeout(function () {
        window.location.href = "index.html";
      }, 1600);
    }).catch(function () {
      state.busy = false;
      reset();
      setStatus(
        "Could not reach the registration server. Start it with: node server.js",
        "bad"
      );
    });
  });

  /* ---------- init ---------- */

  var unitParam = "";
  try {
    unitParam = new URLSearchParams(window.location.search).get("unit") || "";
  } catch (error) {}
  if (unitParam === "security") unit.value = "security";
  applyUnit();

  setStep(1, false);
  syncIdType();

  window.addEventListener("pagehide", function () {
    idFrontCtl.park();
    idBackCtl.park();
    faceCtl.park();
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
