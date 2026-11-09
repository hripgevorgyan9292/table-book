// ---------- Ադմին պանել ----------

const root = document.documentElement;
const toggle = document.getElementById("themeToggle");
const langSelect = document.getElementById("langSelect");
const adminName = document.getElementById("adminName");
const logoutBtn = document.getElementById("logoutBtn");
const loginView = document.getElementById("loginView");
const deniedView = document.getElementById("deniedView");
const panelView = document.getElementById("panelView");
const loginForm = document.getElementById("adminLoginForm");
let currentUser = null;

// Բաց/մուգ ռեժիմ՝ նույնը, ինչ գլխավոր էջում (ընտրությունը ընդհանուր է)
function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  const label = theme === "dark" ? t("themeLight") : t("themeDark");
  toggle.innerHTML = (theme === "dark" ? "☀️" : "🌙") + '<span class="btn-label"> ' + label + "</span>";
  toggle.setAttribute("aria-label", label);
}

let savedTheme = null;
try { savedTheme = localStorage.getItem("theme"); } catch (e) {}
applyTheme(savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

toggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem("theme", next); } catch (e) {}
});

// Ցույց տալ երեք վիճակներից մեկը. մուտքի ձև, «Մուտքն արգելված է» կամ պանել
function showView(user) {
  currentUser = user;
  loginView.hidden = Boolean(user);
  deniedView.hidden = !user || user.isAdmin;
  panelView.hidden = !user || !user.isAdmin;
  adminName.hidden = !user;
  logoutBtn.hidden = !user;
  renderUser();
  if (user && user.isAdmin) {
    loadAdminBookings();
    loadRestaurants();
  }
}

function renderUser() {
  if (!currentUser) return;
  const role = currentUser.isAdmin ? " · " + t("adminTag") : "";
  adminName.textContent = "👤 " + currentUser.firstName + " " + currentUser.lastName + role;
  document.getElementById("adminWelcome").textContent = t("adminWelcome", { name: currentUser.firstName + " " + currentUser.lastName });
}

function showError(fieldId, message) {
  document.getElementById(fieldId + "Error").textContent = message;
  document.getElementById(fieldId).parentElement.classList.toggle("invalid", message !== "");
}

loginForm.addEventListener("input", (event) => showError(event.target.id, ""));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  showError("adminEmail", email ? "" : t("errEmailEmpty"));
  showError("adminPassword", password ? "" : t("errLoginPassword"));
  if (!email || !password) return;

  const submitBtn = loginForm.querySelector(".submit-btn");
  submitBtn.disabled = true;
  try {
    // Ադմինի առանձին մուտք. հյուրի հաշիվը մերժվում է և մուտք չի գործում
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();
    if (!response.ok) {
      // 403՝ ճիշտ գաղտնաբառ, բայց հաշիվը ադմին չէ
      showError("adminPassword", response.status === 403 ? t("notAdminAccount") : translateServer(result.error));
      return;
    }
    loginForm.reset();
    showView(result.user);
  } catch (e) {
    showError("adminPassword", t("networkError"));
  } finally {
    submitBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await fetch("/api/admin/logout", { method: "POST" });
  } catch (e) {}
  showView(null);
});

// ---------- Օգնական ֆունկցիաներ ----------

const toast = document.getElementById("toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
}

async function postJson(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return { ok: response.ok, result: await response.json() };
}

function formatDate(date) {
  const [, month, day] = date.split("-").map(Number);
  return t("formatDate", { day, month: month - 1 });
}

// Ամրագրման ժամանակահատվածը, օրինակ՝ 19:00–20:00
function timeRange(time, duration) {
  const [h, m] = time.split(":").map(Number);
  const end = h * 60 + m + duration;
  return time + "–" + String(Math.floor(end / 60)).padStart(2, "0") + ":" + String(end % 60).padStart(2, "0");
}

// ---------- Ամրագրումներ՝ «Հաստատել» կոճակով ----------

const adminBookingsList = document.getElementById("adminBookingsList");
const adminBookingsEmpty = document.getElementById("adminBookingsEmpty");
const STATUS_KEYS = { pending: "statusPending", confirmed: "statusConfirmed", cancelled: "statusCancelled" };
let adminBookings = [];

