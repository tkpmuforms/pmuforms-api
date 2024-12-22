export type PaginationMeta = {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  firstPage: number;
};

export function paginationMetaGenerator(
  totalCount: number,
  page: number,
  limit: number,
) {
  const lastPage = Math.ceil(totalCount / limit);
  const meta: PaginationMeta = {
    total: totalCount,
    currentPage: Number(page),
    perPage: Math.min(limit, totalCount),
    lastPage,
    firstPage: 1,
  };
  return meta;
}
