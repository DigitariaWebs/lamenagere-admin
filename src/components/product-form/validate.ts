import { type FormState, num, int, type TabKey } from "./types";

/**
 * One problem to fix, tied to the tab that holds it so a failed save can switch
 * tabs and focus the field instead of firing a vague toast from the top of a
 * page the admin isn't looking at.
 *
 * `field` doubles as the DOM id of the control to focus (see `Field.tsx`).
 */
export interface FieldError {
  field: string;
  tab: TabKey;
  message: string;
}

/**
 * What "Le client choisit la forme" needs in order to price at all: a Forme
 * block to pick from, one measurement tagged as the first pan, and one tagged
 * as the height. Missing any of them, `dimensionsFromShape` returns a surface
 * of zero and checkout refuses the order.
 *
 * Returns the sentence to show the admin, or null when the setup is sound.
 */
export function byShapeSetupIssue(state: FormState): string | null {
  const { form, blocks, overrideBlocks, categories } = state;
  if (form.priceKind !== "sqm" || form.areaFormula !== "by_shape") return null;

  const effective = overrideBlocks
    ? blocks
    : (categories.find((c) => c.id === form.categoryId)?.configBlocks ?? []);
  // Nothing to judge yet: no category chosen means no template to inherit.
  if (!overrideBlocks && !form.categoryId) return null;

  const missing: string[] = [];
  if (!effective.some((b) => b.type === "shape" && (b.options ?? []).length > 0)) {
    missing.push("un bloc « Forme » avec au moins une forme cochée");
  }
  const fields = effective
    .filter((b) => b.type === "measurements")
    .flatMap((b) => b.fields ?? []);
  if (!fields.some((f) => f.priceRole === "run1")) {
    missing.push("une mesure taguée « Pan 1 »");
  }
  if (!fields.some((f) => f.priceRole === "height")) {
    missing.push("une mesure taguée « Hauteur »");
  }
  if (!missing.length) return null;
  return `Il manque ${missing.join(", ")}. Sans cela la surface vaut zéro et le client ne pourra pas commander.`;
}

/**
 * Rows that used to be dropped in silence at save time (a tier without a rate,
 * a colour without a name) are reported here instead — the admin typed them, so
 * losing them without a word is worse than refusing to save.
 */
export function validate(state: FormState): FieldError[] {
  const { form, colors } = state;
  const errors: FieldError[] = [];

  if (!form.name.trim()) {
    errors.push({ field: "name", tab: "essentiel", message: "Le nom du produit est requis." });
  }
  if (!form.categoryId) {
    errors.push({ field: "categoryId", tab: "essentiel", message: "Choisissez une catégorie." });
  }

  if (form.priceKind === "fixed") {
    const price = num(form.price);
    if (price == null) {
      errors.push({ field: "price", tab: "prix", message: "Indiquez le prix de vente." });
    } else if (price <= 0) {
      errors.push({ field: "price", tab: "prix", message: "Le prix doit être supérieur à 0 €." });
    }
  } else {
    const validTiers = form.qualityTiers.filter(
      (t) => t.label.trim() && num(t.pricePerSqm) != null,
    );
    const rate = num(form.pricePerSqm);
    if (validTiers.length === 0) {
      if (rate == null) {
        errors.push({
          field: "pricePerSqm",
          tab: "prix",
          message: "Indiquez un prix au m², ou créez au moins une gamme.",
        });
      } else if (rate <= 0) {
        errors.push({
          field: "pricePerSqm",
          tab: "prix",
          message: "Le prix au m² doit être supérieur à 0 €.",
        });
      }
    }

    // A half-filled tier row is almost always an oversight, not an intent to
    // delete it — say so rather than discarding it at save time.
    form.qualityTiers.forEach((tier, i) => {
      const hasLabel = !!tier.label.trim();
      const hasRate = num(tier.pricePerSqm) != null;
      if (!hasLabel && !hasRate) {
        errors.push({
          field: `tier-label-${i}`,
          tab: "prix",
          message: `Gamme ${i + 1} : remplissez le nom et le prix, ou supprimez la ligne.`,
        });
      } else if (!hasLabel) {
        errors.push({
          field: `tier-label-${i}`,
          tab: "prix",
          message: `Gamme ${i + 1} : nom manquant.`,
        });
      } else if (!hasRate) {
        errors.push({
          field: `tier-rate-${i}`,
          tab: "prix",
          message: `« ${tier.label.trim()} » : prix au m² manquant.`,
        });
      }
    });

    // A broken by_shape setup can be saved as a draft, but never published:
    // a published product must be orderable.
    if (form.status === "publie" && byShapeSetupIssue(state)) {
      errors.push({
        field: "areaFormula",
        tab: "prix",
        message: byShapeSetupIssue(state)!,
      });
    }

    const minW = num(form.minWidth);
    const maxW = num(form.maxWidth);
    if (minW != null && maxW != null && maxW < minW) {
      errors.push({
        field: "maxWidth",
        tab: "prix",
        message: "La largeur maximale doit être supérieure à la minimale.",
      });
    }
    const minH = num(form.minHeight);
    const maxH = num(form.maxHeight);
    if (minH != null && maxH != null && maxH < minH) {
      errors.push({
        field: "maxHeight",
        tab: "prix",
        message: "La hauteur maximale doit être supérieure à la minimale.",
      });
    }
  }

  if (form.priceKind === "fixed") {
    const stock = int(form.stockQty);
    if (stock != null && stock < 0) {
      errors.push({ field: "stockQty", tab: "prix", message: "Le stock ne peut pas être négatif." });
    }
    const cap = int(form.maxPerOrder);
    if (cap != null && cap <= 0) {
      errors.push({
        field: "maxPerOrder",
        tab: "prix",
        message: "Le plafond par commande doit valoir au moins 1.",
      });
    }
  }

  colors.forEach((c, i) => {
    if (!c.name.trim() && (c.images.length > 0 || c.key.trim())) {
      errors.push({
        field: `color-name-${i}`,
        tab: "medias",
        message: `Couleur ${i + 1} : donnez-lui un nom, sinon elle ne sera pas enregistrée.`,
      });
    }
  });

  return errors;
}

/** Errors of one tab, for the coloured dot and the per-field lookup. */
export function errorsByTab(errors: FieldError[]): Record<TabKey, number> {
  const counts: Record<TabKey, number> = {
    essentiel: 0,
    prix: 0,
    medias: 0,
    config: 0,
    livraison: 0,
  };
  for (const e of errors) counts[e.tab] += 1;
  return counts;
}

/** `field id → message`, so a control can look up its own error in O(1). */
export function errorMap(errors: FieldError[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const e of errors) if (!map[e.field]) map[e.field] = e.message;
  return map;
}
