import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Camera,
  CheckCircle2,
  Droplets,
  HeartPulse,
  Home,
  LifeBuoy,
  Loader2,
  Moon,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sun,
  Utensils,
  XCircle
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { fetchProduct } from './openFoodFacts';
import {
  defaultSettings,
  isToday,
  loadFoodLogs,
  loadSettings,
  loadSymptomLogs,
  saveFoodLogs,
  saveSettings,
  saveSymptomLogs
} from './storage';
import type { FoodLog, NutrientAvailability, Nutrients, PageId, ProductNutrition, Settings, SymptomLog } from './types';

type Totals = Nutrients & { fluidsOz: number };
type Theme = 'light' | 'dark';
type NavItem = { id: PageId; label: string; icon: typeof Home };
type LookupState = 'idle' | 'permission' | 'scanning' | 'loading' | 'found' | 'not-found' | 'api-error' | 'camera-error';

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Today', icon: Home },
  { id: 'scanner', label: 'Scan', icon: Camera },
  { id: 'manual', label: 'Manual', icon: Plus },
  { id: 'symptoms', label: 'Symptoms', icon: HeartPulse },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'help', label: 'Help', icon: LifeBuoy },
  { id: 'settings', label: 'Settings', icon: SettingsIcon }
];

const emptyNutrients: Nutrients = {
  sodiumMg: 0,
  potassiumMg: 0,
  magnesiumMg: 0,
  calciumMg: 0,
  carbohydratesG: 0,
  sugarsG: 0,
  proteinG: 0,
  caffeineMg: 0
};

