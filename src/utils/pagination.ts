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
  let lastPage: number;
  if (totalCount === 0) {
    lastPage = Number(page);
  } else {
    lastPage = Math.ceil(totalCount / limit);
  }
  const meta: PaginationMeta = {
    total: totalCount,
    currentPage: Number(page),
    perPage: Number(limit),
    lastPage,
    firstPage: 1,
  };
  return meta;
}
