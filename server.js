"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

var ROOT = __dirname;
var PORT = parseInt(process.env.PORT || process.argv[2] || "3000", 10);
var DATA_DIR = path.join(ROOT, "server-data");
var UPLOADS_DIR = path.join(DATA_DIR, "uploads");
var USERS_FILE = path.join(DATA_DIR, "users.json");
var REPORTS_DIR = path.join(DATA_DIR, "reports");
var REPORTS_FILE = path.join(DATA_DIR, "reports.json");
var MAX_BODY_BYTES = 12 * 1024 * 1024;

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var EMPLOYEE_RE = /^[A-Za-z0-9][A-Za-z0-9-]{3,31}$/;
var UNITS = { responder: true, security: true };
var MIN_PASSWORD = 12;

var MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function ensureStore() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]\n", "utf8");
  }
  if (!fs.existsSync(REPORTS_FILE)) {
    fs.writeFileSync(REPORTS_FILE, "[]\n", "utf8");
  }
}

function loadUsers() {
  try {
    var text = fs.readFileSync(USERS_FILE, "utf8").replace(/^\uFEFF/, "");
    var parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2) + "\n", "utf8");
}

function loadReports() {
  try {
    var text = fs.readFileSync(REPORTS_FILE, "utf8").replace(/^\uFEFF/, "");
    var parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveReports(reports) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2) + "\n", "utf8");
}

function sanitizeReport(report) {
  return {
    id: report.id,
    type: report.type,
    note: report.note,
    place: report.place,
    reporterName: report.reporterName,
    reporterEmployeeId: report.reporterEmployeeId,
    imageUrl: "/api/reports/" + report.id + "/image",
    createdAt: report.createdAt
  };
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function safeEqual(a, b) {
  var bufA = Buffer.from(String(a), "hex");
  var bufB = Buffer.from(String(b), "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

var SESSIONS = new Map();
var SESSION_TTL_MS = 8 * 60 * 60 * 1000;
var SESSION_COOKIE = "resqtrack_session";

var PROTECTED_PAGES = {
  "/responder.html": true,
  "/dashboard.html": true,
  "/incidents.html": true,
  "/responders.html": true,
  "/settings.html": true,
  "/admin.html": true
};

function parseCookies(req) {
  var header = req.headers.cookie || "";
  var cookies = {};
  header.split(";").forEach(function (part) {
    var index = part.indexOf("=");
    if (index === -1) return;
    var name = part.slice(0, index).trim();
    var value = part.slice(index + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  });
  return cookies;
}

function userFromRequest(req) {
  var token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;

  var session = SESSIONS.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    SESSIONS.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;

  var users = loadUsers();
  var user = null;
  users.forEach(function (item) {
    if (item.id === session.userId) user = item;
  });
  if (!user || user.status !== "verified") {
    SESSIONS.delete(token);
    return null;
  }
  return user;
}

function requireUser(req, res) {
  var user = userFromRequest(req);
  if (!user) {
    sendJson(res, 401, { error: "Authentication required." });
    return null;
  }
  return user;
}

function sessionCookie(token, maxAgeSeconds) {
  return SESSION_COOKIE + "=" + token +
    "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + maxAgeSeconds;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    fullname: user.fullname,
    email: user.email,
    sex: user.sex,
    age: user.age,
    idType: user.idType,
    employeeId: user.employeeId,
    station: user.station,
    credentialsFileName: user.credentialsFileName,
    captures: user.captures,
    status: user.status,
    role: user.role,
    createdAt: user.createdAt,
    verifiedAt: user.verifiedAt
  };
}

function sendJson(res, code, payload, headers) {
  var body = JSON.stringify(payload);
  var outHeaders = {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  };
  if (headers) {
    Object.keys(headers).forEach(function (name) {
      outHeaders[name] = headers[name];
    });
  }
  res.writeHead(code, outHeaders);
  res.end(body);
}

function sendRedirect(res, location) {
  res.writeHead(302, {
    "Location": location,
    "Cache-Control": "no-store"
  });
  res.end();
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    var size = 0;
    req.on("data", function (chunk) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject({ code: 413, message: "Payload too large (max 12 MB)." });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", function () {
      try {
        var text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (error) {
        reject({ code: 400, message: "Invalid JSON body." });
      }
    });
    req.on("error", function () {
      reject({ code: 400, message: "Request stream error." });
    });
  });
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  var match = /^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) return null;
  var buffer = Buffer.from(match[1].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > 4 * 1024 * 1024) return null;
  return buffer;
}

