import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Apple, Carrot, Search, Utensils } from 'lucide-react';
import type { FoodCategory, FoodLog, Nutrients } from './types';

type FoodLogHubProps = {
  onAdd: (entry: Omit<FoodLog, 'id' | 'createdAt'>, saveToFavorites?: boolean) => void;
};

type QuickFoodGroup = 'all' | 'produce' | 'protein' | 'salad' | 'dairy' | 'grains' | 'snacks' | 'drinks' | 'potassium';
type NutrientTuple = [number, number, number, number, number, number, number, number];
type QuickFoodItem = Nutrients & {
  id: string;
  name: string;
  servingSize: string;
  category: FoodCategory;
  group: QuickFoodGroup;
  fluidsOz: number;
  notes: string;
  tags: string[];
};

const emptyNutrients: Nutrients = { sodiumMg: 0, potassiumMg: 0, magnesiumMg: 0, calciumMg: 0, carbohydratesG: 0, sugarsG: 0, proteinG: 0, caffeineMg: 0 };
const multipliers = [0.5, 1, 1.5, 2];
const filters: Array<{ value: QuickFoodGroup; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'produce', label: 'Produce' },
  { value: 'protein', label: 'Protein' },
  { value: 'salad', label: 'Salads' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'grains', label: 'Grains' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'potassium', label: 'High potassium' }
];
const foodCategories: Array<{ value: FoodCategory; label: string }> = [
  { value: 'produce', label: 'Produce' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'vegetable', label: 'Vegetable' },
  { value: 'homemade', label: 'Homemade meal' },
  { value: 'restaurant', label: 'Restaurant food' },
  { value: 'custom', label: 'Custom food' },
  { value: 'packaged', label: 'Packaged food' }
];

const food = (id: string, name: string, servingSize: string, category: FoodCategory, group: QuickFoodGroup, nutrients: NutrientTuple, fluidsOz: number, notes: string, tags: string[]): QuickFoodItem => ({
  id,
  name,
  servingSize,
  category,
  group,
  sodiumMg: nutrients[0],
  potassiumMg: nutrients[1],
  magnesiumMg: nutrients[2],
  calciumMg: nutrients[3],
  carbohydratesG: nutrients[4],
  sugarsG: nutrients[5],
  proteinG: nutrients[6],
  caffeineMg: nutrients[7],
  fluidsOz,
  notes,
  tags
});

