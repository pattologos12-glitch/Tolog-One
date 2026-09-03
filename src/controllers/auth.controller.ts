import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

const authService = new AuthService();

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  try {
    const { accessToken, refreshToken } = await authService.login(email, password);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * Number(process.env.REFRESH_TOKEN_DAYS || 30),
    });
    res.json({ accessToken });
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Unauthorized" });
  }
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: "No refresh token" });
  try {
    const result = await authService.refresh(refreshToken);
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * Number(process.env.REFRESH_TOKEN_DAYS || 30),
    });
    res.json({ accessToken: result.accessToken });
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Invalid refresh" });
  }
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    await authService.revokeRefresh(refreshToken);
    res.clearCookie("refreshToken");
  }
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json({ id: user.id, email: user.email, roles: user.roles });
}
