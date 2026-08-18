import "server-only";

import { z } from "zod";

const supabaseUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const url = new URL(value);

    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1"))
    );
  }, "Use HTTPS, exceto para o Supabase local.")
  .transform((value) => value.replace(/\/+$/, ""));

const publishableKeySchema = z
  .string()
  .trim()
  .min(20)
  .refine(
    (value) => !value.startsWith("sb_secret_"),
    "A chave publicável não pode ser uma Secret key.",
  );

function isServiceRoleKey(value: string): boolean {
  if (value.startsWith("sb_secret_")) {
    return true;
  }

  if (value.startsWith("sb_")) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(value.split(".")[1], "base64url").toString("utf8"),
    ) as { role?: unknown };

    return payload.role === "service_role";
  } catch {
    return false;
  }
}

const serviceRoleKeySchema = z
  .string()
  .trim()
  .min(20)
  .refine(
    isServiceRoleKey,
    "Use uma Secret key ou uma chave JWT com role service_role.",
  );

const supabaseServerEnvSchema = z.object({
  SUPABASE_URL: supabaseUrlSchema,
  SUPABASE_PUBLISHABLE_KEY: publishableKeySchema,
});

const supabaseAdminEnvSchema = z.object({
  SUPABASE_URL: supabaseUrlSchema,
  SUPABASE_SECRET_KEY: serviceRoleKeySchema,
});

export type SupabaseServerEnv = z.infer<typeof supabaseServerEnvSchema>;
export type SupabaseAdminEnv = z.infer<typeof supabaseAdminEnvSchema>;

let cachedServerEnv: Readonly<SupabaseServerEnv> | undefined;
let cachedAdminEnv: Readonly<SupabaseAdminEnv> | undefined;

function parseEnvironment<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): Readonly<z.output<TSchema>> {
  const result = schema.safeParse(input);

  if (!result.success) {
    const invalidKeys = Array.from(
      new Set(
        result.error.issues.map((issue) =>
          issue.path.length > 0 ? String(issue.path[0]) : "configuração",
        ),
      ),
    );

    // Do not include values or Zod's detailed messages: they can reveal secrets.
    throw new Error(
      `Variáveis de ambiente ausentes ou inválidas: ${invalidKeys.join(", ")}.`,
    );
  }

  return Object.freeze(result.data);
}

export function getSupabaseServerEnv(): Readonly<SupabaseServerEnv> {
  cachedServerEnv ??= parseEnvironment(supabaseServerEnvSchema, {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  });

  return cachedServerEnv;
}

export function getSupabaseAdminEnv(): Readonly<SupabaseAdminEnv> {
  cachedAdminEnv ??= parseEnvironment(supabaseAdminEnvSchema, {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });

  return cachedAdminEnv;
}