const quickFoods: QuickFoodItem[] = [
  food('egg-large', 'Egg', '1 large egg', 'custom', 'protein', [62, 69, 6, 28, 0.4, 0.2, 6.3, 0], 1.2, 'Estimate for one large cooked egg, no added salt.', ['egg', 'breakfast', 'protein']),
  food('scrambled-eggs', 'Scrambled eggs', '2 large eggs', 'homemade', 'protein', [140, 140, 12, 60, 1, 0.4, 12.6, 0], 2.4, 'Estimate for two eggs without cheese or salty seasoning.', ['egg', 'breakfast', 'protein']),
  food('chicken-breast', 'Chicken breast', '3 oz cooked', 'homemade', 'protein', [64, 256, 25, 5, 0, 0, 26, 0], 1.9, 'Estimate for plain cooked skinless chicken breast, no added salt.', ['chicken', 'meat', 'protein']),
  food('chicken-thigh', 'Chicken thigh', '3 oz cooked', 'homemade', 'protein', [76, 220, 20, 9, 0, 0, 21, 0], 1.7, 'Estimate for plain cooked chicken thigh, no added salt.', ['chicken', 'meat', 'protein']),
  food('ground-beef', 'Ground beef', '3 oz cooked', 'homemade', 'protein', [76, 270, 20, 15, 0, 0, 22, 0], 1.5, 'Estimate for cooked 85 percent lean beef, no added salt.', ['beef', 'meat', 'protein']),
  food('steak', 'Steak', '3 oz cooked', 'homemade', 'protein', [55, 260, 21, 10, 0, 0, 25, 0], 1.5, 'Estimate for plain cooked beef steak, no added salt.', ['beef', 'meat', 'protein']),
  food('pork-chop', 'Pork chop', '3 oz cooked', 'homemade', 'protein', [52, 370, 25, 7, 0, 0, 24, 0], 1.4, 'Estimate for plain cooked pork chop, no added salt.', ['pork', 'meat', 'protein', 'potassium']),
  food('turkey-breast', 'Turkey breast', '3 oz roasted', 'homemade', 'protein', [54, 240, 24, 12, 0, 0, 25, 0], 1.8, 'Estimate for roasted turkey breast. Deli turkey is often much higher sodium.', ['turkey', 'protein']),
  food('salmon', 'Salmon', '3 oz cooked', 'homemade', 'protein', [50, 326, 26, 9, 0, 0, 22, 0], 1.6, 'Estimate for cooked salmon, no added salt.', ['fish', 'protein', 'potassium']),
  food('tuna', 'Tuna', '3 oz canned in water, drained', 'packaged', 'protein', [320, 200, 28, 10, 0, 0, 22, 0], 1, 'Canned tuna varies by brand and sodium level; check labels when possible.', ['fish', 'protein', 'canned']),
  food('tofu', 'Tofu', '1/2 cup firm', 'custom', 'protein', [12, 150, 37, 253, 2, 0.6, 10, 0], 2.7, 'Estimate for firm tofu prepared with calcium sulfate.', ['tofu', 'protein', 'calcium']),
  food('black-beans', 'Black beans', '1/2 cup cooked', 'homemade', 'protein', [1, 305, 60, 23, 20, 0.3, 7.6, 0], 2.2, 'Estimate for cooked beans with no added salt. Canned beans can be much higher sodium.', ['beans', 'protein', 'fiber']),
  food('chickpeas', 'Chickpeas', '1/2 cup cooked', 'homemade', 'protein', [6, 238, 39, 40, 22, 4, 7, 0], 2, 'Estimate for cooked chickpeas with no added salt.', ['beans', 'protein', 'salad']),
  food('romaine', 'Romaine lettuce', '1 cup shredded', 'vegetable', 'salad', [8, 116, 7, 16, 1.5, 0.6, 0.6, 0], 1.4, 'Estimate for one cup shredded romaine lettuce.', ['lettuce', 'salad', 'vegetable', 'fluids']),
  food('iceberg', 'Iceberg lettuce', '1 cup shredded', 'vegetable', 'salad', [7, 102, 5, 10, 2.1, 1.4, 0.6, 0], 1.7, 'Estimate for one cup shredded iceberg lettuce.', ['lettuce', 'salad', 'vegetable', 'fluids']),
  food('spinach', 'Spinach', '1 cup raw', 'vegetable', 'salad', [24, 167, 24, 30, 1.1, 0.1, 0.9, 0], 0.9, 'Estimate for one cup raw spinach.', ['spinach', 'salad', 'magnesium', 'calcium']),
  food('mixed-greens', 'Mixed greens', '2 cups', 'vegetable', 'salad', [25, 250, 25, 55, 4, 1.2, 2, 0], 2.4, 'Estimate for two cups of plain mixed salad greens.', ['lettuce', 'salad', 'greens']),
  food('garden-salad', 'Garden salad', '2 cups, no dressing', 'homemade', 'salad', [35, 420, 35, 60, 10, 5, 3, 0], 5, 'Estimate for lettuce, tomato, cucumber, carrots, and peppers without dressing.', ['salad', 'vegetable', 'fluids', 'potassium']),
  food('side-salad-dressing', 'Side salad with dressing', '2 cups salad + 2 tbsp dressing', 'restaurant', 'salad', [350, 420, 35, 70, 14, 7, 3, 0], 5, 'Broad estimate. Dressing can change sodium a lot.', ['salad', 'restaurant', 'sodium']),
  food('caesar-salad', 'Caesar salad', '2 cups', 'restaurant', 'salad', [650, 300, 25, 160, 14, 2, 7, 0], 3, 'Estimate for romaine, dressing, parmesan, and croutons; restaurant portions vary.', ['salad', 'restaurant', 'sodium']),
  food('banana', 'Banana', '1 medium banana', 'fruit', 'produce', [1, 422, 32, 6, 27, 14.4, 1.3, 0], 3.5, 'Estimate for one medium banana.', ['fruit', 'potassium']),
  food('apple', 'Apple', '1 medium apple', 'fruit', 'produce', [2, 195, 9, 11, 25, 19, 0.5, 0], 5.3, 'Estimate for one medium apple with skin.', ['fruit']),
  food('orange', 'Orange', '1 medium orange', 'fruit', 'produce', [0, 237, 15, 52, 15.4, 12.2, 1.2, 0], 3.8, 'Estimate for one medium orange.', ['fruit', 'calcium']),
  food('strawberries', 'Strawberries', '1 cup sliced', 'fruit', 'produce', [2, 233, 20, 24, 12.7, 7.4, 1, 0], 4.8, 'Estimate for one cup sliced strawberries.', ['fruit']),
  food('avocado', 'Avocado', '1/2 avocado', 'fruit', 'produce', [7, 487, 29, 12, 8.5, 0.7, 2, 0], 2, 'Estimate for one half medium avocado.', ['fruit', 'potassium', 'magnesium']),
  food('potato', 'Potato', '1 medium baked potato', 'vegetable', 'produce', [17, 926, 48, 26, 37, 2, 4.3, 0], 4.2, 'Estimate for one medium baked potato with skin, no salt.', ['vegetable', 'potassium']),
  food('sweet-potato', 'Sweet potato', '1 medium baked sweet potato', 'vegetable', 'produce', [72, 542, 31, 43, 26.2, 5.4, 2, 0], 3.1, 'Estimate for one medium baked sweet potato.', ['vegetable', 'potassium']),
  food('broccoli', 'Broccoli', '1 cup chopped raw', 'vegetable', 'produce', [30, 288, 19, 43, 6, 1.5, 2.6, 0], 2.7, 'Estimate for one cup chopped raw broccoli.', ['vegetable', 'calcium']),
  food('carrots', 'Carrots', '1 cup chopped raw', 'vegetable', 'produce', [88, 410, 15, 42, 12.3, 6.1, 1.2, 0], 3.6, 'Estimate for one cup chopped raw carrots.', ['vegetable', 'potassium']),
  food('tomato', 'Tomato', '1 medium tomato', 'vegetable', 'produce', [6, 292, 14, 12, 4.8, 3.2, 1.1, 0], 3.7, 'Estimate for one medium tomato.', ['vegetable', 'fluids']),
  food('cucumber', 'Cucumber', '1 cup sliced', 'vegetable', 'produce', [2, 193, 17, 19, 3.8, 1.7, 0.8, 0], 3.6, 'Estimate for one cup sliced cucumber with peel.', ['vegetable', 'fluids']),
  food('bell-pepper', 'Bell pepper', '1 cup chopped', 'vegetable', 'produce', [4, 314, 18, 10, 9, 6.3, 1.5, 0], 4.3, 'Estimate for one cup chopped red bell pepper.', ['vegetable']),
  food('white-rice', 'White rice', '1 cup cooked', 'homemade', 'grains', [2, 55, 19, 16, 45, 0.1, 4.3, 0], 4, 'Estimate for cooked white rice without added salt.', ['rice', 'grain']),
  food('brown-rice', 'Brown rice', '1 cup cooked', 'homemade', 'grains', [10, 154, 84, 20, 45, 0.7, 5, 0], 4, 'Estimate for cooked brown rice without added salt.', ['rice', 'grain', 'magnesium']),
  food('pasta', 'Pasta', '1 cup cooked', 'homemade', 'grains', [1, 63, 18, 10, 43, 0.8, 8, 0], 3.6, 'Estimate for cooked pasta without sauce or added salt.', ['pasta', 'grain']),
  food('oatmeal', 'Oatmeal', '1 cup cooked', 'homemade', 'grains', [2, 164, 63, 21, 27, 1, 6, 0], 6, 'Estimate for cooked oats made with water and no added salt.', ['oats', 'breakfast', 'magnesium']),
  food('toast', 'Toast', '1 slice', 'packaged', 'grains', [150, 70, 12, 40, 14, 2, 3, 0], 0.4, 'Average estimate for one slice of bread. Check labels when available.', ['bread', 'toast', 'grain']),
  food('tortilla', 'Flour tortilla', '1 medium tortilla', 'packaged', 'grains', [330, 80, 15, 70, 24, 1.5, 4, 0], 0.8, 'Average estimate; tortillas vary widely by brand and size.', ['tortilla', 'grain', 'sodium']),
  food('milk', 'Milk', '1 cup', 'custom', 'dairy', [105, 366, 27, 305, 12, 12, 8, 0], 8, 'Estimate for one cup dairy milk.', ['milk', 'dairy', 'calcium', 'fluids']),
  food('greek-yogurt', 'Greek yogurt', '3/4 cup plain', 'custom', 'dairy', [55, 240, 20, 180, 6, 5, 17, 0], 4, 'Estimate for plain nonfat Greek yogurt.', ['yogurt', 'dairy', 'protein', 'calcium']),
  food('cheddar', 'Cheddar cheese', '1 oz', 'custom', 'dairy', [180, 28, 7, 200, 0.4, 0.1, 7, 0], 0.3, 'Estimate for one ounce cheddar cheese.', ['cheese', 'dairy', 'calcium', 'sodium']),
  food('cottage-cheese', 'Cottage cheese', '1/2 cup', 'packaged', 'dairy', [350, 110, 8, 70, 4, 3, 12, 0], 3, 'Average estimate. Cottage cheese is often high sodium; check labels.', ['dairy', 'protein', 'sodium']),
  food('almonds', 'Almonds', '1 oz', 'custom', 'snacks', [0, 200, 76, 76, 6, 1.2, 6, 0], 0.3, 'Estimate for unsalted almonds.', ['nuts', 'snack', 'magnesium']),
  food('peanut-butter', 'Peanut butter', '2 tbsp', 'packaged', 'snacks', [140, 190, 50, 18, 7, 3, 8, 0], 0.2, 'Average estimate; sodium varies by brand.', ['peanut', 'snack', 'protein']),
  food('pretzels', 'Pretzels', '1 oz', 'packaged', 'snacks', [350, 50, 20, 10, 23, 1, 3, 0], 0.2, 'Average estimate for salted pretzels.', ['snack', 'salt', 'sodium']),
  food('broth', 'Broth', '1 cup regular', 'packaged', 'drinks', [860, 120, 8, 15, 1, 0.5, 5, 0], 8, 'Regular broth is often high sodium; low-sodium versions can be much lower.', ['broth', 'fluids', 'sodium']),
  food('water', 'Water', '8 oz', 'custom', 'drinks', [0, 0, 0, 0, 0, 0, 0, 0], 8, 'Plain water entry for tracking fluids.', ['water', 'fluids']),
  food('coffee', 'Coffee', '8 oz brewed', 'custom', 'drinks', [5, 116, 7, 5, 0, 0, 0.3, 95], 8, 'Average estimate for black brewed coffee.', ['coffee', 'caffeine', 'fluids']),
  food('black-tea', 'Black tea', '8 oz brewed', 'custom', 'drinks', [7, 88, 7, 5, 0.7, 0, 0, 47], 8, 'Average estimate for plain brewed black tea.', ['tea', 'caffeine', 'fluids'])
];

