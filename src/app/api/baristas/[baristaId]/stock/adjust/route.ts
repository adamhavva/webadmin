import { handleAuth, created } from "@/lib/api-response";
import { adjustBaristaStock } from "@/modules/barista-stock/barista-stock.service";
import { adjustBaristaStockSchema } from "@/modules/barista-stock/barista-stock.validator";

export const POST = handleAuth(async (req, ctx) => {
  const { baristaId } = await ctx.params;
  const body = await req.json();
  const input = adjustBaristaStockSchema.parse({
    ...body,
    baristaId,
  });

  const result = await adjustBaristaStock(input);
  return created(result);
});
