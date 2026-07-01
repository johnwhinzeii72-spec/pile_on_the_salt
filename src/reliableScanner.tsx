import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { AlertCircle, Camera, CheckCircle2, Loader2, Search } from 'lucide-react';
import { fetchProduct } from './openFoodFacts';
import type { FoodCategory, FoodLog, NutrientAvailability, Nutrients, ProductNutrition } from './types';

type ScannerStatus = 'idle' | 'permission' | 'scanning' | 'loading' | 'found' | 'not-found' | 'api-error' | 'camera-error';
type ScannerControls = { stop: () => void };

type ReliableScannerProps = {
  onAdd: (entry: Omit<FoodLog, 'id' | 'createdAt'>, saveToFavorites?: boolean) => void;
  onManual: () => void;
  onSaveFood: (food: Omit<FoodLog, 'id' | 'createdAt'>) => void;
};

const emptyNutrients: Nutrients = { sodiumMg: 0, potassiumMg: 0, magnesiumMg: 0, calciumMg: 0, carbohydratesG: 0, sugarsG: 0, proteinG: 0, caffeineMg: 0 };
const multipliers = [0.5, 1, 1.5, 2];
const buttonPrimary = 'min-h-12 rounded-xl bg-salt-700 px-4 py-3 font-bold text-white shadow-soft transition active:scale-[0.99] disabled:bg-slate-300 disabled:shadow-none dark:bg-salt-500 dark:text-slate-950 dark:disabled:bg-slate-700 dark:disabled:text-slate-400';
const buttonSecondary = 'min-h-12 rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 shadow-sm transition active:scale-[0.99] disabled:text-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:disabled:text-slate-600';
const inputClass = 'mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-salt-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500';

const fmt = (value: number) => Math.round(value).toLocaleString();

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

function normalizeBarcode(value: string) {
  return value.trim().replace(/^0+(\d{12})$/, '$1');
}

