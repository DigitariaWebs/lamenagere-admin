"use client";

import { ImageOff, Eye, AlertTriangle } from "lucide-react";
import { areaFormula } from "@/lib/area-formulas";
import { formatEUR } from "@/lib/format";
import { BLOCK_META, type ConfigBlock } from "../CategoryBlocksEditor";
import { int, num, type FormState } from "./types";

const STATUS_PILL: Record<string, string> = {
  publie: "pill-success-soft",
  brouillon: "pill-warning-soft",
  archive: "pill-outline",
};
const STATUS_LABEL: Record<string, string> = {
  publie: "Publié",
  brouillon: "Brouillon",
  archive: "Archivé",
};

interface Step {
  title: string;
  meta?: string;
}

/**
 * What the customer will actually be asked, derived from the current settings.
 * The form is entirely about "what does the app show" but never showed it, so
 * every choice had to be simulated in the admin's head.
 */
function buildJourney(state: FormState): Step[] {
  const { form, blocks, overrideBlocks, categories } = state;
  const steps: Step[] = [];

  const effectiveBlocks: ConfigBlock[] = (
    overrideBlocks
      ? blocks
      : form.priceKind === "sqm"
        ? (categories.find((c) => c.id === form.categoryId)?.configBlocks ?? [])
        : []
  ).filter((b) => {
    const a = b.appliesTo ?? "all";
    if (a === "sqm") return form.priceKind === "sqm";
    if (a === "fixed") return form.priceKind === "fixed";
    return true;
  });

  if (form.priceKind === "fixed" && !overrideBlocks) {
    const stock = int(form.stockQty);
    const cap = int(form.maxPerOrder);
    if (stock != null && stock <= 0) {
      steps.push({ title: "Rupture de stock", meta: "Ajout au panier désactivé" });
      return steps;
    }
    const limit = Math.min(stock ?? Infinity, cap ?? Infinity);
    steps.push({
      title: "Choix de la quantité",
      meta: Number.isFinite(limit) ? `de 1 à ${limit}` : "de 1 à 99",
    });
    return steps;
  }

  if (form.priceKind === "sqm") {
    const formula = areaFormula(form.areaFormula);
    if (formula.fields.length > 0) {
      steps.push({
        title: "Saisie des dimensions",
        meta: formula.fields.map((f) => f.label).join(" · "),
      });
    }
    if (form.qualityTiers.some((t) => t.label.trim())) {
      steps.push({
        title: "Choix de la gamme",
        meta: form.qualityTiers
          .filter((t) => t.label.trim())
          .map((t) => t.label.trim())
          .join(" · "),
      });
    }
  }

  for (const b of effectiveBlocks) {
    const count =
      b.fields?.length ?? b.options?.length ?? b.items?.length ?? 0;
    steps.push({
      title: b.label || BLOCK_META[b.type]?.label || b.type,
      meta: [
        BLOCK_META[b.type]?.label,
        count > 0 ? `${count} élément${count > 1 ? "s" : ""}` : null,
        b.required ? "obligatoire" : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  if (steps.length === 0) {
    steps.push({ title: "Ajout direct au panier", meta: "aucune étape de configuration" });
  }
  return steps;
}

function priceLine(state: FormState): string | null {
  const { form } = state;
  if (form.priceKind === "fixed") {
    const p = num(form.price);
    return p == null ? null : formatEUR(p);
  }
  const rates = form.qualityTiers
    .map((t) => num(t.pricePerSqm))
    .filter((n): n is number => n != null);
  if (rates.length > 0) {
    return `à partir de ${formatEUR(Math.min(...rates))}/m²`;
  }
  const rate = num(form.pricePerSqm);
  return rate == null ? null : `${formatEUR(rate)}/m²`;
}

export function CustomerPreview({ state }: { state: FormState }) {
  const { form, images, colors, categories } = state;
  const cover = images[0] ?? colors.find((c) => c.images.length > 0)?.images[0];
  const category = categories.find((c) => c.id === form.categoryId);
  const price = priceLine(state);
  const journey = buildJourney(state);

  const warnings: string[] = [];
  if (!cover) warnings.push("Aucune photo");
  if (!price) warnings.push("Prix non renseigné");
  if (!category) warnings.push("Catégorie non choisie");

  return (
    <div className="preview-panel">
      <div className="card card-padded">
        <div className="hstack" style={{ gap: 8, marginBottom: 14 }}>
          <Eye size={14} strokeWidth={1.8} style={{ color: "var(--outline)" }} />
          <span className="eyebrow">Aperçu client</span>
        </div>

        {cover ? (
          <img className="preview-media" src={cover} alt="" />
        ) : (
          <div className="preview-empty">
            <ImageOff size={22} strokeWidth={1.5} />
            <span>Aucune photo</span>
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <div className="hstack" style={{ gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span className={`pill ${STATUS_PILL[form.status] ?? "pill-outline"}`}>
              {STATUS_LABEL[form.status] ?? form.status}
            </span>
            {category && <span className="pill pill-navy-soft">{category.name}</span>}
            {form.freeShipping && <span className="pill pill-success-soft">Livraison offerte</span>}
          </div>

          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>
            {form.name.trim() || "Produit sans nom"}
          </div>
          {form.shortDescription.trim() && (
            <div style={{ fontSize: 12.5, color: "var(--outline)", marginTop: 4, lineHeight: 1.5 }}>
              {form.shortDescription}
            </div>
          )}
          <div className="preview-price" style={{ marginTop: 10 }}>
            {price ?? "— €"}
          </div>
        </div>

        <div className="divider" style={{ margin: "18px 0" }} />

        <div className="eyebrow" style={{ marginBottom: 12 }}>
          Parcours d&apos;achat
        </div>
        <ol className="journey">
          {journey.map((s, i) => (
            <li key={`${s.title}-${i}`}>
              <span className="jn">{i + 1}</span>
              <span>
                {s.title}
                {s.meta && <span className="jm">{s.meta}</span>}
              </span>
            </li>
          ))}
        </ol>

        {warnings.length > 0 && (
          <>
            <div className="divider" style={{ margin: "18px 0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {warnings.map((w) => (
                <div
                  key={w}
                  className="hstack"
                  style={{ gap: 6, fontSize: 12, color: "#92400E" }}
                >
                  <AlertTriangle size={13} strokeWidth={1.9} />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