async function loadAdminBookings() {
  try {
    const response = await fetch("/api/admin/reservations");
    if (!response.ok) return;
    adminBookings = (await response.json()).reservations;
    renderAdminBookings();
  } catch (e) {}
}

function renderAdminBookings() {
  adminBookingsList.innerHTML = "";
  adminBookingsEmpty.hidden = adminBookings.length > 0;

  adminBookings.forEach((booking) => {
    const item = document.createElement("li");
    item.className = "booking-item" + (booking.status === "cancelled" ? " is-cancelled" : "");

    const main = document.createElement("div");
    main.className = "booking-main";
    const title = document.createElement("strong");
    title.textContent = (booking.restaurantName ? booking.restaurantName + " · " : "") + t("tableN", { n: booking.tableNumber });
    const details = document.createElement("span");
    details.textContent = formatDate(booking.date) + ", " + timeRange(booking.time, booking.duration) +
      " · " + t("guestsOption", { n: booking.guests });
    const guest = document.createElement("span");
    guest.className = "booking-guest";
    guest.textContent = "👤 " + booking.guestName + " · " + booking.guestEmail;
    main.append(title, details, guest);

    if (booking.rejectReason) {
      const reason = document.createElement("span");
      reason.className = "reject-reason";
      reason.textContent = t("rejectReasonShown", { reason: booking.rejectReason });
      main.appendChild(reason);
    }

    const badge = document.createElement("span");
    badge.className = "status-badge " + booking.status;
    badge.textContent = t(booking.rejectReason ? "statusRejected" : STATUS_KEYS[booking.status] || "statusPending");
    item.append(main, badge);

    if (booking.status === "pending") {
      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "search-btn";
      confirmBtn.textContent = t("confirmBtn");
      confirmBtn.addEventListener("click", () => confirmBooking(booking, confirmBtn));

      const rejectBtn = document.createElement("button");
      rejectBtn.type = "button";
      rejectBtn.className = "cancel-btn";
      rejectBtn.textContent = t("rejectBtn");
      rejectBtn.addEventListener("click", () => openRejectForm(booking));
      item.append(confirmBtn, rejectBtn);
    }

    adminBookingsList.appendChild(item);
  });
}

async function confirmBooking(booking, btn) {
  btn.disabled = true;
  try {
    const { ok, result } = await postJson("/api/admin/reservations/confirm", { id: booking.id });
    showToast(ok ? t("bookingConfirmed") : translateServer(result.error));
    loadAdminBookings();
    loadAdminTables();
  } catch (e) {
    showToast(t("networkError"));
    btn.disabled = false;
  }
}

// ---------- Ամրագրման մերժում ----------

const rejectModal = document.getElementById("rejectModal");
const rejectForm = document.getElementById("rejectForm");
const rejectTemplates = document.getElementById("rejectTemplates");
const rejectBookingInfo = document.getElementById("rejectBookingInfo");
// Պատրաստի պատասխաններ. ընտրվածը լցվում է դաշտում, որտեղ ադմինը կարող է այն փոխել
const REJECT_TEMPLATES = ["rejectTplBusy", "rejectTplClosed", "rejectTplGuests", "rejectTplTime"];
let rejectingBooking = null;

function renderRejectTemplates() {
  rejectTemplates.innerHTML = "";
  REJECT_TEMPLATES.forEach((key) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reject-template";
    btn.textContent = t(key + "Title");
    btn.addEventListener("click", () => {
      rejectForm.reason.value = t(key);
      showError("rejectReason", "");
      rejectTemplates.querySelectorAll(".reject-template").forEach((b) => b.classList.toggle("selected", b === btn));
    });
    rejectTemplates.appendChild(btn);
  });
}

