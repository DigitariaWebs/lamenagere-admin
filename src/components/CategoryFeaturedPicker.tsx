"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, ChevronUp, ChevronDown, Star } from "lucide-react";
import { adminApi } from "@/lib/api";

interface FeaturedProduct {
  id: string;
  name: string;
  images: string[];
}
interface ProductOption {
  id: string;
  name: string;
}

/**
 * Curates the ordered "Notre sélection" rail shown atop a category's screen in
 * the mobile app. Scoped to a single category via its id.
 */
export default function CategoryFeaturedPicker({ categoryId }: { categoryId: string }) {
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [addId, setAddId] = useState("");

  const load = useCallback(async () => {
    const [f, p] = await Promise.all([
      adminApi.featured.products(categoryId) as Promise<FeaturedProduct[]>,
      adminApi.products.listAll<ProductOption>(),
    ]);
    setFeatured(f ?? []);
    setAllProducts(p ?? []);
  }, [categoryId]);

  useEffect(() => {
    load().catch((e: { message?: string }) => toast.error(e?.message ?? "Chargement impossible"));
  }, [load]);

  async function addProduct() {
    if (!addId) return;
    try {
      await adminApi.featured.addProduct(addId, categoryId);
      setAddId("");
      await load();
      toast.success("Produit ajouté à la sélection");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Ajout impossible");
    }
  }
  async function removeProduct(id: string) {
    try {
      await adminApi.featured.removeProduct(id, categoryId);
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Retrait impossible");
    }
  }
  async function moveProduct(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= featured.length) return;
    const next = [...featured];
    [next[index], next[target]] = [next[target], next[index]];
    setFeatured(next);
    try {
      await adminApi.featured.reorderProducts(next.map((p) => p.id), categoryId);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Réordonnancement impossible");
      load();
    }
  }

  const featuredIds = new Set(featured.map((f) => f.id));
  const addable = allProducts.filter((p) => !featuredIds.has(p.id));

  return (
    <div>
      <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
        <div className="field-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Star size={14} strokeWidth={1.8} /> Produits en vedette (Notre sélection)
        </div>
        <div className="hstack" style={{ gap: 8 }}>
          <div className="select-wrap">
            <select value={addId} onChange={(e) => setAddId(e.target.value)}>
              <option value="">Choisir un produit…</option>
              {addable.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={addProduct} disabled={!addId}>
            <Plus size={14} strokeWidth={2} /> Ajouter
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {featured.map((p, i) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, border: "1px solid var(--outline-soft)", borderRadius: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13 }}>#{i + 1}</div>
            <div className="thumb" style={{ width: 36, height: 36, backgroundImage: `url(${p.images?.[0] ?? ""})`, backgroundSize: "cover", borderRadius: 7 }}></div>
            <div style={{ flex: 1, fontWeight: 500, fontSize: 13 }}>{p.name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button type="button" className="icon-btn" style={{ width: 26, height: 22 }} title="Monter" disabled={i === 0} onClick={() => moveProduct(i, -1)}>
                <ChevronUp size={14} strokeWidth={2} />
              </button>
              <button type="button" className="icon-btn" style={{ width: 26, height: 22 }} title="Descendre" disabled={i === featured.length - 1} onClick={() => moveProduct(i, 1)}>
                <ChevronDown size={14} strokeWidth={2} />
              </button>
            </div>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeProduct(p.id)}>Retirer</button>
          </div>
        ))}
        {featured.length === 0 && <div style={{ color: "var(--outline)", fontSize: 13 }}>Aucun produit en vedette pour cette catégorie.</div>}
      </div>
    </div>
  );
}
