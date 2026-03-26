import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middlewares/auth.js";
import { serializeCustomCategory } from "../utils/serializers.js";
import { customCategorySchema } from "../validators/schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const items = await prisma.customCategory.findMany({
    where: { userId: req.user.id },
    orderBy: [{ type: "asc" }, { name: "asc" }]
  });
  res.json(items.map(serializeCustomCategory));
});

router.post("/", async (req, res) => {
  const parsed = customCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Neplatná data vlastní kategorie.", errors: parsed.error.flatten() });
  }

  const item = await prisma.customCategory.create({
    data: {
      ...parsed.data,
      userId: req.user.id
    }
  });

  res.status(201).json(serializeCustomCategory(item));
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.customCategory.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });

  if (!existing) {
    return res.status(404).json({ message: "Kategorie nebyla nalezena." });
  }

  await prisma.customCategory.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
