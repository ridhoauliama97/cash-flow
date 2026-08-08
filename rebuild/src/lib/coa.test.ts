import { describe, expect, it } from "vitest";
import {
  buildCoaTree,
  detectCoaCycle,
  validateCoa,
  type CoaRow,
} from "./coa";

const rows: CoaRow[] = [
  { id: "a1", code: "1", name: "Aset", type: "asset", parentId: null },
  { id: "a2", code: "1-1000", name: "Kas", type: "asset", parentId: "a1" },
  { id: "a3", code: "1-2000", name: "Bank", type: "asset", parentId: "a1" },
  { id: "a4", code: "2", name: "Liabilitas", type: "liability", parentId: null },
];

describe("validateCoa", () => {
  it("valid input passes", () => {
    expect(
      validateCoa({ code: "1-1000", name: "Kas", type: "asset", parentId: null }),
    ).toBeNull();
  });

  it("rejects empty code and name", () => {
    expect(validateCoa({ code: " ", name: "Kas", type: "asset", parentId: null })).toMatch(/Kode/);
    expect(validateCoa({ code: "1", name: " ", type: "asset", parentId: null })).toMatch(/Nama/);
  });

  it("rejects code with non numeric-dash characters", () => {
    expect(validateCoa({ code: "1A", name: "Kas", type: "asset", parentId: null })).toMatch(
      /hanya boleh angka/,
    );
    expect(validateCoa({ code: "1_2", name: "Kas", type: "asset", parentId: null })).toMatch(
      /hanya boleh angka/,
    );
  });

  it("accepts code with dashes", () => {
    expect(validateCoa({ code: "1-10-20", name: "X", type: "asset", parentId: null })).toBeNull();
  });

  it("rejects unknown account type", () => {
    expect(validateCoa({ code: "1", name: "X", type: "investment", parentId: null })).toMatch(
      /Tipe akun/,
    );
  });
});

describe("detectCoaCycle", () => {
  const rows: Array<{ id: string; parentId: string | null }> = [
    { id: "r1", parentId: null },
    { id: "r2", parentId: "r1" },
    { id: "r3", parentId: "r2" },
  ];

  it("no cycle for root or shallow parent", () => {
    expect(detectCoaCycle(rows, "r2", null)).toBe(false);
    expect(detectCoaCycle(rows, "r3", "r2")).toBe(false);
  });

  it("detects direct cycle (parent = self)", () => {
    expect(detectCoaCycle(rows, "r2", "r2")).toBe(true);
  });

  it("detects indirect cycle (parent chain leads back)", () => {
    expect(detectCoaCycle(rows, "r1", "r3")).toBe(true);
    expect(detectCoaCycle(rows, "r2", "r3")).toBe(true);
  });

  it("detects cycle through a node not present in rows (guard)", () => {
    expect(detectCoaCycle(rows, "r1", "ghost")).toBe(false); // ghost tidak di rows → bukan cycle
  });
});

describe("buildCoaTree", () => {
  it("builds hierarchy and sorts by code", () => {
    const tree = buildCoaTree(rows);
    expect(tree.map((n) => n.code)).toEqual(["1", "2"]);
    expect(tree[0].children.map((n) => n.code)).toEqual(["1-1000", "1-2000"]);
    expect(tree[0].children[0].children).toEqual([]);
  });

  it("orphan rows (parent missing) become roots", () => {
    const tree = buildCoaTree([
      { id: "x", code: "9", name: "Orphan", type: "asset", parentId: "missing" },
    ]);
    expect(tree.map((n) => n.code)).toEqual(["9"]);
  });

  it("empty input yields empty tree", () => {
    expect(buildCoaTree([])).toEqual([]);
  });
});
