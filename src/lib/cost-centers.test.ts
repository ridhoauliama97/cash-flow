import { describe, expect, it } from "vitest";
import { validateCostCenter } from "./cost-centers";

describe("validateCostCenter", () => {
  it("valid input passes", () => {
    expect(
      validateCostCenter({ code: "CC-001", name: "Marketing", divisionId: "d1" }),
    ).toBeNull();
  });

  it("rejects empty or whitespace-only code", () => {
    expect(validateCostCenter({ code: "", name: "Marketing", divisionId: "d1" })).toMatch(
      /Kode/,
    );
    expect(validateCostCenter({ code: "  ", name: "Marketing", divisionId: "d1" })).toMatch(
      /Kode/,
    );
  });

  it("rejects empty or whitespace-only name", () => {
    expect(validateCostCenter({ code: "CC-001", name: "", divisionId: "d1" })).toMatch(
      /Nama/,
    );
    expect(validateCostCenter({ code: "CC-001", name: "  ", divisionId: "d1" })).toMatch(
      /Nama/,
    );
  });

  it("rejects missing divisionId", () => {
    expect(validateCostCenter({ code: "CC-001", name: "Marketing", divisionId: "" })).toMatch(
      /Divisi/,
    );
    expect(validateCostCenter({ code: "CC-001", name: "Marketing", divisionId: " " })).toMatch(
      /Divisi/,
    );
  });
});
