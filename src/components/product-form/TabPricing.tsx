"use client";

import { Boxes, Euro, Layers, Ruler, Trash2, Plus } from "lucide-react";
import { SectionHead, Callout } from "./SectionHead";
import { TextField, fieldClass } from "./Field";
import { AreaFormulaPicker } from "./AreaFormulaPicker";
import {
  DEFAULT_TIERS,
  int,
  type Form,
  type PriceKind,
  type QualityTierEntry,
} from "./types";
import type { AreaFormulaKey } from "@/lib/area-formulas";

const MODES: {
  key: PriceKind;
  title: string;
  hint: string;
  bullets: string[];
}[] = [
  {
    key: "fixed",
    title: "Prix fixe",
    hint: "Un article vendu à l'unité, à un prix unique.",
    bullets: ["Sélecteur de quantité − / +", "Stock suivi", "Ajout direct au panier"],
  },
  {
    key: "sqm",
    title: "Au m²",
    hint: "Fabriqué sur mesure : le client saisit ses dimensions.",
    bullets: ["Prix calculé (m² × tarif)", "Gammes de qualité", "Configuration guidée"],
  },
];

export function TabPricing({
  form,
  patch,
  errors,
  onPriceKindChange,
  setupIssue,
}: {
  form: Form;
  patch: (p: Partial<Form>) => void;
  errors: Record<string, string>;
  onPriceKindChange: (kind: PriceKind) => void;
  /** What "le client choisit la forme" still needs, if anything. */
  setupIssue?: string | null;
}) {
  const tiers = form.qualityTiers;

  function patchTier(index: number, p: Partial<QualityTierEntry>) {
    patch({ qualityTiers: tiers.map((t, i) => (i === index ? { ...t, ...p } : t)) });
  }
  function removeTier(index: number) {
    patch({ qualityTiers: tiers.filter((_, i) => i !== index) });
  }
  function addTier(seed?: { key: string; label: string }) {
    const key = seed?.key ?? `tier_${tiers.length + 1}_${Math.random().toString(36).slice(2, 6)}`;
    if (tiers.some((t) => t.key === key)) return;
    patch({ qualityTiers: [...tiers, { key, label: seed?.label ?? "", pricePerSqm: "" }] });
  }

  return (
    <div className="stack">
      {/* The decision that reshapes the rest of the form — so it comes first,
          full width, and states what the customer will actually get. */}
      <div className="card card-padded">
        <SectionHead
          icon={Euro}
          tone="bronze"
          title="Comment ce produit est-il vendu ?"
          hint="Ce choix décide du reste de la fiche et du parcours d'achat dans l'application."
        />
        <div className="choice-grid" role="radiogroup" aria-label="Mode de tarification">
          {MODES.map((m) => {
            const active = form.priceKind === m.key;
            return (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={active}
                className={`choice-card${active ? " active" : ""}`}
                onClick={() => onPriceKindChange(m.key)}
              >
                <span className="cc-title">
                  {m.key === "fixed" ? <Boxes size={16} strokeWidth={1.8} /> : <Ruler size={16} strokeWidth={1.8} />}
                  {m.title}
                </span>
                <span className="cc-hint">{m.hint}</span>
                <ul className="cc-list">
                  {m.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {form.priceKind === "fixed" ? (
        <>
          <div className="card card-padded">
            <SectionHead icon={Euro} tone="bronze" title="Prix" />
            <div className="field-grid cols-2">
              <TextField
                id="price"
                label="Prix de vente HT"
                required
                unit="€"
                inputMode="decimal"
                value={form.price}
                error={errors.price}
                placeholder="0"
                hint="Hors taxes. La TVA est ajoutée à la commande selon la zone de livraison."
                onChange={(price) => patch({ price })}
              />
              <TextField
                id="purchaseCost"
                label="Coût d'achat"
                unit="€"
                inputMode="decimal"
                value={form.purchaseCost}
                hint="Sert au calcul de la marge, jamais affiché au client."
                onChange={(purchaseCost) => patch({ purchaseCost })}
              />
            </div>
          </div>

          <div className="card card-padded">
            <SectionHead
              icon={Boxes}
              tone="success"
              title="Vente à l'unité"
              hint="Le client choisit une quantité avec − / + puis ajoute au panier. Renseignez le stock pour que le sélecteur s'arrête à ce qui reste disponible."
            />
            <div className="field-grid cols-3">
              <TextField
                id="stockQty"
                label="Stock disponible"
                inputMode="numeric"
                value={form.stockQty}
                error={errors.stockQty}
                placeholder="Illimité"
                hint="Vide = stock non suivi"
                onChange={(stockQty) => patch({ stockQty })}
              />
              <TextField
                id="lowStockThreshold"
                label="Seuil stock faible"
                inputMode="numeric"
                value={form.lowStockThreshold}
                placeholder="3"
                hint="En dessous, l'app affiche l'alerte"
                onChange={(lowStockThreshold) => patch({ lowStockThreshold })}
              />
              <TextField
                id="maxPerOrder"
                label="Max par commande"
                inputMode="numeric"
                value={form.maxPerOrder}
                error={errors.maxPerOrder}
                placeholder="Aucune limite"
                hint="Plafond du sélecteur"
                onChange={(maxPerOrder) => patch({ maxPerOrder })}
              />
            </div>
            <div style={{ marginTop: 18 }}>
              <StockOutcome stockQty={form.stockQty} maxPerOrder={form.maxPerOrder} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card card-padded">
            <SectionHead icon={Euro} tone="bronze" title="Tarif au m²" />
            <div className="field-grid cols-2">
              <TextField
                id="pricePerSqm"
                label="Prix au m² HT"
                required={tiers.length === 0}
                unit="€"
                inputMode="decimal"
                value={form.pricePerSqm}
                error={errors.pricePerSqm}
                disabled={tiers.length > 0}
                placeholder="0"
                hint={
                  tiers.length > 0
                    ? "Ignoré : le prix vient des gammes ci-dessous."
                    : undefined
                }
                onChange={(pricePerSqm) => patch({ pricePerSqm })}
              />
              <TextField
                id="purchaseCost"
                label="Coût d'achat"
                unit="€"
                inputMode="decimal"
                value={form.purchaseCost}
                hint="Sert au calcul de la marge, jamais affiché au client."
                onChange={(purchaseCost) => patch({ purchaseCost })}
              />
            </div>
          </div>

          <div className="card card-padded">
            <SectionHead
              icon={Ruler}
              tone="navy"
              title="Formule de calcul"
              hint="Décide des mesures demandées au client et de la surface facturée. Le serveur applique exactement la même formule."
            />
            <AreaFormulaPicker
              value={form.areaFormula}
              onChange={(areaFormula: AreaFormulaKey) => patch({ areaFormula })}
            />
            {setupIssue && (
              <div style={{ marginTop: 12 }}>
                <Callout kind="warn">
                  <strong>Configuration incomplète.</strong> {setupIssue} Le produit reste
                  enregistrable en brouillon, mais pas publiable.
                </Callout>
              </div>
            )}
          </div>

          <div className="card card-padded">
            <SectionHead
              icon={Layers}
              tone="bronze"
              title="Gammes de qualité"
              hint="Proposez plusieurs qualités, chacune avec son prix au m². Le client choisit sa gamme et le prix s'ajuste. Laissez vide pour un tarif unique."
            />

            {tiers.length > 0 && (
              <div className="repeater" style={{ marginBottom: 12 }}>
                <div className="repeater-head">
                  <span style={{ flex: 1 }}>Nom de la gamme</span>
                  <span style={{ width: 130 }}>Prix au m² HT</span>
                  <span style={{ width: 32 }} />
                </div>
                {tiers.map((tier, i) => (
                  <div key={tier.key} className="repeater-row">
                    <input
                      id={`tier-label-${i}`}
                      className={fieldClass("input", errors[`tier-label-${i}`])}
                      style={{ flex: 1 }}
                      aria-label={`Nom de la gamme ${i + 1}`}
                      placeholder="ex. Premium"
                      value={tier.label}
                      onChange={(e) => patchTier(i, { label: e.target.value })}
                    />
                    <span className="input-affix" style={{ width: 130, flexShrink: 0 }}>
                      <input
                        id={`tier-rate-${i}`}
                        className={fieldClass("input", errors[`tier-rate-${i}`])}
                        inputMode="decimal"
                        aria-label={`Prix au m² de la gamme ${i + 1}`}
                        placeholder="0"
                        value={tier.pricePerSqm}
                        onChange={(e) => patchTier(i, { pricePerSqm: e.target.value })}
                      />
                      <span className="affix">€/m²</span>
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ width: 32, height: 32, borderRadius: 8, color: "var(--error)", flexShrink: 0 }}
                      aria-label={`Retirer la gamme ${i + 1}`}
                      onClick={() => removeTier(i)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {Object.keys(errors).some((k) => k.startsWith("tier-")) && (
              <div style={{ marginBottom: 12 }}>
                <Callout kind="danger">
                  Une gamme incomplète n&apos;est pas enregistrée. Complétez le nom et le prix, ou
                  supprimez la ligne.
                </Callout>
              </div>
            )}

            <div className="chips">
              {DEFAULT_TIERS.filter((d) => !tiers.some((t) => t.key === d.key)).map((d) => (
                <button key={d.key} type="button" className="chip" onClick={() => addTier(d)}>
                  <Plus size={13} /> {d.label}
                </button>
              ))}
              <button type="button" className="chip" onClick={() => addTier()}>
                <Plus size={13} /> Gamme personnalisée
              </button>
            </div>
          </div>

          <div className="card card-padded">
            <SectionHead
              icon={Ruler}
              tone="warn"
              title="Bornes de saisie"
              hint="Limites acceptées dans l'application. Laissez vide pour ne pas borner."
            />
            <div style={{ marginBottom: 16 }}>
              <Callout kind="info">
                La borne de <strong>largeur</strong> s&apos;applique à <strong>toutes</strong> les
                mesures horizontales (largeur, longueur, gauche, fond, droite) ; celle de{" "}
                <strong>hauteur</strong> à la mesure verticale.
              </Callout>
            </div>
            <div className="field-grid cols-2">
              <TextField
                id="minWidth"
                label="Largeur min"
                unit="cm"
                inputMode="decimal"
                value={form.minWidth}
                onChange={(minWidth) => patch({ minWidth })}
              />
              <TextField
                id="maxWidth"
                label="Largeur max"
                unit="cm"
                inputMode="decimal"
                value={form.maxWidth}
                error={errors.maxWidth}
                onChange={(maxWidth) => patch({ maxWidth })}
              />
              <TextField
                id="minHeight"
                label="Hauteur min"
                unit="cm"
                inputMode="decimal"
                value={form.minHeight}
                onChange={(minHeight) => patch({ minHeight })}
              />
              <TextField
                id="maxHeight"
                label="Hauteur max"
                unit="cm"
                inputMode="decimal"
                value={form.maxHeight}
                error={errors.maxHeight}
                onChange={(maxHeight) => patch({ maxHeight })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Plain-language statement of what the quantity stepper will do. */
function StockOutcome({ stockQty, maxPerOrder }: { stockQty: string; maxPerOrder: string }) {
  const stock = int(stockQty);
  const cap = int(maxPerOrder);

  if (stock != null && stock <= 0) {
    return (
      <Callout kind="warn">
        Stock épuisé : l&apos;app affiche « Rupture de stock » et le bouton Ajouter au panier est
        désactivé.
      </Callout>
    );
  }
  const limit = Math.min(stock ?? Infinity, cap ?? Infinity);
  return (
    <Callout kind="success">
      {Number.isFinite(limit)
        ? `Le client pourra choisir de 1 à ${limit} unité${limit > 1 ? "s" : ""}.`
        : "Le client pourra choisir de 1 à 99 unités (aucune limite fixée)."}
    </Callout>
  );
}
