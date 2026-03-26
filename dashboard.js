const BUDGETS_KEY = "trezor_vydaju_budgets";
const CUSTOM_CATEGORIES_KEY = "trezor_vydaju_custom_categories";
const GOALS_KEY = "trezor_vydaju_goals";
const RECURRING_KEY = "trezor_vydaju_recurring";
const THEME_KEY = "trezor_vydaju_theme";
const SESSION_KEY = "trezor_vydaju_session";
const USERS_KEY = "trezor_vydaju_users";
const STORAGE_KEY = "trezor_vydaju_transactions";
const BACKEND_MIGRATION_KEY = "trezor_vydaju_backend_imported";

let currentUser = null;
let transactionsData = [];
let budgetsCache = null;
let customCategoriesCache = null;
let goalsCache = null;
let recurringPlansCache = null;
let adminUsersCache = [];
let editingAdminUserId = "";
let selectedMonthCacheKey = "";
let selectedMonthCacheData = [];
let monthTransactionsCache = new Map();
let monthTotalsCache = new Map();
let transactionsFilterTimer = null;

let selectedMonth = new Date().getMonth();
let selectedYear = new Date().getFullYear();
let monthPickerViewYear = selectedYear;

let balanceChartInstance = null;
let ratioRuleChartInstance = null;
let expenseDonutChartInstance = null;

const RULE_TARGETS = {
  needs: 48,
  fun: 26,
  savings: 16,
  tithe: 10
};

const RULE_CATEGORY_BUCKETS = {
  fun: [
    "zábava",
    "zabava",
    "volný čas",
    "volny cas",
    "restaurace",
    "cestování",
    "cestovani",
    "hobby",
    "kino",
    "koncert",
    "dovolená",
    "dovolena",
    "stream",
    "netflix",
    "spotify",
    "playstation",
    "xbox",
    "hra",
    "hry",
    "káva",
    "kava",
    "bar",
    "party"
  ],
  needs: [
    "bydlení",
    "bydleni",
    "nájem",
    "najem",
    "jídlo",
    "jidlo",
    "potraviny",
    "doprava",
    "zdraví",
    "zdravi",
    "drogerie",
    "splátky",
    "splatky",
    "pojištění",
    "pojisteni",
    "energie",
    "elektřina",
    "elektrina",
    "plyn",
    "voda",
    "internet",
    "telefon",
    "škola",
    "skola",
    "děti",
    "deti"
  ]
};

const QUICK_CATEGORIES = {
  expense: [
    "Bydlení",
    "Jídlo",
    "Doprava",
    "Zdraví",
    "Předplatné",
    "Splátky",
    "Restaurace",
    "Cestování",
    "Ostatní"
  ],
  income: [
    "Mzda",
    "Bonus",
    "Podnikání",
    "Prodej",
    "Vrácení peněz",
    "Ostatní"
  ],
  investment: [
    "Investice",
    "Spoření",
    "Desátky",
    "Rezerva",
    "Akcie / ETF",
    "Ostatní"
  ]
};

const QUICK_CATEGORY_CHIPS = {
  expense: ["Jídlo", "Doprava", "Bydlení", "Předplatné", "Splátky"],
  income: ["Mzda", "Bonus", "Podnikání", "Prodej", "Vrácení peněz"],
  investment: ["Investice", "Spoření", "Desátky", "Rezerva", "Akcie / ETF"]
};

const centerTextPlugin = {
  id: "centerTextPlugin",
  afterDraw(chart, args, pluginOptions) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data.length) return;

    const x = meta.data[0].x;
    const y = meta.data[0].y;
    const innerRadius = meta.data[0].innerRadius || 70;
    const safeRadius = Math.max(innerRadius - 6, 0);
    const activeElement = chart.getActiveElements?.()[0];
    const labels = chart.data?.labels || [];
    const dataset = chart.data?.datasets?.[0];

    if (!Number.isFinite(x) || !Number.isFinite(y) || safeRadius <= 0) {
      return;
    }

    let label = pluginOptions?.labelText || "";
    let total = pluginOptions?.totalText || "";
    let sublabel = pluginOptions?.subLabelText || "";

    if (activeElement && dataset) {
      const activeIndex = activeElement.index;
      const activeValue = Number(dataset.data?.[activeIndex] || 0);
      const activeLabel = String(labels[activeIndex] || "");
      const totalValue = Number(pluginOptions?.hoverTotalValue ?? pluginOptions?.totalValue ?? 0);
      const percent = totalValue ? ((activeValue / totalValue) * 100).toFixed(1) : "";

      label = pluginOptions?.hoverLabelPrefix
        ? `${pluginOptions.hoverLabelPrefix} ${activeLabel}`
        : activeLabel;
      total = pluginOptions?.hoverValueFormatter
        ? pluginOptions.hoverValueFormatter(activeValue, activeIndex)
        : String(activeValue);
      sublabel = pluginOptions?.hoverSubLabelFormatter
        ? pluginOptions.hoverSubLabelFormatter(activeValue, activeIndex, percent)
        : (percent ? `${percent} %` : sublabel);

    }

    const fitText = (text, weight, maxSize, minSize = 10) => {
      if (!text) return minSize;
      let fontSize = maxSize;
      const maxWidth = innerRadius * 1.42;
      while (fontSize > minSize) {
        ctx.font = `${weight} ${fontSize}px Inter, Arial, sans-serif`;
        if (ctx.measureText(text).width <= maxWidth) break;
        fontSize -= 1;
      }
      return fontSize;
    };

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.beginPath();
    ctx.arc(x, y, safeRadius, 0, Math.PI * 2);
    ctx.fillStyle = pluginOptions?.backdropColor || "rgba(9, 14, 22, 0.82)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, safeRadius, 0, Math.PI * 2);
    ctx.strokeStyle = pluginOptions?.backdropBorderColor || "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (label) {
      ctx.fillStyle = pluginOptions?.labelColor || "rgba(255,255,255,0.68)";
      ctx.font = `700 ${fitText(label, 700, 13, 9)}px Inter, Arial, sans-serif`;
      ctx.fillText(label, x, y - innerRadius * 0.26);
    }

    if (total) {
      ctx.fillStyle = pluginOptions?.valueColor || "#ffffff";
      ctx.font = `800 ${fitText(total, 800, 24, 13)}px Inter, Arial, sans-serif`;
      ctx.shadowColor = pluginOptions?.shadowColor || "rgba(212, 175, 55, 0.22)";
      ctx.shadowBlur = pluginOptions?.shadowBlur ?? 18;
      ctx.fillText(total, x, y + 1);
      ctx.shadowBlur = 0;
    }

    if (sublabel) {
      ctx.fillStyle = pluginOptions?.subLabelColor || "rgba(255,255,255,0.55)";
      ctx.font = `700 ${fitText(sublabel, 700, 11, 9)}px Inter, Arial, sans-serif`;
      ctx.fillText(sublabel, x, y + innerRadius * 0.25);
    }

    ctx.restore();
  }
};

const premiumGlowPlugin = {
  id: "premiumGlowPlugin",
  beforeDatasetDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.shadowColor = "rgba(212, 175, 55, 0.24)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
  },
  afterDatasetDraw(chart) {
    chart.ctx.restore();
  }
};

function getSession() {
  return window.MonetraApi?.getSession() || null;
}

function getSessionUser() {
  return getSession()?.user || null;
}

function getApiToken() {
  return getSession()?.token || "";
}

function getLegacyUsers() {
  const users = readStorageJson(USERS_KEY, []);
  return Array.isArray(users) ? users : [];
}

function getLegacySessionUser() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (raw && typeof raw === "object" && !raw.token && raw.id && raw.email) {
      return raw;
    }
  } catch {
    return null;
  }

  return null;
}

function getLegacyUserByEmail(email) {
  const normalizedEmail = normalizeText(email);
  return getLegacyUsers().find(user => normalizeText(user.email) === normalizedEmail) || null;
}

function getLegacyTransactionsForUser(userId) {
  if (!userId) return [];
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY)) || [])
      .filter(transaction => transaction.userId === userId)
      .map(normalizeTransactionRecord);
  } catch {
    return [];
  }
}

function getAllTransactions() {
  return [...transactionsData];
}

function saveAllTransactions(data) {
  transactionsData = (data || []).map(normalizeTransactionRecord);
  invalidateSelectedMonthCache();
}

function getUserTransactions(userId) {
  return getAllTransactions().filter(t => t.userId === userId);
}

function readStorageJson(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

function getActiveUserId() {
  return currentUser?.id || getSessionUser()?.id || "";
}

function cloneScopedValue(value, fallback) {
  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? [...value] : [...fallback];
  }

  if (fallback && typeof fallback === "object") {
    return value && typeof value === "object" && !Array.isArray(value)
      ? { ...value }
      : { ...fallback };
  }

  return value ?? fallback;
}

function isLegacyBudgetStore(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(item => item == null || Number.isFinite(Number(item)));
}

function getScopedStoreValue(key, fallback, legacyValidator) {
  const raw = readStorageJson(key, null);
  const userId = getActiveUserId();

  if (legacyValidator(raw)) {
    return cloneScopedValue(raw, fallback);
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !userId) {
    return cloneScopedValue(null, fallback);
  }

  return cloneScopedValue(raw[userId], fallback);
}

function saveScopedStoreValue(key, value, fallback) {
  const userId = getActiveUserId();
  if (!userId) {
    return cloneScopedValue(value, fallback);
  }

  const raw = readStorageJson(key, {});
  const scopedStore = raw && typeof raw === "object" && !Array.isArray(raw)
    ? { ...raw }
    : {};

  scopedStore[userId] = cloneScopedValue(value, fallback);
  localStorage.setItem(key, JSON.stringify(scopedStore));

  return scopedStore[userId];
}

function saveBudgets(data) {
  budgetsCache = saveScopedStoreValue(BUDGETS_KEY, data, {});
}

function getBudgets() {
  if (budgetsCache) return budgetsCache;
  budgetsCache = getScopedStoreValue(BUDGETS_KEY, {}, isLegacyBudgetStore);
  return budgetsCache;
}

function saveCustomCategories(data) {
  customCategoriesCache = saveScopedStoreValue(CUSTOM_CATEGORIES_KEY, data, []);
}

function getCustomCategories() {
  if (customCategoriesCache) return customCategoriesCache;
  customCategoriesCache = getScopedStoreValue(CUSTOM_CATEGORIES_KEY, [], Array.isArray);
  return customCategoriesCache;
}

function saveGoals(data) {
  goalsCache = saveScopedStoreValue(GOALS_KEY, data, []);
}

function getGoals() {
  if (goalsCache) return goalsCache;
  goalsCache = getScopedStoreValue(GOALS_KEY, [], Array.isArray);
  return goalsCache;
}

function saveRecurringPlans(data) {
  const normalizedData = (data || []).map(normalizeRecurringPlanRecord);
  recurringPlansCache = saveScopedStoreValue(RECURRING_KEY, normalizedData, []);
}

function getRecurringPlans() {
  if (recurringPlansCache) return recurringPlansCache;
  recurringPlansCache = getScopedStoreValue(RECURRING_KEY, [], Array.isArray).map(normalizeRecurringPlanRecord);
  return recurringPlansCache;
}

function invalidateSelectedMonthCache() {
  selectedMonthCacheKey = "";
  selectedMonthCacheData = [];
  monthTransactionsCache.clear();
  monthTotalsCache.clear();
}

function refreshUserTransactions() {
  transactionsData = currentUser ? getUserTransactions(currentUser.id).map(normalizeTransactionRecord) : [];
  invalidateSelectedMonthCache();
}

function markBackendImportDone(userId) {
  if (!userId) return;
  const imported = readStorageJson(BACKEND_MIGRATION_KEY, {});
  imported[userId] = true;
  localStorage.setItem(BACKEND_MIGRATION_KEY, JSON.stringify(imported));
}

function isBackendImportDone(userId) {
  if (!userId) return false;
  const imported = readStorageJson(BACKEND_MIGRATION_KEY, {});
  return Boolean(imported && imported[userId]);
}

function buildBudgetMap(items) {
  return (items || []).reduce((acc, item) => {
    acc[item.category] = Number(item.limitAmount || 0);
    return acc;
  }, {});
}

async function apiRequest(path, options = {}) {
  if (!window.MonetraApi) {
    throw new Error("API vrstva není dostupná.");
  }

  return window.MonetraApi.request(path, options);
}

async function loadBackendState() {
  const [transactions, budgets, goals, recurringPlans, customCategories] = await Promise.all([
    apiRequest("/api/transactions"),
    apiRequest("/api/budgets"),
    apiRequest("/api/goals"),
    apiRequest("/api/recurring-plans"),
    apiRequest("/api/custom-categories")
  ]);

  transactionsData = (transactions || []).map(normalizeTransactionRecord);
  budgetsCache = buildBudgetMap(budgets);
  goalsCache = (goals || []).map(goal => ({
    ...goal,
    target: Number(goal.target || 0),
    current: Number(goal.current || 0),
    monthlyContribution: Number(goal.monthlyContribution || 0)
  }));
  recurringPlansCache = (recurringPlans || []).map(normalizeRecurringPlanRecord);
  customCategoriesCache = (customCategories || []).map(item => ({
    ...item,
    name: item.name || "",
    type: item.type || "expense"
  }));
  invalidateSelectedMonthCache();
}

function isAdminUser() {
  return currentUser?.role === "ADMIN";
}

async function loadAdminUsers() {
  if (!isAdminUser()) return;
  adminUsersCache = await apiRequest("/api/admin/users");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("cs-CZ").format(parseTransactionDate(dateString));
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayInputValue() {
  return toInputDate(new Date());
}

function normalizeTransactionDateValue(dateString) {
  if (!dateString) return "";
  const parsedDate = parseTransactionDate(dateString);
  if (Number.isNaN(parsedDate.getTime())) {
    return String(dateString).trim();
  }
  return toInputDate(parsedDate);
}

function parseTransactionDate(dateString) {
  if (!dateString) return new Date("");

  const normalized = String(dateString).trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), 12);
  }

  return new Date(normalized);
}

function normalizeTransactionRecord(transaction) {
  if (!transaction || typeof transaction !== "object") {
    return transaction;
  }

  return {
    ...transaction,
    date: normalizeTransactionDateValue(transaction.date)
  };
}

function normalizeRecurringPlanRecord(plan) {
  if (!plan || typeof plan !== "object") {
    return plan;
  }

  return {
    ...plan,
    dayOfMonth: Math.min(Math.max(Math.trunc(Number(plan.dayOfMonth || 1)), 1), 31),
    lastUsedAt: normalizeTransactionDateValue(plan.lastUsedAt)
  };
}

