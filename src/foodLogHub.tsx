import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Apple, Carrot, Search } from 'lucide-react';
import type { FoodCategory, FoodLog, Nutrients } from './types';

type FoodLogHubProps = {
  onAdd: (entry: Omit<FoodLog, 'id' | 'createdAt'>, saveToFavorites?: boolean) => void;
};

type ProduceItem = Nutrients & {
  id: string;
  name: string;
  servingSize: string;
  category: FoodCategory;
  fluidsOz: number;
  notes: string;
  tags: string[];
};

const emptyNutrients: Nutrients = { sodiumMg: 0, potassiumMg: 0, magnesiumMg: 0, calciumMg: 0, carbohydratesG: 0, sugarsG: 0, proteinG: 0, caffeineMg: 0 };
const multipliers = [0.5, 1, 1.5, 2];
const foodCategories: Array<{ value: FoodCategory; label: string }> = [
  { value: 'produce', label: 'Produce' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'vegetable', label: 'Vegetable' },
  { value: 'homemade', label: 'Homemade meal' },
  { value: 'restaurant', label: 'Restaurant food' },
  { value: 'custom', label: 'Custom food' },
  { value: 'packaged', label: 'Packaged food' }
];

const produceItems: ProduceItem[] = [
  { id: 'banana-medium', name: 'Banana', servingSize: '1 medium banana', category: 'fruit', sodiumMg: 1, potassiumMg: 422, magnesiumMg: 32, calciumMg: 6, carbohydratesG: 27, sugarsG: 14.4, proteinG: 1.3, caffeineMg: 0, fluidsOz: 3.5, notes: 'USDA-style estimate for one medium banana.', tags: ['fruit', 'potassium'] },
  { id: 'apple-medium', name: 'Apple', servingSize: '1 medium apple', category: 'fruit', sodiumMg: 2, potassiumMg: 195, magnesiumMg: 9, calciumMg: 11, carbohydratesG: 25, sugarsG: 19, proteinG: 0.5, caffeineMg: 0, fluidsOz: 5.3, notes: 'USDA-style estimate for one medium apple with skin.', tags: ['fruit'] },
  { id: 'orange-medium', name: 'Orange', servingSize: '1 medium orange', category: 'fruit', sodiumMg: 0, potassiumMg: 237, magnesiumMg: 15, calciumMg: 52, carbohydratesG: 15.4, sugarsG: 12.2, proteinG: 1.2, caffeineMg: 0, fluidsOz: 3.8, notes: 'USDA-style estimate for one medium orange.', tags: ['fruit', 'calcium'] },
  { id: 'strawberries-cup', name: 'Strawberries', servingSize: '1 cup sliced', category: 'fruit', sodiumMg: 2, potassiumMg: 233, magnesiumMg: 20, calciumMg: 24, carbohydratesG: 12.7, sugarsG: 7.4, proteinG: 1, caffeineMg: 0, fluidsOz: 4.8, notes: 'USDA-style estimate for one cup sliced strawberries.', tags: ['fruit'] },
  { id: 'blueberries-cup', name: 'Blueberries', servingSize: '1 cup', category: 'fruit', sodiumMg: 1, potassiumMg: 114, magnesiumMg: 9, calciumMg: 9, carbohydratesG: 21.5, sugarsG: 14.7, proteinG: 1.1, caffeineMg: 0, fluidsOz: 4.4, notes: 'USDA-style estimate for one cup blueberries.', tags: ['fruit'] },
  { id: 'grapes-cup', name: 'Grapes', servingSize: '1 cup', category: 'fruit', sodiumMg: 3, potassiumMg: 288, magnesiumMg: 11, calciumMg: 15, carbohydratesG: 27.3, sugarsG: 23.4, proteinG: 1.1, caffeineMg: 0, fluidsOz: 4.5, notes: 'USDA-style estimate for one cup grapes.', tags: ['fruit'] },
  { id: 'watermelon-cup', name: 'Watermelon', servingSize: '1 cup diced', category: 'fruit', sodiumMg: 2, potassiumMg: 170, magnesiumMg: 15, calciumMg: 11, carbohydratesG: 11.5, sugarsG: 9.4, proteinG: 0.9, caffeineMg: 0, fluidsOz: 4.9, notes: 'USDA-style estimate for one cup diced watermelon.', tags: ['fruit', 'fluids'] },
  { id: 'avocado-half', name: 'Avocado', servingSize: '1/2 avocado', category: 'fruit', sodiumMg: 7, potassiumMg: 487, magnesiumMg: 29, calciumMg: 12, carbohydratesG: 8.5, sugarsG: 0.7, proteinG: 2, caffeineMg: 0, fluidsOz: 2.0, notes: 'USDA-style estimate for one half medium avocado.', tags: ['fruit', 'potassium', 'magnesium'] },
  { id: 'potato-medium', name: 'Potato', servingSize: '1 medium baked potato', category: 'vegetable', sodiumMg: 17, potassiumMg: 926, magnesiumMg: 48, calciumMg: 26, carbohydratesG: 37, sugarsG: 2, proteinG: 4.3, caffeineMg: 0, fluidsOz: 4.2, notes: 'USDA-style estimate for one medium baked potato with skin, no salt.', tags: ['vegetable', 'potassium'] },
  { id: 'sweet-potato-medium', name: 'Sweet potato', servingSize: '1 medium baked sweet potato', category: 'vegetable', sodiumMg: 72, potassiumMg: 542, magnesiumMg: 31, calciumMg: 43, carbohydratesG: 26.2, sugarsG: 5.4, proteinG: 2, caffeineMg: 0, fluidsOz: 3.1, notes: 'USDA-style estimate for one medium baked sweet potato.', tags: ['vegetable', 'potassium'] },
  { id: 'spinach-cup', name: 'Spinach', servingSize: '1 cup raw', category: 'vegetable', sodiumMg: 24, potassiumMg: 167, magnesiumMg: 24, calciumMg: 30, carbohydratesG: 1.1, sugarsG: 0.1, proteinG: 0.9, caffeineMg: 0, fluidsOz: 0.9, notes: 'USDA-style estimate for one cup raw spinach.', tags: ['vegetable', 'magnesium', 'calcium'] },
  { id: 'broccoli-cup', name: 'Broccoli', servingSize: '1 cup chopped raw', category: 'vegetable', sodiumMg: 30, potassiumMg: 288, magnesiumMg: 19, calciumMg: 43, carbohydratesG: 6, sugarsG: 1.5, proteinG: 2.6, caffeineMg: 0, fluidsOz: 2.7, notes: 'USDA-style estimate for one cup chopped raw broccoli.', tags: ['vegetable', 'calcium'] },
  { id: 'carrots-cup', name: 'Carrots', servingSize: '1 cup chopped raw', category: 'vegetable', sodiumMg: 88, potassiumMg: 410, magnesiumMg: 15, calciumMg: 42, carbohydratesG: 12.3, sugarsG: 6.1, proteinG: 1.2, caffeineMg: 0, fluidsOz: 3.6, notes: 'USDA-style estimate for one cup chopped raw carrots.', tags: ['vegetable', 'potassium'] },
  { id: 'tomato-medium', name: 'Tomato', servingSize: '1 medium tomato', category: 'vegetable', sodiumMg: 6, potassiumMg: 292, magnesiumMg: 14, calciumMg: 12, carbohydratesG: 4.8, sugarsG: 3.2, proteinG: 1.1, caffeineMg: 0, fluidsOz: 3.7, notes: 'USDA-style estimate for one medium tomato.', tags: ['vegetable', 'fluids'] },
  { id: 'cucumber-cup', name: 'Cucumber', servingSize: '1 cup sliced', category: 'vegetable', sodiumMg: 2, potassiumMg: 193, magnesiumMg: 17, calciumMg: 19, carbohydratesG: 3.8, sugarsG: 1.7, proteinG: 0.8, caffeineMg: 0, fluidsOz: 3.6, notes: 'USDA-style estimate for one cup sliced cucumber with peel.', tags: ['vegetable', 'fluids'] },
  { id: 'celery-stalk', name: 'Celery', servingSize: '1 large stalk', category: 'vegetable', sodiumMg: 51, potassiumMg: 166, magnesiumMg: 7, calciumMg: 26, carbohydratesG: 1.9, sugarsG: 1.1, proteinG: 0.4, caffeineMg: 0, fluidsOz: 1.6, notes: 'USDA-style estimate for one large celery stalk.', tags: ['vegetable', 'fluids'] },
  { id: 'romaine-cup', name: 'Romaine lettuce', servingSize: '1 cup shredded', category: 'vegetable', sodiumMg: 8, potassiumMg: 116, magnesiumMg: 7, calciumMg: 16, carbohydratesG: 1.5, sugarsG: 0.6, proteinG: 0.6, caffeineMg: 0, fluidsOz: 1.4, notes: 'USDA-style estimate for one cup shredded romaine.', tags: ['vegetable', 'fluids'] },
  { id: 'bell-pepper-cup', name: 'Bell pepper', servingSize: '1 cup chopped', category: 'vegetable', sodiumMg: 4, potassiumMg: 314, magnesiumMg: 18, calciumMg: 10, carbohydratesG: 9, sugarsG: 6.3, proteinG: 1.5, caffeineMg: 0, fluidsOz: 4.3, notes: 'USDA-style estimate for one cup chopped red bell pepper.', tags: ['vegetable'] },
  { id: 'zucchini-cup', name: 'Zucchini', servingSize: '1 cup sliced raw', category: 'vegetable', sodiumMg: 9, potassiumMg: 324, magnesiumMg: 22, calciumMg: 20, carbohydratesG: 3.9, sugarsG: 3.1, proteinG: 1.5, caffeineMg: 0, fluidsOz: 4.2, notes: 'USDA-style estimate for one cup sliced zucchini.', tags: ['vegetable', 'fluids'] },
  { id: 'corn-cup', name: 'Corn', servingSize: '1 cup kernels', category: 'vegetable', sodiumMg: 15, potassiumMg: 392, magnesiumMg: 54, calciumMg: 3, carbohydratesG: 31, sugarsG: 6.8, proteinG: 5.4, caffeineMg: 0, fluidsOz: 3.1, notes: 'USDA-style estimate for one cup cooked sweet corn, no salt.', tags: ['vegetable', 'magnesium'] },
  { id: 'peas-cup', name: 'Green peas', servingSize: '1 cup cooked', category: 'vegetable', sodiumMg: 5, potassiumMg: 354, magnesiumMg: 62, calciumMg: 43, carbohydratesG: 25, sugarsG: 9.5, proteinG: 8.6, caffeineMg: 0, fluidsOz: 3.4, notes: 'USDA-style estimate for one cup cooked green peas, no salt.', tags: ['vegetable', 'magnesium', 'protein'] },
  { id: 'green-beans-cup', name: 'Green beans', servingSize: '1 cup cooked', category: 'vegetable', sodiumMg: 1, potassiumMg: 183, magnesiumMg: 25, calciumMg: 55, carbohydratesG: 9.9, sugarsG: 4.5, proteinG: 2.4, caffeineMg: 0, fluidsOz: 3.9, notes: 'USDA-style estimate for one cup cooked green beans, no salt.', tags: ['vegetable', 'calcium'] },
  { id: 'mushrooms-cup', name: 'Mushrooms', servingSize: '1 cup sliced raw', category: 'vegetable', sodiumMg: 4, potassiumMg: 223, magnesiumMg: 6, calciumMg: 2, carbohydratesG: 2.3, sugarsG: 1.4, proteinG: 2.2, caffeineMg: 0, fluidsOz: 2.1, notes: 'USDA-style estimate for one cup sliced raw white mushrooms.', tags: ['vegetable'] },
  { id: 'kale-cup', name: 'Kale', servingSize: '1 cup chopped raw', category: 'vegetable', sodiumMg: 19, potassiumMg: 79, magnesiumMg: 7, calciumMg: 53, carbohydratesG: 0.9, sugarsG: 0.2, proteinG: 0.6, caffeineMg: 0, fluidsOz: 0.6, notes: 'USDA-style estimate for one cup chopped raw kale.', tags: ['vegetable', 'calcium'] }
];