const inputClass = 'mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-salt-500 focus:ring-4 focus:ring-salt-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-salt-500/20';
const buttonPrimary = 'min-h-12 rounded-xl bg-salt-700 px-4 py-3 text-sm font-black text-white transition hover:bg-salt-800 dark:bg-salt-500 dark:text-slate-950 dark:hover:bg-salt-400';
const buttonSecondary = 'min-h-12 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';
const fmt = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
const numberField = (form: FormData, key: string) => Math.max(0, Number(form.get(key)) || 0);
const textField = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const scale = (item: QuickFoodItem, multiplier: number): Nutrients => ({
  sodiumMg: item.sodiumMg * multiplier,
  potassiumMg: item.potassiumMg * multiplier,
  magnesiumMg: item.magnesiumMg * multiplier,
  calciumMg: item.calciumMg * multiplier,
  carbohydratesG: item.carbohydratesG * multiplier,
  sugarsG: item.sugarsG * multiplier,
  proteinG: item.proteinG * multiplier,
  caffeineMg: item.caffeineMg * multiplier
});

function FoodLogHub({ onAdd }: FoodLogHubProps) {
  const [mode, setMode] = useState<'library' | 'manual'>('library');
  return <section className="space-y-5"><div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-soft dark:bg-slate-900 dark:shadow-night"><button type="button" onClick={() => setMode('library')} className={`min-h-12 rounded-xl px-4 py-3 font-black transition ${mode === 'library' ? 'bg-salt-700 text-white dark:bg-salt-500 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'}`}>Quick Foods</button><button type="button" onClick={() => setMode('manual')} className={`min-h-12 rounded-xl px-4 py-3 font-black transition ${mode === 'manual' ? 'bg-salt-700 text-white dark:bg-salt-500 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'}`}>Manual</button></div>{mode === 'library' ? <QuickFoodLibrary onAdd={onAdd} /> : <ManualEntry onAdd={onAdd} />}</section>;
}

