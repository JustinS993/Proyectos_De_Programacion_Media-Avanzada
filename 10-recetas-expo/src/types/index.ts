export interface Recipe {
  id: number;
  title: string;
  image: string;
  imageType?: string;
  readyInMinutes?: number;
  servings?: number;
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  veryHealthy?: boolean;
  cheap?: boolean;
  veryPopular?: boolean;
  sustainable?: boolean;
  lowFodmap?: boolean;
  weightWatcherSmartPoints?: number;
  gaps?: string;
  preparationMinutes?: number;
  cookingMinutes?: number;
  aggregateLikes?: number;
  healthScore?: number;
  creditsText?: string;
  sourceName?: string;
  pricePerServing?: number;
  extendedIngredients?: ExtendedIngredient[];
  summary?: string;
  instructions?: string;
  analyzedInstructions?: AnalyzedInstruction[];
}

export interface ExtendedIngredient {
  id: number;
  aisle?: string;
  image?: string;
  consistency?: string;
  name: string;
  nameClean?: string;
  original: string;
  originalName?: string;
  amount: number;
  unit: string;
  meta?: string[];
  measures?: Measures;
}

export interface Measures {
  us?: Measure;
  metric?: Measure;
}

export interface Measure {
  amount: number;
  unitShort: string;
  unitLong: string;
}

export interface AnalyzedInstruction {
  name?: string;
  steps?: Step[];
}

export interface Step {
  number: number;
  step: string;
  ingredients?: Ent[];
  equipment?: Ent[];
  length?: Length;
}

export interface Ent {
  id: number;
  name: string;
  localizedName?: string;
  image?: string;
}

export interface Length {
  number: number;
  unit: string;
}

export interface DietFilter {
  id: string;
  name: string;
  icon: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
}
