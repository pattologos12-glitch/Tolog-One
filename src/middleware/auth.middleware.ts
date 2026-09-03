import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { getRepository } from "typeorm";
import { User } from "../entities/User";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });
  const token = header.substring(7);
  try {
    const payload: any = verifyAccessToken(token) as any;
    const user = await getRepository(User).findOne(payload.sub);
    if (!user) return res.status(401).json({ error: "Invalid token" });
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function authorize(requiredRoles: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (requiredRoles.length === 0) return next();
    const has = requiredRoles.some((r: string) => user.roles.includes(r));
    if (!has) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
