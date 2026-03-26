import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middlewares/auth.js";
import { serializeBudget } from "../utils/serializers.js";
import { budgetSchema } from "../validators/schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const items = await prisma.budget.findMany({
    where: { userId: req.user.id },
    orderBy: { category: "asc" }
  });
  res.json(items.map(serializeBudget));
});

router.put("/:category", async (req, res) => {
  const parsed = budgetSchema.safeParse({
    category: req.params.category,
    limitAmount: req.body.limitAmount
  });

  if (!parsed.success) {
    return res.status(400).json({ message: "Neplatná data rozpočtu.", errors: parsed.error.flatten() });
  }

  const item = await prisma.budget.upsert({
    where: {
      userId_category: {
        userId: req.user.id,
        category: parsed.data.category
      }
    },
    update: {
      limitAmount: parsed.data.limitAmount
    },
    create: {
      userId: req.user.id,
      category: parsed.data.category,
      limitAmount: parsed.data.limitAmount
    }
  });

  res.json(serializeBudget(item));
});

router.delete("/:category", async (req, res) => {
  const existing = await prisma.budget.findFirst({
    where: { userId: req.user.id, category: req.params.category }
  });

  if (!existing) {
    return res.status(404).json({ message: "Rozpočet nebyl nalezen." });
  }

  await prisma.budget.delete({ where: { id: existing.id } });
  res.status(204).send();
});

export default router;
