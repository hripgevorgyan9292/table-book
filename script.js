const root = document.documentElement;
const toggle = document.getElementById("themeToggle");

function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  const label = theme === "dark" ? t("themeLight") : t("themeDark");
  toggle.innerHTML = (theme === "dark" ? "☀️" : "🌙") + '<span class="btn-label"> ' + label + "</span>";
  toggle.setAttribute("aria-label", label);
}

let saved = null;
try { saved = localStorage.getItem("theme"); } catch (e) {}
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(saved || (prefersDark ? "dark" : "light"));

toggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem("theme", next); } catch (e) {}
});

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const signupModal = document.getElementById("signupModal");
const loginModal = document.getElementById("loginModal");
let openedModal = null;
let lastFocused = null;

function openModal(modal) {
  if (openedModal) openedModal.hidden = true;
  else lastFocused = document.activeElement;
  openedModal = modal;
  modal.hidden = false;
  modal.querySelector("input").focus();
}

function closeModal() {
  if (!openedModal) return;
  openedModal.hidden = true;
  openedModal = null;
  if (lastFocused && !lastFocused.hidden) lastFocused.focus();
}

signupBtn.addEventListener("click", () => openModal(signupModal));
loginBtn.addEventListener("click", () => openModal(loginModal));

document.querySelectorAll(".modal-close").forEach((btn) => {
  btn.addEventListener("click", closeModal);
});

// Անցում «Գրանցում» և «Մուտք» պատուհանների միջև
document.querySelectorAll("[data-open]").forEach((btn) => {
  btn.addEventListener("click", () => openModal(document.getElementById(btn.dataset.open)));
});

// Փակել, երբ սեղմում են պատուհանից դուրս՝ մուգ ֆոնի վրա
[signupModal, loginModal].forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

async function postJson(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return { ok: response.ok, result: await response.json() };
}

const signupForm = document.getElementById("signupForm");

function showError(fieldId, message) {
  document.getElementById(fieldId + "Error").textContent = message;
  document.getElementById(fieldId).parentElement.classList.toggle("invalid", message !== "");
}

function validateForm() {
  const firstName = signupForm.firstName.value.trim();
  const lastName = signupForm.lastName.value.trim();
  const email = signupForm.email.value.trim().toLowerCase();
  const password = signupForm.password.value;
  const passwordConfirm = signupForm.passwordConfirm.value;
  const errors = {};

  if (!firstName) errors.firstName = t("errFirstName");
  if (!lastName) errors.lastName = t("errLastName");

  if (!email) {
    errors.email = t("errEmailEmpty");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = t("errEmailInvalid");
  }

  if (!password) {
    errors.password = t("errPasswordEmpty");
  } else if (password.length < 6) {
    errors.password = t("errPasswordShort");
  }

  if (!passwordConfirm) {
    errors.passwordConfirm = t("errPasswordConfirmEmpty");
  } else if (password !== passwordConfirm) {
    errors.passwordConfirm = t("errPasswordMismatch");
  }

  ["firstName", "lastName", "email", "password", "passwordConfirm"].forEach((id) => {
    showError(id, errors[id] || "");
  });

  return Object.keys(errors).length === 0 ? { firstName, lastName, email, password } : null;
}

// Դաշտում գրելիս հանել տվյալ դաշտի սխալը
signupForm.addEventListener("input", (event) => {
  showError(event.target.id, "");
});

const submitBtn = signupForm.querySelector(".submit-btn");

// Ուղարկել տվյալները սերվերին, որը դրանք պահում է տվյալների բազայում
signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = validateForm();
  if (!formData) return;

  submitBtn.disabled = true;
  try {
    const { ok, result } = await postJson("/api/signup", formData);

    if (!ok) {
      Object.entries(result.errors || {}).forEach(([id, message]) => showError(id, translateServer(message)));
      if (result.error) showToast(translateServer(result.error));
      return;
    }

    signupForm.reset();
    closeModal();
    showUser(result.user);
    showToast(t("welcome", { name: result.user.firstName }));
  } catch (e) {
    showToast(t("networkError"));
  } finally {
    submitBtn.disabled = false;
  }
});

const loginForm = document.getElementById("loginForm");
const loginSubmitBtn = loginForm.querySelector(".submit-btn");

