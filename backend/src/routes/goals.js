import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middlewares/auth.js";
import { serializeGoal } from "../utils/serializers.js";
import { goalSchema } from "../validators/schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const items = await prisma.goal.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" }
  });
  res.json(items.map(serializeGoal));
});

router.post("/", async (req, res) => {
  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Neplatná data cíle.", errors: parsed.error.flatten() });
  }

  const item = await prisma.goal.create({
    data: { ...parsed.data, userId: req.user.id }
  });

  res.status(201).json(serializeGoal(item));
});

router.put("/:id", async (req, res) => {
  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Neplatná data cíle.", errors: parsed.error.flatten() });
  }

  const existing = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });

  if (!existing) {
    return res.status(404).json({ message: "Cíl nebyl nalezen." });
  }

  const item = await prisma.goal.update({
    where: { id: req.params.id },
    data: parsed.data
  });

  res.json(serializeGoal(item));
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });

  if (!existing) {
    return res.status(404).json({ message: "Cíl nebyl nalezen." });
  }

  await prisma.goal.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
