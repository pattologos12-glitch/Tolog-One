import { Router } from "express";
import * as AuthCtrl from "../controllers/auth.controller";
import rateLimit from "express-rate-limit";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests, try later" },
});

router.post("/login", authLimiter, AuthCtrl.login);
router.post("/refresh", AuthCtrl.refresh);
router.post("/logout", AuthCtrl.logout);
router.get("/me", AuthCtrl.me);

export default router;
