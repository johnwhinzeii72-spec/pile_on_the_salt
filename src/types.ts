export type PageId = 'dashboard' | 'scanner' | 'manual' | 'symptoms' | 'insights' | 'help' | 'settings';

export type Nutrients = {
  sodiumMg: number;
  potassiumMg: number;
  magnesiumMg: number;
  calciumMg: number;
  carbohydratesG: number;
  sugarsG: number;
  proteinG: number;
  caffeineMg: number;
};

export type FoodLog = Nutrients & {
  id: string;
  name: string;
  brand?: string;
  servingSize?: string;
  fluidsOz: number;
  notes?: string;
  source: 'scanner' | 'manual';
  barcode?: string;
  multiplier: number;
  createdAt: string;
};

export type SymptomLog = {
  id: string;
  dizziness: number;
  fatigue: number;
  brainFog: number;
  nausea: number;
  pain: number;
  heartRate: number;
  standingTolerance: number;
  notes: string;
  createdAt: string;
};

export type Settings = {
  sodiumGoalMg: number;
  fluidGoalOz: number;
  emergencyContact: string;
  doctorContact: string;
};

export type ProductNutrition = Nutrients & {
  barcode: string;
  name: string;
  brand?: string;
  servingSize?: string;
};