function saveCapture(userId, suffix, dataUrl) {
  var buffer = parseDataUrl(dataUrl);
  if (!buffer) return null;
  var fileName = userId + "-" + suffix + ".png";
  fs.writeFileSync(path.join(UPLOADS_DIR, fileName), buffer);
  return "server-data/uploads/" + fileName;
}

function handleRegister(req, res) {
  readBody(req).then(function (body) {
    var fullname = String(body.fullname || "").trim();
    var email = String(body.email || "").trim().toLowerCase();
    var sex = String(body.sex || "");
    var age = parseInt(body.age, 10);
    var idType = String(body.idType || "");
    var employeeId = String(body.employeeId || "").trim();
    var station = String(body.station || "").trim();
    var unit = String(body.unit || "");
    var password = String(body.password || "");
    var faceVerified = body.faceVerified === true;
    var credentialsFileName = String(body.credentialsFileName || "").trim();

    if (fullname.length < 2) return sendJson(res, 400, { error: "Full name is required." });
    if (!EMAIL_RE.test(email)) return sendJson(res, 400, { error: "Enter a valid email address." });
    if (!UNITS[unit]) return sendJson(res, 400, { error: "Select a valid unit (responder or security)." });

    if (unit === "responder") {
      if (sex !== "male" && sex !== "female") return sendJson(res, 400, { error: "Sex is required." });
      if (!(age >= 18 && age <= 100)) return sendJson(res, 400, { error: "Age must be between 18 and 100." });
      if (!EMPLOYEE_RE.test(employeeId)) return sendJson(res, 400, { error: "Employee ID is invalid." });
      if (!station) return sendJson(res, 400, { error: "Station is required." });
    } else {
      sex = "";
      age = null;
      employeeId = "";
      station = "";
    }
    if (password.length < MIN_PASSWORD) {
      return sendJson(res, 400, { error: "Password must be at least " + MIN_PASSWORD + " characters." });
    }

    var users = loadUsers();
    var duplicate = users.some(function (user) {
      return user.email === email ||
        (employeeId && user.employeeId && user.employeeId.toUpperCase() === employeeId.toUpperCase());
    });
    if (duplicate) {
      return sendJson(res, 409, { error: "An account with this email or employee ID already exists." });
    }

    var id = "USR-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    var salt = crypto.randomBytes(16).toString("hex");
    var now = new Date().toISOString();

    var user = {
      id: id,
      fullname: fullname,
      email: email,
      sex: sex,
      age: age,
      idType: idType,
      employeeId: employeeId,
      station: station,
      salt: salt,
      passwordHash: hashPassword(password, salt),
      credentialsFileName: credentialsFileName,
      captures: {
        idFront: saveCapture(id, "id-front", body.idFrontShot),
        idBack: saveCapture(id, "id-back", body.idBackShot),
        face: saveCapture(id, "face", body.faceShot)
      },
      status: faceVerified ? "verified" : "pending",
      role: unit,
      createdAt: now,
      verifiedAt: faceVerified ? now : null
    };

    users.push(user);
    saveUsers(users);

    sendJson(res, 201, {
      ok: true,
      status: user.status,
      user: sanitizeUser(user)
    });
  }).catch(function (error) {
    sendJson(res, error.code || 500, { error: error.message || "Registration failed." });
  });
}

