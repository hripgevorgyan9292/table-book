// ---------- Թեստային վճարման էջ՝ ամրագրման կանխավճար ----------

const root = document.documentElement;
const toggle = document.getElementById("themeToggle");
const langSelect = document.getElementById("langSelect");
const payView = document.getElementById("payView");
const payResult = document.getElementById("payResult");
const payForm = document.getElementById("payForm");
const payBtn = document.getElementById("payBtn");
const payTimer = document.getElementById("payTimer");
const toast = document.getElementById("toast");
const paymentId = Number(new URLSearchParams(location.search).get("id"));
let state = null; // { payment, booking }
let timerId = null;
let resultKey = null;

// Բաց/մուգ ռեժիմ՝ նույնը, ինչ մյուս էջերում
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

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 4000);
}

function showError(fieldId, message) {
  document.getElementById(fieldId + "Error").textContent = message;
  document.getElementById(fieldId).parentElement.closest(".field").classList.toggle("invalid", message !== "");
}

// ---------- Ամրագրման տվյալները և 15 րոպեի հաշվիչը ----------

function render() {
  if (!state) return;
  const { payment, booking } = state;
  document.getElementById("payRestaurant").textContent = booking.restaurant;
  document.getElementById("payTable").textContent = t("tableN", { n: booking.table });
  const [, month, day] = booking.date.split("-").map(Number);
  document.getElementById("payWhen").textContent = t("formatDate", { day, month: month - 1 }) + ", " + booking.time;
  document.getElementById("payAmount").textContent = formatPrice(payment.amount);
  payBtn.textContent = t("payButton", { amount: formatPrice(payment.amount) });
  updateTimer();
}

function updateTimer() {
  if (!state) return;
  const left = Math.max(0, Math.floor((new Date(state.payment.expiresAt) - Date.now()) / 1000));
  const text = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
  payTimer.textContent = t("payTimeLeft", { time: text });
  payTimer.classList.toggle("urgent", left < 120);
  if (left === 0) showResult("expired");
}

// Վերջնական վիճակներ՝ վճարված, ժամկետն անցել է, արդեն վճարված է, մուտք գործեք, չի գտնվել
const RESULTS = {
  paid: { icon: "✅", title: "payDoneTitle", text: "payDoneText" },
  expired: { icon: "⌛", title: "payExpiredTitle", text: "payExpiredText" },
  already: { icon: "ℹ️", title: "payAlreadyTitle", text: "payAlreadyText" },
  login: { icon: "🔒", title: "payLoginTitle", text: "payLoginText" },
  missing: { icon: "❔", title: "payMissingTitle", text: "payMissingText" },
  localOnly: { icon: "🧪", title: "payLocalTitle", text: "payLocalText" },
};

function showResult(key) {
  resultKey = key;
  clearInterval(timerId);
  const result = RESULTS[key];
  payView.hidden = true;
  payResult.hidden = false;
  document.getElementById("payResultIcon").textContent = result.icon;
  document.getElementById("payResultTitle").textContent = t(result.title);
  document.getElementById("payResultText").textContent = t(result.text, state ? {
    amount: formatPrice(state.payment.amount), card: state.payment.cardBrand, last4: state.payment.cardLast4,
  } : {});
  // Վճարելուց հետո գլխավոր էջը ցույց է տալիս «գումարը սառեցված է» հաղորդագրությունը
  document.querySelector(".pay-back-btn").href = key === "paid" ? "/?paid=1" : "/";
}

async function loadPayment() {
  if (!Number.isInteger(paymentId) || paymentId <= 0) return showResult("missing");
  try {
    const response = await fetch("/api/payment?id=" + paymentId);
    const result = await response.json();
    if (response.status === 401) return showResult("login");
    if (response.status === 403) return showResult("localOnly");
    if (!response.ok) return showResult("missing");
    state = result;
    if (state.payment.status === "expired" || state.payment.status === "void") return showResult("expired");
    if (state.payment.status !== "awaiting") return showResult("already");
    payView.hidden = false;
    render();
    timerId = setInterval(updateTimer, 1000);
  } catch (e) {
    showToast(t("networkError"));
  }
}

// ---------- Քարտի ձևը ----------

const cardNumber = document.getElementById("cardNumber");
const cardExpiry = document.getElementById("cardExpiry");
const cardBrandLabel = document.getElementById("cardBrand");

// Քարտի տեսակը՝ ըստ առաջին թվանշանների (նույն կանոնները, ինչ սերվերում)
function detectBrand(digits) {
  if (/^9051/.test(digits)) return "ArCa";
  if (/^220[0-4]/.test(digits)) return "МИР";
  if (/^4/.test(digits)) return "VISA";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "AmEx";
  if (/^62/.test(digits)) return "UnionPay";
  return "";
}

// Համարը խմբավորվում է 4-ական թվանշանով, իսկ ժամկետին «/»-ն ավելանում է ինքնաբերաբար
cardNumber.addEventListener("input", () => {
  const digits = cardNumber.value.replace(/\D/g, "").slice(0, 19);
  cardNumber.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  cardBrandLabel.textContent = detectBrand(digits);
});

cardExpiry.addEventListener("input", () => {
  const digits = cardExpiry.value.replace(/\D/g, "").slice(0, 4);
  cardExpiry.value = digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits;
});

const CARD_FIELDS = { number: "cardNumber", expiry: "cardExpiry", cvc: "cardCvc", name: "cardName" };
payForm.addEventListener("input", (event) => {
  const field = Object.values(CARD_FIELDS).find((id) => id === event.target.id);
  if (field) showError(field, "");
});

payForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state) return;
  const data = {
    id: state.payment.id,
    number: cardNumber.value,
    expiry: cardExpiry.value,
    cvc: payForm.elements.cvc.value.trim(),
    name: payForm.elements.name.value.trim(),
  };
  payBtn.disabled = true;
  try {
    const response = await fetch("/api/payment/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (response.ok) {
      state.payment = result.payment;
      showResult("paid");
      return;
    }
    Object.entries(result.errors || {}).forEach(([field, message]) => showError(CARD_FIELDS[field], translateServer(message)));
    if (result.error) {
      showToast(translateServer(result.error));
      if (/15/.test(result.error)) showResult("expired");
    }
  } catch (e) {
    showToast(t("networkError"));
  } finally {
    payBtn.disabled = false;
  }
});

// ---------- Լեզու ----------

function applyLanguage() {
  langSelect.value = currentLang;
  applyStaticTranslations();
  document.title = t("payPageTitle");
  applyTheme(root.getAttribute("data-theme"));
  render();
  if (resultKey) showResult(resultKey);
}

langSelect.addEventListener("change", () => {
  currentLang = langSelect.value;
  try { localStorage.setItem("lang", currentLang); } catch (e) {}
  applyLanguage();
});

applyLanguage();
loadPayment();
