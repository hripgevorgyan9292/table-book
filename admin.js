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
  bell.show(Boolean(user && user.isAdmin));
  if (user && user.isAdmin) {
    loadAdminBookings();
    loadRestaurants();
    bell.load();
  }
}

// 🔔 Ծանուցումներ՝ հյուրը վճարեց կանխավճարը (գումարը սառեցված է), հյուրը չեղարկեց ամրագրումը
const bell = createNotificationBell({
  listUrl: "/api/admin/notifications",
  readUrl: "/api/admin/notifications/read",
  onNew: (text) => {
    showToast(text);
    loadAdminBookings();
  },
});

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

// Ցանկը թարմանում է ինքն իրեն. երևում են նոր ամրագրումները, իսկ մերժվածները
// անհետանում են 2 րոպե հետո, երբ սերվերը ջնջում է դրանք
setInterval(() => {
  if (currentUser && currentUser.isAdmin && !document.hidden) {
    loadAdminBookings();
    bell.load();
  }
}, 30 * 1000);

// Քաղաքները, որոնց ցանկը ադմինը բացել է (մնում են բաց 30 վայրկյանը մեկ թարմանալիս)
const openBookingCities = new Set();

function renderAdminBookings() {
  adminBookingsList.innerHTML = "";
  adminBookingsEmpty.hidden = adminBookings.length > 0;

  // Խմբեր ըստ քաղաքների. նախ այն քաղաքները, որտեղ կան նոր (սպասող) ամրագրումներ, հետո մնացածը՝ ցանկի կարգով
  const cityOrder = (key) => CITIES.findIndex((c) => c.key === key);
  const groups = {};
  adminBookings.forEach((booking) => { (groups[booking.restaurantCity] ||= []).push(booking); });
  const newCount = (list) => list.filter((b) => b.status === "pending").length;
  Object.keys(groups)
    .sort((a, b) => (newCount(groups[b]) > 0) - (newCount(groups[a]) > 0) || cityOrder(a) - cityOrder(b))
    .forEach((city) => adminBookingsList.appendChild(bookingCityGroup(city, groups[city], newCount(groups[city]))));
}

// Քաղաքի կոճակը (անուն, քանակ, «N նոր») և դրա տակ բացվող ամրագրումները
function bookingCityGroup(city, bookings, fresh) {
  const group = document.createElement("section");
  group.className = "booking-city";
  const open = openBookingCities.has(city);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "booking-city-toggle" + (fresh ? " has-new" : "");
  toggle.setAttribute("aria-expanded", String(open));
  const name = document.createElement("span");
  name.className = "booking-city-name";
  name.textContent = "📍 " + (city ? cityName(city) : t("cityUnknown"));
  const count = document.createElement("span");
  count.className = "booking-city-count";
  count.textContent = t("bookingsCount", { n: bookings.length });
  toggle.append(name, count);
  if (fresh) {
    const badge = document.createElement("span");
    badge.className = "booking-city-new";
    badge.textContent = t("newBookings", { n: fresh });
    toggle.appendChild(badge);
  }
  const chevron = document.createElement("span");
  chevron.className = "my-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▾";
  toggle.appendChild(chevron);

  const list = document.createElement("ul");
  list.className = "my-bookings-list booking-city-list";
  list.hidden = !open;
  bookings.forEach((booking) => list.appendChild(bookingItem(booking)));

  toggle.addEventListener("click", () => {
    const nowOpen = list.hidden;
    list.hidden = !nowOpen;
    toggle.setAttribute("aria-expanded", String(nowOpen));
    if (nowOpen) openBookingCities.add(city);
    else openBookingCities.delete(city);
  });

  group.append(toggle, list);
  return group;
}

