function normalizeText(value) {
  return (value || "").toString().trim().toLowerCase();
}

function parseTransactionDate(dateString) {
  if (!dateString) return new Date("");

  var normalized = String(dateString).trim();
  var match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  }

  return new Date(normalized);
}

function toInputDate(date) {
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1);
  if (month.length < 2) month = "0" + month;
  var day = String(date.getDate());
  if (day.length < 2) day = "0" + day;
  return year + "-" + month + "-" + day;
}

function normalizeTransactionDateValue(dateString) {
  if (!dateString) return "";
  var parsedDate = parseTransactionDate(dateString);
  if (isNaN(parsedDate.getTime())) {
    return String(dateString).trim();
  }
  return toInputDate(parsedDate);
}

function isDateInMonth(dateString, year, month) {
  var date = parseTransactionDate(dateString);
  return date.getFullYear() === year && date.getMonth() === month;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getRecurringNextDate(plan, year, month) {
  var safeDay = Math.max(Number(plan.dayOfMonth || 1), 1);
  var day = Math.min(safeDay, getDaysInMonth(year, month));
  return new Date(year, month, day);
}

function normalizeTransactionType(type, category) {
  if (type === "investment" && normalizeText(category).indexOf("desát") !== -1) {
    return "tithe";
  }
  return type;
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

function calculateMonthTotals(transactions) {
  var totals = { income: 0, expense: 0, investment: 0, tithe: 0 };

  for (var i = 0; i < transactions.length; i++) {
    var transaction = transactions[i];
    var amount = Number(transaction.amount || 0);
    if (transaction.type === "income") totals.income += amount;
    if (transaction.type === "expense") totals.expense += amount;
    if (transaction.type === "investment") totals.investment += amount;
    if (transaction.type === "tithe") totals.tithe += amount;
  }

  totals.balance = totals.income - totals.expense - totals.investment - totals.tithe;
  return totals;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runTests() {
  var transactions = [
    { title: "Vyplata", amount: 50000, type: "income", category: "Mzda", date: "2026-03-05" },
    { title: "Najem", amount: 16000, type: "expense", category: "Bydlení", date: "2026-03-01" },
    { title: "ETF", amount: 4000, type: "investment", category: "Investice", date: "2026-03-10" },
    { title: "Desatky", amount: 2500, type: "tithe", category: "Desátky", date: "2026-03-12" },
    { title: "Potraviny", amount: 3200, type: "expense", category: "Jídlo", date: "2026-04-02" }
  ];

  assert(normalizeTransactionDateValue("2026-03-05") === "2026-03-05", "ISO datum se musi zachovat");
  assert(isDateInMonth("2026-03-05", 2026, 2), "Brezen musi patrit do mesice index 2");
  assert(!isDateInMonth("2026-03-05", 2026, 3), "Brezen nesmi patrit do dubna");

  var marchTransactions = [];
  for (var i = 0; i < transactions.length; i++) {
    if (isDateInMonth(transactions[i].date, 2026, 2)) {
      marchTransactions.push(transactions[i]);
    }
  }

  assert(marchTransactions.length === 4, "Do brezna maji spadnout 4 transakce");

  var totals = calculateMonthTotals(marchTransactions);
  assert(totals.income === 50000, "Prijmy za brezen nesedi");
  assert(totals.expense === 16000, "Vydaje za brezen nesedi");
  assert(totals.investment === 4000, "Investice za brezen nesedi");
  assert(totals.tithe === 2500, "Desatky za brezen nesedi");
  assert(totals.balance === 27500, "Saldo za brezen nesedi");

  var recurringPlan = {
    title: "Najem",
    amount: 16000,
    type: "expense",
    category: "Bydlení",
    dayOfMonth: 31
  };

  assert(toInputDate(getRecurringNextDate(recurringPlan, 2026, 1)) === "2026-02-28", "Unor musi zkratit den opakovane platby");
  assert(toInputDate(getRecurringNextDate(recurringPlan, 2026, 2)) === "2026-03-31", "Brezen musi zachovat 31. den");

  assert(
    doesTransactionMatchRecurringPlan(
      { title: "Najem", amount: 16000, type: "expense", category: "Bydlení", date: "2026-03-31" },
      recurringPlan,
      "2026-03-31"
    ),
    "Opakovana platba se musi sparovat se spravnou transakci"
  );

  assert(normalizeTransactionType("investment", "Desátky") === "tithe", "Kategorie Desatky se musi prevest na typ tithe");

  WScript.Echo("OK: logika mesicu, souctu a opakovanych plateb prosla zakladnim overenim.");
}

runTests();
