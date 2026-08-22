export function positiveInteger(
  value: number,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  if (!Number.isFinite(value)) return fallback;
  const normalized = Math.trunc(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) return fallback;
  return Math.min(normalized, maximum);
}

export function paginationFor(total: number, page: number, pageSize: number) {
  const safeTotal =
    Number.isSafeInteger(total) && total > 0 ? total : 0;
  const safePageSize = positiveInteger(pageSize, 1);
  const requestedPage = positiveInteger(page, 1);
  const pageCount = Math.ceil(safeTotal / safePageSize);

  return {
    page: pageCount > 0 ? Math.min(requestedPage, pageCount) : 1,
    pageCount,
    pageSize: safePageSize,
    total: safeTotal,
  };
}