// Ամրագրման տողը՝ հյուրը, պատվերը, վիճակը և «Հաստատել»/«Մերժել» կոճակները
function bookingItem(booking) {
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
  // Ուտեստները, որոնք հյուրը պատվիրել է ամրագրման հետ
  const order = orderLine(booking.order);
  if (order) main.appendChild(order);
  // Կանխավճարի վիճակը՝ սպասում է վճարման, սառեցված է, գանձված է, վերադարձված է
  const payment = paymentLine(booking.payment);
  if (payment) main.appendChild(payment);

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
    // Հաստատել կարելի է միայն վճարված (սառեցված) կանխավճարով ամրագրումը
    if (booking.payment && booking.payment.status !== "held") {
      confirmBtn.disabled = true;
      confirmBtn.title = t("confirmNeedsPayment");
    }

    const rejectBtn = document.createElement("button");
    rejectBtn.type = "button";
    rejectBtn.className = "cancel-btn";
    rejectBtn.textContent = t("rejectBtn");
    rejectBtn.addEventListener("click", () => openRejectForm(booking));
    item.append(confirmBtn, rejectBtn);
  }

  return item;
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

// Քաղաքը փոխում է և՛ սեղանների ձևի ռեստորանների ցանկը, և՛ ներքևի 9 քարտերը
atCity.addEventListener("change", () => {
  fillTablesRestaurantSelect();
  pickShownRestaurants();
  renderRestaurants();
});

// Ռեստորանների ցանկը վերցվում է նույն ցուցակից, որը ադմինը կառավարում է ներքևում՝ ընտրված քաղաքի ռեստորանները
function fillTablesRestaurantSelect() {
  const previous = atRestaurant.value;
  const list = restaurants.filter((r) => !atCity.value || r.city === atCity.value);
  atRestaurant.innerHTML = "";
  list.forEach((restaurant) => atRestaurant.add(new Option(restaurant.name, restaurant.id)));
  if (list.some((restaurant) => String(restaurant.id) === previous)) atRestaurant.value = previous;
  loadAdminTables();
  renderRestaurantDetail();
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

atForm.addEventListener("change", (event) => {
  loadAdminTables();
  // Ռեստորան, օր կամ ժամ ընտրելիս բացվում է «Ռեստորաններ» ներդիրը՝ ընտրված ռեստորանով և նրա սեղաններով
  if (event.target !== atCity) {
    renderRestaurants();
    showTab("restaurantsTab");
  }
});

// ---------- Աջ կողմի ներդիրները. միաժամանակ երևում է միայն մեկ հատված ----------

const contentTabs = document.querySelectorAll(".content-tab");
const tabPanels = document.querySelectorAll(".tab-panel");

function showTab(name) {
  tabPanels.forEach((panel) => { panel.hidden = panel.id !== name; });
  contentTabs.forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

contentTabs.forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.tab)));

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

// Ինչպես գլխավոր էջում՝ 9 պատահական ռեստորան սեղանների ձևում ընտրված քաղաքից.
// նորից ընտրվում են բեռնելիս, քաղաքը փոխելիս և ամեն 10 րոպեն մեկ
const SHOWN_RESTAURANTS = 9;
const RESTAURANTS_REFRESH_MS = 10 * 60 * 1000;
let shownRestaurantIds = [];

function pickShownRestaurants() {
  const list = restaurants.filter((r) => !atCity.value || r.city === atCity.value);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  shownRestaurantIds = list.slice(0, SHOWN_RESTAURANTS).map((r) => r.id);
}

// keep՝ պահել ցույց տրվողները (ավելացնելուց, փոխելուց, ջնջելուց հետո), addedId՝ նոր ռեստորանը դնել առաջինը
async function loadRestaurants({ keep = false, addedId = null } = {}) {
  try {
    const response = await fetch("/api/restaurants");
    if (!response.ok) return;
    restaurants = (await response.json()).restaurants;
    fillCitySelects();
    if (keep) {
      if (addedId) shownRestaurantIds = [addedId, ...shownRestaurantIds].slice(0, SHOWN_RESTAURANTS);
    } else {
      pickShownRestaurants();
    }
    renderRestaurants();
    fillTablesRestaurantSelect();
  } catch (e) {}
}

setInterval(() => {
  if (currentUser && currentUser.isAdmin) loadRestaurants();
}, RESTAURANTS_REFRESH_MS);

// ---------- Որոնում ռեստորանների մեջ ----------

const restaurantSearch = document.getElementById("restaurantSearch");
const restaurantSearchCount = document.getElementById("restaurantSearchCount");

