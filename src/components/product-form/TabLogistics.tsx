"use client";

import { Truck, Search } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { TextField, TextAreaField, SwitchRow } from "./Field";
import type { Form } from "./types";

export function TabLogistics({
  form,
  patch,
}: {
  form: Form;
  patch: (p: Partial<Form>) => void;
}) {
  const seoTitle = form.seoTitle.trim() || form.name.trim();
  const seoDesc = form.seoDescription.trim() || form.shortDescription.trim();

  return (
    <div className="stack">
      <div className="card card-padded">
        <SectionHead
          icon={Truck}
          tone="success"
          title="Livraison"
          hint="Délais affichés sur la fiche produit et repris dans le récapitulatif de commande."
        />
        <div className="field-grid cols-2">
          <TextField
            id="deliveryMetropole"
            label="Délai métropole"
            value={form.deliveryMetropole}
            placeholder="2-3 semaines"
            onChange={(deliveryMetropole) => patch({ deliveryMetropole })}
          />
          <TextField
            id="deliveryOutremer"
            label="Délai outre-mer"
            value={form.deliveryOutremer}
            placeholder="8-12 semaines"
            onChange={(deliveryOutremer) => patch({ deliveryOutremer })}
          />
          <TextField
            id="weightKg"
            label="Poids estimé"
            unit="kg"
            inputMode="decimal"
            value={form.weightKg}
            onChange={(weightKg) => patch({ weightKg })}
          />
          <TextField
            id="volumeM3"
            label="Encombrement"
            unit="m³"
            inputMode="decimal"
            value={form.volumeM3}
            onChange={(volumeM3) => patch({ volumeM3 })}
          />
        </div>
        <div style={{ marginTop: 20 }}>
          <SwitchRow
            id="freeShipping"
            label="Livraison gratuite"
            hint="Aucun frais de port ne sera ajouté pour ce produit."
            checked={form.freeShipping}
            onChange={(freeShipping) => patch({ freeShipping })}
          />
        </div>
      </div>

      <div className="card card-padded">
        <SectionHead
          icon={Search}
          tone="navy"
          title="Référencement"
          hint="Repris tels quels dans les partages de lien. Laissés vides, le nom et la description courte sont utilisés."
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <TextField
            id="seoTitle"
            label="Titre SEO"
            value={form.seoTitle}
            placeholder={form.name || "Titre affiché dans les résultats"}
            hint={`${form.seoTitle.length}/60 caractères recommandés`}
            onChange={(seoTitle) => patch({ seoTitle })}
          />
          <TextAreaField
            id="seoDescription"
            label="Description SEO"
            minHeight={70}
            value={form.seoDescription}
            placeholder={form.shortDescription || "Résumé affiché sous le titre"}
            hint={`${form.seoDescription.length}/155 caractères recommandés`}
            onChange={(seoDescription) => patch({ seoDescription })}
          />

          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              Aperçu du partage
            </div>
            <div
              style={{
                border: "1px solid var(--outline-variant)",
                borderRadius: 10,
                padding: 14,
                background: "var(--surface-container-low)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--outline)" }}>
                lamenagere.paris › produits
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: "#1a0dab",
                  marginTop: 3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {seoTitle || "Titre du produit"}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--on-surface-variant)",
                  marginTop: 3,
                  lineHeight: 1.5,
                }}
              >
                {seoDesc || "Aucune description : ajoutez une description courte ou un texte SEO."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