async function migrateLocalData() {
  if (!currentUser || isBackendImportDone(currentUser.id)) {
    return;
  }

  const hasBackendData =
    transactionsData.length ||
    Object.keys(getBudgets()).length ||
    getGoals().length ||
    getRecurringPlans().length ||
    getCustomCategories().length;

  if (hasBackendData) {
    markBackendImportDone(currentUser.id);
    return;
  }

  const legacyUser = getLegacySessionUser() || getLegacyUserByEmail(currentUser.email);
  if (!legacyUser) {
    markBackendImportDone(currentUser.id);
    return;
  }

  const legacyTransactions = getLegacyTransactionsForUser(legacyUser.id);
  const legacyBudgets = readStorageJson(BUDGETS_KEY, {});
  const legacyCustomCategories = readStorageJson(CUSTOM_CATEGORIES_KEY, []);
  const legacyGoals = readStorageJson(GOALS_KEY, []);
  const legacyRecurringPlans = readStorageJson(RECURRING_KEY, []);

  const scopedBudgets = isLegacyBudgetStore(legacyBudgets)
    ? legacyBudgets
    : (legacyBudgets?.[legacyUser.id] || {});
  const scopedCustomCategories = Array.isArray(legacyCustomCategories)
    ? legacyCustomCategories
    : (legacyCustomCategories?.[legacyUser.id] || []);
  const scopedGoals = Array.isArray(legacyGoals)
    ? legacyGoals
    : (legacyGoals?.[legacyUser.id] || []);
  const scopedRecurringPlans = Array.isArray(legacyRecurringPlans)
    ? legacyRecurringPlans
    : (legacyRecurringPlans?.[legacyUser.id] || []);

  if (
    !legacyTransactions.length &&
    !Object.keys(scopedBudgets || {}).length &&
    !(scopedCustomCategories || []).length &&
    !(scopedGoals || []).length &&
    !(scopedRecurringPlans || []).length
  ) {
    markBackendImportDone(currentUser.id);
    return;
  }

  await Promise.all([
    ...legacyTransactions.map(transaction =>
      apiRequest("/api/transactions", {
        method: "POST",
        body: {
          title: transaction.title,
          amount: Number(transaction.amount || 0),
          type: normalizeTransactionType(transaction.type, transaction.category),
          category: transaction.category || "Ostatní",
          date: normalizeTransactionDateValue(transaction.date),
          note: transaction.note || ""
        }
      })
    ),
    ...Object.entries(scopedBudgets || {}).map(([category, limitAmount]) =>
      apiRequest(`/api/budgets/${encodeURIComponent(category)}`, {
        method: "PUT",
        body: {
          limitAmount: Number(limitAmount || 0)
        }
      })
    ),
    ...(scopedGoals || []).map(goal =>
      apiRequest("/api/goals", {
        method: "POST",
        body: {
          name: goal.name || "Cíl",
          target: Number(goal.target || 0),
          current: Number(goal.current || 0),
          monthlyContribution: Number(goal.monthlyContribution || 0)
        }
      })
    ),
    ...(scopedRecurringPlans || []).map(plan =>
      apiRequest("/api/recurring-plans", {
        method: "POST",
        body: {
          title: plan.title || "Opakovaná platba",
          amount: Number(plan.amount || 0),
          type: normalizeTransactionType(plan.type, plan.category),
          category: plan.category || "Ostatní",
          dayOfMonth: Math.min(Math.max(Math.trunc(Number(plan.dayOfMonth || 1)), 1), 31),
          lastUsedAt: normalizeTransactionDateValue(plan.lastUsedAt) || null
        }
      })
    ),
    ...(scopedCustomCategories || []).map(item =>
      apiRequest("/api/custom-categories", {
        method: "POST",
        body: {
          name: item.name || "",
          type: item.type || "expense"
        }
      }).catch(() => null)
    )
  ]);

  markBackendImportDone(currentUser.id);
  await loadBackendState();
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function normalizeTransactionType(type, category) {
  if (type === "investment" && normalizeText(category).includes("desát")) {
    return "tithe";
  }
  return type;
}

function getCategoriesForType(type = "expense") {
  const baseCategories = QUICK_CATEGORIES[type] || QUICK_CATEGORIES.expense;
  const customCategories = getCustomCategories()
    .filter(item => item.type === type)
    .map(item => item.name);

  return [...new Set([...baseCategories, ...customCategories])];
}

function getAllCategoryNames() {
  const base = Object.values(QUICK_CATEGORIES).flat();
  const custom = getCustomCategories().map(item => item.name);
  return [...new Set([...base, ...custom])];
}

function populateOptionList(target, values, options = {}) {
  if (!target) return;

  const {
    placeholder = "",
    datalist = false,
    preserveValue = true
  } = options;

  const selectedBefore = preserveValue ? target.value : "";
  const safeValues = Array.isArray(values) ? values : [];
  const optionMarkup = safeValues.map(value => {
    const escapedValue = escapeHtml(value);
    return datalist
      ? `<option value="${escapedValue}"></option>`
      : `<option value="${escapedValue}">${escapedValue}</option>`;
  });

  target.innerHTML = [
    ...(placeholder ? [`<option value="">${placeholder}</option>`] : []),
    ...optionMarkup
  ].join("");

  if (!datalist && preserveValue && safeValues.includes(selectedBefore)) {
    target.value = selectedBefore;
  }
}

function renderBudgetCategoryOptions() {
  const select = document.getElementById("budgetCategory");
  if (!select) return;

  populateOptionList(select, getCategoriesForType("expense"));
}

function renderRecurringCategoryOptions() {
  const select = document.getElementById("recurringCategory");
  const typeSelect = document.getElementById("recurringType");
  if (!select || !typeSelect) return;

  const normalizedType = typeSelect.value === "tithe" ? "investment" : typeSelect.value;
  populateOptionList(select, getCategoriesForType(normalizedType));
}

function renderTransactionCategoryDatalist() {
  const list = document.getElementById("transactionCategoryOptions");
  if (!list) return;

  populateOptionList(list, getAllCategoryNames(), {
    datalist: true,
    preserveValue: false
  });
}

function normalizeText(value) {
  return (value || "").toString().trim().toLowerCase();
}

function categoryMatchesRuleBucket(category, keywords = []) {
  return keywords.some(keyword => {
    const normalizedKeyword = normalizeText(keyword);
    return category === normalizedKeyword || category.includes(normalizedKeyword);
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getThemeTextColor() {
  return getComputedStyle(document.body).getPropertyValue("--text-main").trim() || "#ffffff";
}

function getThemeSoftColor() {
  return getComputedStyle(document.body).getPropertyValue("--text-soft").trim() || "rgba(255,255,255,0.68)";
}

function showToast(message) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function getMonthLabel(year, month) {
  return new Intl.DateTimeFormat("cs-CZ", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month, 1));
}

function isDateInMonth(dateString, year, month) {
  const date = parseTransactionDate(dateString);
  return date.getFullYear() === year && date.getMonth() === month;
}

function getTransactionsForMonth(year, month) {
  const cacheKey = `${year}-${month}`;
  if (monthTransactionsCache.has(cacheKey)) {
    return monthTransactionsCache.get(cacheKey);
  }

  if (cacheKey === selectedMonthCacheKey) {
    return selectedMonthCacheData;
  }

  selectedMonthCacheData = transactionsData.filter(t => isDateInMonth(t.date, year, month));
  selectedMonthCacheKey = cacheKey;
  monthTransactionsCache.set(cacheKey, selectedMonthCacheData);
  return selectedMonthCacheData;
}

function getSelectedMonthTransactions() {
  return getTransactionsForMonth(selectedYear, selectedMonth);
}

function calculateMonthTotals(transactions) {
  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const investment = transactions.filter(t => t.type === "investment").reduce((s, t) => s + Number(t.amount), 0);
  const tithe = transactions.filter(t => t.type === "tithe").reduce((s, t) => s + Number(t.amount), 0);

  return {
    income,
    expense,
    investment,
    tithe,
    balance: income - expense - investment - tithe
  };
}

function getMonthTotals(year, month) {
  const cacheKey = `${year}-${month}`;
  if (monthTotalsCache.has(cacheKey)) {
    return monthTotalsCache.get(cacheKey);
  }

  const totals = calculateMonthTotals(getTransactionsForMonth(year, month));
  monthTotalsCache.set(cacheKey, totals);
  return totals;
}

function getSelectedMonthTotals() {
  return getMonthTotals(selectedYear, selectedMonth);
}

function getPreviousMonthTotals() {
  const prev = new Date(selectedYear, selectedMonth - 1, 1);
  return getMonthTotals(prev.getFullYear(), prev.getMonth());
}

function getExpenseWithInvestmentsTotal(totals) {
  return Number(totals?.expense || 0) + Number(totals?.investment || 0);
}

function calculateComparison(current, previous) {
  const diff = current - previous;
  const percent = previous === 0 ? (current === 0 ? 0 : 100) : (diff / previous) * 100;
  return { diff, percent };
}

function getComparisonText(current, previous) {
  const { diff, percent } = calculateComparison(current, previous);
  const sign = diff > 0 ? "+" : diff < 0 ? "-" : "±";
  return `${sign} ${formatCurrency(Math.abs(diff))} · ${percent.toFixed(1)} %`;
}

function updateMonthLabel() {
  const label = document.getElementById("currentMonthLabel");
  if (!label) return;

  const text = getMonthLabel(selectedYear, selectedMonth);
  label.textContent = text.charAt(0).toUpperCase() + text.slice(1);
}

function getShortMonthNames() {
  return ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
}

function renderMonthPickerModal() {
  const grid = document.getElementById("monthPickerGrid");
  const yearLabel = document.getElementById("monthPickerYearLabel");
  if (!grid || !yearLabel) return;

  yearLabel.textContent = String(monthPickerViewYear);
  const today = new Date();
  const monthNames = getShortMonthNames();

  grid.innerHTML = monthNames.map((monthName, monthIndex) => {
    const isSelected = monthPickerViewYear === selectedYear && monthIndex === selectedMonth;
    const isCurrent = monthPickerViewYear === today.getFullYear() && monthIndex === today.getMonth();

    return `
      <button
        type="button"
        class="month-tile${isSelected ? " is-selected" : ""}${isCurrent ? " is-current" : ""}"
        data-month-index="${monthIndex}"
      >
        <span class="month-tile-name">${monthName}</span>
        <span class="month-tile-meta">${isSelected ? "Aktivní měsíc" : isCurrent ? "Aktuální měsíc" : "Přejít na přehled"}</span>
      </button>
    `;
  }).join("");
}

function openMonthPickerModal() {
  monthPickerViewYear = selectedYear;
  renderMonthPickerModal();
  document.getElementById("monthPickerModal")?.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeMonthPickerModal() {
  document.getElementById("monthPickerModal")?.classList.add("hidden");
  if (document.getElementById("editTransactionModal")?.classList.contains("hidden")) {
    document.body.classList.remove("modal-open");
  }
}

function changeMonthPickerYear(delta) {
  monthPickerViewYear += delta;
  renderMonthPickerModal();
}

function selectMonthFromPicker(monthIndex) {
  selectedYear = monthPickerViewYear;
  selectedMonth = monthIndex;
  closeMonthPickerModal();
  renderAll();
}

function getCalendarDayTotals(dateString) {
  const normalizedDate = normalizeTransactionDateValue(dateString);
  const transactions = transactionsData.filter(t => normalizeTransactionDateValue(t.date) === normalizedDate);
  const income = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = transactions
    .filter(t => t.type !== "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    income,
    expense,
    count: transactions.length
  };
}

function buildCalendarTotalsMap() {
  return transactionsData.reduce((acc, transaction) => {
    const key = normalizeTransactionDateValue(transaction.date);
    if (!key) return acc;

    if (!acc[key]) {
      acc[key] = { income: 0, expense: 0, count: 0 };
    }

    if (transaction.type === "income") {
      acc[key].income += Number(transaction.amount);
    } else {
      acc[key].expense += Number(transaction.amount);
    }

    acc[key].count += 1;
    return acc;
  }, {});
}

function renderMonthCalendar() {
  const weekdaysWrap = document.getElementById("monthCalendarWeekdays");
  const grid = document.getElementById("monthCalendarGrid");
  if (!weekdaysWrap || !grid) return;

  const weekdayLabels = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
  weekdaysWrap.innerHTML = weekdayLabels
    .map(day => `<div class="month-calendar-weekday">${day}</div>`)
    .join("");

  const firstDay = new Date(selectedYear, selectedMonth, 1);
  const monthDays = getDaysInMonth(selectedYear, selectedMonth);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const prevMonthDays = getDaysInMonth(selectedYear, selectedMonth - 1);
  const today = new Date();
  const calendarTotalsMap = buildCalendarTotalsMap();

  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    const dayNumber = prevMonthDays - startOffset + i + 1;
    cells.push({
      year: new Date(selectedYear, selectedMonth - 1, dayNumber).getFullYear(),
      month: new Date(selectedYear, selectedMonth - 1, dayNumber).getMonth(),
      day: dayNumber,
      outside: true
    });
  }

  for (let day = 1; day <= monthDays; day += 1) {
    cells.push({
      year: selectedYear,
      month: selectedMonth,
      day,
      outside: false
    });
  }

  while (cells.length % 7 !== 0) {
    const day = cells.length - (startOffset + monthDays) + 1;
    const nextDate = new Date(selectedYear, selectedMonth + 1, day);
    cells.push({
      year: nextDate.getFullYear(),
      month: nextDate.getMonth(),
      day,
      outside: true
    });
  }

  grid.innerHTML = cells.map(cell => {
    const isoDate = toInputDate(new Date(cell.year, cell.month, cell.day));
    const totals = calendarTotalsMap[isoDate] || { income: 0, expense: 0, count: 0 };
    const hasIncome = totals.income > 0;
    const hasExpense = totals.expense > 0;
    const isToday =
      cell.year === today.getFullYear() &&
      cell.month === today.getMonth() &&
      cell.day === today.getDate();

    const stateClass = hasIncome && hasExpense
      ? "has-mixed"
      : hasIncome
        ? "has-income"
        : hasExpense
          ? "has-expense"
          : "";

    return `
      <div class="calendar-day ${cell.outside ? "is-outside" : ""} ${isToday ? "is-today" : ""} ${stateClass}">
        <div class="calendar-day-top">
          <div class="calendar-day-number">${cell.day}</div>
          ${totals.count ? `<div class="calendar-day-count">${totals.count}×</div>` : ""}
        </div>
        <div class="calendar-day-body">
          ${hasIncome ? `
            <div class="calendar-day-line income">
              <span>Příjmy</span>
              <strong>${formatCurrency(totals.income)}</strong>
            </div>
          ` : ""}
          ${hasExpense ? `
            <div class="calendar-day-line expense">
              <span>Výdaje</span>
              <strong>${formatCurrency(totals.expense)}</strong>
            </div>
          ` : ""}
          ${!totals.count ? `<div class="calendar-day-empty">Bez pohybu</div>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function updateThemeToggleButton() {
  const icon = document.getElementById("themeToggleIcon");
  const text = document.getElementById("themeToggleText");
  const isLight = document.body.classList.contains("light-mode");

  if (!icon || !text) return;

  if (isLight) {
    icon.textContent = "☀️";
    text.textContent = "Světlý režim";
  } else {
    icon.textContent = "🌙";
    text.textContent = "Tmavý režim";
  }
}

function renderKpis() {
  const current = getSelectedMonthTotals();
  const previous = getPreviousMonthTotals();
  const currentInvestmentWithTithe = Number(current.investment || 0) + Number(current.tithe || 0);
  const previousInvestmentWithTithe = Number(previous.investment || 0) + Number(previous.tithe || 0);

  document.getElementById("incomeKpi").textContent = formatCurrency(current.income);
  document.getElementById("expenseOnlyKpi").textContent = formatCurrency(current.expense);
  document.getElementById("investmentOnlyKpi").textContent = formatCurrency(currentInvestmentWithTithe);
  document.getElementById("balanceKpi").textContent = formatCurrency(current.balance);

  document.getElementById("incomeCompare").textContent = `Oproti minulému měsíci: ${getComparisonText(current.income, previous.income)}`;
  document.getElementById("expenseCompare").textContent = `Výdaje ${getComparisonText(current.expense, previous.expense)} · Investice ${getComparisonText(currentInvestmentWithTithe, previousInvestmentWithTithe)}`;
  document.getElementById("balanceCompare").textContent = `Oproti minulému měsíci: ${getComparisonText(current.balance, previous.balance)}`;
}

function renderMonthlyComparison() {
  const current = getSelectedMonthTotals();
  const previous = getPreviousMonthTotals();
  const container = document.getElementById("comparisonList");
  if (!container) return;

  const items = [
    { title: "Příjmy", current: current.income, previous: previous.income },
    { title: "Výdaje", current: current.expense, previous: previous.expense },
    { title: "Investice", current: current.investment, previous: previous.investment },
    { title: "Desátky", current: current.tithe, previous: previous.tithe },
    { title: "Zůstatek", current: current.balance, previous: previous.balance }
  ];

  container.innerHTML = items.map(item => `
    <div class="comparison-item">
      <div class="comparison-item-top">
        <strong>${item.title}</strong>
        <strong>${formatCurrency(item.current)}</strong>
      </div>
      <small>Minulý měsíc: ${formatCurrency(item.previous)} · Rozdíl: ${getComparisonText(item.current, item.previous)}</small>
    </div>
  `).join("");
}

function createVerticalGradient(ctx, chartArea, topColor, bottomColor) {
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  return gradient;
}

function createRadialSegmentGradient(ctx, chartArea, innerColor, outerColor) {
  if (!chartArea) return outerColor;
  const centerX = (chartArea.left + chartArea.right) / 2;
  const centerY = (chartArea.top + chartArea.bottom) / 2;
  const radius = Math.max(chartArea.width, chartArea.height) / 2;
  const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.15, centerX, centerY, radius);
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(1, outerColor);
  return gradient;
}

function getPremiumDonutOptions(total, label, sublabel = "", showLegend = true, config = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    radius: "96%",
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1400,
      easing: "easeOutQuart"
    },
    interaction: {
      mode: "nearest",
      intersect: false
    },
    onHover(event, activeElements) {
      if (typeof config.onHoverChange === "function") {
        config.onHoverChange(activeElements?.[0]?.index ?? null);
      }
    },
    layout: {
      padding: 14
    },
    elements: {
      arc: {
        borderWidth: 0,
        borderRadius: 18,
        hoverBorderWidth: 2,
        hoverBorderColor: "rgba(255,255,255,0.30)"
      }
    },
    plugins: {
      legend: {
        display: showLegend,
        position: "bottom",
        labels: {
          color: getThemeSoftColor(),
          padding: 18,
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 10,
          boxHeight: 10,
          font: {
            size: 12,
            weight: "800"
          }
        }
      },
      tooltip: {
        backgroundColor: "rgba(9, 14, 22, 0.97)",
        borderColor: "rgba(212,175,55,0.24)",
        borderWidth: 1,
        titleColor: "#ffffff",
        bodyColor: "#f8f8f8",
        padding: 12,
        displayColors: true,
        cornerRadius: 16,
        caretSize: 6
      },
      centerTextPlugin: {
        labelText: label,
        totalText: total,
        subLabelText: sublabel,
        totalValue: config.totalValue ?? 0,
        labelColor: getThemeSoftColor(),
        valueColor: getThemeTextColor(),
        subLabelColor: getThemeSoftColor(),
        hoverLabelPrefix: "",
        hoverValueFormatter: config.hoverValueFormatter,
        hoverSubLabelFormatter: config.hoverSubLabelFormatter,
        backdropColor: config.backdropColor,
        backdropBorderColor: config.backdropBorderColor
      }
    }
  };
}

function setActiveItems(selector, activeIndex) {
  document.querySelectorAll(selector).forEach((element, index) => {
    element.classList.toggle("is-active", activeIndex === index);
  });
}

function renderBalanceChart() {
  const canvas = document.getElementById("balanceChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = [];
  const balances = [];
  const incomes = [];
  const expenses = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(selectedYear, selectedMonth - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const totals = getMonthTotals(year, month);

    labels.push(new Intl.DateTimeFormat("cs-CZ", { month: "short" }).format(new Date(year, month, 1)));
    balances.push(totals.balance);
    incomes.push(totals.income);
    expenses.push(totals.expense + totals.investment + totals.tithe);
  }

  const balanceConfig = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Zůstatek",
          data: balances,
          borderColor: "rgba(212, 175, 55, 1)",
          backgroundColor(context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return "rgba(212, 175, 55, 0.18)";
            return createVerticalGradient(
              ctx,
              chartArea,
              "rgba(212, 175, 55, 0.28)",
              "rgba(212, 175, 55, 0.02)"
            );
          },
          fill: true,
          tension: 0.42,
          pointRadius: 0,
          pointHoverRadius: 7,
          pointBackgroundColor: "rgba(212, 175, 55, 1)",
          pointBorderColor: "#fff3cf",
          pointBorderWidth: 2,
          borderWidth: 3.2
        },
        {
          label: "Příjmy",
          data: incomes,
          borderColor: "rgba(115, 226, 155, 1)",
          backgroundColor: "rgba(115, 226, 155, 0.08)",
          tension: 0.40,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: "rgba(115, 226, 155, 1)",
          pointBorderColor: "#d8ffe4",
          pointBorderWidth: 2,
          borderWidth: 2.2,
          borderDash: [0]
        },
        {
          label: "Odtoky",
          data: expenses,
          borderColor: "rgba(255, 126, 209, 1)",
          backgroundColor: "rgba(255, 126, 209, 0.08)",
          tension: 0.40,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: "rgba(255, 126, 209, 1)",
          pointBorderColor: "#ffd8f0",
          pointBorderWidth: 2,
          borderWidth: 2.2,
          borderDash: [7, 7]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: getThemeSoftColor(),
            padding: 18,
            usePointStyle: true,
            pointStyle: "circle",
            font: {
              size: 12,
              weight: "800"
            }
          }
        },
        tooltip: {
          backgroundColor: "rgba(9, 14, 22, 0.97)",
          borderColor: "rgba(212,175,55,0.22)",
          borderWidth: 1,
          titleColor: "#ffffff",
          bodyColor: "#f7f7f7",
          padding: 12,
          cornerRadius: 14,
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: getThemeSoftColor()
          },
          grid: {
            color: "rgba(255,255,255,0.04)",
            drawBorder: false
          }
        },
        y: {
          ticks: {
            color: getThemeSoftColor(),
            callback(value) {
              return formatCurrency(value);
            }
          },
          grid: {
            color: "rgba(255,255,255,0.07)",
            drawBorder: false
          }
        }
      }
    }
  };

  if (balanceChartInstance) {
    balanceChartInstance.data = balanceConfig.data;
    balanceChartInstance.options = balanceConfig.options;
    balanceChartInstance.update();
    return;
  }

  balanceChartInstance = new Chart(canvas, balanceConfig);
}