function handleLogin(req, res) {
  readBody(req).then(function (body) {
    var email = String(body.email || "").trim().toLowerCase();
    var password = String(body.password || "");

    var users = loadUsers();
    var user = null;
    users.forEach(function (item) {
      if (item.email === email) user = item;
    });

    if (!user || !safeEqual(hashPassword(password, user.salt), user.passwordHash)) {
      return sendJson(res, 401, { error: "Invalid email or password." });
    }

    if (user.status === "suspended") {
      return sendJson(res, 403, {
        error: "Account suspended \u2014 contact the LDRRMO administrator."
      });
    }

    if (user.status !== "verified") {
      return sendJson(res, 403, {
        error: "Account pending verification \u2014 awaiting LDRRMO approval."
      });
    }

    var token = crypto.randomBytes(32).toString("hex");
    SESSIONS.set(token, {
      userId: user.id,
      role: user.role,
      expiresAt: Date.now() + SESSION_TTL_MS
    });

    sendJson(res, 200, { ok: true, user: sanitizeUser(user) }, {
      "Set-Cookie": sessionCookie(token, SESSION_TTL_MS / 1000)
    });
  }).catch(function (error) {
    sendJson(res, error.code || 500, { error: error.message || "Login failed." });
  });
}

function handleUsers(req, res) {
  var users = loadUsers().map(sanitizeUser);
  sendJson(res, 200, { ok: true, count: users.length, users: users });
}

function handleLogout(req, res) {
  var token = parseCookies(req)[SESSION_COOKIE];
  if (token) SESSIONS.delete(token);
  sendJson(res, 200, { ok: true }, {
    "Set-Cookie": sessionCookie("", 0)
  });
}

function handleSession(req, res) {
  var user = userFromRequest(req);
  if (!user) return sendJson(res, 401, { error: "Authentication required." });
  sendJson(res, 200, { ok: true, user: sanitizeUser(user) });
}

function handleCreateReport(req, res, user) {
  readBody(req).then(function (body) {
    var note = String(body.note || "").trim().slice(0, 200);
    var image = parseDataUrl(body.image);
    if (!image) {
      return sendJson(res, 400, { error: "A captured PNG image is required." });
    }

    var id = "RPT-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    fs.writeFileSync(path.join(REPORTS_DIR, id + ".png"), image);

    var reports = loadReports();
    var report = {
      id: id,
      type: "Road Accident",
      note: note,
      place: "Katipunan, Zamboanga del Norte",
      reporterName: user.fullname,
      reporterEmployeeId: user.employeeId,
      image: "server-data/reports/" + id + ".png",
      createdAt: new Date().toISOString()
    };
    reports.unshift(report);
    saveReports(reports);

    sendJson(res, 201, { ok: true, report: sanitizeReport(report) });
  }).catch(function (error) {
    sendJson(res, error.code || 500, { error: error.message || "Report failed." });
  });
}

function handleListReports(req, res) {
  var reports = loadReports().map(sanitizeReport);
  sendJson(res, 200, { ok: true, count: reports.length, reports: reports });
}

function handleReportImage(req, res, reportId) {
  var reports = loadReports();
  var report = null;
  reports.forEach(function (item) {
    if (item.id === reportId) report = item;
  });
  if (!report) return sendJson(res, 404, { error: "Report not found." });

  var filePath = path.normalize(path.join(ROOT, report.image));
  if (filePath.indexOf(path.join(ROOT, "server-data") + path.sep) !== 0) {
    return sendJson(res, 403, { error: "Forbidden." });
  }

  fs.readFile(filePath, function (readError, content) {
    if (readError) return sendJson(res, 404, { error: "Report not found." });
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": content.length,
      "Cache-Control": "no-store"
    });
    res.end(content);
  });
}

function handleUserStatus(req, res, userId) {
  readBody(req).then(function (body) {
    var status = String(body.status || "");
    if (status !== "verified" && status !== "suspended") {
      return sendJson(res, 400, { error: "Status must be \"verified\" or \"suspended\"." });
    }

    var users = loadUsers();
    var user = null;
    users.forEach(function (item) {
      if (item.id === userId) user = item;
    });
    if (!user) return sendJson(res, 404, { error: "User not found." });

    user.status = status;
    user.verifiedAt = status === "verified" ? new Date().toISOString() : null;
    saveUsers(users);

    sendJson(res, 200, { ok: true, user: sanitizeUser(user) });
  }).catch(function (error) {
    sendJson(res, error.code || 500, { error: error.message || "Update failed." });
  });
}

var CAPTURE_KINDS = { front: "idFront", back: "idBack", face: "face" };

