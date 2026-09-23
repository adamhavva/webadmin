import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { RecipeForm } from "@/components/inventory/recipes/recipe-form";
import { cn } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<{ productId?: string }>;
};

export default async function NewRecipePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const productId = params.productId;

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href={
            productId
              ? `/inventory/products/${productId}`
              : "/inventory/recipes"
          }
          aria-label="Kembali"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Buat Resep Baru
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tentukan bahan dan quantity untuk produk.
          </p>
        </div>
      </div>

      <RecipeForm mode="create" initialProductId={productId} />
    </div>
  );
}