const multipliers = [0.5, 1, 1.5, 2];
const uid = () => ('crypto' in window && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const numberField = (form: FormData, key: string) => Math.max(0, Number(form.get(key)) || 0);
const textField = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const fmt = (value: number) => Math.round(value).toLocaleString();
const buttonPrimary = 'min-h-12 rounded-xl bg-salt-700 px-4 py-3 font-bold text-white shadow-soft transition active:scale-[0.99] disabled:bg-slate-300 disabled:shadow-none dark:bg-salt-500 dark:text-slate-950 dark:disabled:bg-slate-700 dark:disabled:text-slate-400';
const buttonSecondary = 'min-h-12 rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 shadow-sm transition active:scale-[0.99] disabled:text-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:disabled:text-slate-600';

function applyMultiplier(product: ProductNutrition, multiplier: number): Nutrients {
  return {
    sodiumMg: product.sodiumMg * multiplier,
    potassiumMg: product.potassiumMg * multiplier,
    magnesiumMg: product.magnesiumMg * multiplier,
    calciumMg: product.calciumMg * multiplier,
    carbohydratesG: product.carbohydratesG * multiplier,
    sugarsG: product.sugarsG * multiplier,
    proteinG: product.proteinG * multiplier,
    caffeineMg: product.caffeineMg * multiplier
  };
}

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('pile-on-the-salt.theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>(() => loadFoodLogs());
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>(() => loadSymptomLogs());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => saveFoodLogs(foodLogs), [foodLogs]);
  useEffect(() => saveSymptomLogs(symptomLogs), [symptomLogs]);
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('pile-on-the-salt.theme', theme);
  }, [theme]);

  const todayFoods = useMemo(() => foodLogs.filter((log) => isToday(log.createdAt)), [foodLogs]);
  const todaySymptoms = useMemo(() => symptomLogs.filter((log) => isToday(log.createdAt)), [symptomLogs]);
  const totals = useMemo<Totals>(() => todayFoods.reduce((sum, item) => ({
    sodiumMg: sum.sodiumMg + item.sodiumMg,
    potassiumMg: sum.potassiumMg + item.potassiumMg,
    magnesiumMg: sum.magnesiumMg + item.magnesiumMg,
    calciumMg: sum.calciumMg + item.calciumMg,
    carbohydratesG: sum.carbohydratesG + item.carbohydratesG,
    sugarsG: sum.sugarsG + item.sugarsG,
    proteinG: sum.proteinG + item.proteinG,
    caffeineMg: sum.caffeineMg + item.caffeineMg,
    fluidsOz: sum.fluidsOz + item.fluidsOz
  }), { ...emptyNutrients, fluidsOz: 0 }), [todayFoods]);

  const addFood = (entry: Omit<FoodLog, 'id' | 'createdAt'>) => {
    setFoodLogs((logs) => [{ ...entry, id: uid(), createdAt: new Date().toISOString() }, ...logs]);
    setPage('dashboard');
  };

  const addSymptom = (entry: Omit<SymptomLog, 'id' | 'createdAt'>) => {
    setSymptomLogs((logs) => [{ ...entry, id: uid(), createdAt: new Date().toISOString() }, ...logs]);
  };

  const title = navItems.find((item) => item.id === page)?.label ?? 'Today';
  const ThemeIcon = theme === 'dark' ? Sun : Moon;

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-ink transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="safe-top sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/90 px-4 pb-3 backdrop-blur-xl transition-colors dark:border-slate-800 dark:bg-slate-950/88">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-salt-700 dark:text-salt-500">Pile On The Salt</p>
            <h1 className="truncate text-2xl font-black">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              <ThemeIcon size={21} />
            </button>
            <button type="button" onClick={() => setPage('scanner')} className="grid h-12 w-12 place-items-center rounded-full bg-salt-700 text-white shadow-soft transition active:scale-95 dark:bg-salt-500 dark:text-slate-950" aria-label="Open barcode scanner">
              <Camera size={22} />
            </button>
          </div>
        </div>
      </header>

      <main key={page} className="page-enter mx-auto max-w-3xl px-4 py-5">
        {page === 'dashboard' && <Dashboard totals={totals} settings={settings} foods={todayFoods} symptoms={todaySymptoms} />}
        {page === 'scanner' && <Scanner onAdd={addFood} onManual={() => setPage('manual')} />}
        {page === 'manual' && <ManualEntry onAdd={addFood} />}
        {page === 'symptoms' && <SymptomTracker onAdd={addSymptom} logs={todaySymptoms} />}
        {page === 'insights' && <Insights foods={foodLogs} symptoms={symptomLogs} settings={settings} />}
        {page === 'help' && <HelpNow settings={settings} />}
        {page === 'settings' && <SettingsPage settings={settings} setSettings={setSettings} />}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/92 px-2 pt-2 shadow-[0_-12px_35px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-[0_-12px_35px_rgba(0,0,0,0.35)]" aria-label="Primary navigation">
        <div className="mx-auto grid max-w-3xl grid-cols-7 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button key={item.id} type="button" onClick={() => setPage(item.id)} aria-label={`Open ${item.label}`} aria-current={active ? 'page' : undefined} className={`flex min-h-14 flex-col items-center justify-center rounded-xl px-1 text-[11px] font-bold transition active:scale-95 ${active ? 'bg-salt-50 text-salt-900 dark:bg-salt-500/15 dark:text-salt-100' : 'text-slate-500 dark:text-slate-400'}`}>
                <Icon size={20} aria-hidden="true" />
                <span className="mt-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Dashboard({ totals, settings, foods, symptoms }: { totals: Totals; settings: Settings; foods: FoodLog[]; symptoms: SymptomLog[] }) {
  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <GoalCard icon={Utensils} label="Sodium" value={totals.sodiumMg} goal={settings.sodiumGoalMg} unit="mg" />
        <GoalCard icon={Droplets} label="Fluids" value={totals.fluidsOz} goal={settings.fluidGoalOz} unit="oz" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Potassium" value={`${fmt(totals.potassiumMg)} mg`} />
        <Metric label="Magnesium" value={`${fmt(totals.magnesiumMg)} mg`} />
        <Metric label="Calcium" value={`${fmt(totals.calciumMg)} mg`} />
      </div>
      <Panel title="Foods Logged Today">
        {foods.length === 0 ? <Empty text="No foods logged yet." /> : foods.map((food) => <FoodRow key={food.id} food={food} />)}
      </Panel>
      <Panel title="Symptom Check-ins">
        {symptoms.length === 0 ? <Empty text="No symptom check-ins today." /> : symptoms.map((log) => <SymptomRow key={log.id} log={log} />)}
      </Panel>
    </section>
  );
}

