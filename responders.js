(function () {
  "use strict";

  var UNITS = [
    { id: "PNP-UNIT-04", person: "Juan Cruz", status: "arrived", statusLabel: "Arrived", incident: "INC-2023-081A" },
    { id: "RHU-AMB-12", person: "Paul Santos", status: "enroute", statusLabel: "En Route", incident: "INC-2023-089C" }
  ];
  var STATUS_VALUES = ["all", "arrived", "enroute"];
  var STORAGE_FILTER = "resqtrack.duty.filter";
  var STORAGE_QUERY = "resqtrack.duty.query";

  var body = document.getElementById("duty-body");
  if (!body) return;

  var empty = document.getElementById("duty-empty");
  var searchForm = document.getElementById("search-form");
  var searchInput = document.getElementById("search");
  var toastEl = document.getElementById("toast");
  var filterBtn = document.getElementById("filter-btn");
  var filterMenu = document.getElementById("filter-menu");
  var filterItems = Array.prototype.slice.call(filterMenu.querySelectorAll("[data-filter]"));

  var state = { query: "", filter: "all" };
  var toastTimer = null;

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
      if (value) window.localStorage.setItem(key, value);
      else window.localStorage.removeItem(key);
    } catch (error) {}
  }

  function matches(unit) {
    if (state.filter !== "all" && unit.status !== state.filter) return false;
    if (!state.query) return true;
    return (unit.id + " " + unit.person + " " + unit.incident).toLowerCase().indexOf(state.query) !== -1;
  }

  function rowFor(unit) {
    var row = document.createElement("tr");
    row.className = "duty__row";

    var id = document.createElement("td");
    id.className = "duty__id";
    id.textContent = unit.id;

    var person = document.createElement("td");
    person.className = "duty__person";
    person.textContent = unit.person;

    var status = document.createElement("td");
    var pill = document.createElement("span");
    pill.className = "pill pill--" + unit.status;
    var dot = document.createElement("span");
    dot.className = "pill__dot";
    dot.setAttribute("aria-hidden", "true");
    pill.appendChild(dot);
    pill.appendChild(document.createTextNode(unit.statusLabel));
    status.appendChild(pill);

    var incident = document.createElement("td");
    incident.className = "duty__incident";
    incident.textContent = unit.incident;

    var action = document.createElement("td");
    var open = document.createElement("button");
    open.type = "button";
    open.className = "rowbtn";
    open.setAttribute("aria-label", "Open unit " + unit.id);
    open.innerHTML = '<svg aria-hidden="true"><use href="#i-external"/></svg>';
    open.addEventListener("click", function () {
      toast("Opening " + unit.id + " \u2014 unit detail is not wired up in this prototype.");
    });
    action.appendChild(open);

    row.appendChild(id);
    row.appendChild(person);
    row.appendChild(status);
    row.appendChild(incident);
    row.appendChild(action);
    return row;
  }

  function render() {
    body.innerHTML = "";
    var visible = 0;
    UNITS.forEach(function (unit) {
      if (!matches(unit)) return;
      body.appendChild(rowFor(unit));
      visible += 1;
    });
    empty.hidden = visible > 0;
  }

  /* ---------- filter menu ---------- */

  function setMenuOpen(open) {
    filterMenu.hidden = !open;
    filterBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function setFilter(value) {
    state.filter = value;
    persist(STORAGE_FILTER, value === "all" ? "" : value);
    filterItems.forEach(function (item) {
      var on = item.getAttribute("data-filter") === value;
      item.classList.toggle("is-checked", on);
      item.setAttribute("aria-checked", on ? "true" : "false");
    });
    render();
  }

  filterBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    setMenuOpen(filterMenu.hidden);
  });

  filterMenu.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  filterItems.forEach(function (item) {
    item.addEventListener("click", function () {
      setFilter(item.getAttribute("data-filter"));
      setMenuOpen(false);
      filterBtn.focus();
    });
  });

  document.addEventListener("click", function () {
    if (!filterMenu.hidden) setMenuOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || filterMenu.hidden) return;
    setMenuOpen(false);
    filterBtn.focus();
  });

  /* ---------- search ---------- */

  searchInput.addEventListener("input", function () {
    state.query = searchInput.value.trim().toLowerCase();
    persist(STORAGE_QUERY, searchInput.value.trim());
    render();
  });

  searchInput.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !searchInput.value) return;
    event.preventDefault();
    searchInput.value = "";
    state.query = "";
    persist(STORAGE_QUERY, "");
    render();
  });

  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    state.query = searchInput.value.trim().toLowerCase();
    render();
    var first = body.querySelector(".rowbtn");
    if (first) {
      first.focus();
    } else {
      toast(state.query
        ? "No units match \u201C" + searchInput.value.trim() + "\u201D."
        : "Enter a unit ID, personnel name, or incident ID to search.");
    }
  });

  /* ---------- shell ---------- */

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

  /* ---------- init ---------- */

  var savedFilter = restore(STORAGE_FILTER, "all");
  if (STATUS_VALUES.indexOf(savedFilter) < 0) savedFilter = "all";

  var savedQuery = restore(STORAGE_QUERY, "");
  searchInput.value = savedQuery;
  state.query = savedQuery.trim().toLowerCase();

  setFilter(savedFilter);
})();