loginForm.addEventListener("input", (event) => {
  showError(event.target.id, "");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  showError("loginEmail", email ? "" : t("errEmailEmpty"));
  showError("loginPassword", password ? "" : t("errLoginPassword"));
  if (!email || !password) return;

  loginSubmitBtn.disabled = true;
  try {
    const { ok, result } = await postJson("/api/login", { email, password });

    if (!ok) {
      showError("loginPassword", translateServer(result.error));
      return;
    }

    loginForm.reset();
    closeModal();
    showUser(result.user);
    showToast(t("welcomeBack", { name: result.user.firstName }));
  } catch (e) {
    showToast(t("networkError"));
  } finally {
    loginSubmitBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await postJson("/api/logout", {});
    showGuest();
    showToast(t("loggedOut"));
  } catch (e) {
    showToast(t("networkError"));
  }
});

const userName = document.getElementById("userName");
const toast = document.getElementById("toast");
let toastTimer;

// «Մուտք» և «Գրանցվել» կոճակների փոխարեն ցույց տալ օգտատիրոջ անունը և «Ելք» կոճակը
function showUser(user) {
  userName.textContent = "👤 " + user.firstName + " " + user.lastName;
  userName.hidden = false;
  logoutBtn.hidden = false;
  loginBtn.hidden = true;
  signupBtn.hidden = true;
  myBookings.hidden = false;
  loadMyBookings();
}

function showGuest() {
  userName.hidden = true;
  logoutBtn.hidden = true;
  loginBtn.hidden = false;
  signupBtn.hidden = false;
  myBookings.hidden = true;
  lastBookings = [];
  loginBtn.focus();
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
}

// Էջը բացելիս սերվերից ստուգել՝ արդյոք օգտատերը մուտք է գործած
fetch("/api/me")
  .then((response) => response.json())
  .then((result) => { if (result.user) showUser(result.user); })
  .catch(() => {});

// ---------- Սեղանի ամրագրում ----------

const searchForm = document.getElementById("searchForm");
const bookDate = document.getElementById("bookDate");
const bookTime = document.getElementById("bookTime");
const bookGuests = document.getElementById("bookGuests");
const bookRestaurant = document.getElementById("bookRestaurant");
const searchBtn = searchForm.querySelector(".search-btn");
const bookingStatus = document.getElementById("bookingStatus");
const hall = document.getElementById("hall");
const panelEmpty = document.getElementById("panelEmpty");
const panelDetails = document.getElementById("panelDetails");
const bookBtn = document.getElementById("bookBtn");
let lastSearch = null;
let lastTables = null;
let selectedTable = null;
let lastStatus = null;

// Սեղանների տեղը հատակագծում (տոկոսներով), գոտին և նկարագրությունը՝ ըստ սեղանի համարի
const TABLE_LAYOUT = {
  1: { x: 14, y: 20, zone: "zoneWindow", desc: "desc1" },
  2: { x: 34, y: 20, zone: "zoneWindow", desc: "desc2" },
  3: { x: 54, y: 20, zone: "zoneWindow", desc: "desc3" },
  4: { x: 14, y: 47, zone: "zoneCenter", desc: "desc4" },
  5: { x: 34, y: 47, zone: "zoneCenter", desc: "desc5" },
  6: { x: 54, y: 47, zone: "zoneCenter", desc: "desc6" },
  7: { x: 22, y: 78, zone: "zoneSofa", desc: "desc7" },
  8: { x: 55, y: 80, zone: "zoneBig", desc: "desc8" },
};

// Սեղանի չափերը (px)՝ ըստ տեղերի քանակի
const TABLE_SIZES = { 2: [52, 52], 4: [64, 64], 6: [116, 58], 8: [156, 62] };

function tableSize(seats) {
  const key = [2, 4, 6, 8].find((n) => seats <= n) || 8;
  return { key, size: TABLE_SIZES[key] };
}

// Աթոռների դիրքերը սեղանի շուրջը
function chairPositions(key, w, h) {
  const left = [-12, h / 2];
  const right = [w + 12, h / 2];
  const row = (y) => [0.2, 0.5, 0.8].map((p) => [w * p, y]);
  if (key === 2) return [left, right];
  if (key === 4) return [[w / 2, -12], [w / 2, h + 12], left, right];
  if (key === 6) return [...row(-12), ...row(h + 12)];
  return [...row(-12), ...row(h + 12), left, right];
}

