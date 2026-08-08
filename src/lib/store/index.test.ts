import { describe, expect, it } from "vitest";
import { resolveStoreMode, type StoreMode } from "./index";

const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

function withEnv(
  values: Partial<Record<(typeof keys)[number], string>>,
  fn: () => StoreMode,
): StoreMode {
  const original = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of keys) {
    if (values[k]) process.env[k] = values[k];
    else delete process.env[k];
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(original)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe("resolveStoreMode", () => {
  it("returns local when no env vars are set", () => {
    expect(withEnv({}, () => resolveStoreMode())).toBe("local");
  });

  it("returns local when only URL is set", () => {
    expect(
      withEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" }, () =>
        resolveStoreMode(),
      ),
    ).toBe("local");
  });

  it("returns supabase when URL + anon key are set", () => {
    expect(
      withEnv(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        },
        () => resolveStoreMode(),
      ),
    ).toBe("supabase");
  });
});
