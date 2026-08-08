import { describe, expect, it } from "vitest";
import { getUserFromSession } from "./session";

const baseUser = {
  id: "user-1",
  aud: "authenticated",
  role: "authenticated",
  email: "a@b.co",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-08-08T00:00:00Z",
  updated_at: "2026-08-08T00:00:00Z",
};

describe("getUserFromSession", () => {
  it("returns null for null session", () => {
    expect(getUserFromSession(null)).toBeNull();
  });

  it("returns null when session has no user id", () => {
    expect(getUserFromSession(null)).toBeNull();
  });

  it("extracts id and email", () => {
    const user = getUserFromSession(baseUser);
    expect(user).toEqual({ id: "user-1", email: "a@b.co", name: undefined });
  });

  it("extracts full_name from user_metadata", () => {
    const user = getUserFromSession({
      ...baseUser,
      user_metadata: { full_name: "Alex Morgan" },
    });
    expect(user?.name).toBe("Alex Morgan");
  });
});