// Ամսաթիվը YYYY-MM-DD ձևաչափով (տեղական ժամով). daysAhead=1՝ վաղվա օրը
function todayString(daysAhead = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Այսօրվա համար թաքցնել արդեն անցած ժամերը, որ դրանք հնարավոր չլինի ընտրել
function updateTimeOptions() {
  const isToday = bookDate.value === todayString();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  [...bookTime.options].forEach((option) => {
    const [h, m] = option.value.split(":").map(Number);
    const isPast = isToday && h * 60 + m <= nowMinutes;
    option.disabled = isPast;
    option.hidden = isPast;
  });

  if (bookTime.selectedOptions[0] && bookTime.selectedOptions[0].disabled) {
    const firstFree = [...bookTime.options].find((option) => !option.disabled);
    if (firstFree) bookTime.value = firstFree.value;
  }
}

// Ժամեր՝ 10:00-ից 22:00, ամեն 30 րոպեն մեկ
for (let h = 10; h <= 22; h++) {
  ["00", "30"].forEach((m) => {
    if (h === 22 && m === "30") return;
    const time = String(h).padStart(2, "0") + ":" + m;
    bookTime.add(new Option(time, time));
  });
}
bookTime.value = "19:00";

for (let n = 1; n <= 8; n++) {
  bookGuests.add(new Option("", n));
}
bookGuests.value = "2";

function translateGuestOptions() {
  [...bookGuests.options].forEach((option) => {
    option.textContent = t("guestsOption", { n: Number(option.value) });
  });
}

// Եթե այսօր ազատ ժամ այլևս չկա (22:00-ից հետո), սկսել վաղվանից
bookDate.min = todayString();
bookDate.value = todayString();
updateTimeOptions();
if ([...bookTime.options].every((option) => option.disabled)) {
  bookDate.min = todayString(1);
  bookDate.value = todayString(1);
  updateTimeOptions();
  bookTime.value = "19:00";
}

// Ամրագրման ժամանակահատվածը, օրինակ՝ 19:00–20:00 (յուրաքանչյուր ամրագրում 1 ժամ է)
function timeRange(time, duration = 60) {
  const [h, m] = time.split(":").map(Number);
  const end = h * 60 + m + duration;
  return time + "–" + String(Math.floor(end / 60)).padStart(2, "0") + ":" + String(end % 60).padStart(2, "0");
}

// Ամսանունները յուրաքանչյուր լեզվի համար գրված են i18n.js-ում
function formatDate(date) {
  const [, month, day] = date.split("-").map(Number);
  return t("formatDate", { day, month: month - 1 });
}

// Կարգավիճակի տողը հիշում է բանալին, որ լեզուն փոխելիս նորից թարգմանվի
function setStatus(key, vars = {}) {
  lastStatus = key ? { key, vars } : null;
  bookingStatus.textContent = key ? t(key, vars) : "";
}

function setStatusText(text) {
  lastStatus = { text };
  bookingStatus.textContent = text;
}

function clearSelection() {
  selectedTable = null;
  panelDetails.hidden = true;
  panelEmpty.hidden = false;
}

function renderHall(tables, guests) {
  hall.querySelectorAll(".hall-table").forEach((el) => el.remove());
  clearSelection();
  let fitting = 0;

  tables.forEach((table, i) => {
    const place = TABLE_LAYOUT[table.number] || { x: 12 + (i % 4) * 20, y: 92, zone: "zoneHall", desc: "" };
    let state = "free";
    let label = t("stateFree");
    if (!table.free) {
      state = "busy";
      label = t("stateBusy");
    } else if (table.seats < guests) {
      state = "small";
      label = t("stateSmall");
    } else {
      fitting++;
    }

    const { key, size: [w, h] } = tableSize(table.seats);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hall-table seats-" + key + " " + state;
    btn.dataset.id = table.id;
    btn.style.left = place.x + "%";
    btn.style.top = place.y + "%";
    btn.disabled = state !== "free";
    btn.setAttribute("aria-pressed", "false");
    btn.title = t("tableN", { n: table.number }) + " · " + t("seatsShort", { n: table.seats }) + " · " + t(place.zone) + " · " + label;
    btn.setAttribute("aria-label", btn.title);

    chairPositions(key, w, h).forEach(([cx, cy]) => {
      const chair = document.createElement("span");
      chair.className = "chair";
      chair.style.left = cx + "px";
      chair.style.top = cy + "px";
      btn.appendChild(chair);
    });

    const top = document.createElement("span");
    top.className = "top";
    top.innerHTML = '<span class="t-num">' + table.number + '</span><span class="t-seats">' + t("seatsShort", { n: table.seats }) + "</span>";
    btn.appendChild(top);

    btn.addEventListener("click", () => selectTable(btn, table, place));
    hall.appendChild(btn);
  });

  if (fitting) setStatus("statusFree", { n: fitting });
  else setStatus("statusNone");
}

function selectTable(btn, table, place) {
  hall.querySelectorAll(".hall-table.selected").forEach((el) => {
    el.classList.replace("selected", "free");
    el.setAttribute("aria-pressed", "false");
  });
  btn.classList.replace("free", "selected");
  btn.setAttribute("aria-pressed", "true");
  selectedTable = table;

  document.getElementById("panelZone").textContent = lastSearch.restaurantName + " · " + t(place.zone);
  document.getElementById("panelTitle").textContent = t("tableN", { n: table.number });
  document.getElementById("panelDesc").textContent = place.desc ? t(place.desc) : "";
  document.getElementById("panelSeats").textContent = table.seats;
  document.getElementById("panelDate").textContent = formatDate(lastSearch.date);
  document.getElementById("panelTime").textContent = timeRange(lastSearch.time);
  document.getElementById("panelGuests").textContent = lastSearch.guests;
  panelEmpty.hidden = true;
  panelDetails.hidden = false;
}

async function searchTables() {
  const search = {
    restaurantId: Number(bookRestaurant.value),
    restaurantName: bookRestaurant.selectedOptions[0] ? bookRestaurant.selectedOptions[0].textContent : "",
    date: bookDate.value,
    time: bookTime.value,
    guests: Number(bookGuests.value),
  };
  if (!search.restaurantId) {
    hall.querySelectorAll(".hall-table").forEach((el) => el.remove());
    clearSelection();
    lastSearch = null;
    lastTables = null;
    setStatus("statusChooseRestaurant");
    return;
  }
  if (!search.date) {
    setStatus("statusChooseDay");
    return;
  }

  setStatus("statusLoading");
  searchBtn.disabled = true;
  try {
    const response = await fetch("/api/tables?restaurantId=" + search.restaurantId +
      "&date=" + encodeURIComponent(search.date) + "&time=" + encodeURIComponent(search.time));
    const result = await response.json();
    if (!response.ok) {
      setStatusText(translateServer(result.error));
      return;
    }
    lastSearch = search;
    lastTables = result.tables;
    renderHall(result.tables, search.guests);
  } catch (e) {
    setStatus("networkError");
  } finally {
    searchBtn.disabled = false;
  }
}

// Օրը, ժամը կամ հյուրերի քանակը փոխելիս սխեման թարմացվում է ինքնաբերաբար
searchForm.addEventListener("change", () => {
  updateTimeOptions();
  searchTables();
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchTables();
});

function askToLogin() {
  showToast(t("askLogin"));
  openModal(loginModal);
}

bookBtn.addEventListener("click", async () => {
  if (!selectedTable || !lastSearch) return;
  if (userName.hidden) {
    askToLogin();
    return;
  }

  bookBtn.disabled = true;
  try {
    const response = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: lastSearch.date,
        time: lastSearch.time,
        guests: lastSearch.guests,
        tableId: selectedTable.id,
      }),
    });
    const result = await response.json();

    if (response.status === 401) {
      askToLogin();
      return;
    }
    if (!response.ok) {
      showToast(translateServer(result.error));
      // Սեղանը կարող էր զբաղվել այդ ընթացքում, թարմացնել ցուցակը
      if (response.status === 409) searchTables();
      return;
    }

    const r = result.reservation;
    showToast(t("booked", {
      restaurant: r.restaurantName, n: r.tableNumber, date: formatDate(r.date), time: timeRange(r.time, r.duration),
    }));
    searchTables();
    loadMyBookings();
  } catch (e) {
    showToast(t("networkError"));
  } finally {
    bookBtn.disabled = false;
  }
});