function ReliableScanner({ onAdd, onManual, onSaveFood }: ReliableScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const processingRef = useRef(false);
  const lastScanRef = useRef({ code: '', at: 0 });
  const [status, setStatus] = useState('Ready. Tap Start Scanner, allow camera access, and line up the UPC inside the guide.');
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('idle');
  const [product, setProduct] = useState<ProductNutrition | null>(null);
  const [barcode, setBarcode] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [multiplier, setMultiplier] = useState(1);

  const scanning = scannerStatus === 'permission' || scannerStatus === 'scanning';
  const loading = scannerStatus === 'loading';
  const scaled = useMemo(() => product ? applyMultiplier(product, multiplier) : null, [product, multiplier]);
  const productLog = product && scaled ? { ...scaled, name: product.name, brand: product.brand, servingSize: product.servingSize, category: 'packaged' as FoodCategory, fluidsOz: 0, source: 'scanner' as const, barcode: product.barcode, multiplier } : null;

  const releaseCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const stopScanner = () => {
    releaseCamera();
    setScannerStatus((state) => state === 'permission' || state === 'scanning' ? 'idle' : state);
    setStatus('Scanner stopped. Tap Start Scanner to try again.');
  };

  const lookupBarcode = async (value: string) => {
    const cleanBarcode = normalizeBarcode(value);
    if (!cleanBarcode || processingRef.current) return;
    processingRef.current = true;
    setBarcode(cleanBarcode);
    setProduct(null);
    setMultiplier(1);
    setScannerStatus('loading');
    setStatus(`Looking up ${cleanBarcode}...`);
    try {
      const found = await fetchProduct(cleanBarcode);
      if (found) {
        setProduct(found);
        setScannerStatus('found');
        setStatus('Product found. Review the nutrients, adjust serving size, then add it to today.');
      } else {
        setScannerStatus('not-found');
        setStatus('Product not found in Open Food Facts. You can scan again or enter nutrition manually.');
      }
    } catch {
      setScannerStatus('api-error');
      setStatus('Open Food Facts lookup failed. Check your connection or enter nutrition manually.');
    } finally {
      processingRef.current = false;
    }
  };

  const handleScan = async (rawValue: string) => {
    const cleanBarcode = normalizeBarcode(rawValue);
    const now = Date.now();
    if (!cleanBarcode || processingRef.current) return;
    if (lastScanRef.current.code === cleanBarcode && now - lastScanRef.current.at < 2500) return;
    lastScanRef.current = { code: cleanBarcode, at: now };
    setStatus('Barcode captured. Stopping camera and looking up product...');
    releaseCamera();
    await lookupBarcode(cleanBarcode);
  };

  const startScanner = async () => {
    releaseCamera();
    setProduct(null);
    setBarcode('');
    setMultiplier(1);
    processingRef.current = false;
    if (!window.isSecureContext) {
      setScannerStatus('camera-error');
      setStatus('Camera scanning requires HTTPS. On iPhone Safari, open the Vercel HTTPS site or installed PWA.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerStatus('camera-error');
      setStatus('This browser does not expose camera access to web apps. Use manual barcode entry instead.');
      return;
    }
    setScannerStatus('permission');
    setStatus('Requesting camera permission. Choose Allow, then hold the barcode flat inside the guide.');
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        videoRef.current ?? undefined,
        (result) => {
          if (result) void handleScan(result.getText());
        }
      );
      controlsRef.current = controls;
      setScannerStatus('scanning');
      setStatus('Scanner active. This is a live camera preview only; no video is saved or uploaded.');
    } catch {
      releaseCamera();
      setScannerStatus('camera-error');
      setStatus('Camera start failed. Make sure Safari camera permission is allowed, then try Scan Again or use manual barcode entry.');
    }
  };

  useEffect(() => () => releaseCamera(), []);

  const submitManualBarcode = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    releaseCamera();
    void lookupBarcode(manualBarcode);
  };

  return <section className="space-y-5"><Panel title="Barcode Scanner"><div className="rounded-xl border border-salt-100 bg-salt-50 p-3 text-sm font-semibold text-salt-900 dark:border-salt-500/20 dark:bg-salt-500/10 dark:text-salt-100">This scanner uses a live camera preview to read UPC, EAN, and Code128 barcodes. It does not record or upload video.</div><div className="relative mt-4 overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-200 dark:ring-slate-700"><video ref={videoRef} muted playsInline autoPlay className="aspect-[4/3] w-full object-cover" aria-label="Live barcode scanner camera preview" /><div className="pointer-events-none absolute inset-x-8 top-1/2 h-28 -translate-y-1/2 rounded-2xl border-2 border-white/85 shadow-[0_0_0_999px_rgba(2,6,23,0.32)]" /><div className="pointer-events-none absolute inset-x-10 top-1/2 h-0.5 -translate-y-1/2 bg-salt-300/95" /></div><ScannerMessage state={scannerStatus} status={status} /><div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={() => void startScanner()} disabled={scanning || loading} className={buttonPrimary}>{scannerStatus === 'found' || scannerStatus === 'not-found' || scannerStatus === 'api-error' || scannerStatus === 'camera-error' ? 'Scan Again' : 'Start Scanner'}</button><button type="button" onClick={stopScanner} disabled={!scanning} className={buttonSecondary}>Stop Scanner</button></div><form onSubmit={submitManualBarcode} className="mt-4 grid grid-cols-[1fr_auto] gap-2" aria-label="Manual barcode lookup"><input value={manualBarcode} onChange={(event) => setManualBarcode(event.target.value)} inputMode="numeric" autoComplete="off" aria-label="Barcode number" placeholder="Enter barcode" className={inputClass} /><button type="submit" disabled={loading || !manualBarcode.trim()} className="grid h-12 w-12 place-items-center rounded-xl bg-slate-900 text-white transition active:scale-95 disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-950 dark:disabled:bg-slate-700" aria-label="Look up barcode">{loading ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <Search size={20} aria-hidden="true" />}</button></form><button type="button" onClick={onManual} className="mt-3 w-full min-h-12 rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700 transition active:scale-[0.99] dark:bg-slate-800 dark:text-slate-100">Manual nutrition entry</button></Panel>{(scannerStatus === 'not-found' || scannerStatus === 'api-error' || scannerStatus === 'camera-error') && <Panel title={scannerStatus === 'not-found' ? 'Product Not Found' : scannerStatus === 'api-error' ? 'Lookup Error' : 'Camera Help'}><p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{scannerStatus === 'not-found' ? `${barcode || 'That barcode'} was not found in Open Food Facts.` : scannerStatus === 'api-error' ? 'Open Food Facts could not be reached or returned an error.' : 'On iPhone Safari, the scanner must run on HTTPS and camera permission must be allowed.'}</p><div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={() => void startScanner()} className={buttonPrimary}>Scan Again</button><button type="button" onClick={onManual} className={buttonSecondary}>Manual Entry</button></div></Panel>}{product && scaled && productLog && <Panel title="Product Details"><div className="space-y-1"><h2 className="text-xl font-black">{product.name}</h2><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{product.brand || 'Brand unavailable'} · {product.servingSize || 'Serving size unavailable'}</p><p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Barcode {product.barcode}</p></div><div className="mt-4 flex gap-2">{multipliers.map((value) => <button key={value} type="button" onClick={() => setMultiplier(value)} aria-pressed={multiplier === value} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold transition active:scale-95 ${multiplier === value ? 'bg-salt-700 text-white dark:bg-salt-500 dark:text-slate-950' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{value}x</button>)}</div><NutrientGrid nutrients={scaled} availability={product.availableNutrients} /><div className="mt-4 grid gap-3 sm:grid-cols-3"><button type="button" onClick={() => onAdd(productLog)} className="min-h-12 rounded-xl bg-berry px-4 py-3 font-bold text-white shadow-soft transition active:scale-[0.99]">Add To Today</button><button type="button" onClick={() => onSaveFood(productLog)} className={buttonSecondary}>Save Food</button><button type="button" onClick={() => void startScanner()} className={buttonSecondary}>Scan Again</button></div></Panel>}</section>;
}

