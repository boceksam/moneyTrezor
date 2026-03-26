import { createApp } from "./app.js";
import { config } from "./config.js";
import { ensureAdminUser } from "./bootstrap/ensure-admin.js";

const app = createApp();

async function startServer() {
  await ensureAdminUser();

  app.listen(config.port, () => {
    console.log(`Monetra API nasloucha na portu ${config.port}`);
  });
}

startServer().catch(error => {
  console.error("Nepodarilo se spustit backend:", error);
  process.exit(1);
});
