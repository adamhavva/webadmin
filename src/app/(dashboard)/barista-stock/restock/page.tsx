import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { BaristaRestockForm } from "@/components/barista-stock/barista-restock-form";
import { cn } from "@/lib/utils";

export default function RestockBaristaPage() {
  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/barista-stock"
          aria-label="Kembali"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Restock Barista
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catat stok yang diambil barista dari pusat.
          </p>
        </div>
      </div>

      <BaristaRestockForm />
    </div>
  );
}