import { Router } from "express";
import { prisma } from "../db.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";
import { hashPassword } from "../utils/auth.js";
import { serializeUser } from "../utils/serializers.js";
import {
  adminUserCreateSchema,
  adminUserResetPasswordSchema,
  adminUserUpdateSchema
} from "../validators/schemas.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "desc" }, { createdAt: "desc" }],
    include: {
      _count: {
        select: {
          transactions: true,
          goals: true,
          recurringPlans: true
        }
      }
    }
  });

  res.json(users.map(user => ({
    ...serializeUser(user),
    stats: {
      transactions: user._count.transactions,
      goals: user._count.goals,
      recurringPlans: user._count.recurringPlans
    }
  })));
});

router.post("/users", async (req, res) => {
  const parsed = adminUserCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Neplatna data uzivatele.", errors: parsed.error.flatten() });
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existingUser) {
    return res.status(409).json({ message: "Uzivatel s timto emailem uz existuje." });
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: await hashPassword(parsed.data.password),
      name: parsed.data.name || normalizedEmail.split("@")[0],
      role: parsed.data.role,
      active: true
    }
  });

  res.status(201).json(serializeUser(user));
});

router.put("/users/:id", async (req, res) => {
  const parsed = adminUserUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Neplatna data uzivatele.", errors: parsed.error.flatten() });
  }

  const existingUser = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existingUser) {
    return res.status(404).json({ message: "Uzivatel nebyl nalezen." });
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const conflictingUser = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      NOT: { id: req.params.id }
    }
  });

  if (conflictingUser) {
    return res.status(409).json({ message: "Jiny uzivatel uz ma tento email." });
  }

  if (req.params.id === req.user.id && parsed.data.role !== "ADMIN") {
    return res.status(400).json({ message: "Nemuzes odebrat admin roli sam sobe." });
  }

  if (req.params.id === req.user.id && parsed.data.active === false) {
    return res.status(400).json({ message: "Nemuzes deaktivovat vlastni ucet." });
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      email: normalizedEmail,
      name: parsed.data.name || normalizedEmail.split("@")[0],
      role: parsed.data.role,
      active: parsed.data.active
    }
  });

  res.json(serializeUser(user));
});

router.post("/users/:id/reset-password", async (req, res) => {
  const parsed = adminUserResetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Neplatne nove heslo.", errors: parsed.error.flatten() });
  }

  const existingUser = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existingUser) {
    return res.status(404).json({ message: "Uzivatel nebyl nalezen." });
  }

  await prisma.user.update({
    where: { id: req.params.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword)
    }
  });

  res.json({ message: "Heslo bylo resetovano." });
});

router.delete("/users/:id", async (req, res) => {
  const userId = req.params.id;

  if (userId === req.user.id) {
    return res.status(400).json({ message: "Nemuzes smazat vlastni administratorsky ucet." });
  }

  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) {
    return res.status(404).json({ message: "Uzivatel nebyl nalezen." });
  }

  await prisma.user.delete({ where: { id: userId } });
  res.status(204).send();
});

export default router;