function openRejectForm(booking) {
  rejectingBooking = booking;
  rejectBookingInfo.textContent = "👤 " + booking.guestName + " · " +
    (booking.restaurantName ? booking.restaurantName + " · " : "") + t("tableN", { n: booking.tableNumber }) +
    " · " + formatDate(booking.date) + ", " + timeRange(booking.time, booking.duration);
  rejectForm.reset();
  showError("rejectReason", "");
  renderRejectTemplates();
  rejectModal.hidden = false;
  rejectForm.reason.focus();
}

function closeRejectForm() {
  rejectModal.hidden = true;
}

rejectModal.querySelector(".modal-close").addEventListener("click", closeRejectForm);
rejectModal.addEventListener("click", (event) => {
  if (event.target === rejectModal) closeRejectForm();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !rejectModal.hidden) closeRejectForm();
});
rejectForm.reason.addEventListener("input", () => showError("rejectReason", ""));

rejectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const reason = rejectForm.reason.value.trim();
  if (!reason) return showError("rejectReason", t("errRejectReason"));

  const submitBtn = rejectForm.querySelector(".submit-btn");
  submitBtn.disabled = true;
  try {
    const { ok, result } = await postJson("/api/admin/reservations/reject", { id: rejectingBooking.id, reason });
    if (ok) {
      closeRejectForm();
      showToast(t("bookingRejected"));
      loadAdminBookings();
      loadAdminTables();
    } else {
      showError("rejectReason", translateServer(result.error));
    }
  } catch (e) {
    showToast(t("networkError"));
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------- Ազատ և զբաղված սեղաններ ----------

const atForm = document.getElementById("adminTablesForm");
const atRestaurant = document.getElementById("atRestaurant");
const atDate = document.getElementById("atDate");
const atTime = document.getElementById("atTime");
const adminTablesGrid = document.getElementById("adminTablesGrid");
const adminTablesSummary = document.getElementById("adminTablesSummary");
let adminTables = [];

// Ժամեր՝ 10:00-ից 22:00, ամեն 30 րոպեն մեկ (նույնը, ինչ հյուրերի ամրագրման ձևում)
for (let h = 10; h <= 22; h++) {
  ["00", "30"].forEach((m) => {
    if (h === 22 && m === "30") return;
    const time = String(h).padStart(2, "0") + ":" + m;
    atTime.add(new Option(time, time));
  });
}
// Լռելյայն՝ «All day» (ամբողջ օրվա ամրագրումները)
atTime.value = "";
atDate.value = (() => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
})();

const atCity = document.getElementById("atCity");
const rCity = document.getElementById("rCity");

// Քաղաքների ցանկերը. սեղանների ձևում՝ ռեստորանների քանակով, ռեստորանի ձևում՝ առանց «Բոլոր քաղաքները»
function fillCitySelects() {
  const counts = {};
  restaurants.forEach((r) => { counts[r.city] = (counts[r.city] || 0) + 1; });
  fillCitySelect(atCity, { allLabel: true, counts });
  fillCitySelect(rCity);
}

atCity.addEventListener("change", fillTablesRestaurantSelect);

// Ռեստորանների ցանկը վերցվում է նույն ցուցակից, որը ադմինը կառավարում է ներքևում՝ ընտրված քաղաքի ռեստորանները
function fillTablesRestaurantSelect() {
  const previous = atRestaurant.value;
  const list = restaurants.filter((r) => !atCity.value || r.city === atCity.value);
  atRestaurant.innerHTML = "";
  list.forEach((restaurant) => atRestaurant.add(new Option(restaurant.name, restaurant.id)));
  if (list.some((restaurant) => String(restaurant.id) === previous)) atRestaurant.value = previous;
  loadAdminTables();
}

async function loadAdminTables() {
  if (!atRestaurant.value || !atDate.value) {
    adminTables = [];
    renderAdminTables();
    return;
  }
  try {
    const response = await fetch("/api/admin/tables?restaurantId=" + atRestaurant.value +
      "&date=" + encodeURIComponent(atDate.value) + (atTime.value ? "&time=" + encodeURIComponent(atTime.value) : ""));
    const result = await response.json();
    if (!response.ok) {
      adminTables = [];
      renderAdminTables();
      adminTablesSummary.textContent = translateServer(result.error);
      return;
    }
    adminTables = result.tables;
    renderAdminTables();
  } catch (e) {
    adminTablesSummary.textContent = t("networkError");
  }
}

