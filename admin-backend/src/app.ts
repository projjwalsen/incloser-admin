import cors from "cors";
import express from "express";
import { adminRouter } from "./routes/index.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/admin", adminRouter);

app.use((_req, res) => {
  res.status(404).json({ ok: false, message: "Not found" });
});