function buildExpenseCategoryData(transactions) {
  const grouped = {};

  transactions
    .filter(t => t.type === "expense" || t.type === "investment" || t.type === "tithe")
    .forEach(t => {
      const category = t.category || "Ostatní";
      const title = (t.title || "").trim();
      const label = t.type === "investment"
        ? (title ? `${category} · ${title}` : `${category} · Investice`)
        : t.type === "tithe"
          ? (title ? `${category} · ${title}` : `${category} · Desátky`)
          : category;

      grouped[label] = (grouped[label] || 0) + Number(t.amount);
    });

  const labels = Object.keys(grouped);
  const values = Object.values(grouped);
  const total = values.reduce((sum, value) => sum + value, 0);

  return { labels, values, total };
}

function getExpenseDonutBackgrounds(chartArea, ctx) {
  return [
    createRadialSegmentGradient(ctx, chartArea, "rgba(255, 186, 186, 1)", "rgba(255, 88, 88, 0.96)"),
    createRadialSegmentGradient(ctx, chartArea, "rgba(255, 196, 234, 1)", "rgba(255, 94, 196, 0.96)"),
    createRadialSegmentGradient(ctx, chartArea, "rgba(173, 244, 255, 1)", "rgba(49, 206, 255, 0.96)"),
    createRadialSegmentGradient(ctx, chartArea, "rgba(190, 212, 255, 1)", "rgba(94, 143, 255, 0.96)"),
    createRadialSegmentGradient(ctx, chartArea, "rgba(224, 193, 255, 1)", "rgba(173, 97, 255, 0.96)"),
    createRadialSegmentGradient(ctx, chartArea, "rgba(255, 221, 174, 1)", "rgba(255, 171, 71, 0.96)"),
    createRadialSegmentGradient(ctx, chartArea, "rgba(165, 255, 225, 1)", "rgba(30, 198, 143, 0.96)"),
    createRadialSegmentGradient(ctx, chartArea, "rgba(255, 239, 173, 1)", "rgba(212, 175, 55, 0.98)")
  ];
}

function getExpenseDonutSolidColors() {
  return [
    "#ff6b6b",
    "#ff78c8",
    "#51dcff",
    "#7d9bff",
    "#b988ff",
    "#ffbc63",
    "#42d6a4",
    "#e4c15a"
  ];
}

function renderExpenseDonutLegend(labels, values, total) {
  const container = document.getElementById("expenseDonutLegend");
  if (!container) return;

  if (!labels.length || !values.length || !total) {
    container.innerHTML = '<div class="expense-legend-empty">Za vybraný měsíc zatím nejsou žádné výdaje, investice ani desátky podle kategorií.</div>';
    return;
  }

  const colors = getExpenseDonutSolidColors();
  const items = labels
    .map((label, index) => {
      const value = Number(values[index] || 0);
      return {
        index,
        label,
        value,
        percent: total ? (value / total) * 100 : 0,
        color: colors[index % colors.length]
      };
    })
    .sort((a, b) => b.value - a.value);

  container.innerHTML = items.map(item => `
    <div class="expense-legend-item" data-expense-index="${item.index}">
      <span class="expense-legend-swatch" style="background:${item.color}"></span>
      <div class="expense-legend-main">
        <div class="expense-legend-label-row">
          <span class="expense-legend-label">${escapeHtml(item.label)}</span>
          <span class="expense-legend-percent">${item.percent.toFixed(1)} %</span>
        </div>
        <div class="expense-legend-bar">
          <div class="expense-legend-fill" style="width:${Math.max(item.percent, 4)}%; background:linear-gradient(90deg, ${item.color}, ${item.color}cc);"></div>
        </div>
      </div>
      <strong class="expense-legend-value">${formatCurrency(item.value)}</strong>
    </div>
  `).join("");
}

