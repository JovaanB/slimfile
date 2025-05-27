import { SignJWT, jwtVerify } from "jose";
import { dbExtended as database } from "./database";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
);

export interface User {
  email: string;
  usage_count: number;
  last_reset: string; // YYYY-MM format
  created_at: string;
  is_pro: boolean;

  // Champs Stripe - tous les statuts possibles
  subscription_id?: string;
  subscription_status?:
    | "active"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "past_due"
    | "trialing"
    | "unpaid";
  subscription_end?: string;
  stripe_customer_id?: string;
}

/**
 * Crée un JWT token pour l'utilisateur
 */
export async function createToken(email: string): Promise<string> {
  return await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

/**
 * Vérifie un JWT token
 */
export async function verifyToken(
  token: string
): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { email: string };
  } catch {
    return null;
  }
}

/**
 * Obtient l'utilisateur depuis un token
 */
export async function getUserFromToken(token: string): Promise<User | null> {
  const payload = await verifyToken(token);
  if (!payload) return null;

  return await database.findUser(payload.email);
}

/**
 * Authentifie ou crée un utilisateur
 */
export async function authenticateUser(
  email: string
): Promise<{ user: User; token: string }> {
  // Validation email basique
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Email invalide");
  }

  let user = await database.findUser(email);

  if (!user) {
    user = await database.createUser(email);
  }

  // Reset du compteur si nouveau mois
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (user.last_reset !== currentMonth) {
    user = (await database.updateUser(email, {
      usage_count: 0,
      last_reset: currentMonth,
    })) as User;
  }

  const token = await createToken(email);

  return { user, token };
}

/**
 * Incrémente l'usage d'un utilisateur
 */
export async function incrementUsage(email: string): Promise<User | null> {
  const user = await database.findUser(email);
  if (!user) return null;

  // Reset si nouveau mois
  const currentMonth = new Date().toISOString().slice(0, 7);

  if (user.last_reset !== currentMonth) {
    return await database.updateUser(email, {
      usage_count: 1,
      last_reset: currentMonth,
    });
  } else {
    return await database.updateUser(email, {
      usage_count: user.usage_count + 1,
    });
  }
}

/**
 * Met à jour un utilisateur
 */
export async function updateUser(
  email: string,
  updates: Partial<User>
): Promise<User | null> {
  return await database.updateUser(email, updates);
}

/**
 * Obtient un utilisateur par email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return await database.findUser(email);
}

/**
 * Vérifie si l'utilisateur peut encore compresser
 */
export function canCompress(user: User): boolean {
  // Utilisateur Pro avec abonnement actif
  if (
    user.is_pro &&
    (user.subscription_status === "active" ||
      user.subscription_status === "trialing")
  ) {
    return true;
  }

  // Utilisateur gratuit dans sa limite
  return user.usage_count < 5;
}

/**
 * Obtient les stats d'usage
 */
export function getUsageStats(user: User) {
  const isPro =
    user.is_pro &&
    (user.subscription_status === "active" ||
      user.subscription_status === "trialing");
  const remaining = isPro ? Infinity : Math.max(0, 5 - user.usage_count);
  const percentage = isPro ? 0 : (user.usage_count / 5) * 100;

  return {
    current: user.usage_count,
    max: isPro ? Infinity : 5,
    remaining,
    percentage,
    is_pro: isPro,
    subscription_status: user.subscription_status,
  };
}