function renderAdminTables() {
  adminTablesGrid.innerHTML = "";
  const busy = adminTables.filter((table) => !table.free).length;
  const allDay = !atTime.value;
  if (!adminTables.length) adminTablesSummary.textContent = "";
  else if (allDay) adminTablesSummary.textContent = t("adminTablesSummaryDay", { busy, total: adminTables.length });
  else adminTablesSummary.textContent = t("adminTablesSummary", { free: adminTables.length - busy, busy });

  adminTables.forEach((table) => {
    const card = document.createElement("div");
    card.className = "admin-table-card " + (table.free ? "free" : "busy");

    const head = document.createElement("div");
    head.className = "admin-table-head";
    const title = document.createElement("strong");
    title.textContent = t("tableN", { n: table.number }) + " · " + t("seatsShort", { n: table.seats });
    const state = document.createElement("span");
    state.className = "admin-table-state";
    state.textContent = t(table.free ? (allDay ? "freeAllDay" : "legendFree") : "legendBusy");
    head.append(title, state);
    card.appendChild(head);

    // Յուրաքանչյուր ամրագրում՝ երբ, ով, քանի հոգով և ինչ ստատուսով
    table.bookings.forEach((booking) => {
      const line = document.createElement("span");
      line.className = "booking-guest";
      line.textContent = timeRange(booking.time, booking.duration) + " · 👤 " + booking.guestName + " · " +
        t("guestsOption", { n: booking.guests }) + " · " + t(STATUS_KEYS[booking.status] || "statusPending");
      card.appendChild(line);
    });

    adminTablesGrid.appendChild(card);
  });
}

atForm.addEventListener("change", loadAdminTables);

// ---------- Ռեստորաններ՝ ավելացնել, փոխել, ջնջել ----------

const restaurantGrid = document.getElementById("restaurantGrid");
const restaurantsEmpty = document.getElementById("restaurantsEmpty");
const addRestaurantBtn = document.getElementById("addRestaurantBtn");
const restaurantModal = document.getElementById("restaurantModal");
const restaurantForm = document.getElementById("restaurantForm");
const restaurantFormTitle = document.getElementById("restaurantFormTitle");
const RESTAURANT_FIELDS = { name: "rName", city: "rCity", cuisine: "rCuisine", address: "rAddress", description: "rDescription", imageUrl: "rImageUrl" };
let restaurants = [];
let editingRestaurant = null;

async function loadRestaurants() {
  try {
    const response = await fetch("/api/restaurants");
    if (!response.ok) return;
    restaurants = (await response.json()).restaurants;
    fillCitySelects();
    renderRestaurants();
    fillTablesRestaurantSelect();
  } catch (e) {}
}

function renderRestaurants() {
  restaurantGrid.innerHTML = "";
  restaurantsEmpty.hidden = restaurants.length > 0;

  restaurants.forEach((restaurant) => {
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

    const actions = document.createElement("div");
    actions.className = "admin-actions";
    // «Tables»՝ ցույց տալ այս ռեստորանի ազատ և զբաղված սեղանները
    const tablesBtn = document.createElement("button");
    tablesBtn.type = "button";
    tablesBtn.className = "search-btn";
    tablesBtn.textContent = t("tablesBtn");
    tablesBtn.addEventListener("click", () => {
      if (atCity.value && atCity.value !== restaurant.city) {
        atCity.value = restaurant.city;
        fillTablesRestaurantSelect();
      }
      atRestaurant.value = restaurant.id;
      loadAdminTables();
      document.getElementById("adminTables").scrollIntoView({ behavior: "smooth" });
    });
    actions.appendChild(tablesBtn);
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "outline-btn";
    editBtn.textContent = t("editBtn");
    editBtn.addEventListener("click", () => openRestaurantForm(restaurant));
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "cancel-btn";
    deleteBtn.textContent = t("deleteBtn");
    deleteBtn.addEventListener("click", () => deleteRestaurant(restaurant, deleteBtn));
    actions.append(editBtn, deleteBtn);
    card.appendChild(actions);

    restaurantGrid.appendChild(card);
  });
}

