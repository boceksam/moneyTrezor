import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.coerce.number().finite().nonnegative();

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  name: z.string().trim().max(100).optional().default("")
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8)
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Nova hesla se musi shodovat.",
  path: ["confirmPassword"]
});

export const transactionSchema = z.object({
  title: z.string().trim().min(1).max(150),
  amount: money,
  type: z.enum(["expense", "income", "investment", "tithe"]),
  category: z.string().trim().min(1).max(100),
  date: dateString,
  note: z.string().trim().max(1000).optional().default("")
});

export const budgetSchema = z.object({
  category: z.string().trim().min(1).max(100),
  limitAmount: money
});

export const goalSchema = z.object({
  name: z.string().trim().min(1).max(150),
  target: money,
  current: money.default(0),
  monthlyContribution: money.default(0)
});

export const recurringSchema = z.object({
  title: z.string().trim().min(1).max(150),
  amount: money,
  type: z.enum(["expense", "income", "investment", "tithe"]),
  category: z.string().trim().min(1).max(100),
  dayOfMonth: z.coerce.number().int().min(1).max(31),
  lastUsedAt: dateString.nullish()
});

export const customCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(["expense", "income", "investment"])
});

export const adminUserCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().max(100).optional().default(""),
  role: z.enum(["USER", "ADMIN"]).optional().default("USER")
});

export const adminUserUpdateSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(100).optional().default(""),
  role: z.enum(["USER", "ADMIN"]),
  active: z.boolean()
});

export const adminUserResetPasswordSchema = z.object({
  newPassword: z.string().min(8)
});
