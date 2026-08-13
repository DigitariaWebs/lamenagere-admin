"use client";

import { SlidersHorizontal } from "lucide-react";
import CategoryBlocksEditor, {
  BLOCK_META,
  type ConfigBlock,
} from "../CategoryBlocksEditor";
import { SectionHead, Callout } from "./SectionHead";
import { SwitchRow } from "./Field";
import type { Category, Form } from "./types";

export function TabConfiguration({
  form,
  categories,
  blocks,
  setBlocks,
  overrideBlocks,
  setOverrideBlocks,
}: {
  form: Form;
  categories: Category[];
  blocks: ConfigBlock[];
  setBlocks: (next: ConfigBlock[]) => void;
  overrideBlocks: boolean;
  setOverrideBlocks: (v: boolean) => void;
}) {
  const category = categories.find((c) => c.id === form.categoryId);
  const inherited = category?.configBlocks ?? [];

  return (
    <div className="stack">
      <div className="card card-padded">
        <SectionHead
          icon={SlidersHorizontal}
          tone="warn"
          title="Blocs de configuration"
          hint={
            form.priceKind === "fixed"
              ? "Un produit à prix fixe se vend à l'unité : il n'hérite pas des blocs de sa catégorie. Activez la personnalisation seulement pour lui demander un choix avant l'achat."
              : "Par défaut, ce produit hérite des blocs de sa catégorie. Activez la personnalisation pour lui donner ses propres blocs."
          }
        />

        <div style={{ marginBottom: 16 }}>
          <Callout kind="info">
            Les <strong>types d&apos;ouverture</strong> se définissent ici, avec un bloc{" "}
            <strong>« Détails d&apos;ouverture »</strong> : chaque ouverture peut porter son
            propre libellé, sa photo et son supplément. C&apos;est ce bloc que le client voit
            dans l&apos;application.
          </Callout>
        </div>

        {form.priceKind === "fixed" && !overrideBlocks && (
          <div style={{ marginBottom: 16 }}>
            <Callout kind="warn">
              En activant la personnalisation, le client passera par la{" "}
              <strong>configuration guidée</strong> au lieu du sélecteur de quantité.
            </Callout>
          </div>
        )}

        <SwitchRow
          id="overrideBlocks"
          label="Personnaliser les blocs pour ce produit"
          checked={overrideBlocks}
          onChange={(on) => {
            setOverrideBlocks(on);
            // Seed from the chosen category's template on first enable.
            if (on && blocks.length === 0) {
              setBlocks(inherited.length ? structuredClone(inherited) : []);
            }
          }}
        />

        {!overrideBlocks && form.priceKind === "sqm" && (
          <div style={{ marginTop: 18 }}>
            <InheritedBlocks categoryName={category?.name} blocks={inherited} />
          </div>
        )}

        {overrideBlocks && (
          <div style={{ marginTop: 20 }}>
            <CategoryBlocksEditor blocks={blocks} onChange={setBlocks} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Read-only view of what the product inherits. Without it, turning the switch
 * off showed an empty card and no way to know what the customer would be asked.
 */
function InheritedBlocks({
  categoryName,
  blocks,
}: {
  categoryName?: string;
  blocks: ConfigBlock[];
}) {
  if (!categoryName) {
    return (
      <Callout kind="warn">
        Choisissez d&apos;abord une catégorie (onglet Essentiel) pour savoir quels blocs ce produit
        hérite.
      </Callout>
    );
  }
  if (blocks.length === 0) {
    return (
      <Callout kind="info">
        La catégorie <strong>{categoryName}</strong> ne définit aucun bloc : le client ne verra
        aucune étape de configuration.
      </Callout>
    );
  }
  return (
    <div>
      <div className="field-label" style={{ marginBottom: 10 }}>
        Hérité de {categoryName} — {blocks.length} bloc{blocks.length > 1 ? "s" : ""}
      </div>
      <div className="chips">
        {blocks.map((b) => (
          <span key={b.id} className="chip" style={{ cursor: "default" }}>
            <span className="pill pill-navy-soft" style={{ fontSize: 9 }}>
              {BLOCK_META[b.type]?.label ?? b.type}
            </span>
            {b.label}
            {b.required && <span className="req">*</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
