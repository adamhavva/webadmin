"use client";

import { useParams } from "next/navigation";
import { RecipeDetailView } from "@/components/inventory/recipes/recipe-detail-view";

export default function RecipeDetailPage() {
  const params = useParams();
  const recipeId = params.id as string;

  return <RecipeDetailView recipeId={recipeId} />;
}