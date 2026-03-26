function toNumber(value) {
  return value == null ? 0 : Number(value);
}

function toIsoDateOnly(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

export function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name || "",
    role: user.role || "USER",
    active: user.active !== false,
    createdAt: user.createdAt
  };
}

export function serializeTransaction(transaction) {
  return {
    id: transaction.id,
    userId: transaction.userId,
    title: transaction.title,
    amount: toNumber(transaction.amount),
    type: transaction.type,
    category: transaction.category,
    date: toIsoDateOnly(transaction.date),
    note: transaction.note || "",
    createdAt: transaction.createdAt
  };
}

export function serializeBudget(budget) {
  return {
    id: budget.id,
    userId: budget.userId,
    category: budget.category,
    limitAmount: toNumber(budget.limitAmount),
    createdAt: budget.createdAt
  };
}

export function serializeGoal(goal) {
  return {
    id: goal.id,
    userId: goal.userId,
    name: goal.name,
    target: toNumber(goal.target),
    current: toNumber(goal.current),
    monthlyContribution: toNumber(goal.monthlyContribution),
    createdAt: goal.createdAt
  };
}

export function serializeRecurringPlan(plan) {
  return {
    id: plan.id,
    userId: plan.userId,
    title: plan.title,
    amount: toNumber(plan.amount),
    type: plan.type,
    category: plan.category,
    dayOfMonth: plan.dayOfMonth,
    lastUsedAt: toIsoDateOnly(plan.lastUsedAt),
    createdAt: plan.createdAt
  };
}

export function serializeCustomCategory(category) {
  return {
    id: category.id,
    userId: category.userId,
    name: category.name,
    type: category.type,
    createdAt: category.createdAt
  };
}
