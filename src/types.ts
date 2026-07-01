export type PageId = 'dashboard' | 'scanner' | 'manual' | 'saved' | 'symptoms' | 'insights' | 'help' | 'community' | 'settings';

export type FoodCategory = 'produce' | 'fruit' | 'vegetable' | 'homemade' | 'restaurant' | 'custom' | 'packaged';

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
  category?: FoodCategory;
  fluidsOz: number;
  notes?: string;
  source: 'scanner' | 'manual' | 'saved';
  barcode?: string;
  multiplier: number;
  createdAt: string;
};

export type SavedFood = Nutrients & {
  id: string;
  name: string;
  brand?: string;
  servingSize?: string;
  category?: FoodCategory;
  fluidsOz: number;
  notes?: string;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
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

export type NutrientAvailability = Partial<Record<keyof Nutrients, boolean>>;

export type ProductNutrition = Nutrients & {
  barcode: string;
  name: string;
  brand?: string;
  servingSize?: string;
  availableNutrients: NutrientAvailability;
};

export type ChatRoom = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  body: string;
  created_at: string;
};

export type MemberProfile = {
  id: string;
  username: string | null;
  created_at?: string;
};
