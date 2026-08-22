import { describe, expect, it } from "vitest";

import { paginationFor, positiveInteger } from "@/lib/pagination";

describe("paginação administrativa", () => {
  it("normaliza valores não finitos e limita o tamanho máximo", () => {
    expect(positiveInteger(Number.POSITIVE_INFINITY, 1)).toBe(1);
    expect(positiveInteger(Number.NaN, 1)).toBe(1);
    expect(positiveInteger(80, 20, 50)).toBe(50);
  });

  it("traz páginas além do total de volta para a última página", () => {
    expect(paginationFor(41, 999, 20)).toEqual({
      page: 3,
      pageCount: 3,
      pageSize: 20,
      total: 41,
    });
  });

  it("mantém a primeira página para coleções vazias", () => {
    expect(paginationFor(0, 5, 20)).toMatchObject({
      page: 1,
      pageCount: 0,
      total: 0,
    });
  });
});