function QuickFoodLibrary({ onAdd }: FoodLogHubProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<QuickFoodGroup>('all');
  const [multiplierById, setMultiplierById] = useState<Record<string, number>>({});
  const filtered = useMemo(() => quickFoods.filter((item) => {
    const haystack = `${item.name} ${item.servingSize} ${item.group} ${item.tags.join(' ')}`.toLowerCase();
    const matchesQuery = haystack.includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || item.group === filter || (filter === 'potassium' && item.potassiumMg >= 350);
    return matchesQuery && matchesFilter;
  }), [filter, query]);

  const addQuickFood = (item: QuickFoodItem, saveFavorite: boolean) => {
    const multiplier = multiplierById[item.id] ?? 1;
    const nutrients = scale(item, multiplier);
    onAdd({ ...nutrients, name: item.name, servingSize: item.servingSize, category: item.category, fluidsOz: item.fluidsOz * multiplier, notes: `${item.notes} Multiplier: ${multiplier}x.`, source: 'manual', multiplier }, saveFavorite);
  };

  return <Panel title="Quick Food Library"><div className="rounded-xl border border-salt-100 bg-salt-50 p-3 text-sm font-semibold text-salt-900 dark:border-salt-500/20 dark:bg-salt-500/10 dark:text-salt-100">Built-in values are common serving estimates for foods that are hard to scan. Adjust the serving multiplier or use Manual for exact recipes and labels.</div><label className="mt-4 block"><span className="sr-only">Search quick foods</span><span className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search eggs, meats, salads, grains..." className={`${inputClass} pl-10`} /></span></label><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`min-h-11 shrink-0 rounded-xl px-3 py-2 text-sm font-bold ${filter === item.value ? 'bg-salt-700 text-white dark:bg-salt-500 dark:text-slate-950' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{item.label}</button>)}</div><div className="mt-4 space-y-3">{filtered.length === 0 ? <Empty text="No quick foods match that search." /> : filtered.map((item) => <QuickFoodCard key={item.id} item={item} multiplier={multiplierById[item.id] ?? 1} onMultiplier={(value) => setMultiplierById((state) => ({ ...state, [item.id]: value }))} onAdd={(saveFavorite) => addQuickFood(item, saveFavorite)} />)}</div></Panel>;
}

