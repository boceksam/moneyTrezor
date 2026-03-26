import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middlewares/auth.js";
import { serializeRecurringPlan } from "../utils/serializers.js";
import { recurringSchema } from "../validators/schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const items = await prisma.recurringPlan.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" }
  });
  res.json(items.map(serializeRecurringPlan));
});

router.post("/", async (req, res) => {
  const parsed = recurringSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Neplatná data opakované platby.", errors: parsed.error.flatten() });
  }

  const item = await prisma.recurringPlan.create({
    data: {
      ...parsed.data,
      lastUsedAt: parsed.data.lastUsedAt ? new Date(`${parsed.data.lastUsedAt}T12:00:00`) : null,
      userId: req.user.id
    }
  });

  res.status(201).json(serializeRecurringPlan(item));
});

router.put("/:id", async (req, res) => {
  const parsed = recurringSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Neplatná data opakované platby.", errors: parsed.error.flatten() });
  }

  const existing = await prisma.recurringPlan.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });

  if (!existing) {
    return res.status(404).json({ message: "Opakovaná platba nebyla nalezena." });
  }

  const item = await prisma.recurringPlan.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      lastUsedAt: parsed.data.lastUsedAt ? new Date(`${parsed.data.lastUsedAt}T12:00:00`) : null
    }
  });

  res.json(serializeRecurringPlan(item));
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.recurringPlan.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });

  if (!existing) {
    return res.status(404).json({ message: "Opakovaná platba nebyla nalezena." });
  }

  await prisma.recurringPlan.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
