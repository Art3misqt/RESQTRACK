# ResQtrack

Smart Emergency Response System with Image Processing and Real-Time Tracking, built for Katipunan, Zamboanga del Norte.

ResQtrack pairs a camera-based registration flow (ID front/back and face capture) and camera incident reporting with a lightweight Node.js backend that stores data on disk — no database and no npm dependencies required.

## Features

- Responder registration with ID and face capture; passwords hashed with scrypt (minimum 12 characters)
- Login/logout with an HttpOnly session cookie (8-hour sliding session)
- Protected pages (dashboard, incidents, responders, settings, admin) redirect to the login page when signed out
- Incident feed with camera-captured road accident reports
- Alerts panel with unread badges, report thumbnails, and a lightbox image preview
- Admin user management: list accounts, verify or suspend users, and view ID/face captures

## Requirements

- Node.js 18 or newer (tested on Node 24). No `npm install` needed — the server uses only Node core modules.
- A modern browser. Camera capture works when the site is served from `localhost` (or HTTPS).

## Running the system

```powershell
npm start
```

Or run the server directly:

```powershell
node server.js
```

Then open http://localhost:3000/ in your browser.

Use a custom port either way:

```powershell
node server.js 8080
$env:PORT = "8080"; node server.js
```

## Project structure

| Path | Purpose |
| --- | --- |
| `server.js` | HTTP server: static file hosting plus the JSON API |
| `index.html` / `script.js` / `style.css` | Login page |
| `register.html` / `register.js` / `register.css` | Registration with camera captures |
| `dashboard.html` / `dashboard.js` / `dashboard.css` | Main dashboard |
| `incidents.html` / `incidents.js` / `incidents.css` | Incident feed and reporting |
| `responders.html` / `responders.js` / `responders.css` | Responder directory |
| `settings.html` / `settings.js` / `settings.css` | Platform settings |
| `admin.html` / `admin.js` | Admin user management |
| `session.js` | Session chip, current user display, and sign-out |
| `notifications.js` | Alerts bell, unread tracking, and image lightbox |
| `data/incidents.js` | Local incident fixtures used by the UI |
| `server-data/` | Runtime data store (users, reports, uploaded images) |

## API routes

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/register` | No | Create an account with ID/face captures |
| POST | `/api/login` | No | Sign in and receive a session cookie |
| POST | `/api/logout` | No | End the current session |
| GET | `/api/session` | No | Return the signed-in user |
| GET | `/api/users` | Yes | List users (admin page) |
| POST | `/api/users/:id/status` | Yes | Set a user to `verified` or `suspended` |
| GET | `/api/users/:id/captures/:kind` | Yes | Fetch a capture image (`front`, `back`, `face`) |
| POST | `/api/reports` | Yes | Submit a road accident report with a PNG capture |
| GET | `/api/reports` | Yes | List reports |
| GET | `/api/reports/:id/image` | Yes | Fetch a report photo |

## Data storage

Everything lives in `server-data/`, which is excluded from git:

- `users.json` — accounts with scrypt password hashes and salts
- `reports.json` — incident reports
- `uploads/` — ID front/back and face captures (PNG)
- `reports/` — report photos (PNG)

## Notes

- Sessions are held in memory: restarting the server signs everyone out.
- Reports are stored with fixed type "Road Accident" and place "Katipunan, Zamboanga del Norte".
- `/admin.html` currently requires only a signed-in account, with no role check.
- Never commit `server-data/` — it contains personal ID and face images.