function GoalCard({ icon: Icon, label, value, goal, unit }: { icon: typeof Home; label: string; value: number; goal: number; unit: string }) {
  const percent = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft transition-colors dark:bg-slate-900 dark:shadow-night">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-black">{fmt(value)} <span className="text-base text-slate-500 dark:text-slate-400">{unit}</span></p>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-full bg-salt-50 text-salt-900 dark:bg-salt-500/15 dark:text-salt-100"><Icon aria-hidden="true" /></div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-salt-700 dark:bg-salt-500" style={{ width: `${percent}%` }} /></div>
      <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{percent}% of {fmt(goal)} {unit}</p>
    </div>
  );
}

function Scanner({ onAdd, onManual }: { onAdd: (entry: Omit<FoodLog, 'id' | 'createdAt'>) => void; onManual: () => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const [status, setStatus] = useState('Ready to scan. Camera access is requested only when you tap Start Scan.');
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [product, setProduct] = useState<ProductNutrition | null>(null);
  const [barcode, setBarcode] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [multiplier, setMultiplier] = useState(1);
  const scanning = lookupState === 'permission' || lookupState === 'scanning';
  const loading = lookupState === 'loading';

  const stop = async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      setLookupState((state) => (state === 'scanning' || state === 'permission' ? 'idle' : state));
      return;
    }

    try {
      if (scanner.isScanning) await scanner.stop();
      await scanner.clear();
    } catch {
      // Camera cleanup can throw if Safari has already released the stream.
    } finally {
      scannerRef.current = null;
      setLookupState((state) => (state === 'scanning' || state === 'permission' ? 'idle' : state));
    }
  };

  const resetForScan = () => {
    processingRef.current = false;
    setBarcode('');
    setProduct(null);
    setMultiplier(1);
    setStatus('Ready to scan. Camera access is requested only when you tap Start Scan.');
    setLookupState('idle');
  };

  const lookupBarcode = async (value: string) => {
    const cleanBarcode = value.trim();
    if (!cleanBarcode || processingRef.current) return;
    processingRef.current = true;
    setBarcode(cleanBarcode);
    setProduct(null);
    setLookupState('loading');
    setStatus(`Looking up ${cleanBarcode}...`);

    try {
      const found = await fetchProduct(cleanBarcode);
      if (found) {
        setProduct(found);
        setLookupState('found');
        setStatus('Product found. Review nutrients and add it to today when ready.');
      } else {
        setLookupState('not-found');
        setStatus('Product not found in Open Food Facts. Use manual barcode or nutrition entry as a fallback.');
      }
    } catch {
      setLookupState('api-error');
      setStatus('Open Food Facts lookup failed. Check your connection or enter nutrition manually.');
    } finally {
      processingRef.current = false;
    }
  };

  useEffect(() => () => { void stop(); }, []);

  const start = async () => {
    await stop();
    resetForScan();

    if (!window.isSecureContext) {
      setLookupState('camera-error');
      setStatus('Camera scanning requires HTTPS. On iPhone Safari, open the installed app or the HTTPS site before scanning.');
      return;
    }

    setLookupState('permission');
    setStatus('Safari may ask for camera permission. Choose Allow, then point the camera at a UPC, EAN, or Code128 barcode.');

    try {
      const scanner = new Html5Qrcode('reader', {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.CODE_128]
      });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 260, height: 160 }, aspectRatio: 1.7778 },
        async (decodedText) => {
          if (processingRef.current) return;
          processingRef.current = true;
          const cleanBarcode = decodedText.trim();
          setBarcode(cleanBarcode);
          setStatus('Barcode captured. Stopping camera and looking up product...');
          await stop();
          processingRef.current = false;
          await lookupBarcode(cleanBarcode);
        },
        () => undefined
      );
      setLookupState('scanning');
      setStatus('Camera is active. Hold the barcode inside the frame.');
    } catch {
      processingRef.current = false;
      scannerRef.current = null;
      setLookupState('camera-error');
      setStatus('Camera access failed. On iPhone Safari, scanning requires HTTPS and camera permission.');
    }
  };

  const submitManualBarcode = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void stop().then(() => lookupBarcode(manualBarcode));
  };

  const scaled = product ? applyMultiplier(product, multiplier) : null;

  return (
    <section className="space-y-5">
      <Panel title="Barcode Scanner">
        <div className="rounded-xl border border-salt-100 bg-salt-50 p-3 text-sm font-semibold text-salt-900 dark:border-salt-500/20 dark:bg-salt-500/10 dark:text-salt-100">
          Tap Start Scan to request camera access. For iPhone Safari, use the HTTPS site or installed PWA and allow camera permission when prompted.
        </div>
        <div id="reader" className="mt-4 min-h-56 overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700" />
        <ScannerStatus state={lookupState} status={status} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={start} disabled={scanning || loading} className={buttonPrimary}>{lookupState === 'found' || lookupState === 'not-found' || lookupState === 'api-error' ? 'Scan Again' : 'Start Scan'}</button>
          <button type="button" onClick={() => void stop()} disabled={!scanning} className={buttonSecondary}>Stop</button>
        </div>
        <form onSubmit={submitManualBarcode} className="mt-4 grid grid-cols-[1fr_auto] gap-2" aria-label="Manual barcode lookup">
          <input value={manualBarcode} onChange={(event) => setManualBarcode(event.target.value)} inputMode="numeric" autoComplete="off" aria-label="Barcode number" placeholder="Enter barcode" className="min-h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-salt-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500" />
          <button type="submit" disabled={loading || !manualBarcode.trim()} className="grid h-12 w-12 place-items-center rounded-xl bg-slate-900 text-white transition active:scale-95 disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-950 dark:disabled:bg-slate-700" aria-label="Look up barcode">
            {loading ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <Search size={20} aria-hidden="true" />}
          </button>
        </form>
        <button type="button" onClick={onManual} className="mt-3 w-full min-h-12 rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700 transition active:scale-[0.99] dark:bg-slate-800 dark:text-slate-100">Manual nutrition entry</button>
      </Panel>

      {(lookupState === 'not-found' || lookupState === 'api-error') && (
        <Panel title={lookupState === 'not-found' ? 'Product Not Found' : 'Lookup Error'}>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{lookupState === 'not-found' ? `${barcode || 'That barcode'} was not found in Open Food Facts.` : 'Open Food Facts could not be reached or returned an error.'}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={start} className={buttonPrimary}>Scan Again</button>
            <button type="button" onClick={onManual} className={buttonSecondary}>Manual Entry</button>
          </div>
        </Panel>
      )}

      {product && scaled && (
        <Panel title="Product Details">
          <div className="space-y-1">
            <h2 className="text-xl font-black">{product.name}</h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{product.brand || 'Brand unavailable'} · {product.servingSize || 'Serving size unavailable'}</p>
            <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Barcode {product.barcode}</p>
          </div>
          <div className="mt-4 flex gap-2">
            {multipliers.map((value) => <button key={value} type="button" onClick={() => setMultiplier(value)} aria-pressed={multiplier === value} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold transition active:scale-95 ${multiplier === value ? 'bg-salt-700 text-white dark:bg-salt-500 dark:text-slate-950' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{value}x</button>)}
          </div>
          <NutrientGrid nutrients={scaled} availability={product.availableNutrients} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => onAdd({ ...scaled, name: product.name, brand: product.brand, servingSize: product.servingSize, fluidsOz: 0, source: 'scanner', barcode: product.barcode, multiplier })} className="min-h-12 rounded-xl bg-berry px-4 py-3 font-bold text-white shadow-soft transition active:scale-[0.99]">Add To Today</button>
            <button type="button" onClick={start} className={buttonSecondary}>Scan Again</button>
          </div>
        </Panel>
      )}
    </section>
  );
}

