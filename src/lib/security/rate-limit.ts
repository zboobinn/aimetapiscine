import "server-only";

import { getSecurityEnv } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/**
 * Clé = premier segment de `x-forwarded-for` (jamais l'en-tête entier : il
 * est falsifiable en chaîne, un client peut ajouter ses propres entrées
 * devant — seul le segment ajouté par le proxy de confiance est fiable ; sur
 * Vercel c'est le premier segment) + `userId` si une session existe, pour
 * distinguer deux comptes derrière la même IP (23).
 */
function buildCheckoutRateLimitKey(request: Request, userId: string | null): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  return `checkout:${ip}:${userId ?? "anon"}`;
}

/**
 * Incrément atomique via la fonction Postgres `rate_limit_hit` (SECURITY
 * DEFINER, migration 20260714200000) — un SELECT puis un UPDATE côté
 * application laisserait passer deux requêtes concurrentes sous la limite.
 * En cas d'échec du compteur (RPC indisponible) : fail-open. Le rate
 * limiting est une défense en profondeur, pas la protection primaire — le
 * serveur recalcule de toute façon tous les montants (23) ; un compteur en
 * panne ne doit jamais empêcher un paiement légitime.
 */
export async function checkCheckoutRateLimit(
  request: Request,
  userId: string | null,
): Promise<RateLimitResult> {
  const { CHECKOUT_RATE_LIMIT_MAX, CHECKOUT_RATE_LIMIT_WINDOW_SECONDS } = getSecurityEnv();
  const key = buildCheckoutRateLimitKey(request, userId);

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .rpc("rate_limit_hit", {
      p_key: key,
      p_window_seconds: CHECKOUT_RATE_LIMIT_WINDOW_SECONDS,
      p_max: CHECKOUT_RATE_LIMIT_MAX,
    })
    .single<{ allowed: boolean; retry_after_seconds: number }>();

  if (error || !data) {
    console.error("[rate-limit] rate_limit_hit indisponible, fail-open", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return { allowed: data.allowed, retryAfterSeconds: data.retry_after_seconds };
}
