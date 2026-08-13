import type { AreaFormulaKey } from "@/lib/area-formulas";
import type { ConfigBlock } from "../CategoryBlocksEditor";
import type { ColorEntry } from "../ProductColorsEditor";

export type Mode = "edit" | "new";

/** How a product is priced. "fixed" = single price; "sqm" = price per m² with
 *  customer-entered dimensions. (Quote-only products no longer exist.) */
export type PriceKind = "fixed" | "sqm";

export type Status = "brouillon" | "publie" | "archive";

/** The five tabs the form is split across. Validation errors carry the tab they
 *  belong to so a failed save can jump straight to the offending field. */
export type TabKey = "essentiel" | "prix" | "medias" | "config" | "livraison";

/** One quality tier row: label + its €/m² rate (as a text input). */
export interface QualityTierEntry {
  key: string;
  label: string;
  pricePerSqm: string;
}

/** Standard tiers offered as one-click seeds; admin can add/remove/rename. */
export const DEFAULT_TIERS: { key: string; label: string }[] = [
  { key: "bas", label: "Économique" },
  { key: "milieu", label: "Intermédiaire" },
  { key: "haute", label: "Premium" },
];

export interface Category {
  id: string;
  name: string;
  configBlocks?: ConfigBlock[];
}

export interface Form {
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  priceKind: PriceKind;
  status: Status;
  price: string;
  purchaseCost: string;
  pricePerSqm: string;
  /** Which dimensions the customer is asked for, and how they make a surface. */
  areaFormula: AreaFormulaKey;
  qualityTiers: QualityTierEntry[];
  minWidth: string;
  minHeight: string;
  maxWidth: string;
  maxHeight: string;
  stockQty: string;
  lowStockThreshold: string;
  maxPerOrder: string;
  deliveryMetropole: string;
  deliveryOutremer: string;
  weightKg: string;
  volumeM3: string;
  freeShipping: boolean;
  seoTitle: string;
  seoDescription: string;
}

export const EMPTY: Form = {
  name: "", slug: "", sku: "", description: "", shortDescription: "",
  categoryId: "", priceKind: "fixed", status: "brouillon",
  price: "", purchaseCost: "", pricePerSqm: "", areaFormula: "width_height",
  qualityTiers: [],
  minWidth: "", minHeight: "", maxWidth: "", maxHeight: "",
  stockQty: "", lowStockThreshold: "3", maxPerOrder: "",
  deliveryMetropole: "2-3 semaines", deliveryOutremer: "8-12 semaines",
  weightKg: "", volumeM3: "", freeShipping: false,
  seoTitle: "", seoDescription: "",
};

/** Everything the tabs, the preview and the validator read from. Bundled so the
 *  media/colour/block state travels with the form fields instead of being
 *  threaded through every signature. */
export interface FormState {
  form: Form;
  images: string[];
  videos: string[];
  colors: ColorEntry[];
  blocks: ConfigBlock[];
  overrideBlocks: boolean;
  categories: Category[];
}

export const num = (s: string): number | undefined => {
  if (!s.trim()) return undefined;
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

export const cents = (c: number | null): string => (c == null ? "" : String(c / 100));

/** Whole-number field (stock, quantity caps). Blank / invalid → undefined. */
export const int = (s: string): number | undefined => {
  if (!s.trim()) return undefined;
  const n = Math.trunc(Number(s.replace(/\s/g, "")));
  return Number.isFinite(n) ? n : undefined;
};
