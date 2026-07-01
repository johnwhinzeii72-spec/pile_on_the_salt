import type { FoodLog, Settings, SymptomLog } from './types';

const FOOD_KEY = 'pile-on-the-salt.foodLogs.v1';
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
export const loadSymptomLogs = () => readJson<SymptomLog[]>(SYMPTOM_KEY, []);
export const saveSymptomLogs = (logs: SymptomLog[]) => writeJson(SYMPTOM_KEY, logs);
export const loadSettings = () => readJson<Settings>(SETTINGS_KEY, defaultSettings);
export const saveSettings = (settings: Settings) => writeJson(SETTINGS_KEY, settings);

export function isToday(isoDate: string) {
  const value = new Date(isoDate);
  const now = new Date();
  return value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth() && value.getDate() === now.getDate();
}
