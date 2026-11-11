import { z } from './zod';
import type { PaginacaoMeta } from './api-result';

export const paginacaoQuery = {
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  limit: z.coerce.number().int().min(1).max(50).default(12).openapi({ example: 12 }),
};

export const paginar = (page: number, limit: number) => ({ skip: (page - 1) * limit, take: limit });

export const metaPaginacao = (page: number, limit: number, totalItems: number): PaginacaoMeta => ({
  page,
  limit,
  totalItems,
  totalPages: Math.max(1, Math.ceil(totalItems / limit)),
});
