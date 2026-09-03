import { getRepository } from "typeorm";
import { User } from "../entities/User";
import { RefreshToken } from "../entities/RefreshToken";
import { signAccessToken, signRefreshToken, verifyRefreshToken, verifyAccessToken } from "../utils/jwt";
import { hashPassword, verifyPassword, hashToken, verifyTokenHash } from "../utils/hash";
import { add, isAfter } from "date-fns";

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
    const refreshTokenRaw = signRefreshToken({ sub: user.id });
    const expiresAt = add(new Date(), { days: refreshTokenTTLDays });
    const tokenHash = await hashToken(refreshTokenRaw);
    const rt = this.tokenRepo.create({ user, tokenHash, expiresAt });
    await this.tokenRepo.save(rt);

    return { user, accessToken, refreshToken: refreshTokenRaw, refreshTokenId: rt.id };
  }

  async refresh(oldRefreshToken: string) {
    const payload: any = verifyRefreshToken(oldRefreshToken) as any;
    const userId = payload.sub;
    const user = await this.userRepo.findOne(userId);
    if (!user) throw new Error("Invalid token");

    const tokens = await this.tokenRepo.find({ where: { user }, order: { createdAt: "DESC" } });
    let matched: RefreshToken | undefined;
    for (const t of tokens) {
      const ok = await verifyTokenHash(oldRefreshToken, t.tokenHash);
      if (ok) { matched = t; break; }
    }
    if (!matched) throw new Error("Refresh token not found or revoked");

    if (matched.revoked) throw new Error("Token revoked");
    if (!isAfter(matched.expiresAt, new Date())) throw new Error("Token expired");

    matched.revoked = true;
    const newRefreshRaw = signRefreshToken({ sub: user.id });
    const newHash = await hashToken(newRefreshRaw);
    const newRt = this.tokenRepo.create({ user, tokenHash: newHash, expiresAt: add(new Date(), { days: refreshTokenTTLDays }) });
    await this.tokenRepo.save(newRt);
    matched.replacedByTokenId = newRt.id;
    await this.tokenRepo.save(matched);

    const accessToken = signAccessToken({ sub: user.id, roles: user.roles });
    return { accessToken, refreshToken: newRefreshRaw, refreshTokenId: newRt.id };
  }

  async revokeRefresh(tokenRaw: string) {
    const tokens = await this.tokenRepo.find();
    for (const t of tokens) {
      const ok = await verifyTokenHash(tokenRaw, t.tokenHash);
      if (ok) {
        t.revoked = true;
        await this.tokenRepo.save(t);
        return true;
      }
    }
    return false;
  }

  async getUserFromAccessToken(accessToken: string) {
    const payload: any = verifyAccessToken(accessToken) as any;
    return this.userRepo.findOne(payload.sub);
  }
}