const fmt = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
const numberField = (form: FormData, key: string) => Math.max(0, Number(form.get(key)) || 0);
const textField = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const scale = (item: ProduceItem, multiplier: number): Nutrients => ({
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
  const [mode, setMode] = useState<'produce' | 'manual'>('produce');
  return <section className="space-y-5"><div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-soft dark:bg-slate-900 dark:shadow-night"><button type="button" onClick={() => setMode('produce')} className={`min-h-12 rounded-xl px-4 py-3 font-black transition ${mode === 'produce' ? 'bg-salt-700 text-white dark:bg-salt-500 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'}`}>Produce</button><button type="button" onClick={() => setMode('manual')} className={`min-h-12 rounded-xl px-4 py-3 font-black transition ${mode === 'manual' ? 'bg-salt-700 text-white dark:bg-salt-500 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'}`}>Manual</button></div>{mode === 'produce' ? <ProduceLibrary onAdd={onAdd} /> : <ManualEntry onAdd={onAdd} />}</section>;
}

function ProduceLibrary({ onAdd }: FoodLogHubProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'fruit' | 'vegetable' | 'potassium'>('all');
  const [multiplierById, setMultiplierById] = useState<Record<string, number>>({});
  const filtered = useMemo(() => produceItems.filter((item) => {
    const matchesQuery = `${item.name} ${item.servingSize} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || item.category === filter || (filter === 'potassium' && item.potassiumMg >= 350);
    return matchesQuery && matchesFilter;
  }), [filter, query]);

  const addProduce = (item: ProduceItem, saveFavorite: boolean) => {
    const multiplier = multiplierById[item.id] ?? 1;
    const nutrients = scale(item, multiplier);
    onAdd({ ...nutrients, name: item.name, servingSize: item.servingSize, category: item.category, fluidsOz: item.fluidsOz * multiplier, notes: `${item.notes} Multiplier: ${multiplier}x.`, source: 'manual', multiplier }, saveFavorite);
  };

  return <Panel title="Produce Library"><div className="rounded-xl border border-salt-100 bg-salt-50 p-3 text-sm font-semibold text-salt-900 dark:border-salt-500/20 dark:bg-salt-500/10 dark:text-salt-100">Built-in produce values are estimates for common serving sizes. Adjust the serving multiplier or use Manual for exact labels and recipes.</div><label className="mt-4 block"><span className="sr-only">Search produce</span><span className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fruits and vegetables" className={`${inputClass} pl-10`} /></span></label><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{(['all', 'fruit', 'vegetable', 'potassium'] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold capitalize ${filter === value ? 'bg-salt-700 text-white dark:bg-salt-500 dark:text-slate-950' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{value === 'potassium' ? 'High potassium' : value}</button>)}</div><div className="mt-4 space-y-3">{filtered.length === 0 ? <Empty text="No produce matches that search." /> : filtered.map((item) => <ProduceCard key={item.id} item={item} multiplier={multiplierById[item.id] ?? 1} onMultiplier={(value) => setMultiplierById((state) => ({ ...state, [item.id]: value }))} onAdd={(saveFavorite) => addProduce(item, saveFavorite)} />)}</div></Panel>;
}

function ProduceCard({ item, multiplier, onMultiplier, onAdd }: { item: ProduceItem; multiplier: number; onMultiplier: (value: number) => void; onAdd: (saveFavorite: boolean) => void }) {
  const nutrients = scale(item, multiplier);
  const Icon = item.category === 'fruit' ? Apple : Carrot;
  return <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-salt-50 text-salt-800 dark:bg-salt-500/15 dark:text-salt-200"><Icon size={21} aria-hidden="true" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{item.name}</h3><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{item.servingSize}</p></div><p className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">{item.category}</p></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{multipliers.map((value) => <button key={value} type="button" onClick={() => onMultiplier(value)} aria-pressed={multiplier === value} className={`min-h-10 rounded-lg px-3 py-2 text-sm font-bold ${multiplier === value ? 'bg-salt-700 text-white dark:bg-salt-500 dark:text-slate-950' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{value}x</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><MiniMetric label="Sodium" value={`${fmt(nutrients.sodiumMg)} mg`} /><MiniMetric label="Potassium" value={`${fmt(nutrients.potassiumMg)} mg`} /><MiniMetric label="Magnesium" value={`${fmt(nutrients.magnesiumMg)} mg`} /><MiniMetric label="Calcium" value={`${fmt(nutrients.calciumMg)} mg`} /><MiniMetric label="Carbs" value={`${fmt(nutrients.carbohydratesG)} g`} /><MiniMetric label="Fluids" value={`${fmt(item.fluidsOz * multiplier)} oz`} /></div><p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.notes}</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => onAdd(false)} className={buttonPrimary}>Add To Today</button><button type="button" onClick={() => onAdd(true)} className={buttonSecondary}>Save Favorite</button></div></div></div></div>;
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