function handleUserCapture(req, res, userId, kind) {
  var key = CAPTURE_KINDS[kind];
  if (!key) return sendJson(res, 404, { error: "Capture not found." });

  var users = loadUsers();
  var user = null;
  users.forEach(function (item) {
    if (item.id === userId) user = item;
  });
  if (!user || !user.captures || !user.captures[key]) {
    return sendJson(res, 404, { error: "Capture not found." });
  }

  var filePath = path.normalize(path.join(ROOT, user.captures[key]));
  if (filePath.indexOf(path.join(ROOT, "server-data") + path.sep) !== 0) {
    return sendJson(res, 403, { error: "Forbidden." });
  }

  fs.readFile(filePath, function (readError, content) {
    if (readError) return sendJson(res, 404, { error: "Capture not found." });
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": content.length,
      "Cache-Control": "no-store"
    });
    res.end(content);
  });
}

function serveStatic(req, res, pathname) {
  if (pathname.indexOf("/server-data/") === 0 || pathname === "/server-data") {
    return sendJson(res, 404, { error: "Not found." });
  }

  var decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (error) {
    return sendJson(res, 400, { error: "Bad request path." });
  }

  if (decoded === "/") decoded = "/index.html";
  var filePath = path.normalize(path.join(ROOT, decoded));
  if (filePath.indexOf(ROOT + path.sep) !== 0) {
    return sendJson(res, 403, { error: "Forbidden." });
  }

  fs.stat(filePath, function (statError, stats) {
    if (!statError && stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    fs.readFile(filePath, function (readError, content) {
      if (readError) {
        return sendJson(res, 404, { error: "Not found." });
      }
      var type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": content.length,
        "Cache-Control": "no-cache"
      });
      res.end(content);
    });
  });
}

ensureStore();

var server = http.createServer(function (req, res) {
  var pathname = req.url.split("?")[0];

  if (pathname === "/api/register" && req.method === "POST") return handleRegister(req, res);
  if (pathname === "/api/login" && req.method === "POST") return handleLogin(req, res);
  if (pathname === "/api/logout" && req.method === "POST") return handleLogout(req, res);
  if (pathname === "/api/session" && req.method === "GET") return handleSession(req, res);

  if (pathname === "/api/users" && req.method === "GET") {
    if (!requireUser(req, res)) return;
    return handleUsers(req, res);
  }

  var statusMatch = /^\/api\/users\/([^\/]+)\/status$/.exec(pathname);
  if (statusMatch && req.method === "POST") {
    if (!requireUser(req, res)) return;
    return handleUserStatus(req, res, statusMatch[1]);
  }

  var captureMatch = /^\/api\/users\/([^\/]+)\/captures\/([^\/]+)$/.exec(pathname);
  if (captureMatch && req.method === "GET") {
    if (!requireUser(req, res)) return;
    return handleUserCapture(req, res, captureMatch[1], captureMatch[2]);
  }

  if (pathname === "/api/reports" && req.method === "POST") {
    var reportUser = requireUser(req, res);
    if (!reportUser) return;
    return handleCreateReport(req, res, reportUser);
  }

  if (pathname === "/api/reports" && req.method === "GET") {
    if (!requireUser(req, res)) return;
    return handleListReports(req, res);
  }

  var reportImageMatch = /^\/api\/reports\/([^\/]+)\/image$/.exec(pathname);
  if (reportImageMatch && req.method === "GET") {
    if (!requireUser(req, res)) return;
    return handleReportImage(req, res, reportImageMatch[1]);
  }

  if (pathname.indexOf("/api/") === 0) return sendJson(res, 404, { error: "Unknown API route." });

  if (req.method === "GET" || req.method === "HEAD") {
    if (PROTECTED_PAGES[pathname] && !userFromRequest(req)) {
      return sendRedirect(res, "/index.html");
    }
    return serveStatic(req, res, pathname);
  }
  sendJson(res, 405, { error: "Method not allowed." });
});

server.listen(PORT, function () {
  console.log("ResQtrack server running at http://localhost:" + PORT + "/");
  console.log("Static site: /  |  API: /api/register, /api/login, /api/users");
  console.log("User database: " + path.relative(ROOT, USERS_FILE));
});