function QuickFoodCard({ item, multiplier, onMultiplier, onAdd }: { item: QuickFoodItem; multiplier: number; onMultiplier: (value: number) => void; onAdd: (saveFavorite: boolean) => void }) {
  const nutrients = scale(item, multiplier);
  const Icon = item.category === 'fruit' ? Apple : item.category === 'vegetable' ? Carrot : Utensils;
  return <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-salt-50 text-salt-800 dark:bg-salt-500/15 dark:text-salt-200"><Icon size={21} aria-hidden="true" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{item.name}</h3><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{item.servingSize}</p></div><p className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">{item.group}</p></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{multipliers.map((value) => <button key={value} type="button" onClick={() => onMultiplier(value)} aria-pressed={multiplier === value} className={`min-h-10 rounded-lg px-3 py-2 text-sm font-bold ${multiplier === value ? 'bg-salt-700 text-white dark:bg-salt-500 dark:text-slate-950' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{value}x</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><MiniMetric label="Sodium" value={`${fmt(nutrients.sodiumMg)} mg`} /><MiniMetric label="Potassium" value={`${fmt(nutrients.potassiumMg)} mg`} /><MiniMetric label="Magnesium" value={`${fmt(nutrients.magnesiumMg)} mg`} /><MiniMetric label="Calcium" value={`${fmt(nutrients.calciumMg)} mg`} /><MiniMetric label="Protein" value={`${fmt(nutrients.proteinG)} g`} /><MiniMetric label="Fluids" value={`${fmt(item.fluidsOz * multiplier)} oz`} /></div><p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.notes}</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => onAdd(false)} className={buttonPrimary}>Add To Today</button><button type="button" onClick={() => onAdd(true)} className={buttonSecondary}>Save Favorite</button></div></div></div></div>;
}

function ManualEntry({ onAdd }: FoodLogHubProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAdd({ ...emptyNutrients, name: textField(form, 'name') || 'Manual entry', brand: textField(form, 'brand'), servingSize: textField(form, 'servingSize'), category: textField(form, 'category') as FoodCategory, sodiumMg: numberField(form, 'sodiumMg'), potassiumMg: numberField(form, 'potassiumMg'), magnesiumMg: numberField(form, 'magnesiumMg'), calciumMg: numberField(form, 'calciumMg'), carbohydratesG: numberField(form, 'carbohydratesG'), sugarsG: numberField(form, 'sugarsG'), proteinG: numberField(form, 'proteinG'), caffeineMg: numberField(form, 'caffeineMg'), fluidsOz: numberField(form, 'fluidsOz'), notes: textField(form, 'notes'), source: 'manual', multiplier: 1 }, form.get('saveFavorite') === 'on');
    event.currentTarget.reset();
  };
  return <Panel title="Food & Nutrition Entry"><form onSubmit={submit} className="space-y-4"><Input name="name" label="Food or meal name" type="text" /><Input name="brand" label="Brand or restaurant" type="text" /><Input name="servingSize" label="Serving size" type="text" /><SelectField name="category" label="Food type" options={foodCategories} /><div className="grid grid-cols-2 gap-3"><Input name="sodiumMg" label="Sodium mg" type="number" /><Input name="potassiumMg" label="Potassium mg" type="number" /><Input name="magnesiumMg" label="Magnesium mg" type="number" /><Input name="calciumMg" label="Calcium mg" type="number" /><Input name="carbohydratesG" label="Carbs g" type="number" /><Input name="sugarsG" label="Sugars g" type="number" /><Input name="proteinG" label="Protein g" type="number" /><Input name="caffeineMg" label="Caffeine mg" type="number" /></div><Input name="fluidsOz" label="Fluids oz" type="number" /><TextArea name="notes" label="Notes" /><label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"><input name="saveFavorite" type="checkbox" className="h-5 w-5 accent-salt-700" /> Save as reusable favorite</label><button className={buttonPrimary}>Add To Today</button></form></Panel>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl bg-white p-4 shadow-soft transition-colors dark:bg-slate-900 dark:shadow-night"><h2 className="mb-4 text-lg font-black">{title}</h2>{children}</section>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800"><p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p><p className="font-black text-slate-900 dark:text-slate-100">{value}</p></div>;
}

function Input({ name, label, type, defaultValue }: { name: string; label: string; type: string; defaultValue?: string | number }) {
  return <label className="block"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span><input name={name} type={type} defaultValue={defaultValue} inputMode={type === 'number' ? 'decimal' : undefined} min={type === 'number' ? 0 : undefined} className={inputClass} /></label>;
}

function TextArea({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return <label className="block"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span><textarea name={name} rows={4} defaultValue={defaultValue} className={inputClass} /></label>;
}

function SelectField({ name, label, options, defaultValue }: { name: string; label: string; options: Array<{ value: FoodCategory; label: string }>; defaultValue?: FoodCategory }) {
  return <label className="block"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span><select name={name} defaultValue={defaultValue ?? 'custom'} className={inputClass}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function Empty({ text }: { text: string }) {
  return <div role="status" className="rounded-xl bg-slate-50 p-4 text-center text-sm font-bold text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">{text}</div>;
}

export default FoodLogHub;
