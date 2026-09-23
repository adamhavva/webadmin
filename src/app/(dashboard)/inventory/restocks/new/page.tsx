import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { RestockForm } from "@/components/inventory/restocks/restock-form";
import { cn } from "@/lib/utils";

export default function NewRestockPage() {
  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/inventory/restocks"
          aria-label="Kembali"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Penerimaan Barang
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catat bahan baku yang diterima dari supplier.
          </p>
        </div>
      </div>

      <RestockForm />
    </div>
  );
}