function renderExpenseHighlights(labels, values, total) {
  const container = document.getElementById("expenseDonutHighlights");
  if (!container) return;

  if (!labels.length || !values.length || !total) {
    container.innerHTML = "";
    return;
  }

  const items = labels
    .map((label, index) => ({
      label,
      value: Number(values[index] || 0),
      percent: total ? (Number(values[index] || 0) / total) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  container.innerHTML = items.map((item, index) => `
    <div class="expense-highlight expense-highlight-rank-${index + 1}">
      <div class="expense-highlight-top">
        <span class="expense-highlight-rank">Top ${index + 1}</span>
        <span class="expense-highlight-share">${item.percent.toFixed(1)} %</span>
      </div>
      <div class="expense-highlight-main">
        <span class="expense-highlight-label">${escapeHtml(item.label)}</span>
        <span class="expense-highlight-value">${formatCurrency(item.value)}</span>
      </div>
    </div>
  `).join("");
}

function getRatioDonutBackgrounds(chartArea, ctx) {
  return [
    createRadialSegmentGradient(ctx, chartArea, "rgba(255, 185, 185, 1)", "rgba(255, 102, 102, 0.97)"),
    createRadialSegmentGradient(ctx, chartArea, "rgba(255, 198, 234, 1)", "rgba(255, 110, 205, 0.97)"),
    createRadialSegmentGradient(ctx, chartArea, "rgba(174, 244, 255, 1)", "rgba(56, 213, 255, 0.97)"),
    createRadialSegmentGradient(ctx, chartArea, "rgba(255, 238, 180, 1)", "rgba(212, 175, 55, 0.98)")
  ];
}

function renderExpenseDonutChart() {
  const canvas = document.getElementById("expenseDonutChart");
  if (!canvas || typeof Chart === "undefined") return;

  const { labels, values, total } = buildExpenseCategoryData(getSelectedMonthTransactions());
  const solidColors = getExpenseDonutSolidColors();
  const donutOptions = getPremiumDonutOptions(
    values.length ? formatCurrency(total) : "0 Kč",
    "Výdaje + investice + desátky",
    labels.length ? `${labels.length} kategorií` : "Bez dat",
    false,
    {
      totalValue: total,
      onHoverChange(activeIndex) {
        setActiveItems("#expenseDonutLegend .expense-legend-item", activeIndex);
      },
      hoverValueFormatter(value) {
        return formatCurrency(value);
      },
      hoverSubLabelFormatter(value, index, percent) {
        return percent ? `${percent} % z výdajů` : "";
      }
    }
  );

  renderExpenseDonutLegend(labels, values, total);
  renderExpenseHighlights(labels, values, total);

  const expenseChartConfig = {
    type: "doughnut",
    data: {
      labels: labels.length ? labels : ["Žádná data"],
      datasets: [{
        data: values.length ? values : [1],
        backgroundColor(context) {
          const { chart } = context;
          if (!values.length) return "rgba(212,175,55,0.38)";
          return getExpenseDonutBackgrounds(chart.chartArea, chart.ctx);
        },
        hoverBackgroundColor: values.length ? solidColors : ["rgba(212,175,55,0.58)"],
        borderColor: "rgba(7, 14, 22, 0.88)",
        borderWidth: 4,
        borderAlign: "inner",
        hoverBorderWidth: 5,
        hoverOffset: 18,
        spacing: 5
      }]
    },
    options: {
      ...donutOptions,
      plugins: {
        ...donutOptions.plugins,
        tooltip: {
          enabled: false,
          backgroundColor: "rgba(9, 14, 22, 0.97)",
          borderColor: "rgba(212,175,55,0.22)",
          borderWidth: 1,
          titleColor: "#ffffff",
          bodyColor: "#f8f8f8",
          padding: 14,
          displayColors: true,
          cornerRadius: 16,
          caretPadding: 10,
          callbacks: {
            label(context) {
              const value = Number(context.raw || 0);
              const percent = total ? ((value / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${formatCurrency(value)} (${percent} %)`;
            }
          }
        }
      }
    },
    plugins: [centerTextPlugin, premiumGlowPlugin]
  };

  if (expenseDonutChartInstance) {
    expenseDonutChartInstance.data = expenseChartConfig.data;
    expenseDonutChartInstance.options = expenseChartConfig.options;
    expenseDonutChartInstance.update();
    return;
  }

  expenseDonutChartInstance = new Chart(canvas, expenseChartConfig);
}
function categorizeForRule(transaction) {
  const category = normalizeText(transaction.category);

  if (transaction.type === "tithe" || category.includes("desát") || category.includes("desat")) {
    return "tithe";
  }

  if (
    transaction.type === "investment" ||
    category.includes("invest") ||
    category.includes("spoř") ||
    category.includes("spor")
  ) {
    return "savings";
  }

  if (categoryMatchesRuleBucket(category, RULE_CATEGORY_BUCKETS.fun)) {
    return "fun";
  }

  if (categoryMatchesRuleBucket(category, RULE_CATEGORY_BUCKETS.needs)) {
    return "needs";
  }

  return "needs";
}

function renderRatioRule() {
  const monthlyTransactions = getSelectedMonthTransactions();
  const income = monthlyTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const relevant = monthlyTransactions.filter(t =>
    t.type === "expense" || t.type === "investment" || t.type === "tithe"
  );

  let actualNeeds = 0;
  let actualFun = 0;
  let actualSavings = 0;
  let actualTithe = 0;

  relevant.forEach(t => {
    const bucket = categorizeForRule(t);
    if (bucket === "needs") actualNeeds += Number(t.amount);
    if (bucket === "fun") actualFun += Number(t.amount);
    if (bucket === "savings") actualSavings += Number(t.amount);
    if (bucket === "tithe") actualTithe += Number(t.amount);
  });

  const targetNeeds = income * (RULE_TARGETS.needs / 100);
  const targetFun = income * (RULE_TARGETS.fun / 100);
  const targetSavings = income * (RULE_TARGETS.savings / 100);
  const targetTithe = income * (RULE_TARGETS.tithe / 100);

  const needsUsedPercent = targetNeeds ? (actualNeeds / targetNeeds) * 100 : 0;
  const funUsedPercent = targetFun ? (actualFun / targetFun) * 100 : 0;
  const savingsUsedPercent = targetSavings ? (actualSavings / targetSavings) * 100 : 0;
  const titheUsedPercent = targetTithe ? (actualTithe / targetTithe) * 100 : 0;

  document.getElementById("ratioNeedsValue").textContent = formatCurrency(targetNeeds);
  document.getElementById("ratioFunValue").textContent = formatCurrency(targetFun);
  document.getElementById("ratioSavingsValue").textContent = formatCurrency(targetSavings);
  document.getElementById("ratioTitheValue").textContent = formatCurrency(targetTithe);

  document.getElementById("ratioNeedsMeta").textContent = `Skutečnost: ${formatCurrency(actualNeeds)} · ${needsUsedPercent.toFixed(1)} % cíle`;
  document.getElementById("ratioFunMeta").textContent = `Skutečnost: ${formatCurrency(actualFun)} · ${funUsedPercent.toFixed(1)} % cíle`;
  document.getElementById("ratioSavingsMeta").textContent = `Skutečnost: ${formatCurrency(actualSavings)} · ${savingsUsedPercent.toFixed(1)} % cíle`;
  document.getElementById("ratioTitheMeta").textContent = `Skutečnost: ${formatCurrency(actualTithe)} · ${titheUsedPercent.toFixed(1)} % cíle`;

  document.getElementById("ratioNeedsBar").style.width = `${Math.min(needsUsedPercent, 100)}%`;
  document.getElementById("ratioFunBar").style.width = `${Math.min(funUsedPercent, 100)}%`;
  document.getElementById("ratioSavingsBar").style.width = `${Math.min(savingsUsedPercent, 100)}%`;
  document.getElementById("ratioTitheBar").style.width = `${Math.min(titheUsedPercent, 100)}%`;

  const statusEl = document.getElementById("ratioStatusText");
  const recommendationEl = document.getElementById("ratioRecommendation");

  if (!income) {
    statusEl.textContent = "Pro výpočet cílového rozdělení potřebuješ mít ve zvoleném měsíci alespoň jeden příjem.";
    recommendationEl?.classList.add("hidden");
  } else {
    const warnings = [];
    if (needsUsedPercent > 100) warnings.push("životní náklady jsou nad cílem");
    if (funUsedPercent > 100) warnings.push("volný čas je nad cílem");
    if (savingsUsedPercent < 100) warnings.push("úspory / investice jsou pod cílem");
    if (titheUsedPercent < 100) warnings.push("desátky jsou pod cílem");

    statusEl.textContent = warnings.length
      ? `Cíl vs. skutečnost: ${warnings.join(", ")}.`
      : "Skutečné rozdělení se drží doporučeného rámce.";

    const recommendations = [];
    if (needsUsedPercent > 100) recommendations.push(`Sniž životní náklady asi o ${formatCurrency(actualNeeds - targetNeeds)}.`);
    if (funUsedPercent > 100) recommendations.push(`Omez volný čas asi o ${formatCurrency(actualFun - targetFun)}.`);
    if (savingsUsedPercent < 100) recommendations.push(`Doplň úspory nebo investice asi o ${formatCurrency(targetSavings - actualSavings)}.`);
    if (titheUsedPercent < 100) recommendations.push(`Doplň desátky asi o ${formatCurrency(targetTithe - actualTithe)}.`);

    if (recommendationEl) {
      if (recommendations.length) {
        recommendationEl.textContent = recommendations[0];
        recommendationEl.classList.remove("hidden");
      } else {
        recommendationEl.textContent = "Rozdělení vypadá zdravě. Stačí držet současný rytmus.";
        recommendationEl.classList.remove("hidden");
      }
    }
  }

  const canvas = document.getElementById("ratioRuleChart");
  if (!canvas || typeof Chart === "undefined") return;

  const values = income
    ? [targetNeeds, targetFun, targetSavings, targetTithe]
    : [48, 26, 16, 10];

  const ratioChartConfig = {
    type: "doughnut",
    data: {
      labels: [
        "Životní náklady",
        "Volný čas",
        "Úspory / investice",
        "Desátky"
      ],
      datasets: [{
        data: values,
        backgroundColor(context) {
          const { chart } = context;
          return getRatioDonutBackgrounds(chart.chartArea, chart.ctx);
        },
        hoverBackgroundColor: [
          "#ff6b6b",
          "#ff78c8",
          "#51dcff",
          "#e4c15a"
        ],
        borderColor: "rgba(7, 14, 22, 0.88)",
        borderWidth: 4,
        borderAlign: "inner",
        hoverBorderWidth: 5,
        hoverOffset: 18,
        spacing: 5
      }]
    },
    options: {
      ...getPremiumDonutOptions(
        income ? formatCurrency(income) : "0 Kč",
        income ? "Příjem měsíce" : "Pravidlo",
        income ? "Cílové rozdělení" : "48 / 26 / 16 / 10",
        false,
        {
          totalValue: income,
          onHoverChange(activeIndex) {
            setActiveItems(".ratio-breakdown .ratio-row", activeIndex);
          },
          hoverValueFormatter(value) {
            return income ? formatCurrency(value) : `${value} %`;
          },
          hoverSubLabelFormatter(value, index, percent) {
            return income && percent ? `${percent} % příjmu` : "";
          }
        }
      ),
      plugins: {
        ...getPremiumDonutOptions(
          income ? formatCurrency(income) : "0 Kč",
          income ? "Příjem měsíce" : "Pravidlo",
          income ? "Cílové rozdělení" : "48 / 26 / 16 / 10",
          false,
          {
            totalValue: income,
            onHoverChange(activeIndex) {
              setActiveItems(".ratio-breakdown .ratio-row", activeIndex);
            },
            hoverValueFormatter(value) {
              return income ? formatCurrency(value) : `${value} %`;
            },
            hoverSubLabelFormatter(value, index, percent) {
              return income && percent ? `${percent} % příjmu` : "";
            }
          }
        ).plugins,
        legend: {
          display: false
        },
        tooltip: {
          enabled: false,
          backgroundColor: "rgba(9, 14, 22, 0.97)",
          borderColor: "rgba(212,175,55,0.22)",
          borderWidth: 1,
          titleColor: "#ffffff",
          bodyColor: "#f8f8f8",
          padding: 14,
          displayColors: true,
          cornerRadius: 16,
          caretPadding: 10,
          callbacks: {
            label(context) {
              const value = Number(context.raw || 0);
              const percent = income ? ((value / income) * 100).toFixed(1) : value.toFixed(0);
              return income
                ? `${context.label}: ${formatCurrency(value)} (${percent} % příjmu)`
                : `${context.label}: ${percent} %`;
            }
          }
        }
      }
    },
    plugins: [centerTextPlugin, premiumGlowPlugin]
  };

  if (ratioRuleChartInstance) {
    ratioRuleChartInstance.data = ratioChartConfig.data;
    ratioRuleChartInstance.options = ratioChartConfig.options;
    ratioRuleChartInstance.update();
    return;
  }

  ratioRuleChartInstance = new Chart(canvas, ratioChartConfig);
}

function renderBudgets() {
  const budgets = getBudgets();
  const list = document.getElementById("budgetsList");
  if (!list) return;

  const monthTransactions = getSelectedMonthTransactions().filter(t => t.type === "expense");
  const entries = Object.entries(budgets);

  if (!entries.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◉</div>
        <h3>Zatím žádné limity</h3>
        <p>Nastav si první měsíční rozpočet kategorie.</p>
        <div class="empty-state-actions">
          <button class="btn btn-gold btn-small" type="button" onclick="focusBudgetForm()">Vytvořit první limit</button>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = entries.map(([category, limit]) => {
    const spent = monthTransactions
      .filter(t => normalizeText(t.category) === normalizeText(category))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const percent = limit > 0 ? (spent / limit) * 100 : 0;
    const progressWidth = Math.min(percent, 100);
    const statusClass = percent >= 100 ? "is-over-limit" : percent >= 80 ? "is-near-limit" : "";

    return `
      <div class="budget-item budget-item-compact ${statusClass}">
        <div class="budget-item-top">
          <div class="budget-item-head">
            <span class="budget-dot"></span>
            <strong class="budget-category">${escapeHtml(category)}</strong>
          </div>
          <div class="budget-item-actions">
            <button class="budget-action-btn" type="button" data-budget-action="edit" data-category="${escapeHtml(category)}" title="Upravit limit">✎</button>
            <button class="budget-action-btn budget-action-delete" type="button" data-budget-action="delete" data-category="${escapeHtml(category)}" title="Smazat limit">🗑️</button>
          </div>
        </div>
        <div class="budget-item-top">
          <span class="budget-meta">Limit</span>
          <strong class="budget-limit">${formatCurrency(limit)}</strong>
        </div>
        <div class="mini-progress">
          <div class="mini-progress-fill" style="width:${progressWidth}%; background: linear-gradient(90deg, rgba(212,175,55,0.72), rgba(255,126,209,0.95));"></div>
        </div>
        <div class="budget-meta">
          <span>Utraceno: ${formatCurrency(spent)}</span>
          <span>${percent.toFixed(1)} %</span>
        </div>
      </div>
    `;
  }).join("");
}

function getGoalEta(goal) {
  const target = Number(goal.target || 0);
  const current = Number(goal.current || 0);
  const monthly = Number(goal.monthlyContribution || 0);

  if (current >= target && target > 0) {
    return "Splněno";
  }

  if (monthly <= 0) {
    return "Bez měsíčního vkladu";
  }

  const remaining = Math.max(target - current, 0);
  const months = Math.ceil(remaining / monthly);
  return `Cca ${months} měs. do cíle`;
}

function renderGoals() {
  const list = document.getElementById("goalsList");
  if (!list) return;

  const goals = getGoals();
  if (!goals.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◉</div>
        <h3>Zatím žádné cíle</h3>
        <p>Přidej si první finanční cíl a uvidíš průběžný progres.</p>
        <div class="empty-state-actions">
          <button class="btn btn-gold btn-small" type="button" onclick="focusGoalForm()">Přidat první cíl</button>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = goals.map(goal => {
    const target = Number(goal.target || 0);
    const current = Number(goal.current || 0);
    const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;

    return `
      <div class="goal-item">
        <div class="goal-item-row">
          <div class="goal-item-main">
            <div class="goal-item-top">
              <div>
                <div class="goal-name">${escapeHtml(goal.name)}</div>
                <div class="goal-meta">
                  <span>Cíl: ${formatCurrency(target)}</span>
                  <span>Naspořeno: ${formatCurrency(current)}</span>
                </div>
              </div>
              <div class="goal-actions">
                <button class="budget-action-btn" type="button" onclick="editGoal('${goal.id}')" title="Upravit cíl">✎</button>
                <button class="budget-action-btn budget-action-delete" type="button" onclick="deleteGoal('${goal.id}')" title="Smazat cíl">🗑️</button>
              </div>
            </div>
            <div class="goal-progress">
              <div class="goal-progress-fill" style="width:${percent}%;"></div>
            </div>
          </div>

          <div class="goal-item-side">
            <div class="goal-meta">
              <span>${percent.toFixed(1)} % splněno</span>
              <span>Měsíční vklad: ${formatCurrency(goal.monthlyContribution || 0)}</span>
            </div>
            <div class="goal-forecast">
              <span>${getGoalEta(goal)}</span>
              <span>Zbývá: ${formatCurrency(Math.max(target - current, 0))}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function getRecurringNextDate(plan, year, month) {
  const safeDay = Math.max(Number(plan.dayOfMonth || 1), 1);
  const day = Math.min(safeDay, getDaysInMonth(year, month));
  return new Date(year, month, day);
}

function renderRecurringPlans() {
  const list = document.getElementById("recurringList");
  if (!list) return;

  const plans = getRecurringPlans();
  const snapshotById = new Map(
    getRecurringSnapshotForSelectedMonth().entries.map(entry => [entry.id, entry])
  );
  if (!plans.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◉</div>
        <h3>Zatím žádné opakované platby</h3>
        <p>Ulož si výplatu, nájem nebo spoření a budeš je mít po ruce jedním klikem.</p>
        <div class="empty-state-actions">
          <button class="btn btn-gold btn-small" type="button" onclick="focusRecurringForm()">Přidat první platbu</button>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = plans.map(plan => {
    const snapshot = snapshotById.get(plan.id);
    const nextDate = getRecurringNextDate(plan, selectedYear, selectedMonth);
    const isApplied = Boolean(snapshot?.isApplied);
    return `
      <div class="recurring-item">
        <div class="recurring-item-compact">
          <div class="recurring-item-main">
            <div class="recurring-title-row">
              <div class="recurring-title-dot type-${plan.type}"></div>
              <div class="recurring-title">${escapeHtml(plan.title)}</div>
            </div>
            <div class="recurring-meta recurring-meta-inline">
              <span class="recurring-meta-pill recurring-meta-amount">${formatCurrency(plan.amount)}</span>
              <span class="recurring-meta-pill">${escapeHtml(plan.category || "Bez kategorie")}</span>
              <span class="recurring-meta-pill">${Number(plan.dayOfMonth)}. den</span>
              <span class="recurring-meta-subtle">${formatDate(toInputDate(nextDate))}</span>
            </div>
          </div>

          <div class="recurring-item-side">
            <span class="type-badge type-${plan.type}">${getTypeLabel(plan.type)}</span>
            <div class="recurring-actions recurring-actions-compact">
              <button class="btn btn-ghost btn-small" type="button" onclick="applyRecurringPlan('${plan.id}')" ${isApplied ? "disabled" : ""}>${isApplied ? "Přidáno" : "Přidat"}</button>
              <button class="budget-action-btn" type="button" onclick="editRecurringPlan('${plan.id}')" title="Upravit platbu">✎</button>
              <button class="budget-action-btn budget-action-delete" type="button" onclick="deleteRecurringPlan('${plan.id}')" title="Smazat platbu">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderSmartInsights() {
  const container = document.getElementById("smartInsights");
  if (!container) return;

  const totals = getSelectedMonthTotals();
  const today = new Date();
  const isCurrentPeriod = selectedYear === today.getFullYear() && selectedMonth === today.getMonth();
  const elapsedDays = isCurrentPeriod ? Math.max(today.getDate(), 1) : getDaysInMonth(selectedYear, selectedMonth);
  const monthDays = getDaysInMonth(selectedYear, selectedMonth);
  const projectedExpense = elapsedDays ? (totals.expense / elapsedDays) * monthDays : totals.expense;
  const projectedBalance = totals.income - projectedExpense - totals.investment - totals.tithe;

  const budgets = Object.entries(getBudgets()).map(([category, limit]) => {
    const spent = getSelectedMonthTransactions()
      .filter(t => t.type === "expense" && normalizeText(t.category) === normalizeText(category))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const percent = limit > 0 ? (spent / limit) * 100 : 0;
    return { category, limit, spent, percent };
  });

  const alerts = budgets.filter(item => item.percent >= 80).sort((a, b) => b.percent - a.percent).slice(0, 3);
  const topGoal = [...getGoals()]
    .sort((a, b) => Number(b.monthlyContribution || 0) - Number(a.monthlyContribution || 0))[0];

  const alertList = alerts.length
    ? `<ul class="insight-list">${alerts.map(item => `<li>${escapeHtml(item.category)}: ${item.percent.toFixed(1)} % limitu (${formatCurrency(item.spent)} z ${formatCurrency(item.limit)})</li>`).join("")}</ul>`
    : `<div class="insight-copy">Rozpočty jsou zatím v klidové zóně a žádná kategorie není těsně před limitem.</div>`;

  const goalCopy = topGoal
    ? `<div class="insight-copy">Největší momentum má cíl <span class="insight-accent">${escapeHtml(topGoal.name)}</span>. Při tempu ${formatCurrency(topGoal.monthlyContribution || 0)} měsíčně je stav ${getGoalEta(topGoal).toLowerCase()}.</div>`
    : `<div class="insight-copy">Jakmile přidáš finanční cíl, zobrazí se tady doporučení, co má největší tah dopředu.</div>`;

  container.innerHTML = `
    <div class="insight-card">
      <div class="insight-head">
        <div class="insight-title">Predikce konce měsíce</div>
        <div class="insight-accent">${formatCurrency(projectedBalance)}</div>
      </div>
      <div class="insight-copy">Při současném tempu vychází odhad výdajů na <span class="insight-accent">${formatCurrency(projectedExpense)}</span>. To znamená předpokládaný zůstatek <span class="insight-accent">${formatCurrency(projectedBalance)}</span>.</div>
    </div>
    <div class="insight-card">
      <div class="insight-title">Rozpočtová upozornění</div>
      ${alertList}
    </div>
    <div class="insight-card">
      <div class="insight-title">Tah na cíl</div>
      ${goalCopy}
    </div>
  `;
}

function getBudgetSnapshotForSelectedMonth() {
  const transactions = getSelectedMonthTransactions().filter(t => t.type === "expense");
  const entries = Object.entries(getBudgets()).map(([category, limit]) => {
    const safeLimit = Number(limit || 0);
    const spent = transactions
      .filter(t => normalizeText(t.category) === normalizeText(category))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const percent = safeLimit > 0 ? (spent / safeLimit) * 100 : 0;

    return {
      category,
      limit: safeLimit,
      spent,
      remaining: safeLimit - spent,
      percent
    };
  });

  return {
    entries: entries.sort((a, b) => b.percent - a.percent || b.spent - a.spent),
    totalLimit: entries.reduce((sum, item) => sum + item.limit, 0),
    totalSpent: entries.reduce((sum, item) => sum + item.spent, 0)
  };
}

function doesTransactionMatchRecurringPlan(transaction, plan, scheduledDate) {
  return (
    normalizeText(transaction.title) === normalizeText(plan.title) &&
    Number(transaction.amount) === Number(plan.amount) &&
    normalizeText(transaction.category) === normalizeText(plan.category) &&
    transaction.type === plan.type &&
    normalizeTransactionDateValue(transaction.date) === normalizeTransactionDateValue(scheduledDate)
  );
}

function getRecurringSnapshotForSelectedMonth() {
  const monthTransactions = getSelectedMonthTransactions();
  const today = getTodayInputValue();
  const isCurrentPeriod = selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth();

  const entries = getRecurringPlans().map(plan => {
    const scheduledDate = normalizeTransactionDateValue(toInputDate(getRecurringNextDate(plan, selectedYear, selectedMonth)));
    const matchedTransaction = monthTransactions.find(transaction =>
      doesTransactionMatchRecurringPlan(transaction, plan, scheduledDate)
    );
    const amount = Number(plan.amount || 0);
    const isIncome = plan.type === "income";
    const isApplied = Boolean(matchedTransaction) || normalizeTransactionDateValue(plan.lastUsedAt) === scheduledDate;
    const isPastDue = !isApplied && isCurrentPeriod && scheduledDate < today;

    return {
      ...plan,
      amount,
      scheduledDate,
      isApplied,
      isPastDue,
      direction: isIncome ? "income" : "outflow"
    };
  }).sort((a, b) => parseTransactionDate(a.scheduledDate) - parseTransactionDate(b.scheduledDate));

  const plannedIncome = entries.filter(item => item.direction === "income").reduce((sum, item) => sum + item.amount, 0);
  const plannedOutflow = entries.filter(item => item.direction === "outflow").reduce((sum, item) => sum + item.amount, 0);
  const pendingIncome = entries.filter(item => item.direction === "income" && !item.isApplied).reduce((sum, item) => sum + item.amount, 0);
  const pendingOutflow = entries.filter(item => item.direction === "outflow" && !item.isApplied).reduce((sum, item) => sum + item.amount, 0);

  return {
    entries,
    plannedIncome,
    plannedOutflow,
    pendingIncome,
    pendingOutflow,
    pendingCount: entries.filter(item => !item.isApplied).length
  };
}

function renderMonthlyPlanner() {
  const kpis = document.getElementById("plannerKpis");
  const budgetRows = document.getElementById("plannerBudgetRows");
  const recurringRows = document.getElementById("plannerRecurringRows");
  const budgetMeta = document.getElementById("plannerBudgetMeta");
  const recurringMeta = document.getElementById("plannerRecurringMeta");
  if (!kpis || !budgetRows || !recurringRows || !budgetMeta || !recurringMeta) return;

  const totals = getSelectedMonthTotals();
  const budgetSnapshot = getBudgetSnapshotForSelectedMonth();
  const recurringSnapshot = getRecurringSnapshotForSelectedMonth();

  const budgetUsagePercent = budgetSnapshot.totalLimit > 0
    ? (budgetSnapshot.totalSpent / budgetSnapshot.totalLimit) * 100
    : 0;
  const currentBalance = totals.balance;
  const projectedBalance = currentBalance + recurringSnapshot.pendingIncome - recurringSnapshot.pendingOutflow;

  kpis.innerHTML = `
    <article class="planner-kpi-card">
      <span class="planner-kpi-label">Rozpočty</span>
      <strong class="planner-kpi-value">${formatCurrency(budgetSnapshot.totalSpent)}</strong>
      <small class="planner-kpi-meta">z ${formatCurrency(budgetSnapshot.totalLimit)} · ${budgetUsagePercent.toFixed(1)} % plánu</small>
    </article>
    <article class="planner-kpi-card">
      <span class="planner-kpi-label">Opakované odchozí</span>
      <strong class="planner-kpi-value">${formatCurrency(recurringSnapshot.plannedOutflow - recurringSnapshot.pendingOutflow)}</strong>
      <small class="planner-kpi-meta">splněno z ${formatCurrency(recurringSnapshot.plannedOutflow)}</small>
    </article>
    <article class="planner-kpi-card">
      <span class="planner-kpi-label">Ještě čeká</span>
      <strong class="planner-kpi-value">${formatCurrency(recurringSnapshot.pendingOutflow)}</strong>
      <small class="planner-kpi-meta">${recurringSnapshot.pendingCount} naplánovaných pohybů bez zaúčtování</small>
    </article>
    <article class="planner-kpi-card">
      <span class="planner-kpi-label">Odhad zůstatku</span>
      <strong class="planner-kpi-value">${formatCurrency(projectedBalance)}</strong>
      <small class="planner-kpi-meta">aktuálně ${formatCurrency(currentBalance)} · po zbytku plánu</small>
    </article>
  `;

  budgetMeta.textContent = budgetSnapshot.entries.length
    ? `${budgetSnapshot.entries.length} limitů v tomto měsíci`
    : "Bez nastavených limitů";

  if (!budgetSnapshot.entries.length) {
    budgetRows.innerHTML = '<div class="planner-empty">Zatím nemáš nastavené žádné rozpočty kategorií.</div>';
  } else {
    budgetRows.innerHTML = budgetSnapshot.entries.slice(0, 6).map(item => {
      const fillWidth = Math.min(item.percent, 100);
      const statusClass = item.percent >= 100 ? "is-danger" : item.percent >= 80 ? "is-warning" : "is-good";
      const remainingText = item.remaining >= 0
        ? `Zbývá ${formatCurrency(item.remaining)}`
        : `Přes limit o ${formatCurrency(Math.abs(item.remaining))}`;

      return `
        <div class="planner-budget-row ${statusClass}">
          <div class="planner-row-top">
            <strong>${escapeHtml(item.category)}</strong>
            <span>${item.percent.toFixed(1)} %</span>
          </div>
          <div class="planner-row-progress">
            <div class="planner-row-fill" style="width:${Math.max(fillWidth, 4)}%"></div>
          </div>
          <div class="planner-row-meta">
            <span>${formatCurrency(item.spent)} z ${formatCurrency(item.limit)}</span>
            <span>${remainingText}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  recurringMeta.textContent = recurringSnapshot.entries.length
    ? `${recurringSnapshot.entries.length} plánovaných pohybů`
    : "Bez opakovaných plateb";

  if (!recurringSnapshot.entries.length) {
    recurringRows.innerHTML = '<div class="planner-empty">Zatím nemáš uložené žádné opakované platby ani příjmy.</div>';
  } else {
    recurringRows.innerHTML = recurringSnapshot.entries.map(item => `
      <div class="planner-recurring-row ${item.isApplied ? "is-applied" : item.isPastDue ? "is-past-due" : "is-pending"}">
        <div class="planner-row-top">
          <div class="planner-recurring-title-wrap">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.category || "Bez kategorie")} · ${formatDate(item.scheduledDate)}</span>
          </div>
          <span class="planner-recurring-amount">${item.direction === "income" ? "+" : "-"} ${formatCurrency(item.amount)}</span>
        </div>
        <div class="planner-row-meta">
          <span>${getTypeLabel(item.type)}</span>
          <span class="planner-status-pill">${item.isApplied ? "Zaúčtováno" : item.isPastDue ? "Po termínu" : "Čeká"}</span>
        </div>
      </div>
    `).join("");
  }
}

function renderTransactionSummary() {
  const transactions = getSelectedMonthTransactions();
  const totals = getSelectedMonthTotals();
  const totalOther = totals.investment + totals.tithe;
  const expenseWithInvestments = getExpenseWithInvestmentsTotal(totals);

  document.getElementById("transactionsCount").textContent = transactions.length;
  document.getElementById("transactionsExpenseTotal").textContent = formatCurrency(expenseWithInvestments);
  document.getElementById("transactionsIncomeTotal").textContent = formatCurrency(totals.income);
  document.getElementById("transactionsOtherTotal").textContent = formatCurrency(totalOther);
}

function getTypeLabel(type) {
  switch (type) {
    case "expense": return "Výdaj";
    case "income": return "Příjem";
    case "investment": return "Investice";
    case "tithe": return "Desátky";
    default: return type;
  }
}

function getAmountClass(type) {
  switch (type) {
    case "expense": return "amount-expense";
    case "income": return "amount-income";
    case "investment": return "amount-investment";
    case "tithe": return "amount-tithe";
    default: return "";
  }
}

function getFilteredTransactions() {
  let transactions = [...getSelectedMonthTransactions()];

  const q = normalizeText(document.getElementById("transactionSearch")?.value);
  const type = document.getElementById("transactionFilterType")?.value || "all";
  const category = normalizeText(document.getElementById("transactionFilterCategory")?.value);
  const sort = document.getElementById("transactionSort")?.value || "date-desc";

  if (q) {
    transactions = transactions.filter(t =>
      normalizeText(t.title).includes(q) ||
      normalizeText(t.note).includes(q)
    );
  }

  if (type !== "all") {
    transactions = transactions.filter(t => t.type === type);
  }

  if (category) {
    transactions = transactions.filter(t => normalizeText(t.category).includes(category));
  }

  transactions.sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return parseTransactionDate(a.date) - parseTransactionDate(b.date);
      case "date-desc":
        return parseTransactionDate(b.date) - parseTransactionDate(a.date);
      case "amount-asc":
        return Number(a.amount) - Number(b.amount);
      case "amount-desc":
        return Number(b.amount) - Number(a.amount);
      case "title-asc":
        return a.title.localeCompare(b.title, "cs");
      case "title-desc":
        return b.title.localeCompare(a.title, "cs");
      default:
        return parseTransactionDate(b.date) - parseTransactionDate(a.date);
    }
  });

  return transactions;
}

function renderTransactions() {
  const tableBody = document.getElementById("transactionsTableBody");
  const cards = document.getElementById("transactionsCards");
  const emptyState = document.getElementById("transactionsEmptyState");

  if (!tableBody || !cards || !emptyState) return;

  const transactions = getFilteredTransactions();
  tableBody.innerHTML = "";
  cards.innerHTML = "";

  if (!transactions.length) {
    const hasAnyTransactions = getSelectedMonthTransactions().length > 0;
    emptyState.innerHTML = hasAnyTransactions
      ? `
        <div class="empty-icon">◉</div>
        <h3>Žádné výsledky</h3>
        <p>Zkus upravit nebo vyčistit filtry.</p>
        <div class="empty-state-actions">
          <button class="btn btn-ghost btn-small" type="button" onclick="resetTransactionFilters()">Vyčistit filtry</button>
        </div>
      `
      : `
        <div class="empty-icon">◉</div>
        <h3>Zatím žádné transakce</h3>
        <p>Přidej první záznam a dashboard se začne plnit daty.</p>
        <div class="empty-state-actions">
          <button class="btn btn-gold btn-small" type="button" onclick="focusQuickAdd()">Přidat první transakci</button>
        </div>
      `;
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  transactions.forEach(transaction => {
    const sign = transaction.type === "income" ? "+" : "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(transaction.date)}</td>
      <td>${escapeHtml(transaction.title)}</td>
      <td>${escapeHtml(transaction.category || "-")}</td>
      <td><span class="type-badge type-${transaction.type}">${getTypeLabel(transaction.type)}</span></td>
      <td class="${getAmountClass(transaction.type)}">${sign} ${formatCurrency(transaction.amount)}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" type="button" onclick="editTransaction('${transaction.id}')" title="Upravit">✎</button>
          <button class="icon-btn" type="button" onclick="deleteTransaction('${transaction.id}')" title="Smazat">🗑️</button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);

    const card = document.createElement("div");
    card.className = "transaction-card";
    card.innerHTML = `
      <div class="transaction-card-top">
        <div class="transaction-card-title">${escapeHtml(transaction.title)}</div>
        <div class="${getAmountClass(transaction.type)}">${sign} ${formatCurrency(transaction.amount)}</div>
      </div>
      <div class="transaction-card-meta">
        <span>${formatDate(transaction.date)}</span>
        <span>${escapeHtml(transaction.category || "Bez kategorie")}</span>
        <span class="type-badge type-${transaction.type}">${getTypeLabel(transaction.type)}</span>
      </div>
      <div class="transaction-card-bottom">
        <small>${escapeHtml(transaction.note || "")}</small>
        <div class="row-actions">
          <button class="icon-btn" type="button" onclick="editTransaction('${transaction.id}')" title="Upravit">✎</button>
          <button class="icon-btn" type="button" onclick="deleteTransaction('${transaction.id}')" title="Smazat">🗑️</button>
        </div>
      </div>
    `;
    cards.appendChild(card);
  });
}

async function addTransaction(event) {
  event.preventDefault();

  const title = document.getElementById("transactionTitle").value.trim();
  const amount = Number(document.getElementById("transactionAmount").value);
  const type = document.getElementById("transactionType").value;
  const category = document.getElementById("transactionCategory").value.trim();
  const date = document.getElementById("transactionDate").value;
  const note = document.getElementById("transactionNote").value.trim();

  if (!title || !amount || !date) {
    showToast("Vyplň název, částku a datum.");
    return;
  }

  if (!currentUser) {
    showToast("Uživatel není přihlášený.");
    return;
  }

  try {
    const newTransaction = await apiRequest("/api/transactions", {
      method: "POST",
      body: {
        title,
        amount,
        type: normalizeTransactionType(type, category),
        category,
        date: normalizeTransactionDateValue(date),
        note
      }
    });

    transactionsData = [...transactionsData, normalizeTransactionRecord(newTransaction)];
    invalidateSelectedMonthCache();
  } catch (error) {
    showToast(error.message || "Transakci se nepodařilo uložit.");
    return;
  }

  document.getElementById("quickTransactionForm").reset();
  document.getElementById("transactionDate").value = getTodayInputValue();
  document.getElementById("transactionType").value = "expense";
  renderQuickCategoryOptions("expense");
  syncQuickCategoryChips();

  const buttons = document.querySelectorAll(".type-switch-btn");
  buttons.forEach(btn => btn.classList.remove("active"));
  document.querySelector('.type-switch-btn[data-type="expense"]')?.classList.add("active");

  showToast("Transakce byla přidána.");
  renderAll();
}

async function deleteTransaction(id) {
  const confirmed = confirm("Opravdu chceš smazat tuto transakci?");
  if (!confirmed) return;

  try {
    await apiRequest(`/api/transactions/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    transactionsData = transactionsData.filter(t => t.id !== id);
    invalidateSelectedMonthCache();
  } catch (error) {
    showToast(error.message || "Transakci se nepodařilo smazat.");
    return;
  }

  showToast("Transakce byla smazána.");
  renderAll();
}

function editTransaction(id) {
  const transaction = transactionsData.find(t => t.id === id);
  if (!transaction) return;
  document.getElementById("editTransactionId").value = transaction.id;
  document.getElementById("editTransactionTitleInput").value = transaction.title || "";
  document.getElementById("editTransactionAmount").value = String(transaction.amount || "");
  document.getElementById("editTransactionType").value = transaction.type || "expense";
  document.getElementById("editTransactionCategory").value = transaction.category || "";
  document.getElementById("editTransactionDate").value = normalizeTransactionDateValue(transaction.date);
  document.getElementById("editTransactionNote").value = transaction.note || "";
  document.getElementById("editTransactionModal")?.classList.remove("hidden");
  document.body.classList.add("modal-open");
  document.getElementById("editTransactionTitleInput")?.focus();
}

function scheduleRenderTransactions() {
  if (transactionsFilterTimer) {
    clearTimeout(transactionsFilterTimer);
  }

  transactionsFilterTimer = setTimeout(() => {
    renderTransactions();
    transactionsFilterTimer = null;
  }, 120);
}

window.deleteTransaction = deleteTransaction;
window.editTransaction = editTransaction;

function focusQuickAdd() {
  const section = document.querySelector(".quick-add-card");
  section?.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("transactionCategory")?.focus();
}

function focusBudgetForm() {
  const form = document.getElementById("budgetForm");
  form?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  document.getElementById("budgetLimit")?.focus();
}

function focusGoalForm() {
  const form = document.getElementById("goalForm");
  form?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  document.getElementById("goalName")?.focus();
}

function focusRecurringForm() {
  const form = document.getElementById("recurringForm");
  form?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  document.getElementById("recurringTitle")?.focus();
}

function editBudget(category) {
  const budgets = getBudgets();
  const limit = budgets[category];
  if (limit == null) return;

  document.getElementById("budgetCategory").value = category;
  document.getElementById("budgetLimit").value = String(limit);
  document.getElementById("budgetOriginalCategory").value = category;
  document.getElementById("budgetSubmitBtn").textContent = "Upravit limit";
  document.getElementById("budgetForm")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function deleteBudget(category) {
  const confirmed = confirm(`Opravdu chceš smazat limit pro kategorii ${category}?`);
  if (!confirmed) return;

  try {
    await apiRequest(`/api/budgets/${encodeURIComponent(category)}`, {
      method: "DELETE"
    });
    const budgets = { ...getBudgets() };
    delete budgets[category];
    saveBudgets(budgets);
  } catch (error) {
    showToast(error.message || "Rozpočet se nepodařilo smazat.");
    return;
  }

  if (document.getElementById("budgetOriginalCategory").value === category) {
    document.getElementById("budgetForm").reset();
    document.getElementById("budgetOriginalCategory").value = "";
    document.getElementById("budgetSubmitBtn").textContent = "Uložit limit";
  }

  showToast("Rozpočet byl smazán.");
  renderBudgets();
  renderSmartInsights();
}

async function saveBudget(event) {
  event.preventDefault();

  const category = document.getElementById("budgetCategory").value;
  const limit = Number(document.getElementById("budgetLimit").value);
  const originalCategory = document.getElementById("budgetOriginalCategory").value;

  if (!category || !limit) {
    showToast("Vyber kategorii a zadej limit.");
    return;
  }

  try {
    if (originalCategory && originalCategory !== category) {
      await apiRequest(`/api/budgets/${encodeURIComponent(originalCategory)}`, {
        method: "DELETE"
      });
    }

    const savedBudget = await apiRequest(`/api/budgets/${encodeURIComponent(category)}`, {
      method: "PUT",
      body: {
        limitAmount: limit
      }
    });

    const budgets = { ...getBudgets() };
    if (originalCategory && originalCategory !== category) {
      delete budgets[originalCategory];
    }
    budgets[savedBudget.category] = Number(savedBudget.limitAmount || limit);
    saveBudgets(budgets);
  } catch (error) {
    showToast(error.message || "Rozpočet se nepodařilo uložit.");
    return;
  }

  document.getElementById("budgetForm").reset();
  document.getElementById("budgetOriginalCategory").value = "";
  document.getElementById("budgetSubmitBtn").textContent = "Uložit limit";
  showToast(originalCategory ? "Rozpočet byl upraven." : "Rozpočet byl uložen.");
  renderBudgets();
  renderSmartInsights();
}

function resetGoalForm() {
  document.getElementById("goalForm")?.reset();
  document.getElementById("goalId").value = "";
  document.getElementById("goalSubmitBtn").textContent = "Uložit cíl";
}

async function saveGoal(event) {
  event.preventDefault();

  const id = document.getElementById("goalId").value;
  const name = document.getElementById("goalName").value.trim();
  const target = Number(document.getElementById("goalTarget").value);
  const current = Number(document.getElementById("goalCurrent").value || 0);
  const monthlyContribution = Number(document.getElementById("goalContribution").value || 0);

  if (!name || !target) {
    showToast("Vyplň název cíle a cílovou částku.");
    return;
  }

  const payload = {
    name,
    target,
    current,
    monthlyContribution
  };

  try {
    const savedGoal = id
      ? await apiRequest(`/api/goals/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: payload
      })
      : await apiRequest("/api/goals", {
        method: "POST",
        body: payload
      });

    const nextGoals = id
      ? getGoals().map(goal => goal.id === id ? savedGoal : goal)
      : [...getGoals(), savedGoal];

    saveGoals(nextGoals);
  } catch (error) {
    showToast(error.message || "Cíl se nepodařilo uložit.");
    return;
  }

  resetGoalForm();
  showToast(id ? "Cíl byl upraven." : "Cíl byl uložen.");
  renderGoals();
  renderSmartInsights();
}

function editGoal(id) {
  const goal = getGoals().find(item => item.id === id);
  if (!goal) return;

  document.getElementById("goalId").value = goal.id;
  document.getElementById("goalName").value = goal.name || "";
  document.getElementById("goalTarget").value = String(goal.target || "");
  document.getElementById("goalCurrent").value = String(goal.current || "");
  document.getElementById("goalContribution").value = String(goal.monthlyContribution || "");
  document.getElementById("goalSubmitBtn").textContent = "Upravit cíl";
  focusGoalForm();
}

async function deleteGoal(id) {
  const goal = getGoals().find(item => item.id === id);
  if (!goal || !confirm(`Opravdu chceš smazat cíl ${goal.name}?`)) return;

  try {
    await apiRequest(`/api/goals/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    saveGoals(getGoals().filter(item => item.id !== id));
  } catch (error) {
    showToast(error.message || "Cíl se nepodařilo smazat.");
    return;
  }

  if (document.getElementById("goalId").value === id) {
    resetGoalForm();
  }
  showToast("Cíl byl smazán.");
  renderGoals();
  renderSmartInsights();
}

function resetRecurringForm() {
  document.getElementById("recurringForm")?.reset();
  document.getElementById("recurringId").value = "";
  document.getElementById("recurringSubmitBtn").textContent = "Uložit platbu";
}

async function saveRecurringPlan(event) {
  event.preventDefault();

  const id = document.getElementById("recurringId").value;
  const title = document.getElementById("recurringTitle").value.trim();
  const amount = Number(document.getElementById("recurringAmount").value);
  const type = document.getElementById("recurringType").value;
  const category = document.getElementById("recurringCategory").value.trim();
  const dayOfMonth = Number(document.getElementById("recurringDay").value);

  if (!title || !amount || !dayOfMonth) {
    showToast("Vyplň název, částku a den v měsíci.");
    return;
  }

  const normalizedDayOfMonth = Math.min(Math.max(Math.trunc(dayOfMonth), 1), 31);

  const payload = {
    title,
    amount,
    type: normalizeTransactionType(type, category),
    category,
    dayOfMonth: normalizedDayOfMonth,
    lastUsedAt: getRecurringPlans().find(item => item.id === id)?.lastUsedAt || null
  };

  try {
    const savedPlan = id
      ? await apiRequest(`/api/recurring-plans/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: payload
      })
      : await apiRequest("/api/recurring-plans", {
        method: "POST",
        body: payload
      });

    const nextPlans = id
      ? getRecurringPlans().map(plan => plan.id === id ? normalizeRecurringPlanRecord(savedPlan) : plan)
      : [...getRecurringPlans(), normalizeRecurringPlanRecord(savedPlan)];

    saveRecurringPlans(nextPlans);
  } catch (error) {
    showToast(error.message || "Opakovanou platbu se nepodařilo uložit.");
    return;
  }

  resetRecurringForm();
  showToast(id ? "Opakovaná platba byla upravena." : "Opakovaná platba byla uložena.");
  renderRecurringPlans();
}

function editRecurringPlan(id) {
  const plan = getRecurringPlans().find(item => item.id === id);
  if (!plan) return;

  document.getElementById("recurringId").value = plan.id;
  document.getElementById("recurringTitle").value = plan.title || "";
  document.getElementById("recurringAmount").value = String(plan.amount || "");
  document.getElementById("recurringType").value = plan.type || "expense";
  document.getElementById("recurringCategory").value = plan.category || "Ostatní";
  document.getElementById("recurringDay").value = String(plan.dayOfMonth || "");
  document.getElementById("recurringSubmitBtn").textContent = "Upravit platbu";
  focusRecurringForm();
}

async function deleteRecurringPlan(id) {
  const plan = getRecurringPlans().find(item => item.id === id);
  if (!plan || !confirm(`Opravdu chceš smazat opakovanou platbu ${plan.title}?`)) return;

  try {
    await apiRequest(`/api/recurring-plans/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    saveRecurringPlans(getRecurringPlans().filter(item => item.id !== id));
  } catch (error) {
    showToast(error.message || "Opakovanou platbu se nepodařilo smazat.");
    return;
  }

  if (document.getElementById("recurringId").value === id) {
    resetRecurringForm();
  }
  showToast("Opakovaná platba byla smazána.");
  renderRecurringPlans();
}

async function applyRecurringPlan(id) {
  const plan = getRecurringPlans().find(item => item.id === id);
  if (!plan || !currentUser) return;

  const date = toInputDate(getRecurringNextDate(plan, selectedYear, selectedMonth));
  const duplicateTransaction = getAllTransactions()
    .some(transaction => doesTransactionMatchRecurringPlan(transaction, plan, date));

  if (duplicateTransaction) {
    showToast("Tahle opakovaná platba už je v tomto měsíci zaúčtovaná.");
    return;
  }

  try {
    const createdTransaction = await apiRequest("/api/transactions", {
      method: "POST",
      body: {
        title: plan.title,
        amount: Number(plan.amount),
        type: normalizeTransactionType(plan.type, plan.category),
        category: plan.category,
        date,
        note: "Vytvořeno z opakované platby"
      }
    });

    const updatedPlan = await apiRequest(`/api/recurring-plans/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: {
        title: plan.title,
        amount: Number(plan.amount),
        type: normalizeTransactionType(plan.type, plan.category),
        category: plan.category,
        dayOfMonth: Number(plan.dayOfMonth),
        lastUsedAt: date
      }
    });

    transactionsData = [...transactionsData, normalizeTransactionRecord(createdTransaction)];
    saveRecurringPlans(getRecurringPlans().map(item => (
      item.id === id
        ? normalizeRecurringPlanRecord(updatedPlan)
        : item
    )));
    invalidateSelectedMonthCache();
  } catch (error) {
    showToast(error.message || "Opakovanou platbu se nepodařilo přidat.");
    return;
  }

  showToast("Opakovaná platba byla přidána do transakcí.");
  renderAll();
}

function closeEditTransactionModal() {
  document.getElementById("editTransactionModal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
  document.getElementById("editTransactionForm")?.reset();
  document.getElementById("editTransactionId").value = "";
}

function openChangePasswordModal() {
  document.getElementById("changePasswordModal")?.classList.remove("hidden");
  document.body.classList.add("modal-open");
  document.getElementById("changePasswordForm")?.reset();
  document.getElementById("currentPasswordInput")?.focus();
}

function closeChangePasswordModal() {
  document.getElementById("changePasswordModal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
  document.getElementById("changePasswordForm")?.reset();
}

async function saveChangedPassword(event) {
  event.preventDefault();

  const currentPassword = document.getElementById("currentPasswordInput")?.value || "";
  const newPassword = document.getElementById("newPasswordInput")?.value || "";
  const confirmPassword = document.getElementById("confirmPasswordInput")?.value || "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    showToast("Vyplň všechna pole pro změnu hesla.");
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast("Nová hesla se musí shodovat.");
    return;
  }

  try {
    await window.MonetraApi.changePassword({
      currentPassword,
      newPassword,
      confirmPassword
    });
    closeChangePasswordModal();
    showToast("Heslo bylo změněno.");
  } catch (error) {
    showToast(error.message || "Heslo se nepodařilo změnit.");
  }
}

async function saveEditedTransaction(event) {
  event.preventDefault();

  const id = document.getElementById("editTransactionId").value;
  const title = document.getElementById("editTransactionTitleInput").value.trim();
  const amount = Number(document.getElementById("editTransactionAmount").value);
  const type = document.getElementById("editTransactionType").value;
  const category = document.getElementById("editTransactionCategory").value.trim();
  const date = document.getElementById("editTransactionDate").value;
  const note = document.getElementById("editTransactionNote").value.trim();

  if (!id || !title || !amount || !date) {
    showToast("Vyplň název, částku a datum.");
    return;
  }

  try {
    const updated = await apiRequest(`/api/transactions/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: {
        title,
        amount,
        type: normalizeTransactionType(type, category),
        category,
        date: normalizeTransactionDateValue(date),
        note
      }
    });

    transactionsData = transactionsData.map(transaction => (
      transaction.id === id ? normalizeTransactionRecord(updated) : transaction
    ));
    invalidateSelectedMonthCache();
  } catch (error) {
    showToast(error.message || "Transakci se nepodařilo upravit.");
    return;
  }

  closeEditTransactionModal();
  showToast("Transakce byla upravena.");
  renderAll();
}

window.editBudget = editBudget;
window.deleteBudget = deleteBudget;
window.focusQuickAdd = focusQuickAdd;
window.focusBudgetForm = focusBudgetForm;
window.focusGoalForm = focusGoalForm;
window.focusRecurringForm = focusRecurringForm;
window.editGoal = editGoal;
window.deleteGoal = deleteGoal;
window.editRecurringPlan = editRecurringPlan;
window.deleteRecurringPlan = deleteRecurringPlan;
window.applyRecurringPlan = applyRecurringPlan;
window.deleteAdminUser = deleteAdminUser;
window.openEditAdminUserModal = openEditAdminUserModal;
window.resetAdminUserPassword = resetAdminUserPassword;
window.toggleAdminUserActive = toggleAdminUserActive;
window.resetTransactionFilters = () => {
  document.getElementById("transactionSearch").value = "";
  document.getElementById("transactionFilterType").value = "all";
  document.getElementById("transactionFilterCategory").value = "";
  document.getElementById("transactionSort").value = "date-desc";
  renderTransactions();
};


function buildPdfLegendRows(labels, values, total) {
  if (!labels.length || !values.length) {
    return `<div class="legend-empty">Za tento měsíc nejsou žádná data pro graf výdajů.</div>`;
  }

  return labels.map((label, index) => {
    const value = Number(values[index] || 0);
    const percent = total ? ((value / total) * 100).toFixed(1) : "0.0";
    return `
      <div class="legend-row">
        <span class="legend-name">${escapeHtml(label)}</span>
        <span class="legend-value">${formatCurrency(value)} · ${percent} %</span>
      </div>
    `;
  }).join("");
}

function buildPdfRuleLegendRows(incomeTotal) {
  const rows = [
    { label: "Životní náklady", percent: 48 },
    { label: "Volný čas", percent: 26 },
    { label: "Úspory / investice", percent: 16 },
    { label: "Desátky", percent: 10 }
  ];

  return rows.map(row => {
    const amount = incomeTotal ? incomeTotal * (row.percent / 100) : 0;
    return `
      <div class="legend-row">
        <span class="legend-name">${row.label}</span>
        <span class="legend-value">${row.percent} % · ${formatCurrency(amount)}</span>
      </div>
    `;
  }).join("");
}

function getYearMonthTotals(year, month) {
  const { income, expense, investment, tithe } = getMonthTotals(year, month);

  return {
    income,
    expense,
    investment,
    tithe,
    outflow: expense + investment + tithe
  };
}

function getYearOverview(year) {
  const months = Array.from({ length: 12 }, (_, month) => {
    const totals = getYearMonthTotals(year, month);
    return {
      month,
      label: new Intl.DateTimeFormat("cs-CZ", { month: "long" }).format(new Date(year, month, 1)),
      shortLabel: new Intl.DateTimeFormat("cs-CZ", { month: "short" }).format(new Date(year, month, 1)),
      ...totals
    };
  });

  const quarters = [
    { label: "Q1", months: [0, 1, 2] },
    { label: "Q2", months: [3, 4, 5] },
    { label: "Q3", months: [6, 7, 8] },
    { label: "Q4", months: [9, 10, 11] }
  ].map(quarter => {
    const quarterMonths = quarter.months.map(index => months[index]);
    return {
      label: quarter.label,
      income: quarterMonths.reduce((sum, item) => sum + item.income, 0),
      expense: quarterMonths.reduce((sum, item) => sum + item.expense, 0),
      outflow: quarterMonths.reduce((sum, item) => sum + item.outflow, 0)
    };
  });

  return {
    year,
    months,
    quarters,
    totalIncome: months.reduce((sum, item) => sum + item.income, 0),
    totalExpense: months.reduce((sum, item) => sum + item.expense, 0),
    totalOutflow: months.reduce((sum, item) => sum + item.outflow, 0)
  };
}

/* 3) a 4) export PDF s dvěma grafy a datem exportu */
function exportPdf() {
  const currentTotals = getSelectedMonthTotals();
  const monthName = getMonthLabel(selectedYear, selectedMonth);
  const transactions = getSelectedMonthTransactions();
  const exportDate = new Date().toLocaleString("cs-CZ");

  const printableRows = transactions.map(t => `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>${escapeHtml(t.title)}</td>
      <td>${escapeHtml(t.category || "-")}</td>
      <td>${getTypeLabel(t.type)}</td>
      <td>${t.type === "income" ? "+" : "-"} ${formatCurrency(t.amount)}</td>
    </tr>
  `).join("");

  const expenseData = buildExpenseCategoryData(transactions);
  const expenseLegendRows = buildPdfLegendRows(expenseData.labels, expenseData.values, expenseData.total);
  const ratioLegendRows = buildPdfRuleLegendRows(currentTotals.income);

  const printWindow = window.open("", "_blank", "width=1400,height=950");
  if (!printWindow) {
    showToast("Pro export PDF povol v prohlížeči vyskakovací okna.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="cs">
    <head>
      <meta charset="UTF-8">
      <title>PDF report - Trezor výdajů</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 32px;
          color: #111;
          background: #f5f1e6;
        }
        .header {
          background: linear-gradient(135deg, #111827, #1f2937);
          color: white;
          padding: 24px;
          border-radius: 18px;
          margin-bottom: 24px;
        }
        .header h1 {
          margin: 0 0 8px;
          color: #d4af37;
        }
        .header p {
          margin: 0;
          opacity: 0.92;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .kpi {
          background: white;
          border: 1px solid #e7dcc2;
          border-radius: 16px;
          padding: 18px;
        }
        .kpi span {
          display: block;
          color: #6b7280;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .kpi strong {
          font-size: 24px;
          color: #111827;
        }
        .section {
          background: white;
          border: 1px solid #e7dcc2;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
          page-break-inside: avoid;
        }
        .section h2 {
          margin: 0 0 12px;
          color: #111827;
        }
        .section p {
          margin: 0 0 16px;
          color: #6b7280;
        }
        .pdf-charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
          margin-top: 8px;
          align-items: start;
        }
        .pdf-chart-card {
          border: 1px solid #ece3cc;
          border-radius: 16px;
          padding: 18px;
          background:
            radial-gradient(circle at top right, rgba(212,175,55,0.08), transparent 34%),
            radial-gradient(circle at bottom left, rgba(66,217,255,0.05), transparent 30%),
            #fffdfa;
        }
        .pdf-chart-card h3 {
          margin: 0 0 8px;
          font-size: 18px;
          color: #111827;
        }
        .pdf-chart-subtitle {
          margin: 0 0 14px;
          color: #6b7280;
          font-size: 13px;
        }
        .pdf-chart-wrap {
          height: 280px;
          position: relative;
        }
        .pdf-chart-wrap canvas {
          width: 100% !important;
          height: 100% !important;
        }
        .legend-block {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #efe6d3;
        }
        .legend-title {
          margin: 0 0 10px;
          font-size: 13px;
          font-weight: 700;
          color: #7a5b10;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .legend-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #f3ede0;
          font-size: 13px;
        }
        .legend-row:last-child {
          border-bottom: none;
        }
        .legend-name {
          font-weight: 700;
          color: #1f2937;
        }
        .legend-value {
          color: #4b5563;
          text-align: right;
        }
        .legend-empty {
          font-size: 13px;
          color: #6b7280;
          padding: 2px 0 6px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        th, td {
          border-bottom: 1px solid #ece7d8;
          padding: 10px 8px;
          text-align: left;
        }
        th {
          color: #8a6b14;
          background: #fbf7ec;
        }
        .footer {
          margin-top: 20px;
          color: #6b7280;
          font-size: 12px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        @media print {
          body {
            background: #fff;
            padding: 20px;
          }
          .section, .kpi {
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Trezor výdajů</h1>
        <p>PDF přehled za období: ${escapeHtml(monthName.charAt(0).toUpperCase() + monthName.slice(1))}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi">
          <span>Příjmy</span>
          <strong>${formatCurrency(currentTotals.income)}</strong>
        </div>
        <div class="kpi">
          <span>Výdaje</span>
          <strong>${formatCurrency(currentTotals.expense)}</strong>
        </div>
        <div class="kpi">
          <span>Zůstatek</span>
          <strong>${formatCurrency(currentTotals.balance)}</strong>
        </div>
      </div>

      <div class="section">
        <h2>Přehled</h2>
        <p>Investice: ${formatCurrency(currentTotals.investment)} · Desátky: ${formatCurrency(currentTotals.tithe)}</p>
      </div>

      <div class="section">
        <h2>Grafy v reportu</h2>

        <div class="pdf-charts-grid">
          <div class="pdf-chart-card">
            <h3>Pravidlo 48 / 26 / 16 / 10</h3>
            <p class="pdf-chart-subtitle">Cílové rozdělení příjmů pro daný měsíc.</p>
            <div class="pdf-chart-wrap">
              <canvas id="pdfRatioChart"></canvas>
            </div>
            <div class="legend-block">
              <div class="legend-title">Popisky</div>
              ${ratioLegendRows}
            </div>
          </div>

          <div class="pdf-chart-card">
            <h3>Výdaje podle kategorií</h3>
            <p class="pdf-chart-subtitle">Rozložení výdajů za zvolený měsíc.</p>
            <div class="pdf-chart-wrap">
              <canvas id="pdfExpenseChart"></canvas>
            </div>
            <div class="legend-block">
              <div class="legend-title">Popisky</div>
              ${expenseLegendRows}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Seznam transakcí</h2>
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Název</th>
              <th>Kategorie</th>
              <th>Typ</th>
              <th>Částka</th>
            </tr>
          </thead>
          <tbody>
            ${printableRows || `<tr><td colspan="5">Za tento měsíc nejsou žádné transakce.</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <span>Vygenerováno z aplikace Trezor výdajů</span>
        <span>Datum exportu: ${escapeHtml(exportDate)}</span>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();

  const renderPdfCharts = () => {
    const ratioCanvas = printWindow.document.getElementById("pdfRatioChart");
    const expenseCanvas = printWindow.document.getElementById("pdfExpenseChart");
    const PdfChart = printWindow.Chart;

    if (!ratioCanvas || !expenseCanvas || !PdfChart) {
      setTimeout(renderPdfCharts, 150);
      return;
    }

    const ratioCtx = ratioCanvas.getContext("2d");
    const expenseCtx = expenseCanvas.getContext("2d");

    new PdfChart(ratioCtx, {
      type: "doughnut",
      data: {
        labels: ["Životní náklady", "Volný čas", "Úspory / investice", "Desátky"],
        datasets: [{
          data: [48, 26, 16, 10],
          backgroundColor: ["#ff7676", "#ff77cf", "#3dd7ff", "#d4af37"],
          borderWidth: 0,
          spacing: 6,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.label}: ${context.raw} %`;
              }
            }
          }
        }
      }
    });

    new PdfChart(expenseCtx, {
      type: "doughnut",
      data: {
        labels: expenseData.labels.length ? expenseData.labels : ["Žádná data"],
        datasets: [{
          data: expenseData.values.length ? expenseData.values : [1],
          backgroundColor: expenseData.values.length
            ? ["#ff7676", "#ff77cf", "#3dd7ff", "#7a98ff", "#b27cff", "#ffb257", "#20c997", "#d4af37"]
            : ["rgba(212,175,55,0.45)"],
          borderWidth: 0,
          spacing: 6,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                if (!expenseData.total) return `${context.label}: 0 Kč`;
                const value = Number(context.raw || 0);
                const percent = ((value / expenseData.total) * 100).toFixed(1);
                return `${context.label}: ${formatCurrency(value)} (${percent} %)`;
              }
            }
          }
        }
      }
    });

    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  setTimeout(renderPdfCharts, 200);
}

function exportAnnualPdf() {
  const overview = getYearOverview(selectedYear);
  const exportDate = new Date().toLocaleString("cs-CZ");
  const monthMax = Math.max(...overview.months.map(item => Math.max(item.income, item.expense, 1)));

  const monthlyCards = overview.months.map(item => {
    const incomeWidth = `${Math.max((item.income / monthMax) * 100, item.income ? 8 : 2)}%`;
    const expenseWidth = `${Math.max((item.expense / monthMax) * 100, item.expense ? 8 : 2)}%`;
    return `
      <div class="month-card">
        <div class="month-card-top">
          <strong>${escapeHtml(item.label.charAt(0).toUpperCase() + item.label.slice(1))}</strong>
          <span>${item.income || item.expense ? "aktivní" : "bez pohybu"}</span>
        </div>
        <div class="month-metric">
          <span>Příjmy</span>
          <strong>${formatCurrency(item.income)}</strong>
        </div>
        <div class="mini-bar"><div class="mini-bar-fill income-fill" style="width:${incomeWidth}"></div></div>
        <div class="month-metric expense">
          <span>Výdaje</span>
          <strong>${formatCurrency(item.expense)}</strong>
        </div>
        <div class="mini-bar"><div class="mini-bar-fill expense-fill" style="width:${expenseWidth}"></div></div>
      </div>
    `;
  }).join("");

  const quarterRows = overview.quarters.map(item => `
    <div class="legend-row">
      <span class="legend-name">${item.label}</span>
      <span class="legend-value">Příjmy ${formatCurrency(item.income)} · Výdaje ${formatCurrency(item.expense)}</span>
    </div>
  `).join("");

  const printWindow = window.open("", "_blank", "width=1480,height=980");
  if (!printWindow) {
    showToast("Pro export ročního přehledu povol v prohlížeči vyskakovací okna.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="cs">
    <head>
      <meta charset="UTF-8">
      <title>Roční přehled - Trezor výdajů</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 30px;
          color: #111827;
          background:
            radial-gradient(circle at top right, rgba(212,175,55,0.18), transparent 26%),
            radial-gradient(circle at bottom left, rgba(66,217,255,0.14), transparent 24%),
            #f5f1e6;
        }
        .hero {
          background: linear-gradient(135deg, #111827, #1f2937);
          color: #fff;
          border-radius: 22px;
          padding: 26px 28px;
          margin-bottom: 22px;
        }
        .hero h1 {
          margin: 0 0 6px;
          color: #f3d67c;
          font-size: 30px;
        }
        .hero p {
          margin: 0;
          opacity: 0.92;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }
        .summary-card {
          background: rgba(255,255,255,0.94);
          border: 1px solid #e7dcc2;
          border-radius: 18px;
          padding: 18px;
        }
        .summary-card span {
          display: block;
          color: #6b7280;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .summary-card strong {
          font-size: 26px;
        }
        .summary-income strong { color: #0f9f6e; }
        .summary-expense strong { color: #ef6464; }
        .summary-balance strong { color: #c69214; }
        .section {
          background: rgba(255,255,255,0.94);
          border: 1px solid #e7dcc2;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 22px;
          page-break-inside: avoid;
        }
        .section h2 {
          margin: 0 0 14px;
        }
        .section p {
          margin: 0 0 14px;
          color: #6b7280;
        }
        .month-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        .month-card {
          background: linear-gradient(135deg, rgba(255,255,255,1), rgba(252,248,239,1));
          border: 1px solid #efe5cf;
          border-radius: 16px;
          padding: 14px;
        }
        .month-card-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .month-card-top strong {
          font-size: 15px;
        }
        .month-card-top span {
          font-size: 12px;
          color: #8b96a7;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .month-metric {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          margin-bottom: 6px;
        }
        .month-metric span {
          color: #6b7280;
        }
        .month-metric strong {
          color: #111827;
        }
        .month-metric.expense strong {
          color: #b94a4a;
        }
        .mini-bar {
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: #ece6d8;
          margin-bottom: 10px;
        }
        .mini-bar-fill {
          height: 100%;
          border-radius: inherit;
        }
        .income-fill {
          background: linear-gradient(90deg, #5fd9a5, #0f9f6e);
        }
        .expense-fill {
          background: linear-gradient(90deg, #ff9696, #ef6464);
        }
        .charts-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 18px;
          align-items: start;
        }
        .chart-card {
          border: 1px solid #ece3cc;
          border-radius: 16px;
          padding: 18px;
          background: #fffdfa;
        }
        .chart-card h3 {
          margin: 0 0 8px;
        }
        .chart-card p {
          margin: 0 0 12px;
          color: #6b7280;
          font-size: 13px;
        }
        .chart-wrap {
          height: 300px;
          position: relative;
        }
        .chart-wrap.small {
          height: 260px;
        }
        .legend-block {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #efe6d3;
        }
        .legend-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #f3ede0;
          font-size: 13px;
        }
        .legend-row:last-child {
          border-bottom: none;
        }
        .legend-name {
          font-weight: 700;
        }
        .legend-value {
          color: #4b5563;
          text-align: right;
        }
        .year-footer {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 12px;
          color: #6b7280;
          flex-wrap: wrap;
        }
        @media print {
          body { background: #fff; padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="hero">
        <h1>Roční přehled ${overview.year}</h1>
        <p>Souhrn příjmů, výdajů a vývoje během celého roku.</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card summary-income">
          <span>Roční příjmy</span>
          <strong>${formatCurrency(overview.totalIncome)}</strong>
        </div>
        <div class="summary-card summary-expense">
          <span>Roční výdaje</span>
          <strong>${formatCurrency(overview.totalExpense)}</strong>
        </div>
        <div class="summary-card summary-balance">
          <span>Roční rozdíl</span>
          <strong>${formatCurrency(overview.totalIncome - overview.totalExpense)}</strong>
        </div>
      </div>

      <div class="section">
        <h2>Měsíční přehled</h2>
        <p>Každý měsíc ukazuje příjmy a výdaje v kompaktní podobě.</p>
        <div class="month-grid">
          ${monthlyCards}
        </div>
      </div>

      <div class="section">
        <h2>Souhrnné grafy</h2>
        <div class="charts-grid">
          <div class="chart-card">
            <h3>Měsíční vývoj</h3>
            <p>Příjmy a výdaje během jednotlivých měsíců.</p>
            <div class="chart-wrap">
              <canvas id="annualMonthlyChart"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <h3>Kvartální přehled</h3>
            <p>Srovnání kvartálů podle příjmů a výdajů.</p>
            <div class="chart-wrap small">
              <canvas id="annualQuarterChart"></canvas>
            </div>
            <div class="legend-block">
              ${quarterRows}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Roční souhrn</h2>
        <div class="charts-grid">
          <div class="chart-card">
            <h3>Vydělal vs. utratil</h3>
            <p>Celoroční porovnání hlavních toků peněz.</p>
            <div class="chart-wrap small">
              <canvas id="annualSummaryChart"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <h3>Celkové výsledky</h3>
            <div class="legend-block">
              <div class="legend-row"><span class="legend-name">Celkové příjmy</span><span class="legend-value">${formatCurrency(overview.totalIncome)}</span></div>
              <div class="legend-row"><span class="legend-name">Celkové výdaje</span><span class="legend-value">${formatCurrency(overview.totalExpense)}</span></div>
              <div class="legend-row"><span class="legend-name">Další odtoky</span><span class="legend-value">${formatCurrency(overview.totalOutflow - overview.totalExpense)}</span></div>
              <div class="legend-row"><span class="legend-name">Roční bilance</span><span class="legend-value">${formatCurrency(overview.totalIncome - overview.totalExpense)}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="year-footer">
        <span>Vygenerováno z aplikace Trezor výdajů</span>
        <span>Datum exportu: ${escapeHtml(exportDate)}</span>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();

  const renderAnnualCharts = () => {
    const monthlyCanvas = printWindow.document.getElementById("annualMonthlyChart");
    const quarterCanvas = printWindow.document.getElementById("annualQuarterChart");
    const summaryCanvas = printWindow.document.getElementById("annualSummaryChart");
    const PdfChart = printWindow.Chart;

    if (!monthlyCanvas || !quarterCanvas || !summaryCanvas || !PdfChart) {
      setTimeout(renderAnnualCharts, 150);
      return;
    }

    new PdfChart(monthlyCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: overview.months.map(item => item.shortLabel),
        datasets: [
          {
            label: "Příjmy",
            data: overview.months.map(item => item.income),
            backgroundColor: "rgba(95, 217, 165, 0.88)",
            borderRadius: 8
          },
          {
            label: "Výdaje",
            data: overview.months.map(item => item.expense),
            backgroundColor: "rgba(239, 100, 100, 0.86)",
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" }
        },
        scales: {
          y: {
            ticks: {
              callback(value) {
                return formatCurrency(value);
              }
            }
          }
        }
      }
    });

    new PdfChart(quarterCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: overview.quarters.map(item => item.label),
        datasets: [
          {
            label: "Příjmy",
            data: overview.quarters.map(item => item.income),
            backgroundColor: "rgba(95, 217, 165, 0.88)",
            borderRadius: 10
          },
          {
            label: "Výdaje",
            data: overview.quarters.map(item => item.expense),
            backgroundColor: "rgba(239, 100, 100, 0.86)",
            borderRadius: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" }
        },
        scales: {
          y: {
            ticks: {
              callback(value) {
                return formatCurrency(value);
              }
            }
          }
        }
      }
    });

    new PdfChart(summaryCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Příjmy", "Výdaje"],
        datasets: [{
          data: [overview.totalIncome, overview.totalExpense],
          backgroundColor: ["#5fd9a5", "#ef6464"],
          borderWidth: 0,
          spacing: 6,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.label}: ${formatCurrency(context.raw)}`;
              }
            }
          }
        }
      }
    });

    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  setTimeout(renderAnnualCharts, 200);
}


function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light-mode");
  } else {
    document.body.classList.remove("light-mode");
  }
  localStorage.setItem(THEME_KEY, theme);
  updateThemeToggleButton();
}

function toggleTheme() {
  const isLight = document.body.classList.contains("light-mode");
  applyTheme(isLight ? "dark" : "light");
  renderAll();
}

function logout() {
  window.MonetraApi?.clearSession();
  window.location.href = "index.html";
}

function renderAll() {
  updateMonthLabel();
  renderMonthCalendar();
  renderBudgetCategoryOptions();
  renderRecurringCategoryOptions();
  renderTransactionCategoryDatalist();
  renderAdminPanel();
  updateThemeToggleButton();
  renderMonthlyPlanner();
  renderKpis();
  renderExpenseDonutChart();
  renderRatioRule();
  renderMonthlyComparison();
  renderBalanceChart();
  renderBudgets();
  renderGoals();
  renderRecurringPlans();
  renderSmartInsights();
  renderTransactionSummary();
  renderTransactions();
}

function renderAdminPanel() {
  const panel = document.getElementById("adminPanel");
  const list = document.getElementById("adminUsersList");
  const count = document.getElementById("adminUsersCount");
  if (!panel || !list || !count) return;

  if (!isAdminUser()) {
    panel.classList.add("hidden");
    return;
  }

  panel.classList.remove("hidden");
  count.textContent = String(adminUsersCache.length);

  if (!adminUsersCache.length) {
    list.innerHTML = '<div class="admin-empty">Zatím tu nejsou žádní uživatelé.</div>';
    return;
  }

  list.innerHTML = adminUsersCache.map(user => `
    <div class="admin-user-item">
      <div class="admin-user-main">
        <div class="admin-user-name-row">
          <strong>${escapeHtml(user.name || user.email)}</strong>
          <span class="admin-user-role">${escapeHtml(user.role || "USER")}</span>
          <span class="admin-user-status ${user.active === false ? "is-inactive" : "is-active"}">${user.active === false ? "Neaktivní" : "Aktivní"}</span>
        </div>
        <div class="admin-user-email">${escapeHtml(user.email)}</div>
        <div class="admin-user-meta">
          Transakce: ${Number(user.stats?.transactions || 0)} · Cíle: ${Number(user.stats?.goals || 0)} · Opakované: ${Number(user.stats?.recurringPlans || 0)}
        </div>
      </div>
      <div class="admin-user-actions">
        <button class="btn btn-ghost btn-small" type="button" onclick="openEditAdminUserModal('${user.id}')">Upravit</button>
        <button class="btn btn-ghost btn-small" type="button" onclick="resetAdminUserPassword('${user.id}')">Reset hesla</button>
        <button class="btn btn-ghost btn-small" type="button" onclick="toggleAdminUserActive('${user.id}')"
          ${user.id === currentUser?.id ? "disabled" : ""}>
          ${user.active === false ? "Aktivovat" : "Deaktivovat"}
        </button>
        <button class="btn btn-danger btn-small" type="button" onclick="deleteAdminUser('${user.id}')"
          ${user.id === currentUser?.id ? "disabled" : ""}>
          Smazat
        </button>
      </div>
    </div>
  `).join("");
}

async function createAdminUser(event) {
  event.preventDefault();

  const name = document.getElementById("adminUserName")?.value.trim() || "";
  const email = document.getElementById("adminUserEmail")?.value.trim() || "";
  const password = document.getElementById("adminUserPassword")?.value || "";
  const role = document.getElementById("adminUserRole")?.value || "USER";

  if (!email || !password) {
    showToast("Vyplň email a heslo pro nového uživatele.");
    return;
  }

  try {
    const newUser = await apiRequest("/api/admin/users", {
      method: "POST",
      body: {
        name,
        email,
        password,
        role
      }
    });

    adminUsersCache = [{ ...newUser, stats: { transactions: 0, goals: 0, recurringPlans: 0 } }, ...adminUsersCache];
    document.getElementById("adminUserForm")?.reset();
    showToast("Uživatel byl vytvořen.");
    renderAdminPanel();
  } catch (error) {
    showToast(error.message || "Uživatele se nepodařilo vytvořit.");
  }
}

function openEditAdminUserModal(id) {
  const user = adminUsersCache.find(item => item.id === id);
  if (!user) return;

  editingAdminUserId = id;
  document.getElementById("editAdminUserId").value = id;
  document.getElementById("editAdminUserName").value = user.name || "";
  document.getElementById("editAdminUserEmail").value = user.email || "";
  document.getElementById("editAdminUserRole").value = user.role || "USER";
  document.getElementById("editAdminUserActive").value = user.active === false ? "false" : "true";
  document.getElementById("editAdminUserModal")?.classList.remove("hidden");
  document.body.classList.add("modal-open");
  document.getElementById("editAdminUserName")?.focus();
}

function closeEditAdminUserModal() {
  editingAdminUserId = "";
  document.getElementById("editAdminUserModal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
  document.getElementById("editAdminUserForm")?.reset();
  document.getElementById("editAdminUserId").value = "";
}

async function saveEditedAdminUser(event) {
  event.preventDefault();

  const id = document.getElementById("editAdminUserId").value;
  const email = document.getElementById("editAdminUserEmail").value.trim();
  const name = document.getElementById("editAdminUserName").value.trim();
  const role = document.getElementById("editAdminUserRole").value;
  const active = document.getElementById("editAdminUserActive").value === "true";

  if (!id || !email) {
    showToast("Vyplň email uživatele.");
    return;
  }

  try {
    const updatedUser = await apiRequest(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: {
        email,
        name,
        role,
        active
      }
    });

    adminUsersCache = adminUsersCache.map(user => (
      user.id === id ? { ...user, ...updatedUser } : user
    ));
    if (currentUser?.id === id) {
      currentUser = { ...currentUser, ...updatedUser };
      const session = window.MonetraApi?.getSession();
      if (session?.token) {
        window.MonetraApi.setSession({
          token: session.token,
          user: currentUser
        });
      }
    }
    closeEditAdminUserModal();
    showToast("Uživatel byl upraven.");
    renderAdminPanel();
  } catch (error) {
    showToast(error.message || "Uživatele se nepodařilo upravit.");
  }
}

async function resetAdminUserPassword(id) {
  const user = adminUsersCache.find(item => item.id === id);
  if (!user) return;

  const newPassword = prompt(`Zadej nové heslo pro ${user.email}:`, "");
  if (!newPassword) return;

  try {
    await apiRequest(`/api/admin/users/${encodeURIComponent(id)}/reset-password`, {
      method: "POST",
      body: {
        newPassword
      }
    });
    showToast("Heslo uživatele bylo resetováno.");
  } catch (error) {
    showToast(error.message || "Reset hesla se nepodařil.");
  }
}

async function toggleAdminUserActive(id) {
  const user = adminUsersCache.find(item => item.id === id);
  if (!user) return;

  const nextActive = user.active === false;
  const actionLabel = nextActive ? "aktivovat" : "deaktivovat";

  if (!confirm(`Opravdu chceš ${actionLabel} účet ${user.email}?`)) {
    return;
  }

  try {
    const updatedUser = await apiRequest(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: {
        email: user.email,
        name: user.name || "",
        role: user.role || "USER",
        active: nextActive
      }
    });

    adminUsersCache = adminUsersCache.map(item => (
      item.id === id ? { ...item, ...updatedUser } : item
    ));
    showToast(`Účet byl ${nextActive ? "aktivován" : "deaktivován"}.`);
    renderAdminPanel();
  } catch (error) {
    showToast(error.message || "Změna stavu účtu se nepodařila.");
  }
}

async function deleteAdminUser(id) {
  const user = adminUsersCache.find(item => item.id === id);
  if (!user) return;

  if (!confirm(`Opravdu chceš smazat uživatele ${user.email}?`)) {
    return;
  }

  try {
    await apiRequest(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    adminUsersCache = adminUsersCache.filter(item => item.id !== id);
    showToast("Uživatel byl smazán.");
    renderAdminPanel();
  } catch (error) {
    showToast(error.message || "Uživatele se nepodařilo smazat.");
  }
}

function seedDateInput() {
  const dateInput = document.getElementById("transactionDate");
  if (dateInput && !dateInput.value) {
    dateInput.value = getTodayInputValue();
  }
}

function bindEvents() {
  document.getElementById("adminUserForm")?.addEventListener("submit", createAdminUser);
  document.getElementById("editAdminUserForm")?.addEventListener("submit", saveEditedAdminUser);
  document.getElementById("closeEditAdminUserModal")?.addEventListener("click", closeEditAdminUserModal);
  document.getElementById("cancelEditAdminUser")?.addEventListener("click", closeEditAdminUserModal);
  document.querySelectorAll("[data-close-admin-edit-modal='true']").forEach(el => {
    el.addEventListener("click", closeEditAdminUserModal);
  });
  document.getElementById("quickTransactionForm")?.addEventListener("submit", addTransaction);
  document.getElementById("changePasswordBtn")?.addEventListener("click", openChangePasswordModal);
  document.getElementById("changePasswordForm")?.addEventListener("submit", saveChangedPassword);
  document.getElementById("closeChangePasswordModal")?.addEventListener("click", closeChangePasswordModal);
  document.getElementById("cancelChangePassword")?.addEventListener("click", closeChangePasswordModal);
  document.querySelectorAll("[data-close-password-modal='true']").forEach(el => {
    el.addEventListener("click", closeChangePasswordModal);
  });
  document.getElementById("quickTransactionForm")?.addEventListener("reset", () => {
    setTimeout(() => {
      renderQuickCategoryOptions("expense");
      syncQuickCategoryChips();
      toggleCustomCategoryPanel(false);
      const customInput = document.getElementById("customCategoryInput");
      if (customInput) customInput.value = "";
    }, 0);
  });
  document.getElementById("budgetForm")?.addEventListener("submit", saveBudget);
  document.getElementById("goalForm")?.addEventListener("submit", saveGoal);
  document.getElementById("recurringForm")?.addEventListener("submit", saveRecurringPlan);
  document.getElementById("editTransactionForm")?.addEventListener("submit", saveEditedTransaction);

  document.getElementById("prevMonthBtn")?.addEventListener("click", () => {
    selectedMonth -= 1;
    if (selectedMonth < 0) {
      selectedMonth = 11;
      selectedYear -= 1;
    }
    renderAll();
  });

  document.getElementById("nextMonthBtn")?.addEventListener("click", () => {
    selectedMonth += 1;
    if (selectedMonth > 11) {
      selectedMonth = 0;
      selectedYear += 1;
    }
    renderAll();
  });

  document.getElementById("openMonthPickerBtn")?.addEventListener("click", () => {
    openMonthPickerModal();
  });

  document.getElementById("closeMonthPickerModal")?.addEventListener("click", closeMonthPickerModal);
  document.querySelectorAll("[data-close-month-modal='true']").forEach(el => {
    el.addEventListener("click", closeMonthPickerModal);
  });
  document.getElementById("monthPickerPrevYear")?.addEventListener("click", () => changeMonthPickerYear(-1));
  document.getElementById("monthPickerNextYear")?.addEventListener("click", () => changeMonthPickerYear(1));
  document.getElementById("monthPickerGrid")?.addEventListener("click", event => {
    const tile = event.target.closest(".month-tile");
    if (!tile) return;
    const monthIndex = Number(tile.dataset.monthIndex);
    if (!Number.isFinite(monthIndex)) return;
    selectMonthFromPicker(monthIndex);
  });

  document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);
  document.getElementById("exportPdfBtn")?.addEventListener("click", exportPdf);
  document.getElementById("annualReportBtn")?.addEventListener("click", exportAnnualPdf);
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
  document.getElementById("toggleCustomCategoryBtn")?.addEventListener("click", () => toggleCustomCategoryPanel());
  document.getElementById("saveCustomCategoryBtn")?.addEventListener("click", saveCustomCategory);
  document.getElementById("budgetsList")?.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;

    const actionButton = event.target.closest("[data-budget-action]");
    if (!actionButton) return;

    const category = actionButton.dataset.category || "";
    if (!category) return;

    if (actionButton.dataset.budgetAction === "edit") {
      editBudget(category);
      return;
    }

    if (actionButton.dataset.budgetAction === "delete") {
      deleteBudget(category);
    }
  });

  document.getElementById("customCategoryInput")?.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    saveCustomCategory();
  });
  document.getElementById("recurringType")?.addEventListener("change", renderRecurringCategoryOptions);

  document.getElementById("openQuickAddFromTransactions")?.addEventListener("click", () => {
    const section = document.querySelector(".quick-add-card");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("transactionCategory")?.focus();
  });

  const filterIds = [
    "transactionSearch",
    "transactionFilterType",
    "transactionFilterCategory",
    "transactionSort"
  ];

  filterIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", scheduleRenderTransactions);
    el.addEventListener("change", renderTransactions);
  });

  document.getElementById("resetTransactionFilters")?.addEventListener("click", () => {
    document.getElementById("transactionSearch").value = "";
    document.getElementById("transactionFilterType").value = "all";
    document.getElementById("transactionFilterCategory").value = "";
    document.getElementById("transactionSort").value = "date-desc";
    renderTransactions();
  });

  document.getElementById("closeEditTransactionModal")?.addEventListener("click", closeEditTransactionModal);
  document.getElementById("cancelEditTransaction")?.addEventListener("click", closeEditTransactionModal);
  document.querySelectorAll("[data-close-modal='true']").forEach(el => {
    el.addEventListener("click", closeEditTransactionModal);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !document.getElementById("editTransactionModal")?.classList.contains("hidden")) {
      closeEditTransactionModal();
      return;
    }

    if (event.key === "Escape" && !document.getElementById("changePasswordModal")?.classList.contains("hidden")) {
      closeChangePasswordModal();
      return;
    }

    if (event.key === "Escape" && !document.getElementById("editAdminUserModal")?.classList.contains("hidden")) {
      closeEditAdminUserModal();
      return;
    }

    if (event.key === "Escape" && !document.getElementById("monthPickerModal")?.classList.contains("hidden")) {
      closeMonthPickerModal();
    }
  });
}

