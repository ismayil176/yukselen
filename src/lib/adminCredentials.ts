import "server-only";
import crypto from "node:crypto";
import { getJSON, setJSON } from "@/lib/railwayDb";
import { passwordStrengthError } from "@/lib/apiSecurity";

export type AdminCredentials = {
  username: string;
  passwordSalt: string;
  passwordHash: string;
  updatedAt: string;
};

const KEY = "admin_credentials_v1";
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,64}$/;

export function pbkdf2(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
}

export async function getAdminCredentials(): Promise<AdminCredentials | null> {
  try {
    const fallback = null as AdminCredentials | null;
    const v = await getJSON<AdminCredentials | null>(KEY, fallback);
    if (!v) return null;
    if (!v.username || !v.passwordSalt || !v.passwordHash) return null;
    return v;
  } catch {
    return null;
  }
}

export async function setAdminCredentials(input: { username: string; password: string }) {
  const username = input.username.trim();
  if (!USERNAME_RE.test(username)) {
    throw new Error("İstifadəçi adı 3-64 simvol olmalı və yalnız hərf, rəqəm, nöqtə, alt-xətt, tire saxlamalıdır.");
  }
  const password = input.password;
  const passwordError = passwordStrengthError(password);
  if (passwordError) throw new Error(passwordError);
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = pbkdf2(password, salt);
  const value: AdminCredentials = { username, passwordSalt: salt, passwordHash: hash, updatedAt: new Date().toISOString() };
  try {
    await setJSON(KEY, value);
  } catch {
    throw new Error("Database konfiqurasiya olunmayıb (DATABASE_URL). Railway-də Project → Add → PostgreSQL əlavə et və service variables-də DATABASE_URL olduğuna əmin ol.");
  }
  return { username, passwordSalt: salt, passwordHash: hash };
}