// Որոնումը նայում է անվանմանը, խոհանոցին, հասցեին և քաղաքի անվանը բոլոր լեզուներով
function searchRestaurants(query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return restaurants.filter((r) => {
    const city = CITIES.find((c) => c.key === r.city);
    const text = [r.name, r.cuisine, r.address, ...(city ? Object.values(city.names) : [])].join(" ").toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

// Ձախում որոնելիս բացվում է «Ռեստորաններ» ներդիրը
restaurantSearch.addEventListener("input", () => {
  renderRestaurants();
  showTab("restaurantsTab");
});

// Ցուցակի վերևի փոքր սլաքով կոճակը. բացված վիճակում երևում են ընտրված քաղաքի բոլոր ռեստորանները
const restaurantListToggle = document.getElementById("restaurantListToggle");
// Սկզբից ցուցակում բոլոր ռեստորաններն են. սյունակում երևում է այնքանը, որքան տեղավորվում է, մնացածը՝ թերթելով
let showAllRestaurants = true;

restaurantListToggle.addEventListener("click", () => {
  showAllRestaurants = !showAllRestaurants;
  renderRestaurants();
});

// Ձախում՝ ռեստորանների կոմպակտ ցուցակը. ընտրվածը նույնն է, ինչ ձախ վահանակի «Ռեստորան»-ը
function renderRestaurants() {
  restaurantGrid.innerHTML = "";
  const query = restaurantSearch.value.trim();
  const inCity = restaurants.filter((r) => !atCity.value || r.city === atCity.value);
  // Որոնելիս երևում են բոլոր գտնվածները, բացված ցուցակում՝ քաղաքի բոլոր ռեստորանները (այբբենական կարգով),
  // իսկ փակ ցուցակում՝ 9 պատահականները
  const list = query
    ? searchRestaurants(query)
    : showAllRestaurants
      ? [...inCity].sort((a, b) => a.name.localeCompare(b.name))
      : shownRestaurantIds.map((id) => restaurants.find((r) => r.id === id)).filter(Boolean);
  restaurantListToggle.hidden = Boolean(query) || inCity.length <= SHOWN_RESTAURANTS;
  restaurantListToggle.setAttribute("aria-expanded", String(showAllRestaurants));
  // Կոճակին միայն սլաքն է, իսկ բացատրությունը՝ հուշման մեջ
  const toggleLabel = showAllRestaurants ? t("restaurantListLess") : t("restaurantListAll", { n: inCity.length });
  restaurantListToggle.title = toggleLabel;
  restaurantListToggle.setAttribute("aria-label", toggleLabel);
  restaurantSearchCount.textContent = query ? t("restaurantSearchFound", { n: list.length }) : "";
  restaurantsEmpty.hidden = list.length > 0;
  restaurantsEmpty.textContent = t(query ? "restaurantSearchNone" : restaurants.length ? "noRestaurantsInCity" : "restaurantsEmpty");

  list.forEach((restaurant) => {
    const item = document.createElement("li");
    const row = document.createElement("button");
    row.type = "button";
    row.className = "rest-row" + (String(restaurant.id) === atRestaurant.value ? " active" : "");
    row.appendChild(restaurantThumb(restaurant, "rest-row-thumb"));
    const text = document.createElement("span");
    text.className = "rest-row-text";
    const name = document.createElement("strong");
    name.textContent = restaurant.name;
    const meta = document.createElement("span");
    meta.textContent = [cityName(restaurant.city), restaurant.cuisine].filter(Boolean).join(" · ");
    text.append(name, meta);
    row.appendChild(text);
    row.addEventListener("click", () => selectRestaurant(restaurant));
    item.appendChild(row);
    restaurantGrid.appendChild(item);
  });
  renderRestaurantDetail();
}

// Ռեստորանի նկարը կամ 🍽️, եթե նկար չկա
function restaurantThumb(restaurant, className) {
  const box = document.createElement("span");
  box.className = className;
  if (restaurant.imageUrl.startsWith("https://")) {
    const img = document.createElement("img");
    img.src = restaurant.imageUrl;
    img.alt = "";
    img.loading = "lazy";
    box.appendChild(img);
  } else {
    box.textContent = "🍽️";
  }
  return box;
}

// Ցուցակից ընտրելիս ձախ վահանակի քաղաքը և ռեստորանը փոխվում են, և բեռնվում են նրա սեղանները
function selectRestaurant(restaurant) {
  if (atCity.value && atCity.value !== restaurant.city) {
    atCity.value = restaurant.city;
    fillTablesRestaurantSelect();
  }
  atRestaurant.value = restaurant.id;
  loadAdminTables();
  renderRestaurants();
}

const restaurantDetail = document.getElementById("restaurantDetail");
const restaurantDetailEmpty = document.getElementById("restaurantDetailEmpty");

// Աջում՝ ընտրված ռեստորանը. նկար, տվյալներ, «Ճաշացանկ», «Փոխել», «Ջնջել» և սեղանները
function renderRestaurantDetail() {
  const restaurant = restaurants.find((r) => String(r.id) === atRestaurant.value);
  restaurantDetail.hidden = !restaurant;
  restaurantDetailEmpty.hidden = Boolean(restaurant);
  if (!restaurant) return;

  const cover = document.getElementById("rdCover");
  cover.innerHTML = "";
  cover.appendChild(restaurantThumb(restaurant, "rest-cover-img"));
  document.getElementById("rdName").textContent = restaurant.name;
  document.getElementById("rdMeta").textContent =
    [restaurant.cuisine, cityName(restaurant.city), restaurant.address].filter(Boolean).join(" · ");
  document.getElementById("rdDesc").textContent = restaurant.description;

  const actions = document.getElementById("rdActions");
  actions.innerHTML = "";
  const button = (label, className, onClick) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.textContent = t(label);
    btn.addEventListener("click", () => onClick(btn));
    actions.appendChild(btn);
  };
  button("menuBtn", "search-btn", () => openMenuEditor(restaurant));
  button("editBtn", "outline-btn", () => openRestaurantForm(restaurant));
  button("deleteBtn", "cancel-btn", (btn) => deleteRestaurant(restaurant, btn));
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
  importForm.reset();
  setImportStatus("importHint");
  restaurantModal.hidden = false;
  (restaurant ? restaurantForm.elements.name : importForm.elements.url).focus();
}

addRestaurantBtn.addEventListener("click", () => openRestaurantForm(null));

// ---------- Ճաշացանկի խմբագրում ----------

const menuEditorModal = document.getElementById("menuEditorModal");
const menuEditorTitle = document.getElementById("menuEditorTitle");
const menuEditorMeta = document.getElementById("menuEditorMeta");
const menuEditorList = document.getElementById("menuEditorList");
const menuEditorEmpty = document.getElementById("menuEditorEmpty");
const menuEditorTabs = document.getElementById("menuEditorTabs");
const dishForm = document.getElementById("dishForm");
const dishSubmit = document.getElementById("dishSubmit");
const dishCancel = document.getElementById("dishCancel");
const dishFormTitle = document.getElementById("dishFormTitle");
const DISH_FIELDS = { category: "dCategory", name: "dName", description: "dDescription", price: "dPrice", imageUrl: "dImage" };
// { restaurant, items, categories, editing } — editing՝ այն ուտեստը, որը հիմա փոխվում է
let menuEditor = null;

async function openMenuEditor(restaurant) {
  menuEditor = { restaurant, items: [], categories: [], editing: null, category: "" };
  if (!(await loadMenuEditor())) return;
  resetDishForm();
  menuEditorModal.hidden = false;
  menuEditorModal.querySelector(".modal").scrollTop = 0;
  menuEditorModal.querySelector(".modal-close").focus();
}

async function loadMenuEditor() {
  try {
    const response = await fetch("/api/menu?restaurantId=" + menuEditor.restaurant.id);
    const result = await response.json();
    if (!response.ok) {
      showToast(translateServer(result.error));
      return false;
    }
    menuEditor.items = result.items;
    menuEditor.categories = result.categories;
    renderMenuEditor();
    return true;
  } catch (e) {
    showToast(t("networkError"));
    return false;
  }
}

function renderMenuEditor() {
  if (!menuEditor) return;
  const { restaurant, items, categories } = menuEditor;
  menuEditorTitle.textContent = t("menuEditorTitle", { name: restaurant.name });
  menuEditorMeta.textContent = [restaurant.cuisine, cityName(restaurant.city), t("menuDishCount", { n: items.length })]
    .filter(Boolean).join(" · ");

  const select = dishForm.elements.category;
  const previous = select.value;
  select.innerHTML = "";
  categories.forEach((key) => select.add(new Option(t("menuCat_" + key), key)));
  if (previous) select.value = previous;

  dishSubmit.textContent = t(menuEditor.editing ? "saveDish" : "addDish");
  dishFormTitle.textContent = menuEditor.editing ? t("dishFormEdit", { name: menuEditor.editing.name }) : t("dishFormAdd");
  // Եթե ընտրված բաժնում ուտեստ չի մնացել, վերադառնալ «Բոլորը»-ին
  if (menuEditor.category && !items.some((item) => item.category === menuEditor.category)) menuEditor.category = "";
  // Բաժինների կոճակներ վերևում՝ «Բոլորը» և այն բաժինները, որտեղ ուտեստ կա (ինչպես գլխավոր էջում)
  menuEditorTabs.innerHTML = "";
  ["", ...categories.filter((key) => items.some((item) => item.category === key))].forEach((key) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "menu-tab" + (key === menuEditor.category ? " active" : "");
    tab.textContent = key ? t("menuCat_" + key) : t("menuAll");
    tab.addEventListener("click", () => {
      menuEditor.category = key;
      renderMenuEditor();
    });
    menuEditorTabs.appendChild(tab);
  });
  menuEditorTabs.hidden = items.length === 0;

  menuEditorEmpty.hidden = items.length > 0;
  renderMenuList(menuEditorList, items, categories, {
    category: menuEditor.category,
    decorate: (row, dish) => {
      if (menuEditor.editing && menuEditor.editing.id === dish.id) row.classList.add("editing");
      const actions = document.createElement("div");
      actions.className = "menu-item-actions";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "outline-btn";
      editBtn.textContent = t("editBtn");
      editBtn.addEventListener("click", () => editDish(dish));
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "cancel-btn";
      deleteBtn.textContent = t("deleteBtn");
      deleteBtn.addEventListener("click", () => deleteDish(dish, deleteBtn));
      actions.append(editBtn, deleteBtn);
      row.appendChild(actions);
    },
  });
}

// Ձևը վերադառնում է «Ավելացնել» վիճակին. բաժինը մնում է նույնը, որ հարմար լինի մի քանի ուտեստ անընդմեջ ավելացնել
function resetDishForm() {
  const category = dishForm.elements.category.value;
  dishForm.reset();
  if (category) dishForm.elements.category.value = category;
  Object.values(DISH_FIELDS).forEach((id) => showError(id, ""));
  menuEditor.editing = null;
  dishCancel.hidden = true;
  renderMenuEditor();
}

function editDish(dish) {
  menuEditor.editing = dish;
  Object.keys(DISH_FIELDS).forEach((field) => { dishForm.elements[field].value = dish[field]; });
  Object.values(DISH_FIELDS).forEach((id) => showError(id, ""));
  dishCancel.hidden = false;
  renderMenuEditor();
  // Ձևը ներքևում է՝ թերթել մինչև այն
  dishForm.scrollIntoView({ behavior: "smooth", block: "end" });
  dishForm.elements.name.focus({ preventScroll: true });
}

dishCancel.addEventListener("click", resetDishForm);
dishForm.addEventListener("input", (event) => showError(event.target.id, ""));

dishForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = {
    category: dishForm.elements.category.value,
    name: dishForm.elements.name.value.trim(),
    description: dishForm.elements.description.value.trim(),
    price: Number(dishForm.elements.price.value),
    imageUrl: dishForm.elements.imageUrl.value.trim(),
  };
  if (!data.name) return showError("dName", t("errDishName"));
  if (dishForm.elements.price.value === "" || !Number.isInteger(data.price) || data.price < 0) {
    return showError("dPrice", t("errPrice"));
  }
  if (data.imageUrl && !/^https:\/\/\S+$/.test(data.imageUrl)) return showError("dImage", t("errImage"));

  dishSubmit.disabled = true;
  try {
    const editing = menuEditor.editing;
    const { ok, result } = editing
      ? await postJson("/api/admin/menu/update", { id: editing.id, ...data })
      : await postJson("/api/admin/menu", { restaurantId: menuEditor.restaurant.id, ...data });
    if (!ok) {
      Object.entries(result.errors || {}).forEach(([field, message]) => showError(DISH_FIELDS[field], translateServer(message)));
      if (result.error) showToast(translateServer(result.error));
      return;
    }
    showToast(t(editing ? "dishSaved" : "dishAdded"));
    // Եթե ընտրված է այլ բաժին, անցնել ավելացված կամ փոխված ուտեստի բաժնին, որ այն երևա
    if (menuEditor.category && menuEditor.category !== data.category) menuEditor.category = data.category;
    await loadMenuEditor();
    resetDishForm();
    dishForm.scrollIntoView({ block: "end" });
    dishForm.elements.name.focus({ preventScroll: true });
  } catch (e) {
    showToast(t("networkError"));
  } finally {
    dishSubmit.disabled = false;
  }
});