function ScannerStatus({ state, status }: { state: LookupState; status: string }) {
  const isError = state === 'api-error' || state === 'camera-error' || state === 'not-found';
  const isLoading = state === 'loading' || state === 'permission';
  return (
    <div role={isError ? 'alert' : 'status'} className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-sm font-semibold ${isError ? 'bg-rose-50 text-rose-950 dark:bg-rose-500/15 dark:text-rose-100' : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
      {isLoading ? <Loader2 className="mt-0.5 shrink-0 animate-spin" size={18} aria-hidden="true" /> : isError ? <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 shrink-0 text-salt-700 dark:text-salt-400" size={18} aria-hidden="true" />}
      <p>{status}</p>
    </div>
  );
}

function ManualEntry({ onAdd }: { onAdd: (entry: Omit<FoodLog, 'id' | 'createdAt'>) => void }) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAdd({ ...emptyNutrients, name: textField(form, 'name') || 'Manual entry', sodiumMg: numberField(form, 'sodiumMg'), potassiumMg: numberField(form, 'potassiumMg'), magnesiumMg: numberField(form, 'magnesiumMg'), calciumMg: numberField(form, 'calciumMg'), fluidsOz: numberField(form, 'fluidsOz'), notes: textField(form, 'notes'), source: 'manual', multiplier: 1 });
    event.currentTarget.reset();
  };
  return <EntryForm title="Manual Nutrition Entry" onSubmit={submit} fields={[['name', 'Product name', 'text'], ['sodiumMg', 'Sodium mg', 'number'], ['potassiumMg', 'Potassium mg', 'number'], ['magnesiumMg', 'Magnesium mg', 'number'], ['calciumMg', 'Calcium mg', 'number'], ['fluidsOz', 'Fluids oz', 'number']]} includeNotes />;
}

