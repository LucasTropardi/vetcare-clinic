import { http } from "./http";
import type {
  CreateStockMovementRequest,
  PageResponse,
  StockBalanceListItemResponse,
  StockMovementResponse,
} from "./types";

export async function listStockBalances(params?: {
  page?: number;
  size?: number;
  sort?: string;
  query?: string;
  belowMinStock?: boolean;
}): Promise<PageResponse<StockBalanceListItemResponse>> {
  const { data } = await http.get<PageResponse<StockBalanceListItemResponse>>("/api/stock/balances", { params });
  return data;
}

export async function listStockMovements(params?: {
  page?: number;
  size?: number;
  sort?: string;
  productId?: number;
}): Promise<PageResponse<StockMovementResponse>> {
  const { data } = await http.get<PageResponse<StockMovementResponse>>("/api/stock/movements", { params });
  return data;
}

export async function createStockMovement(payload: CreateStockMovementRequest): Promise<StockMovementResponse> {
  const { data } = await http.post<StockMovementResponse>("/api/stock/movements", payload);
  return data;
}
