import { describe, expect, it } from "vitest";
import { validateSupplier } from "./suppliers";

describe("validateSupplier", () => {
  it("valid input passes", () => {
    expect(validateSupplier({ name: "PT Maju Jaya", contactInfo: "" })).toBeNull();
  });

  it("contact info is optional", () => {
    expect(
      validateSupplier({ name: "PT Maju Jaya", contactInfo: "021-555-1234" }),
    ).toBeNull();
  });

  it("rejects empty name", () => {
    expect(validateSupplier({ name: "", contactInfo: "" })).toMatch(/Nama/);
  });

  it("rejects whitespace-only name", () => {
    expect(validateSupplier({ name: "   ", contactInfo: "kontak" })).toMatch(/Nama/);
  });
});