// ---------- Իմ ամրագրումները ----------

const myBookings = document.getElementById("myBookings");
const myBookingsList = document.getElementById("myBookingsList");
const myBookingsEmpty = document.getElementById("myBookingsEmpty");
const myBookingsSummary = document.getElementById("myBookingsSummary");
const myBookingsToggle = document.getElementById("myBookingsToggle");
const myBookingsBody = document.getElementById("myBookingsBody");
let lastBookings = [];

// «Իմ ամրագրումները» կոճակը բացում և փակում է քարտերի պատուհանը
function setMyBookingsOpen(open) {
  myBookingsBody.hidden = !open;
  myBookingsToggle.setAttribute("aria-expanded", String(open));
}

myBookingsToggle.addEventListener("click", () => setMyBookingsOpen(myBookingsBody.hidden));

// Փակել՝ պատուհանից դուրս սեղմելով կամ Esc-ով
document.addEventListener("click", (event) => {
  if (!myBookingsBody.hidden && !myBookingsBody.contains(event.target) && !myBookingsToggle.contains(event.target)) {
    setMyBookingsOpen(false);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !myBookingsBody.hidden) {
    setMyBookingsOpen(false);
    myBookingsToggle.focus();
  }
});

// Ամրագրման վիճակը հյուրի համար. մերժվածը պահվում է որպես «cancelled»՝ ադմինի հաղորդագրությամբ
const STATE_TEXT = {
  pending: { badge: "statusPending", icon: "⏳", message: "msgPending" },
  confirmed: { badge: "statusConfirmed", icon: "✅", message: "msgConfirmed" },
  rejected: { badge: "statusRejected", icon: "✖", message: "msgRejected" },
  cancelled: { badge: "statusCancelled", icon: "↩", message: "msgCancelled" },
};