function SymptomTracker({ onAdd, logs }: { onAdd: (entry: Omit<SymptomLog, 'id' | 'createdAt'>) => void; logs: SymptomLog[] }) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAdd({ dizziness: numberField(form, 'dizziness'), fatigue: numberField(form, 'fatigue'), brainFog: numberField(form, 'brainFog'), nausea: numberField(form, 'nausea'), pain: numberField(form, 'pain'), heartRate: numberField(form, 'heartRate'), standingTolerance: numberField(form, 'standingTolerance'), notes: textField(form, 'notes') });
    event.currentTarget.reset();
  };
  return (
    <section className="space-y-5">
      <Panel title="Symptom Tracker">
        <form onSubmit={submit} className="space-y-4">
          {([['dizziness', 'Dizziness'], ['fatigue', 'Fatigue'], ['brainFog', 'Brain fog'], ['nausea', 'Nausea'], ['pain', 'Pain']] as const).map(([name, label]) => <RangeField key={name} name={name} label={label} />)}
          <Input name="heartRate" label="Heart rate" type="number" />
          <Input name="standingTolerance" label="Standing tolerance minutes" type="number" />
          <TextArea name="notes" label="Notes" />
          <button className={buttonPrimary}>Save Check-in</button>
        </form>
      </Panel>
      <Panel title="Today">{logs.length === 0 ? <Empty text="No symptoms logged yet." /> : logs.map((log) => <SymptomRow key={log.id} log={log} />)}</Panel>
    </section>
  );
}

function Insights({ foods, symptoms, settings }: { foods: FoodLog[]; symptoms: SymptomLog[]; settings: Settings }) {
  const last7 = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return foods.filter((food) => new Date(food.createdAt).getTime() >= cutoff);
  }, [foods]);
  const avgSodium = last7.length ? last7.reduce((sum, food) => sum + food.sodiumMg, 0) / 7 : 0;
  const avgFluids = last7.length ? last7.reduce((sum, food) => sum + food.fluidsOz, 0) / 7 : 0;
  const recentSymptoms = symptoms.slice(0, 5);
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Metric label="7-day sodium avg" value={`${fmt(avgSodium)} mg`} />
        <Metric label="7-day fluid avg" value={`${fmt(avgFluids)} oz`} />
      </div>
      <Panel title="Pattern Notes">
        <ul className="space-y-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <li className="flex gap-2"><CheckCircle2 className="shrink-0 text-salt-700 dark:text-salt-400" size={20} aria-hidden="true" /> Sodium average is {Math.round((avgSodium / settings.sodiumGoalMg) * 100) || 0}% of your saved goal.</li>
          <li className="flex gap-2"><CheckCircle2 className="shrink-0 text-salt-700 dark:text-salt-400" size={20} aria-hidden="true" /> Fluid average is {Math.round((avgFluids / settings.fluidGoalOz) * 100) || 0}% of your saved goal.</li>
          <li className="flex gap-2"><CheckCircle2 className="shrink-0 text-salt-700 dark:text-salt-400" size={20} aria-hidden="true" /> Log symptoms alongside meals to spot timing patterns over time.</li>
        </ul>
      </Panel>
      <Panel title="Recent Symptoms">{recentSymptoms.length === 0 ? <Empty text="No symptom history yet." /> : recentSymptoms.map((log) => <SymptomRow key={log.id} log={log} />)}</Panel>
    </section>
  );
}

