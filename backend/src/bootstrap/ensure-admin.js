import { prisma } from "../db.js";
import { config } from "../config.js";
import { hashPassword } from "../utils/auth.js";

export async function ensureAdminUser() {
  if (!config.adminEmail || !config.adminPassword) {
    console.warn("ADMIN_EMAIL nebo ADMIN_PASSWORD nejsou nastaveny. Automaticke zalozeni admina se preskakuje.");
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: config.adminEmail }
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: config.adminEmail,
        passwordHash: await hashPassword(config.adminPassword),
        name: config.adminName,
        role: "ADMIN"
      }
    });
    console.log(`Admin ucet ${config.adminEmail} byl vytvoren.`);
    return;
  }

  if (existingUser.role !== "ADMIN") {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: "ADMIN",
        name: existingUser.name || config.adminName,
        active: true
      }
    });
    console.log(`Uzivatel ${config.adminEmail} byl povysen na ADMIN.`);
    return;
  }

  if (existingUser.active === false) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { active: true }
    });
    console.log(`Admin ucet ${config.adminEmail} byl znovu aktivovan.`);
  }
}
