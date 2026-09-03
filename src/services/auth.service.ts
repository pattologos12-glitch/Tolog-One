import { getRepository } from "typeorm";
import { User } from "../entities/User";
import { RefreshToken } from "../entities/RefreshToken";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { hashPassword, verifyPassword, hashToken, verifyTokenHash } from "../utils/hash";
import { add, isAfter } from "date-fns";
import { randomUUID } from "crypto";

const refreshTokenTTLDays = Number(process.env.REFRESH_TOKEN_DAYS || 30);

export class AuthService {
  private userRepo = getRepository(User);
  private tokenRepo = getRepository(RefreshToken);

  async register(email: string, password: string, roles: string[] = ["user"]) {
    const passwordHash = await hashPassword(password);
    const user = this.userRepo.create({ email, passwordHash, roles });
    return this.userRepo.save(user);
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new Error("Invalid credentials");
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new Error("Invalid credentials");

    const accessToken = signAccessToken({ sub: user.id, roles: user.roles });

    // Use token id (jti) for direct indexed DB lookup, avoiding full-table scans
    const tokenId = randomUUID();
    const refreshTokenRaw = signRefreshToken({ sub: user.id, jti: tokenId });

    const expiresAt = add(new Date(), { days: refreshTokenTTLDays });
    const tokenHash = await hashToken(refreshTokenRaw);

    const rt = this.tokenRepo.create({ id: tokenId, user, tokenHash, expiresAt });
    await this.tokenRepo.save(rt);

    return { user, accessToken, refreshToken: refreshTokenRaw, refreshTokenId: rt.id };
  }

  async refresh(oldRefreshToken: string) {
    const payload: any = verifyRefreshToken(oldRefreshToken) as any;
    const userId = payload.sub;
    const tokenId = payload.jti;
    if (!tokenId) throw new Error("Invalid token payload");

    const user = await this.userRepo.findOne(userId);
    if (!user) throw new Error("Invalid token");

    // Indexed lookup using jti ID
    const matched = await this.tokenRepo.findOne(tokenId as any);
    if (!matched) throw new Error("Refresh token not found or revoked");

    const ok = await verifyTokenHash(oldRefreshToken, matched.tokenHash);
    if (!ok) throw new Error("Refresh token invalid");

    if (matched.revoked) throw new Error("Token revoked");
    if (!isAfter(matched.expiresAt, new Date())) throw new Error("Token expired");

    // Rotation: revoke current and issue a new token with a new jti
    matched.revoked = true;
    const newTokenId = randomUUID();
    const newRefreshRaw = signRefreshToken({ sub: user.id, jti: newTokenId });
    const newHash = await hashToken(newRefreshRaw);
    const newRt = this.tokenRepo.create({ id: newTokenId, user, tokenHash: newHash, expiresAt: add(new Date(), { days: refreshTokenTTLDays }) });
    await this.tokenRepo.save(newRt);
    matched.replacedByTokenId = newRt.id;
    await this.tokenRepo.save(matched);

    const accessToken = signAccessToken({ sub: user.id, roles: user.roles });
    return { accessToken, refreshToken: newRefreshRaw, refreshTokenId: newRt.id };
  }

  async revokeRefresh(tokenRaw: string) {
    try {
      const payload: any = verifyRefreshToken(tokenRaw) as any;
      const tokenId = payload.jti;
      if (!tokenId) return false;
      const t = await this.tokenRepo.findOne(tokenId as any);
      if (!t) return false;
      t.revoked = true;
      await this.tokenRepo.save(t);
      return true;
    } catch (e) {
      return false;
    }
  }

  async getUserFromAccessToken(accessToken: string) {
    const payload: any = (await import("../utils/jwt")).verifyAccessToken(accessToken) as any;
    return this.userRepo.findOne(payload.sub);
  }
}
