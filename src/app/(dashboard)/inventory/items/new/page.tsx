import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ItemForm } from "@/components/inventory/items/item-form";
import { cn } from "@/lib/utils";

export default function NewItemPage() {
  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/inventory/items"
          aria-label="Kembali"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Tambah Bahan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tambahkan bahan baku baru ke sistem.
          </p>
        </div>
      </div>

      <ItemForm mode="create" />
    </div>
  );
}