function bookingState(booking) {
  return booking.rejectReason ? "rejected" : (STATE_TEXT[booking.status] ? booking.status : "pending");
}

async function loadMyBookings() {
  try {
    const response = await fetch("/api/reservations");
    if (!response.ok) return;
    const previous = new Map(lastBookings.map((b) => [b.id, bookingState(b)]));
    lastBookings = (await response.json()).reservations;
    // Ռեստորանը պատասխանել է սպասող ամրագրմանը, մինչ էջը բաց էր
    const answered = lastBookings.some((b) => previous.get(b.id) === "pending" && ["confirmed", "rejected"].includes(bookingState(b)));
    if (answered) {
      showToast(t("msgAnswered"));
      setMyBookingsOpen(true);
    }
    renderMyBookings();
  } catch (e) {}
}

// Ադմինի պատասխանը երևում է առանց էջը թարմացնելու
setInterval(() => {
  if (!myBookings.hidden && !document.hidden) loadMyBookings();
}, 30000);

function renderMyBookings() {
  myBookingsList.innerHTML = "";
  myBookingsEmpty.hidden = lastBookings.length > 0;

  // Կոճակի վրա միայն սպասող ամրագրումների քանակն է. հաստատվածներն ու մերժվածները երևում են պատուհանում
  myBookingsSummary.innerHTML = "";
  ["pending"].forEach((state) => {
    const count = lastBookings.filter((b) => bookingState(b) === state).length;
    if (!count) return;
    const chip = document.createElement("span");
    chip.className = "my-summary-chip " + state;
    chip.title = t(STATE_TEXT[state].badge);
    // Հեռախոսում անվանումը թաքցվում է, մնում են նշանն ու թիվը
    const label = document.createElement("span");
    label.className = "my-chip-label";
    label.textContent = t(STATE_TEXT[state].badge) + ":";
    chip.append(STATE_TEXT[state].icon + " ", label, " " + count);
    myBookingsSummary.appendChild(chip);
  });

  lastBookings.forEach((booking) => {
    const state = bookingState(booking);
    const item = document.createElement("li");
    item.className = "my-booking-card " + state;

    const top = document.createElement("div");
    top.className = "my-booking-top";
    const title = document.createElement("strong");
    title.textContent = booking.restaurantName || t("tableN", { n: booking.tableNumber });
    const badge = document.createElement("span");
    badge.className = "status-badge " + state;
    badge.textContent = t(STATE_TEXT[state].badge);
    top.append(title, badge);

    const details = document.createElement("p");
    details.className = "my-booking-details";
    details.textContent = t("tableN", { n: booking.tableNumber }) + " · " + formatDate(booking.date) + ", " +
      timeRange(booking.time, booking.duration) + " · " + t("guestsOption", { n: booking.guests });

    // Ռեստորանի պատասխանը. մերժման դեպքում՝ ադմինի գրած հաղորդագրությունը
    const message = document.createElement("div");
    message.className = "my-booking-message";
    const icon = document.createElement("span");
    icon.className = "my-booking-icon";
    icon.textContent = STATE_TEXT[state].icon;
    const text = document.createElement("div");
    const label = document.createElement("span");
    label.textContent = t(STATE_TEXT[state].message);
    text.appendChild(label);
    if (booking.rejectReason) {
      const reason = document.createElement("q");
      reason.textContent = booking.rejectReason;
      text.appendChild(reason);
    }
    message.append(icon, text);

    item.append(top, details, message);

    const isPast = new Date(booking.date + "T" + booking.time) < new Date();
    if (booking.canCancel) {
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "cancel-btn";
      cancelBtn.textContent = t("cancelBtn");
      cancelBtn.addEventListener("click", () => cancelBooking(booking, cancelBtn));
      item.appendChild(cancelBtn);
    } else if (booking.status !== "cancelled" && !isPast) {
      // Ամրագրմանը մնացել է 1 ժամից պակաս
      const closed = document.createElement("span");
      closed.className = "cancel-closed";
      closed.textContent = t("cancelTooLate");
      item.appendChild(closed);
    }

    myBookingsList.appendChild(item);
  });
}

