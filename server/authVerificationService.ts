import { randomUUID, randomInt, randomBytes, createHash, timingSafeEqual } from "crypto";

export interface AuthTokenRecord {
  id: string;
  userId: string;
  email: string;
  purpose: "email_verification" | "password_reset";
  codeHash: string;
  tokenHash?: string;
  token?: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedAt?: number | null;
  attemptCount: number;
  maxAttempts: number;
  status: "active" | "consumed" | "expired" | "invalidated";
  ip?: string;
  metadata?: Record<string, any>;
}

// 5 minutes strictly per requirement
export const TOKEN_EXPIRATION_MS = 5 * 60 * 1000;
export const MAX_VERIFICATION_ATTEMPTS = 5;
export const EMAIL_COOLDOWN_MS = 60 * 1000; // 60s cooldown between dispatch requests

// In-memory cache for fast lookups
const tokenCache = new Map<string, AuthTokenRecord>();
const emailDispatchTimestamps = new Map<string, number>();

// Periodic garbage collection for expired verification tokens
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of tokenCache.entries()) {
    if (now > record.expiresAt + 60000) {
      tokenCache.delete(key);
    }
  }
}, 60000).unref();

// Utility: Securely mask email for safe server-side audit logs
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

// Utility: Hash a code using SHA-256
export function hashCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

