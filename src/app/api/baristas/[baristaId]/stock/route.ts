import { handle, ok } from "@/lib/api-response";
import { getBaristaStockDetail } from "@/modules/barista-stock/barista-stock.service";

export const GET = handle(async (_req, ctx) => {
  const { baristaId } = await ctx.params;
  const stock = await getBaristaStockDetail(baristaId);
  return ok(stock);
});