async function cancelBooking(booking, btn) {
  const question = t("cancelConfirm", { n: booking.tableNumber, date: formatDate(booking.date), time: timeRange(booking.time, booking.duration) });
  if (!confirm(question)) return;

  btn.disabled = true;
  try {
    const { ok, result } = await postJson("/api/reservations/cancel", { id: booking.id });
    showToast(ok ? t("cancelled") : translateServer(result.error));
    loadMyBookings();
    // Չեղարկված սեղանը նորից ազատ է, թարմացնել հատակագիծը
    if (ok) searchTables();
  } catch (e) {
    showToast(t("networkError"));
    btn.disabled = false;
  }
}

// ---------- Ռեստորաններ (ցուցակը պահվում է բազայում, փոխվում է միայն ադմին պանելից) ----------

const restaurantGrid = document.getElementById("restaurantGrid");
const restaurantsEmpty = document.getElementById("restaurantsEmpty");
const restaurantsCity = document.getElementById("restaurantsCity");
const bookCity = document.getElementById("bookCity");
let restaurants = [];

// Էջում ցույց է տրվում ընտրված քաղաքի ռեստորաններից 9 պատահական ռեստորան.
// ցանկը նորից է ընտրվում բեռնելիս, քաղաքը փոխելիս և ամեն 10 րոպեն մեկ
const SHOWN_RESTAURANTS = 9;
const RESTAURANTS_REFRESH_MS = 10 * 60 * 1000;
let shownRestaurantIds = [];

function pickShownRestaurants() {
  const list = restaurants.filter(inCity(restaurantsCity.value));
  // Ֆիշեր–Յեյթսի խառնում, որից վերցվում են առաջին 9-ը
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  shownRestaurantIds = list.slice(0, SHOWN_RESTAURANTS).map((r) => r.id);
}

async function loadRestaurants() {
  try {
    const response = await fetch("/api/restaurants");
    if (!response.ok) return;
    restaurants = (await response.json()).restaurants;
    fillCitySelects();
    pickShownRestaurants();
    renderRestaurants();
    fillRestaurantSelect();
  } catch (e) {}
}

setInterval(loadRestaurants, RESTAURANTS_REFRESH_MS);

// Քաղաքների ցանկերը՝ ամեն քաղաքի կողքին այնտեղի ռեստորանների քանակով
function fillCitySelects() {
  const counts = {};
  restaurants.forEach((r) => { counts[r.city] = (counts[r.city] || 0) + 1; });
  fillCitySelect(restaurantsCity, { allLabel: true, counts });
  fillCitySelect(bookCity, { allLabel: true, counts });
}

const inCity = (city) => (restaurant) => !city || restaurant.city === city;

// Ռեստորանների բաժնում քաղաք ընտրելիս նույն քաղաքն ընտրվում է նաև ամրագրման ձևում
restaurantsCity.addEventListener("change", () => {
  pickShownRestaurants();
  renderRestaurants();
  bookCity.value = restaurantsCity.value;
  fillRestaurantSelect();
});

bookCity.addEventListener("change", fillRestaurantSelect);

