import { prisma } from "../db.js";
import { verifyToken } from "../utils/auth.js";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return res.status(401).json({ message: "Chybi pristupovy token." });
    }

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      return res.status(401).json({ message: "Uzivatel nebyl nalezen." });
    }

    if (user.active === false) {
      return res.status(403).json({ message: "Ucet je deaktivovany." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Neplatny nebo expirovany token." });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Tato akce je jen pro administratora." });
  }

  next();
}
