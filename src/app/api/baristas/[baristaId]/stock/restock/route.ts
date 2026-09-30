import { handleAuth, created } from "@/lib/api-response";
import { restockBarista } from "@/modules/barista-stock/barista-stock.service";
import { restockBaristaSchema } from "@/modules/barista-stock/barista-stock.validator";

export const POST = handleAuth(async (req, ctx) => {
  const { baristaId } = await ctx.params;
  const body = await req.json();
  const input = restockBaristaSchema.parse({
    ...body,
    baristaId,
  });

  const result = await restockBarista(input);
  return created(result);
});