function initQuickTypeSwitch() {
  const switchWrap = document.getElementById("quickTypeSwitch");
  const hiddenTypeInput = document.getElementById("transactionType");
  if (!switchWrap || !hiddenTypeInput) return;

  const buttons = switchWrap.querySelectorAll(".type-switch-btn");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      hiddenTypeInput.value = button.dataset.type;
      renderQuickCategoryOptions(button.dataset.type || "expense");
    });
  });
}

function renderQuickCategoryOptions(type = "expense") {
  const categorySelect = document.getElementById("transactionCategory");
  const chipsWrap = document.getElementById("quickCategoryChips");
  if (!categorySelect || !chipsWrap) return;

  const selectedBefore = categorySelect.value;
  const categories = getCategoriesForType(type);
  const chips = QUICK_CATEGORY_CHIPS[type] || QUICK_CATEGORY_CHIPS.expense;

  categorySelect.innerHTML = [
    '<option value="">Vyber kategorii</option>',
    ...categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
  ].join("");

  chipsWrap.innerHTML = chips
    .map(category => `<button type="button" class="quick-category-chip" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`)
    .join("");

  categorySelect.value = categories.includes(selectedBefore) ? selectedBefore : "";
  syncQuickCategoryChips();
}

function toggleCustomCategoryPanel(forceOpen = null) {
  const panel = document.getElementById("customCategoryPanel");
  if (!panel) return;

  const shouldOpen = forceOpen == null ? panel.classList.contains("hidden") : forceOpen;
  panel.classList.toggle("hidden", !shouldOpen);
  if (shouldOpen) {
    document.getElementById("customCategoryInput")?.focus();
  }
}