// Ամրագրման ձևի «Restaurant» ցանկը՝ ընտրված քաղաքի ռեստորաններից, ընտրվածը պահելով
function fillRestaurantSelect() {
  const previous = bookRestaurant.value;
  const list = restaurants.filter(inCity(bookCity.value));
  bookRestaurant.innerHTML = "";
  list.forEach((restaurant) => bookRestaurant.add(new Option(restaurant.name, restaurant.id)));
  if (list.some((restaurant) => String(restaurant.id) === previous)) bookRestaurant.value = previous;

  // Նոր ռեստորան է ընտրված (կամ անունը փոխվել է)՝ թարմացնել հատակագիծը
  const selectedName = bookRestaurant.selectedOptions[0] ? bookRestaurant.selectedOptions[0].textContent : "";
  if (!lastSearch || lastSearch.restaurantId !== Number(bookRestaurant.value) || lastSearch.restaurantName !== selectedName) {
    searchTables();
  }
}

// Քարտի «Book a table» կոճակը ընտրում է ռեստորանը և տանում ամրագրման բաժին
function bookAtRestaurant(restaurant) {
  if (bookCity.value && bookCity.value !== restaurant.city) {
    bookCity.value = restaurant.city;
    fillRestaurantSelect();
  }
  bookRestaurant.value = restaurant.id;
  searchTables();
  document.getElementById("booking").scrollIntoView({ behavior: "smooth" });
}

function renderRestaurants() {
  restaurantGrid.innerHTML = "";
  // Նույն 9-ը մնում են, երբ էջը միայն վերագծվում է (օրինակ՝ լեզուն փոխելիս)
  const list = shownRestaurantIds.map((id) => restaurants.find((r) => r.id === id)).filter(Boolean);
  restaurantsEmpty.hidden = list.length > 0;
  restaurantsEmpty.textContent = t(restaurants.length ? "noRestaurantsInCity" : "restaurantsEmpty");

  list.forEach((restaurant) => {
    const card = document.createElement("div");
    card.className = "card photo-card";

    if (restaurant.imageUrl.startsWith("https://")) {
      const img = document.createElement("img");
      img.src = restaurant.imageUrl;
      img.alt = restaurant.name;
      img.loading = "lazy";
      card.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "restaurant-noimg";
      placeholder.textContent = "🍽️";
      card.appendChild(placeholder);
    }

    if (restaurant.cuisine) {
      const badge = document.createElement("span");
      badge.className = "cuisine-badge";
      badge.textContent = restaurant.cuisine;
      card.appendChild(badge);
    }

    const name = document.createElement("h3");
    name.textContent = restaurant.name;
    card.appendChild(name);

    card.appendChild(restaurantLocation(restaurant));

    if (restaurant.description) {
      const description = document.createElement("p");
      description.textContent = restaurant.description;
      card.appendChild(description);
    }

    const actions = document.createElement("div");
    actions.className = "admin-actions";
    const bookTableBtn = document.createElement("button");
    bookTableBtn.type = "button";
    bookTableBtn.className = "search-btn";
    bookTableBtn.textContent = t("bookTableBtn");
    bookTableBtn.addEventListener("click", () => bookAtRestaurant(restaurant));
    actions.appendChild(bookTableBtn);

    card.appendChild(actions);

    restaurantGrid.appendChild(card);
  });
}

loadRestaurants();

// ---------- Լեզվի ընտրություն ----------

const langSelect = document.getElementById("langSelect");

function applyLanguage() {
  langSelect.value = currentLang;
  applyStaticTranslations();
  applyTheme(root.getAttribute("data-theme"));
  translateGuestOptions();

  if (lastStatus) bookingStatus.textContent = lastStatus.text ?? t(lastStatus.key, lastStatus.vars);
  renderMyBookings();
  fillCitySelects();
  renderRestaurants();

  // Վերագծել սխեման նոր լեզվով՝ պահելով ընտրված սեղանը
  if (lastTables && lastSearch) {
    const selectedId = selectedTable && selectedTable.id;
    renderHall(lastTables, lastSearch.guests);
    const btn = selectedId && hall.querySelector('.hall-table[data-id="' + selectedId + '"]');
    if (btn) btn.click();
  }
}

langSelect.addEventListener("change", () => {
  currentLang = langSelect.value;
  try { localStorage.setItem("lang", currentLang); } catch (e) {}
  applyLanguage();
});

// Հատակագիծը բեռնվում է, երբ ռեստորանների ցուցակը գալիս է սերվերից (fillRestaurantSelect)
applyLanguage();

// Ջնջել բրաուզերում մնացած հին տվյալները, հիմա դրանք պահվում են սերվերում
try {
  localStorage.removeItem("registeredEmails");
  localStorage.removeItem("currentUser");
} catch (e) {}
