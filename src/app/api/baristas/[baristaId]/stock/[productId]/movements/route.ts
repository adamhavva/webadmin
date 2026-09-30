import { handle, ok } from "@/lib/api-response";
import { listMovements } from "@/modules/barista-stock/barista-stock.service";
import { listMovementsQuerySchema } from "@/modules/barista-stock/barista-stock.validator";

export const GET = handle(async (req, ctx) => {
  const { baristaId, productId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const query = listMovementsQuerySchema.parse({
    ...Object.fromEntries(searchParams),
    baristaId,
    productId,
  });

  const result = await listMovements(query);
  return ok(result);
});
