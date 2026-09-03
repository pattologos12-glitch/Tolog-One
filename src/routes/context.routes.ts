import { Router } from "express";
import { processContext } from "../controllers/context.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Protect context endpoints to authenticated services/users
router.post('/process', authenticate, processContext);

export default router;