async function saveCustomCategory() {
  const hiddenTypeInput = document.getElementById("transactionType");
  const input = document.getElementById("customCategoryInput");
  const categorySelect = document.getElementById("transactionCategory");
  if (!hiddenTypeInput || !input || !categorySelect) return;

  const name = input.value.trim();
  const type = hiddenTypeInput.value || "expense";
  if (!name) {
    showToast("Zadej název vlastní kategorie.");
    return;
  }

  const exists = getCategoriesForType(type).some(category => normalizeText(category) === normalizeText(name));
  if (exists) {
    categorySelect.value = getCategoriesForType(type).find(category => normalizeText(category) === normalizeText(name)) || "";
    syncQuickCategoryChips();
    toggleCustomCategoryPanel(false);
    input.value = "";
    showToast("Tahle kategorie už existuje.");
    return;
  }

  try {
    const savedCategory = await apiRequest("/api/custom-categories", {
      method: "POST",
      body: { name, type }
    });
    saveCustomCategories([...getCustomCategories(), savedCategory]);
  } catch (error) {
    showToast(error.message || "Vlastní kategorii se nepodařilo uložit.");
    return;
  }

  renderQuickCategoryOptions(type);
  renderBudgetCategoryOptions();
  renderRecurringCategoryOptions();
  renderTransactionCategoryDatalist();

  categorySelect.value = name;
  syncQuickCategoryChips();
  input.value = "";
  toggleCustomCategoryPanel(false);
  showToast("Vlastní kategorie byla přidána.");
}

