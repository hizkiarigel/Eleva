const bcrypt = require("bcrypt");
const db = require("./db");

class AuthError extends Error {}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

// Compared against when the email doesn't exist, so login takes roughly the
// same time either way and doesn't leak which emails are registered via timing.
const DUMMY_HASH = "$2b$12$yN.V9wMvGTws9tGLndpCH.YQI8wZNwnPmYadXNkrrugvjY8akRyTe";

async function signup({ email, password, betaCode }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new AuthError("Email tidak valid.");
  }
  if (!password || password.length < 8) {
    throw new AuthError("Password minimal 8 karakter.");
  }
  const requiredCode = process.env.BETA_CODE || "";
  if (!requiredCode) {
    throw new AuthError("Pendaftaran belum dibuka.");
  }
  if ((betaCode || "").trim() !== requiredCode) {
    throw new AuthError("Kode beta salah.");
  }

  const existing = await db.getUserByEmail(normalizedEmail);
  if (existing) {
    throw new AuthError("Email sudah terdaftar.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return db.createUser({ email: normalizedEmail, passwordHash });
}

async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await db.getUserByEmail(normalizedEmail);
  const ok = await bcrypt.compare(password || "", user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) {
    throw new AuthError("Email atau password salah.");
  }
  return user;
}

module.exports = { signup, login, AuthError };
