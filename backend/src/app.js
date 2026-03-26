import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import transactionRoutes from "./routes/transactions.js";
import budgetRoutes from "./routes/budgets.js";
import goalRoutes from "./routes/goals.js";
import recurringRoutes from "./routes/recurring.js";
import customCategoryRoutes from "./routes/custom-categories.js";
import adminRoutes from "./routes/admin.js";
import { errorHandler } from "./middlewares/error-handler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/", (req, res) => {
    res.json({
      service: "monetra-api",
      message: "Backend pro Monetra bezi."
    });
  });

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/transactions", transactionRoutes);
  app.use("/api/budgets", budgetRoutes);
  app.use("/api/goals", goalRoutes);
  app.use("/api/recurring-plans", recurringRoutes);
  app.use("/api/custom-categories", customCategoryRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(errorHandler);

  return app;
}