// Utility: Constant-time comparison of hashed strings
export function safeCompareHash(inputCode: string, targetHash: string): boolean {
  try {
    const inputHash = hashCode(inputCode);
    const a = Buffer.from(inputHash, "utf8");
    const b = Buffer.from(targetHash, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Cooldown check to prevent email inbox flooding and denial-of-service
export function checkEmailCooldown(email: string): { allowed: boolean; remainingSec: number } {
  const cleanEmail = email.toLowerCase().trim();
  const lastTime = emailDispatchTimestamps.get(cleanEmail);
  if (!lastTime) {
    return { allowed: true, remainingSec: 0 };
  }
  const elapsed = Date.now() - lastTime;
  if (elapsed < EMAIL_COOLDOWN_MS) {
    const remainingSec = Math.ceil((EMAIL_COOLDOWN_MS - elapsed) / 1000);
    return { allowed: false, remainingSec };
  }
  return { allowed: true, remainingSec: 0 };
}

export function recordEmailDispatch(email: string): void {
  const cleanEmail = email.toLowerCase().trim();
  emailDispatchTimestamps.set(cleanEmail, Date.now());
}

// ── Invalidate previous active tokens for user/email ─────────────────────────
export async function invalidatePreviousTokens(
  email: string,
  purpose: "email_verification" | "password_reset"
): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();

  for (const [id, record] of tokenCache.entries()) {
    if (record.email === cleanEmail && record.purpose === purpose && record.status === "active") {
      record.status = "invalidated";
      tokenCache.set(id, record);
    }
  }
}

// ── Invalidate all tokens for user ID (used on password reset / account state change) ─
export async function invalidateAllTokensForUser(
  userId: string,
  purpose?: "email_verification" | "password_reset"
): Promise<void> {
  for (const [id, record] of tokenCache.entries()) {
    if (record.userId === userId && (!purpose || record.purpose === purpose)) {
      record.status = "invalidated";
      tokenCache.set(id, record);
    }
  }
}

// ── Generate a fresh, cryptographically random verification token ───────────
export async function createVerificationToken(params: {
  userId: string;
  email: string;
  purpose: "email_verification" | "password_reset";
  ip?: string;
  metadata?: Record<string, any>;
}): Promise<{
  record: AuthTokenRecord;
  code: string;
  token: string;
}> {
  const { userId, email, purpose, ip, metadata } = params;
  const cleanEmail = email.toLowerCase().trim();

  // 1. Invalidate any existing active tokens for this email and userId for this purpose
  await invalidatePreviousTokens(cleanEmail, purpose);
  await invalidateAllTokensForUser(userId, purpose);

  // 2. Generate cryptographically random 6-digit PIN (100000 - 999999)
  const code = randomInt(100000, 1000000).toString();

  // 3. Generate cryptographically random URL token
  const prefix = purpose === "email_verification" ? "ct_ev_" : "pw_rst_";
  const token = prefix + randomBytes(24).toString("hex");

  const now = Date.now();
  const expiresAt = now + TOKEN_EXPIRATION_MS; // 5 minutes expiration
  const id = randomUUID();

  const record: AuthTokenRecord = {
    id,
    userId,
    email: cleanEmail,
    purpose,
    codeHash: hashCode(code),
    tokenHash: hashCode(token),
    token,
    createdAt: now,
    expiresAt,
    used: false,
    usedAt: null,
    attemptCount: 0,
    maxAttempts: MAX_VERIFICATION_ATTEMPTS,
    status: "active",
    ip: ip || "",
    metadata: metadata || {},
  };

  // Cache in memory
  tokenCache.set(id, record);
  tokenCache.set(token, record);

  console.log(
    `[AUTH_EVENT] Verification code generated (purpose: ${purpose}, email: ${maskEmail(
      cleanEmail
    )}, userId: ${userId}, expires: 5m)`
  );

  return { record, code, token };
}

// ── Validate verification code or token ─────────────────────────────────────
export async function validateVerificationCode(params: {
  userId?: string;
  email?: string;
  code?: string;
  token?: string;
  purpose: "email_verification" | "password_reset";
  ip?: string;
}): Promise<{
  valid: boolean;
  message: string;
  record?: AuthTokenRecord;
  remainingAttempts?: number;
  status?: "active" | "consumed" | "expired" | "invalidated";
}> {
  const { userId, email, code, token, purpose } = params;
  const cleanEmail = email ? email.toLowerCase().trim() : "";

  if (!code && !token) {
    return {
      valid: false,
      message: "Please enter your 6-digit confirmation code or use the link provided in your email.",
    };
  }

  // A code cannot be verified in a vacuum without user identity (prevents cross-user or generic guessing)
  if (code && !cleanEmail && !userId) {
    return {
      valid: false,
      message: "Email address or user account identifier is required to verify confirmation code.",
    };
  }

  let activeRecord: AuthTokenRecord | null = null;
  let recentRecord: AuthTokenRecord | null = null;

  // 1. Look up in memory cache first
  if (token && tokenCache.has(token)) {
    const cached = tokenCache.get(token)!;
    if (cached.purpose === purpose) {
      if ((!userId || cached.userId === userId) && (!cleanEmail || cached.email === cleanEmail)) {
        if (cached.status === "active") activeRecord = cached;
        else recentRecord = cached;
      }
    }
  }

  if (!activeRecord) {
    for (const record of tokenCache.values()) {
      if (record.purpose === purpose) {
        const matchesUser = userId ? record.userId === userId : true;
        const matchesEmail = cleanEmail ? record.email === cleanEmail : true;
        if (matchesUser && matchesEmail && (userId || cleanEmail)) {
          if (record.status === "active") {
            activeRecord = record;
            break;
          } else if (!recentRecord) {
            recentRecord = record;
          }
        }
      }
    }
  }

  // Evaluate results
  if (!activeRecord) {
    if (recentRecord) {
      if (recentRecord.status === "consumed" || recentRecord.used) {
        return {
          valid: false,
          message: "This verification code has already been used. Please request a new code if needed.",
          status: "consumed",
        };
      }
      if (recentRecord.status === "invalidated") {
        return {
          valid: false,
          message: "This verification code is no longer valid because a newer code was requested. Please use the most recent code.",
          status: "invalidated",
        };
      }
      if (recentRecord.status === "expired" || Date.now() > recentRecord.expiresAt) {
        return {
          valid: false,
          message: "Verification code has expired (valid for 5 minutes). Please request a new code.",
          status: "expired",
        };
      }
    }
    return {
      valid: false,
      message: "No active verification code found for this account. Please request a new code.",
    };
  }

  // Check 5-minute expiration
  const now = Date.now();
  if (now > activeRecord.expiresAt) {
    activeRecord.status = "expired";
    tokenCache.set(activeRecord.id, activeRecord);
    if (activeRecord.token) tokenCache.set(activeRecord.token, activeRecord);

    console.log(
      `[AUTH_EVENT] Verification code expired (email: ${maskEmail(activeRecord.email)}, purpose: ${purpose})`
    );

    return {
      valid: false,
      message: "Verification code has expired (valid for 5 minutes). Please request a new code.",
      status: "expired",
    };
  }

  // Check brute-force attempt lockout
  if (activeRecord.attemptCount >= activeRecord.maxAttempts) {
    activeRecord.status = "invalidated";
    tokenCache.set(activeRecord.id, activeRecord);
    if (activeRecord.token) tokenCache.set(activeRecord.token, activeRecord);

    console.warn(
      `[AUTH_EVENT] Excessive verification attempts detected; token invalidated (email: ${maskEmail(
        activeRecord.email
      )}, attempts: ${activeRecord.attemptCount})`
    );

    return {
      valid: false,
      message: "Too many incorrect verification attempts. For your security, this code has been invalidated. Please request a new code.",
      status: "invalidated",
      remainingAttempts: 0,
    };
  }

  // Validate match
  let isMatch = false;
  if (token && activeRecord.token && token.trim() === activeRecord.token.trim()) {
    isMatch = true;
  } else if (code) {
    isMatch = safeCompareHash(code.trim(), activeRecord.codeHash);
  }

  if (!isMatch) {
    activeRecord.attemptCount += 1;
    const remaining = Math.max(0, activeRecord.maxAttempts - activeRecord.attemptCount);

    if (remaining === 0) {
      activeRecord.status = "invalidated";
    }

    tokenCache.set(activeRecord.id, activeRecord);
    if (activeRecord.token) tokenCache.set(activeRecord.token, activeRecord);

    console.warn(
      `[AUTH_EVENT] Failed verification attempt (email: ${maskEmail(
        activeRecord.email
      )}, remaining: ${remaining}, purpose: ${purpose})`
    );

    if (remaining === 0) {
      return {
        valid: false,
        message: "Invalid verification code. Maximum attempts reached; this code has been invalidated. Please request a new code.",
        remainingAttempts: 0,
        status: "invalidated",
      };
    }

    return {
      valid: false,
      message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      remainingAttempts: remaining,
    };
  }

  // MATCH! Mark code as consumed and single-use
  activeRecord.used = true;
  activeRecord.usedAt = now;
  activeRecord.status = "consumed";

  tokenCache.set(activeRecord.id, activeRecord);
  if (activeRecord.token) tokenCache.set(activeRecord.token, activeRecord);

  console.log(
    `[AUTH_EVENT] Verification code successfully consumed (purpose: ${purpose}, email: ${maskEmail(
      activeRecord.email
    )}, userId: ${activeRecord.userId})`
  );

  return {
    valid: true,
    message: "Verification code verified successfully.",
    record: activeRecord,
    status: "consumed",
  };
}
