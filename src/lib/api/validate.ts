import type { z } from "zod";

import { ApiErrorCode } from "./errors";
import { apiError } from "./response";

type ParseResult<T> = { data: T } | { response: ReturnType<typeof apiError> };

/**
 * Zod `safeParse` → 400 générique en cas d'échec (15) : jamais le détail des
 * `issues` Zod dans la réponse (pas de fuite de structure interne, 23), un
 * seul message générique affichable côté client.
 */
function toParseResult<T>(result: ReturnType<z.ZodType<T>["safeParse"]>): ParseResult<T> {
  if (!result.success) {
    return { response: apiError(ApiErrorCode.VALIDATION_ERROR, "Requête invalide.") };
  }
  return { data: result.data };
}

/** Valide le corps JSON d'une requête. Renvoie soit les données typées, soit une réponse 400 prête à `return`. */
export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<ParseResult<T>> {
  const json = await request.json().catch(() => null);
  return toParseResult(schema.safeParse(json));
}

/** Valide les `searchParams` d'une requête GET. Renvoie soit les données typées, soit une réponse 400 prête à `return`. */
export function parseSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodType<T>,
): ParseResult<T> {
  return toParseResult(schema.safeParse(Object.fromEntries(searchParams)));
}
