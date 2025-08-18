import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logging/logger";

// Normalisation avancée : minuscules, accents, caractères spéciaux (sauf espace)
const normalizeString = (str: string) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/[^a-z0-9 ]/gi, "")     // supprime tout sauf lettres, chiffres et espaces
    .replace(/\s+/g, " ")            // espaces multiples en un seul
    .trim();

const flattenCategories = (categories: any[]): { id: number; title: string }[] => {
  let flatList: { id: number; title: string }[] = [];
  for (const category of categories) {
    if (category.id && category.title) {
      flatList.push({ id: category.id, title: category.title });
    }
    if (category.catalogs && Array.isArray(category.catalogs)) {
      flatList = flatList.concat(flattenCategories(category.catalogs));
    }
  }
  return flatList;
};

// Vérifie si au moins un mot de la recherche est présent dans le titre de la catégorie
const matchAnyWord = (search: string, target: string) => {
  const searchWords = search.split(" ").filter(Boolean);
  return searchWords.some(word => target.includes(word));
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "";

  if (!title || title.length < 3) {
    return NextResponse.json({ categories: [] }, { status: 200 });
  }

  try {
    const res = await fetch("http://localhost:3000/api/v1/vinted/categories");
    if (!res.ok) {
      throw new Error(`Failed to fetch categories: ${res.statusText}`);
    }
    const { categories: hierarchicalCategories } = await res.json();

    const allCategories = flattenCategories(hierarchicalCategories);
    const normalizedTitle = normalizeString(title);

    // Vérifie si au moins un mot de la recherche est présent dans le titre de la catégorie
    const suggestedCategories = allCategories
      .filter(cat => matchAnyWord(normalizedTitle, normalizeString(cat.title)))
      .slice(0, 10);

    return NextResponse.json({ categories: suggestedCategories }, { status: 200 });
  } catch (error: any) {
    logger.error("Error in /api/v1/vinted/category-filters:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}