function HelpNow({ settings }: { settings: Settings }) {
  return (
    <section className="space-y-5">
      <div role="note" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-100"><div className="flex items-start gap-3"><XCircle className="shrink-0" aria-hidden="true" /><p className="font-bold">This app is not medical advice and does not diagnose, treat, or replace care from a clinician.</p></div></div>
      <Panel title="POTS Flare Checklist"><Checklist items={['Sit or lie down safely.', 'Elevate legs if that usually helps you.', 'Sip fluids and use your clinician-approved electrolyte or sodium plan.', 'Cool down with shade, fan, cool cloth, or lighter layers.', 'Avoid driving or standing alone until symptoms settle.', 'Contact your support person if you feel unsafe.']} /></Panel>
      <Panel title="Emergency Warning Signs"><Checklist urgent items={['Chest pain, severe shortness of breath, or fainting with injury.', 'New weakness, trouble speaking, confusion, or one-sided symptoms.', 'Heart rate or symptoms that feel dangerous or unusual for you.', 'Signs of severe dehydration or inability to keep fluids down.', 'Any symptom your doctor told you requires urgent care.']} /></Panel>
      <Panel title="Contacts"><p className="font-semibold text-slate-600 dark:text-slate-300">Emergency: {settings.emergencyContact || 'Not set'}</p><p className="mt-2 font-semibold text-slate-600 dark:text-slate-300">Doctor: {settings.doctorContact || 'Not set'}</p></Panel>
    </section>
  );
}

function SettingsPage({ settings, setSettings }: { settings: Settings; setSettings: (settings: Settings) => void }) {
  const [draft, setDraft] = useState(settings);
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setSettings({ ...defaultSettings, ...draft, sodiumGoalMg: Number(draft.sodiumGoalMg) || 0, fluidGoalOz: Number(draft.fluidGoalOz) || 0 });
  };
  return (
    <Panel title="Settings">
      <form onSubmit={save} className="space-y-4">
        <ControlledInput label="Daily sodium goal mg" value={draft.sodiumGoalMg} onChange={(value) => setDraft({ ...draft, sodiumGoalMg: Number(value) })} type="number" />
        <ControlledInput label="Daily fluid goal oz" value={draft.fluidGoalOz} onChange={(value) => setDraft({ ...draft, fluidGoalOz: Number(value) })} type="number" />
        <ControlledInput label="Emergency contact" value={draft.emergencyContact} onChange={(value) => setDraft({ ...draft, emergencyContact: value })} />
        <ControlledInput label="Doctor contact" value={draft.doctorContact} onChange={(value) => setDraft({ ...draft, doctorContact: value })} />
        <button className={buttonPrimary}>Save Settings</button>
      </form>
    </Panel>
  );
}

function EntryForm({ title, onSubmit, fields, includeNotes }: { title: string; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; fields: [string, string, string][]; includeNotes?: boolean }) {
  return <Panel title={title}><form onSubmit={onSubmit} className="space-y-4">{fields.map(([name, label, type]) => <Input key={name} name={name} label={label} type={type} />)}{includeNotes && <TextArea name="notes" label="Notes" />}<button className={buttonPrimary}>Add To Today</button></form></Panel>;
}