function ScannerMessage({ state, status }: { state: ScannerStatus; status: string }) {
  const isError = state === 'api-error' || state === 'camera-error' || state === 'not-found';
  const isLoading = state === 'loading' || state === 'permission';
  return <div role={isError ? 'alert' : 'status'} className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-sm font-semibold ${isError ? 'bg-rose-50 text-rose-950 dark:bg-rose-500/15 dark:text-rose-100' : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{isLoading ? <Loader2 className="mt-0.5 shrink-0 animate-spin" size={18} aria-hidden="true" /> : isError ? <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" /> : state === 'found' ? <CheckCircle2 className="mt-0.5 shrink-0 text-salt-700 dark:text-salt-400" size={18} aria-hidden="true" /> : <Camera className="mt-0.5 shrink-0 text-salt-700 dark:text-salt-400" size={18} aria-hidden="true" />}<p>{status}</p></div>;
}

function NutrientGrid({ nutrients, availability }: { nutrients: Nutrients; availability?: NutrientAvailability }) {
  const nutrientRows: Array<[keyof Nutrients, string, string, number]> = [['sodiumMg', 'Sodium', 'mg', nutrients.sodiumMg], ['potassiumMg', 'Potassium', 'mg', nutrients.potassiumMg], ['magnesiumMg', 'Magnesium', 'mg', nutrients.magnesiumMg], ['calciumMg', 'Calcium', 'mg', nutrients.calciumMg], ['carbohydratesG', 'Carbs', 'g', nutrients.carbohydratesG], ['sugarsG', 'Sugars', 'g', nutrients.sugarsG], ['proteinG', 'Protein', 'g', nutrients.proteinG], ['caffeineMg', 'Caffeine', 'mg', nutrients.caffeineMg]];
  return <div className="mt-4 grid grid-cols-2 gap-3">{nutrientRows.map(([key, label, unit, value]) => { const isAvailable = availability?.[key] ?? true; const displayValue = isAvailable ? `${unit === 'g' ? value.toFixed(1) : fmt(value)} ${unit}` : 'Not listed'; return <Metric key={key} label={label} value={displayValue} muted={!isAvailable} />; })}</div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl bg-white p-4 shadow-soft transition-colors dark:bg-slate-900 dark:shadow-night"><h2 className="mb-4 text-lg font-black">{title}</h2>{children}</section>;
}

function Metric({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return <div className={`rounded-xl p-3 transition-colors ${muted ? 'bg-slate-50 dark:bg-slate-800/70' : 'bg-salt-50 dark:bg-salt-500/12'}`}><p className={`text-xs font-bold uppercase ${muted ? 'text-slate-400 dark:text-slate-500' : 'text-salt-900/70 dark:text-salt-100/75'}`}>{label}</p><p className={`mt-1 text-lg font-black ${muted ? 'text-slate-500 dark:text-slate-400' : 'text-salt-900 dark:text-salt-50'}`}>{value}</p></div>;
}

export default ReliableScanner;
