import { describe, expect, it } from "vitest";
import { validateCustomer } from "./customers";

describe("validateCustomer", () => {
  it("valid input passes with contact info", () => {
    expect(
      validateCustomer({ name: "PT Maju Jaya", contactInfo: "0812-3456-7890" }),
    ).toBeNull();
  });

  it("valid input passes without contact info", () => {
    expect(validateCustomer({ name: "PT Maju Jaya", contactInfo: null })).toBeNull();
  });

  it("rejects empty name", () => {
    expect(validateCustomer({ name: "", contactInfo: null })).toMatch(/Nama/);
  });

  it("rejects whitespace-only name", () => {
    expect(validateCustomer({ name: "   ", contactInfo: "kontak" })).toMatch(/Nama/);
  });
});