async function deleteDish(dish, btn) {
  if (!confirm(t("deleteDishConfirm", { name: dish.name }))) return;
  btn.disabled = true;
  try {
    const { ok, result } = await postJson("/api/admin/menu/delete", { id: dish.id });
    showToast(ok ? t("dishDeleted") : translateServer(result.error));
    if (menuEditor.editing && menuEditor.editing.id === dish.id) resetDishForm();
    await loadMenuEditor();
  } catch (e) {
    showToast(t("networkError"));
    btn.disabled = false;
  }
}

function closeMenuEditor() {
  menuEditorModal.hidden = true;
}

menuEditorModal.querySelector(".modal-close").addEventListener("click", closeMenuEditor);
menuEditorModal.addEventListener("click", (event) => {
  if (event.target === menuEditorModal) closeMenuEditor();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !menuEditorModal.hidden) closeMenuEditor();
});

// ---------- Ռեստորանի տվյալները՝ նրա էջի հղումով ----------

const importForm = document.getElementById("importForm");
const importStatus = document.getElementById("importStatus");

function setImportStatus(key, { text = null, kind = "" } = {}) {
  importStatus.textContent = text ?? t(key);
  importStatus.className = "import-status" + (kind ? " " + kind : "");
}

// Էջի տեղանքը («Gyumri», «Գյումրի», «Гюмри», ...) համեմատվում է քաղաքների անուններին բոլոր լեզուներով
function matchCity(...texts) {
  const haystack = texts.join(" ").toLowerCase();
  if (!haystack.trim()) return "";
  const city = CITIES.find((c) => Object.values(c.names).some((name) => haystack.includes(name.replace(/\s*\(.*\)$/, "").toLowerCase())));
  return city ? city.key : "";
}

importForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = importForm.elements.url.value.trim();
  if (!/^https?:\/\/\S+$/i.test(url)) {
    setImportStatus("errImportUrl", { kind: "error" });
    return;
  }

  const btn = importForm.querySelector(".search-btn");
  btn.disabled = true;
  setImportStatus("importLoading");
  try {
    const { ok, result } = await postJson("/api/admin/restaurants/import", { url });
    if (!ok) {
      setImportStatus(null, { text: translateServer(result.error), kind: "error" });
      return;
    }
    // Լցնել միայն այն դաշտերը, որոնք գտնվել են էջում. մնացածը մնում են ինչպես կային
    const found = result.restaurant;
    ["name", "cuisine", "address", "description", "imageUrl"].forEach((field) => {
      if (found[field]) {
        restaurantForm.elements[field].value = found[field];
        showError(RESTAURANT_FIELDS[field], "");
      }
    });
    const city = matchCity(found.city, found.address);
    if (city) rCity.value = city;
    setImportStatus(city || !found.city ? "importDone" : "importDoneNoCity", { kind: "success" });
  } catch (e) {
    setImportStatus("networkError", { kind: "error" });
  } finally {
    btn.disabled = false;
  }
});

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
    loadRestaurants({ keep: true, addedId: editingRestaurant ? null : result.restaurant.id });
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
    loadRestaurants({ keep: true });
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
  renderMenuEditor();
  bell.render();
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
