"use client";

import { Package, FileText } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { TextField, TextAreaField, SelectField } from "./Field";
import type { Category, Form } from "./types";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function TabEssentiel({
  form,
  patch,
  errors,
  categories,
}: {
  form: Form;
  patch: (p: Partial<Form>) => void;
  errors: Record<string, string>;
  categories: Category[];
}) {
  const effectiveSlug = form.slug.trim() || slugify(form.name);

  return (
    <div className="stack">
      <div className="card card-padded">
        <SectionHead
          icon={Package}
          tone="navy"
          title="Identité du produit"
          hint="Le nom et la catégorie sont les deux seules informations obligatoires pour enregistrer un brouillon."
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <TextField
            id="name"
            label="Nom du produit"
            required
            value={form.name}
            error={errors.name}
            placeholder="ex. Cuisine sur mesure en L"
            onChange={(name) => patch({ name })}
          />

          <div className="field-grid cols-2">
            <SelectField
              id="categoryId"
              label="Catégorie"
              required
              value={form.categoryId}
              error={errors.categoryId}
              hint="Détermine les blocs de configuration hérités."
              onChange={(categoryId) => patch({ categoryId })}
            >
              <option value="">— Choisir —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>

            <TextField
              id="sku"
              label="Référence (SKU)"
              mono
              value={form.sku}
              placeholder="généré si vide"
              hint="Identifiant interne, visible en commande et en atelier."
              onChange={(sku) => patch({ sku })}
            />
          </div>

          <TextField
            id="slug"
            label="Slug"
            mono
            value={form.slug}
            placeholder="auto depuis le nom"
            hint={effectiveSlug ? `Identifiant d'URL : ${effectiveSlug}` : "Généré depuis le nom."}
            onChange={(slug) => patch({ slug })}
          />
        </div>
      </div>

      <div className="card card-padded">
        <SectionHead
          icon={FileText}
          tone="navy"
          title="Descriptions"
          hint="La description courte s'affiche sous le nom dans les listes ; la description complète sur la fiche produit."
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <TextField
            id="shortDescription"
            label="Description courte"
            value={form.shortDescription}
            placeholder="Une phrase qui résume le produit"
            onChange={(shortDescription) => patch({ shortDescription })}
          />
          <TextAreaField
            id="description"
            label="Description"
            value={form.description}
            placeholder="Matériaux, finitions, fabrication, garantie…"
            onChange={(description) => patch({ description })}
          />
        </div>
      </div>
    </div>
  );
}
