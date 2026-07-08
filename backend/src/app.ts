import express from "express";
import { importRoutes } from "./routes/importRoutes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(express.text({ type: ["text/csv", "text/plain"], limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(importRoutes);
app.use(errorHandler);

export default app;