// Ձևի պատուհանը. բացել, փակել ×-ով, Esc-ով կամ դուրս սեղմելով
function closeRestaurantForm() {
  restaurantModal.hidden = true;
}

restaurantModal.querySelector(".modal-close").addEventListener("click", closeRestaurantForm);
restaurantModal.addEventListener("click", (event) => {
  if (event.target === restaurantModal) closeRestaurantForm();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !restaurantModal.hidden) closeRestaurantForm();
});

// restaurant=null՝ նոր ռեստորան, այլապես՝ փոխել եղածը
function openRestaurantForm(restaurant) {
  editingRestaurant = restaurant;
  restaurantFormTitle.textContent = t(restaurant ? "restaurantFormEdit" : "restaurantFormAdd");
  Object.entries(RESTAURANT_FIELDS).forEach(([field, id]) => {
    restaurantForm.elements[field].value = restaurant ? restaurant[field] : "";
    showError(id, "");
  });
  // Նոր ռեստորանի քաղաքը՝ սեղանների ձևում ընտրվածը, կամ Երևան
  if (!restaurant) rCity.value = atCity.value || "yerevan";
  restaurantModal.hidden = false;
  restaurantForm.elements.name.focus();
}

addRestaurantBtn.addEventListener("click", () => openRestaurantForm(null));

restaurantForm.addEventListener("input", (event) => showError(event.target.id, ""));

restaurantForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = {};
  Object.keys(RESTAURANT_FIELDS).forEach((field) => { data[field] = restaurantForm.elements[field].value.trim(); });

  if (!data.name) {
    showError("rName", t("errName"));
    return;
  }

  const saveBtn = restaurantForm.querySelector(".submit-btn");
  saveBtn.disabled = true;
  try {
    const url = editingRestaurant ? "/api/restaurants/update" : "/api/restaurants";
    const { ok, result } = await postJson(url, editingRestaurant ? { id: editingRestaurant.id, ...data } : data);

    if (!ok) {
      Object.entries(result.errors || {}).forEach(([field, message]) => showError(RESTAURANT_FIELDS[field], translateServer(message)));
      if (result.error) showToast(translateServer(result.error));
      return;
    }

    closeRestaurantForm();
    showToast(t("restaurantSaved"));
    loadRestaurants();
  } catch (e) {
    showToast(t("networkError"));
  } finally {
    saveBtn.disabled = false;
  }
});

async function deleteRestaurant(restaurant, btn) {
  if (!confirm(t("deleteConfirm", { name: restaurant.name }))) return;

  btn.disabled = true;
  try {
    const { ok, result } = await postJson("/api/restaurants/delete", { id: restaurant.id });
    showToast(ok ? t("restaurantDeleted") : translateServer(result.error));
    loadRestaurants();
    // Ջնջված ռեստորանի ամրագրումները չեղարկվում են, թարմացնել ցուցակը
    loadAdminBookings();
  } catch (e) {
    showToast(t("networkError"));
    btn.disabled = false;
  }
}

// Լեզուն ընդհանուր է գլխավոր էջի հետ
function applyLanguage() {
  langSelect.value = currentLang;
  applyStaticTranslations();
  document.title = t("adminPageTitle");
  applyTheme(root.getAttribute("data-theme"));
  renderUser();
  renderAdminBookings();
  renderAdminTables();
  fillCitySelects();
  renderRestaurants();
  renderRejectTemplates();
  restaurantFormTitle.textContent = t(editingRestaurant ? "restaurantFormEdit" : "restaurantFormAdd");
}

langSelect.addEventListener("change", () => {
  currentLang = langSelect.value;
  try { localStorage.setItem("lang", currentLang); } catch (e) {}
  applyLanguage();
});

applyLanguage();

// Էջը բացելիս ստուգել՝ արդյոք արդեն մուտք է գործած
fetch("/api/admin/me")
  .then((response) => response.json())
  .then((result) => showView(result.user))
  .catch(() => showView(null));
