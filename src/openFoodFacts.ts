import type { Nutrients, ProductNutrition } from './types';

type OpenFoodFactsProduct = {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
};

type OpenFoodFactsResponse = {
  status?: number;
  product?: OpenFoodFactsProduct;
};

const numberFrom = (value: unknown) => {
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const unitFrom = (value: unknown, fallback: 'g' | 'mg') => {
  const unit = String(value ?? fallback).trim().toLowerCase();
  if (unit === 'mg' || unit === 'milligram' || unit === 'milligrams') return 'mg';
  if (unit === 'µg' || unit === 'μg' || unit === 'ug' || unit === 'mcg') return 'mcg';
  if (unit === 'kg') return 'kg';
  return 'g';
};

const toMg = (value: number, unit: string) => {
  if (unit === 'mg') return value;
  if (unit === 'mcg') return value / 1000;
  if (unit === 'kg') return value * 1_000_000;
  return value * 1000;
};

const nutrientKeys = (base: string) => ({
  serving: `${base}_serving`,
  servingUnit: `${base}_unit`,
  per100g: `${base}_100g`,
  per100gUnit: `${base}_unit`
});

function mgFrom(
  nutriments: Record<string, number | string | undefined>,
  base: string,
  fallbackUnit: 'g' | 'mg'
) {
  const keys = nutrientKeys(base);
  const serving = numberFrom(nutriments[keys.serving]);
  if (serving !== null) {
    return { value: toMg(serving, unitFrom(nutriments[keys.servingUnit], fallbackUnit)), available: true };
  }

  const per100g = numberFrom(nutriments[keys.per100g]);
  if (per100g !== null) {
    return { value: toMg(per100g, unitFrom(nutriments[keys.per100gUnit], fallbackUnit)), available: true };
  }

  return { value: 0, available: false };
}

function gramsFrom(nutriments: Record<string, number | string | undefined>, base: string) {
  const keys = nutrientKeys(base);
  const serving = numberFrom(nutriments[keys.serving]);
  if (serving !== null) return { value: serving, available: true };

  const per100g = numberFrom(nutriments[keys.per100g]);
  if (per100g !== null) return { value: per100g, available: true };

  return { value: 0, available: false };
}

export async function fetchProduct(barcode: string): Promise<ProductNutrition | null> {
  const cleanBarcode = barcode.trim();
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`);
  if (!response.ok) throw new Error('Product lookup failed.');

  const data = (await response.json()) as OpenFoodFactsResponse;
  if (data.status !== 1 || !data.product) return null;

  const nutriments = data.product.nutriments ?? {};
  const sodium = mgFrom(nutriments, 'sodium', 'g');
  const potassium = mgFrom(nutriments, 'potassium', 'g');
  const magnesium = mgFrom(nutriments, 'magnesium', 'g');
  const calcium = mgFrom(nutriments, 'calcium', 'g');
  const caffeine = mgFrom(nutriments, 'caffeine', 'mg');
  const carbohydrates = gramsFrom(nutriments, 'carbohydrates');
  const sugars = gramsFrom(nutriments, 'sugars');
  const protein = gramsFrom(nutriments, 'proteins');

  const nutrients: Nutrients = {
    sodiumMg: sodium.value,
    potassiumMg: potassium.value,
    magnesiumMg: magnesium.value,
    calciumMg: calcium.value,
    carbohydratesG: carbohydrates.value,
    sugarsG: sugars.value,
    proteinG: protein.value,
    caffeineMg: caffeine.value
  };

  return {
    barcode: cleanBarcode,
    name: data.product.product_name_en || data.product.product_name || 'Unnamed product',
    brand: data.product.brands,
    servingSize: data.product.serving_size,
    ...nutrients,
    availableNutrients: {
      sodiumMg: sodium.available,
      potassiumMg: potassium.available,
      magnesiumMg: magnesium.available,
      calciumMg: calcium.available,
      carbohydratesG: carbohydrates.available,
      sugarsG: sugars.available,
      proteinG: protein.available,
      caffeineMg: caffeine.available
    }
  };
}
