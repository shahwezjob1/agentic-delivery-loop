export const calculateOffset = (page: number, pageSize: number): number => (page - 1) * pageSize;

export const calculateTotalPages = (total: number, pageSize: number): number =>
  total === 0 ? 0 : Math.ceil(total / pageSize);