function syncQuickCategoryChips() {
  const selectedCategory = document.getElementById("transactionCategory")?.value || "";
  document.querySelectorAll("#quickCategoryChips .quick-category-chip").forEach(chip => {
    chip.classList.toggle("is-active", chip.dataset.category === selectedCategory);
  });
}

function initQuickCategoryChips() {
  const categorySelect = document.getElementById("transactionCategory");
  const chipsWrap = document.getElementById("quickCategoryChips");
  const hiddenTypeInput = document.getElementById("transactionType");
  if (!categorySelect || !chipsWrap || !hiddenTypeInput) return;

  renderQuickCategoryOptions(hiddenTypeInput.value || "expense");

  chipsWrap.addEventListener("click", event => {
    const chip = event.target.closest(".quick-category-chip");
    if (!chip) return;
    categorySelect.value = chip.dataset.category || "";
    syncQuickCategoryChips();
  });

  categorySelect.addEventListener("change", syncQuickCategoryChips);
  syncQuickCategoryChips();
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(savedTheme);
}

async function requireAuth() {
  const session = getSession();

  if (!session?.token) {
    window.location.href = "index.html";
    return null;
  }

  try {
    const response = await window.MonetraApi.me();
    window.MonetraApi.setSession({
      token: session.token,
      user: response.user
    });
    return response.user;
  } catch {
    window.MonetraApi?.clearSession();
    window.location.href = "index.html";
    return null;
  }
}

async function init() {
  currentUser = await requireAuth();
  if (!currentUser) return;

  try {
    await loadBackendState();
    await migrateLocalData();
    await loadAdminUsers();
  } catch (error) {
    showToast(error.message || "Nepodařilo se načíst data aplikace.");
    return;
  }

  initTheme();
  seedDateInput();
  initQuickTypeSwitch();
  initQuickCategoryChips();
  bindEvents();
  renderAll();
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});


