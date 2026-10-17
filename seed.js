"use strict";

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

var ROOT = __dirname;
var USERS_FILE = path.join(ROOT, "server-data", "users.json");

var DEMOS = [
  {
    fullname: "Demo Responder",
    email: "demo@resqtrack.ph",
    sex: "male",
    age: 30,
    idType: "national",
    employeeId: "DEMO-0001",
    station: "ldrrrmo",
    password: "ResQtrack-Demo-2026",
    role: "responder"
  },
  {
    fullname: "Demo LDRRMO Admin",
    email: "admin@resqtrack.ph",
    sex: "female",
    age: 41,
    idType: "national",
    employeeId: "ADMIN-0001",
    station: "ldrrrmo",
    password: "ResQtrack-Admin-2026",
    role: "admin"
  }
];

function loadUsers() {
  try {
    var parsed = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

var users = loadUsers();

DEMOS.forEach(function (demo) {
  var salt = crypto.randomBytes(16).toString("hex");
  var passwordHash = crypto.scryptSync(demo.password, salt, 64).toString("hex");
  var existing = null;
  users.forEach(function (user) {
    if (user.email === demo.email) existing = user;
  });

  if (existing) {
    existing.salt = salt;
    existing.passwordHash = passwordHash;
    existing.status = "verified";
    existing.role = demo.role;
    existing.verifiedAt = new Date().toISOString();
    console.log("Demo account updated: " + demo.email + " (role: " + demo.role + ")");
  } else {
    var now = new Date().toISOString();
    users.push({
      id: "USR-" + crypto.randomBytes(4).toString("hex").toUpperCase(),
      fullname: demo.fullname,
      email: demo.email,
      sex: demo.sex,
      age: demo.age,
      idType: demo.idType,
      employeeId: demo.employeeId,
      station: demo.station,
      salt: salt,
      passwordHash: passwordHash,
      credentialsFileName: "",
      captures: { idFront: null, idBack: null, face: null },
      status: "verified",
      role: demo.role,
      createdAt: now,
      verifiedAt: now
    });
    console.log("Demo account created: " + demo.email + " (role: " + demo.role + ")");
  }
});

fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2) + "\n", "utf8");

DEMOS.forEach(function (demo) {
  console.log(demo.email + " \u2014 password: " + demo.password);
});
console.log("Sign in at http://localhost:3000/ \u2014 responders open the field dashboard, admins the command dashboard.");
