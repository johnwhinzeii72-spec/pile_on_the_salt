import type { ProductNutrition } from './types';

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
  return Number.isFinite(numeric) ? numeric : 0;
};

const mgFrom = (nutriments: Record<string, number | string | undefined>, servingKey: string, hundredKey: string) => {
  const serving = numberFrom(nutriments[servingKey]);
  const per100 = numberFrom(nutriments[hundredKey]);
  return (serving || per100) * 1000;
};

export async function fetchProduct(barcode: string): Promise<ProductNutrition | null> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
  if (!response.ok) throw new Error('Product lookup failed.');

  const data = (await response.json()) as OpenFoodFactsResponse;
  if (data.status !== 1 || !data.product) return null;

  const nutriments = data.product.nutriments ?? {};
  return {
    barcode,
    name: data.product.product_name_en || data.product.product_name || 'Unnamed product',
    brand: data.product.brands,
    servingSize: data.product.serving_size,
    sodiumMg: mgFrom(nutriments, 'sodium_serving', 'sodium_100g'),
    potassiumMg: mgFrom(nutriments, 'potassium_serving', 'potassium_100g'),
    magnesiumMg: mgFrom(nutriments, 'magnesium_serving', 'magnesium_100g'),
    calciumMg: mgFrom(nutriments, 'calcium_serving', 'calcium_100g'),
    carbohydratesG: numberFrom(nutriments.carbohydrates_serving) || numberFrom(nutriments.carbohydrates_100g),
    sugarsG: numberFrom(nutriments.sugars_serving) || numberFrom(nutriments.sugars_100g),
    proteinG: numberFrom(nutriments.proteins_serving) || numberFrom(nutriments.proteins_100g),
    caffeineMg: numberFrom(nutriments.caffeine_serving) || numberFrom(nutriments.caffeine_100g)
  };
}
