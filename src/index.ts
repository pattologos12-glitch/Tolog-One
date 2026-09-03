import "reflect-metadata";
import express from "express";
import cookieParser from "cookie-parser";
import { createConnection } from "typeorm";
import authRoutes from "./routes/auth.routes";

async function start() {
  await createConnection();
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use("/auth", authRoutes);

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start().catch(err => {
  console.error("Failed to start app", err);
});
