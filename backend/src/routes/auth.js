import { Router } from "express";
import { prisma } from "../db.js";
import { comparePassword, hashPassword, signToken } from "../utils/auth.js";
import { serializeUser } from "../utils/serializers.js";
import { requireAuth } from "../middlewares/auth.js";
import { changePasswordSchema, loginSchema } from "../validators/schemas.js";

const router = Router();

router.post("/register", async (req, res) => {
  return res.status(403).json({
    message: "Verejna registrace je vypnuta. Ucet vytvari administrator."
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Neplatna data prihlaseni.", errors: parsed.error.flatten() });
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user || !(await comparePassword(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ message: "Neplatny email nebo heslo." });
  }

  if (user.active === false) {
    return res.status(403).json({ message: "Ucet je deaktivovany." });
  }

  const token = signToken(user);
  return res.json({ token, user: serializeUser(user) });
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Neplatna data pro zmenu hesla.", errors: parsed.error.flatten() });
  }

  const { currentPassword, newPassword } = parsed.data;
  const passwordMatches = await comparePassword(currentPassword, req.user.passwordHash);

  if (!passwordMatches) {
    return res.status(400).json({ message: "Soucasne heslo neni spravne." });
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      passwordHash: await hashPassword(newPassword)
    }
  });

  return res.json({ message: "Heslo bylo uspesne zmeneno." });
});

export default router;
