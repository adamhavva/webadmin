import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { RecipeForm } from "@/components/inventory/recipes/recipe-form";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditRecipePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/inventory/recipes/${id}`}
          aria-label="Kembali"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Edit Resep
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ubah komposisi bahan. Tidak bisa diedit jika sudah dipakai
            produksi.
          </p>
        </div>
      </div>

      <RecipeForm mode="edit" recipeId={id} />
    </div>
  );
}