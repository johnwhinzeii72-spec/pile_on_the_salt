import type { FoodLog, SavedFood, Settings, SymptomLog } from './types';

const FOOD_KEY = 'pile-on-the-salt.foodLogs.v1';
const SAVED_FOOD_KEY = 'pile-on-the-salt.savedFoods.v1';
const SYMPTOM_KEY = 'pile-on-the-salt.symptomLogs.v1';
const SETTINGS_KEY = 'pile-on-the-salt.settings.v1';

export const defaultSettings: Settings = {
  sodiumGoalMg: 4500,
  fluidGoalOz: 96,
  emergencyContact: '',
  doctorContact: ''
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const loadFoodLogs = () => readJson<FoodLog[]>(FOOD_KEY, []);
export const saveFoodLogs = (logs: FoodLog[]) => writeJson(FOOD_KEY, logs);
export const loadSavedFoods = () => readJson<SavedFood[]>(SAVED_FOOD_KEY, []);
export const saveSavedFoods = (foods: SavedFood[]) => writeJson(SAVED_FOOD_KEY, foods);
export const loadSymptomLogs = () => readJson<SymptomLog[]>(SYMPTOM_KEY, []);
export const saveSymptomLogs = (logs: SymptomLog[]) => writeJson(SYMPTOM_KEY, logs);
export const loadSettings = () => readJson<Settings>(SETTINGS_KEY, defaultSettings);
export const saveSettings = (settings: Settings) => writeJson(SETTINGS_KEY, settings);

export function isToday(isoDate: string) {
  return isSameDate(isoDate, new Date().toISOString());
}

export function dateKey(isoDate: string) {
  return new Date(isoDate).toISOString().slice(0, 10);
}

export function isSameDate(leftIso: string, rightIso: string) {
  const left = new Date(leftIso);
  const right = new Date(rightIso);
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}
