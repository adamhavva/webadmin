import { handle, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const GET = handle(async (req) => {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "0");
  const lng = parseFloat(searchParams.get("lng") ?? "0");

  const baristas = await prisma.user.findMany({
    where: { role: "BARISTA", status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      phone: true,
      latitude: true,
      longitude: true,
      baristaStocks: {
        select: {
          id: true,
          quantity: true,
          minThreshold: true,
        },
      },
    },
  });

  const items = baristas
    .map((b) => {
      const distance =
        lat && lng && b.latitude && b.longitude
          ? haversineDistance(lat, lng, Number(b.latitude), Number(b.longitude))
          : null;

      return {
        id: b.id,
        name: b.name,
        phone: b.phone,
        latitude: b.latitude ? Number(b.latitude) : null,
        longitude: b.longitude ? Number(b.longitude) : null,
        distanceKm: distance !== null ? Math.round(distance * 100) / 100 : null,
        distanceLabel:
          distance !== null
            ? distance < 1
              ? `${Math.round(distance * 1000)}m`
              : `${Math.round(distance * 10) / 10}km`
            : null,
        hasStock: b.baristaStocks.some((s) => s.quantity > 0),
        stockCount: b.baristaStocks.filter((s) => s.quantity > 0).length,
        lowStockCount: b.baristaStocks.filter(
          (s) => s.quantity < s.minThreshold
        ).length,
      };
    })
    .sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

  return ok({ items });
});