function NutrientGrid({ nutrients, availability }: { nutrients: Nutrients; availability?: NutrientAvailability }) {
  const nutrientRows: Array<[keyof Nutrients, string, string, number]> = [
    ['sodiumMg', 'Sodium', 'mg', nutrients.sodiumMg],
    ['potassiumMg', 'Potassium', 'mg', nutrients.potassiumMg],
    ['magnesiumMg', 'Magnesium', 'mg', nutrients.magnesiumMg],
    ['calciumMg', 'Calcium', 'mg', nutrients.calciumMg],
    ['carbohydratesG', 'Carbs', 'g', nutrients.carbohydratesG],
    ['sugarsG', 'Sugars', 'g', nutrients.sugarsG],
    ['proteinG', 'Protein', 'g', nutrients.proteinG],
    ['caffeineMg', 'Caffeine', 'mg', nutrients.caffeineMg]
  ];
  return <div className="mt-4 grid grid-cols-2 gap-3">{nutrientRows.map(([key, label, unit, value]) => { const isAvailable = availability?.[key] ?? true; const displayValue = isAvailable ? `${unit === 'g' ? value.toFixed(1) : fmt(value)} ${unit}` : 'Not listed'; return <Metric key={key} label={label} value={displayValue} muted={!isAvailable} />; })}</div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl bg-white p-4 shadow-soft transition-colors dark:bg-slate-900 dark:shadow-night"><h2 className="mb-4 text-lg font-black">{title}</h2>{children}</section>;
}

function Metric({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return <div className={`rounded-xl p-3 transition-colors ${muted ? 'bg-slate-50 dark:bg-slate-800/70' : 'bg-salt-50 dark:bg-salt-500/12'}`}><p className={`text-xs font-bold uppercase ${muted ? 'text-slate-400 dark:text-slate-500' : 'text-salt-900/70 dark:text-salt-100/75'}`}>{label}</p><p className={`mt-1 text-lg font-black ${muted ? 'text-slate-500 dark:text-slate-400' : 'text-salt-900 dark:text-salt-50'}`}>{value}</p></div>;
}

function FoodRow({ food }: { food: FoodLog }) {
  return <div className="border-b border-slate-100 py-3 last:border-0 dark:border-slate-800"><div className="flex justify-between gap-3"><p className="font-bold">{food.name}</p><p className="font-black text-salt-900 dark:text-salt-300">{fmt(food.sodiumMg)} mg</p></div><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{food.brand || food.source} · {food.fluidsOz ? `${food.fluidsOz} oz fluids` : 'no fluids'}</p></div>;
}

function SymptomRow({ log }: { log: SymptomLog }) {
  return <div className="border-b border-slate-100 py-3 last:border-0 dark:border-slate-800"><p className="font-bold">Dizziness {log.dizziness}/10 · Fatigue {log.fatigue}/10 · Brain fog {log.brainFog}/10</p><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">HR {log.heartRate || 'n/a'} · Standing {log.standingTolerance || 0} min {log.notes ? `· ${log.notes}` : ''}</p></div>;
}

function Input({ name, label, type }: { name: string; label: string; type: string }) {
  return <label className="block"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span><input name={name} type={type} inputMode={type === 'number' ? 'decimal' : undefined} min={type === 'number' ? 0 : undefined} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-salt-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label>;
}

function ControlledInput({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} type={type} inputMode={type === 'number' ? 'decimal' : undefined} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-salt-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label>;
}

function TextArea({ name, label }: { name: string; label: string }) {
  return <label className="block"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span><textarea name={name} rows={4} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-salt-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label>;
}

function RangeField({ name, label }: { name: string; label: string }) {
  return <label className="block"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span><input name={name} type="range" min="0" max="10" defaultValue="0" className="mt-2 h-8 w-full accent-salt-700 dark:accent-salt-500" /></label>;
}

function Checklist({ items, urgent = false }: { items: string[]; urgent?: boolean }) {
  return <ul className="space-y-3">{items.map((item) => <li key={item} className="flex gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{urgent ? <XCircle className="shrink-0 text-berry dark:text-rose-300" size={20} aria-hidden="true" /> : <CheckCircle2 className="shrink-0 text-salt-700 dark:text-salt-400" size={20} aria-hidden="true" />}{item}</li>)}</ul>;
}

function Empty({ text }: { text: string }) {
  return <div role="status" className="rounded-xl bg-slate-50 p-4 text-center text-sm font-bold text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">{text}</div>;
}

export default App;
