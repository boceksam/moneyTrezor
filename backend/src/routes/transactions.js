import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middlewares/auth.js";
import { serializeTransaction } from "../utils/serializers.js";
import { transactionSchema } from "../validators/schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const items = await prisma.transaction.findMany({
    where: { userId: req.user.id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }]
  });

  res.json(items.map(serializeTransaction));
});

router.post("/", async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Neplatná data transakce.", errors: parsed.error.flatten() });
  }

  const item = await prisma.transaction.create({
    data: {
      ...parsed.data,
      date: new Date(`${parsed.data.date}T12:00:00`),
      userId: req.user.id
    }
  });

  res.status(201).json(serializeTransaction(item));
});

router.put("/:id", async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Neplatná data transakce.", errors: parsed.error.flatten() });
  }

  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });

  if (!existing) {
    return res.status(404).json({ message: "Transakce nebyla nalezena." });
  }

  const item = await prisma.transaction.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      date: new Date(`${parsed.data.date}T12:00:00`)
    }
  });

  res.json(serializeTransaction(item));
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });

  if (!existing) {
    return res.status(404).json({ message: "Transakce nebyla nalezena." });
  }

  await prisma.transaction.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
