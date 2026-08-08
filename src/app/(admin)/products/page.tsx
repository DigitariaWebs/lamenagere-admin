"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, MoreHorizontal, Check } from "lucide-react";
import { adminApi } from "@/lib/api";

interface AdminProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: string;
  productType: "standard" | "configurable" | "quote_only";
  priceLabel: string;
  stock: "en_stock" | "stock_faible" | "rupture" | null;
  status: "publie" | "brouillon" | "archive";
  image: string;
}

const TYPE_LABEL: Record<AdminProduct["productType"], string> = {
  standard: "PRIX FIXE",
  configurable: "AU M²",
  quote_only: "AU M²",
};
function typePill(t: AdminProduct["productType"]) {
  if (t === "standard") return "pill-navy-soft";
  if (t === "configurable") return "pill-bronze-soft";
  return "pill-outline";
}

const STOCK_LABEL: Record<string, { label: string; cls: string }> = {
  en_stock: { label: "En stock", cls: "pill-success-soft" },
  stock_faible: { label: "Stock faible", cls: "pill-warning-soft" },
  rupture: { label: "Rupture", cls: "pill-error-soft" },
};

const STATUS_TABS = [
  { key: "all", label: "Tous" },
  { key: "publie", label: "Publiés" },
  { key: "brouillon", label: "Brouillons" },
  { key: "archive", label: "Archivés" },
];

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("all");
  const [catTab, setCatTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "100" });
      if (search.trim()) params.set("q", search.trim());
      const res = (await adminApi.products.list(`?${params.toString()}`)) as {
        items: AdminProduct[];
      };
      setProducts(res.items ?? []);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const categories = useMemo(() => {
    const set = new Map<string, number>();
    for (const p of products) set.set(p.category, (set.get(p.category) ?? 0) + 1);
    return [...set.entries()].map(([label, count]) => ({ label, count }));
  }, [products]);

  const counts = useMemo(
    () => ({
      all: products.length,
      publie: products.filter((p) => p.status === "publie").length,
      brouillon: products.filter((p) => p.status === "brouillon").length,
      archive: products.filter((p) => p.status === "archive").length,
    }),
    [products],
  );

  const filtered = products.filter((p) => {
    if (statusTab !== "all" && p.status !== statusTab) return false;
    if (catTab !== "all" && p.category !== catTab) return false;
    return true;
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  async function bulk(action: "publish" | "draft" | "archive" | "delete") {
    try {
      await adminApi.products.bulk({ ids: [...selected], action });
      toast.success("Action appliquée");
      setSelected(new Set());
      load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec de l'action");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Produits</h1>
          <div className="page-subtitle">
            {loading
              ? "Chargement…"
              : `${counts.all} produits · ${counts.publie} publiés · ${counts.brouillon} brouillons`}
          </div>
        </div>
        <div className="hstack">
          <Link href="/products/new" className="btn btn-primary">
            <Plus size={14} strokeWidth={2} />
            <span>Ajouter un produit</span>
          </Link>
        </div>
      </div>

      <div className="card card-padded" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "0 0 280px" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--outline)", display: "flex" }}>
              <Search size={16} strokeWidth={1.8} />
            </span>
            <input
              className="input-boxed"
              style={{ paddingLeft: 38, width: "100%" }}
              placeholder="Rechercher un produit, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="chips">
              {STATUS_TABS.map((t) => (
                <button key={t.key} className={`chip${statusTab === t.key ? " active" : ""}`} onClick={() => setStatusTab(t.key)}>
                  {t.label}{" "}
                  <span className="count">
                    {counts[t.key as keyof typeof counts]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--outline-soft)" }}>
          <div className="chips">
            <span className="eyebrow" style={{ marginRight: 8 }}>Catégorie</span>
            <button className={`chip${catTab === "all" ? " active" : ""}`} onClick={() => setCatTab("all")}>
              Toutes
            </button>
            {categories.map((c) => (
              <button key={c.label} className={`chip${catTab === c.label ? " active" : ""}`} onClick={() => setCatTab(c.label)}>
                {c.label}
                <span className="count">{c.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Prix</th>
                <th>Stock</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const checked = selected.has(p.id);
                const stock = p.stock ? STOCK_LABEL[p.stock] : null;
                return (
                  <tr key={p.id} onClick={() => router.push(`/products/${p.id}`)} style={{ cursor: "pointer" }}>
                    <td onClick={(e) => { e.stopPropagation(); toggle(p.id); }}>
                      <span className={`checkbox${checked ? " checked" : ""}`}>
                        {checked && <Check size={10} strokeWidth={3} />}
                      </span>
                    </td>
                    <td>
                      <div className="hstack" style={{ gap: 14 }}>
                        <div className="thumb" style={{ backgroundImage: `url(${p.image})` }}></div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                          <div className="mono" style={{ fontSize: 11, color: "var(--outline)", marginTop: 3 }}>SKU · {p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 12.5 }}>{p.category}</span></td>
                    <td><span className={`pill ${typePill(p.productType)}`}>{TYPE_LABEL[p.productType]}</span></td>
                    <td style={{ textAlign: "right" }} className="num">{p.priceLabel}</td>
                    <td>
                      {stock ? (
                        <span className={`pill ${stock.cls}`}>{stock.label}</span>
                      ) : (
                        <span className="pill pill-outline">—</span>
                      )}
                    </td>
                    <td>
                      {p.status === "publie" ? (
                        <span className="pill pill-success-soft">Publié</span>
                      ) : p.status === "archive" ? (
                        <span className="pill pill-outline">Archivé</span>
                      ) : (
                        <span className="pill pill-outline">Brouillon</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                      <button className="icon-btn" style={{ width: 28, height: 28 }}>
                        <MoreHorizontal size={16} strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 24, color: "var(--outline)", fontSize: 13 }}>
              Aucun produit.
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderTop: "1px solid var(--outline-soft)" }}>
          <div style={{ fontSize: 12, color: "var(--outline)" }}>
            {filtered.length} produit{filtered.length > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--surface)", border: "1px solid var(--outline-variant)", borderRadius: 14, padding: "12px 18px", display: "flex", alignItems: "center", gap: 18, boxShadow: "var(--shadow-pop)", zIndex: 100 }}>
          <div className="hstack">
            <span className="pill pill-navy" style={{ fontFamily: "var(--display)", fontSize: 11 }}>{selected.size}</span>
            <span style={{ fontWeight: 500, fontSize: 13 }}>
              {selected.size > 1 ? "produits sélectionnés" : "produit sélectionné"}
            </span>
          </div>
          <div style={{ height: 24, width: 1, background: "var(--outline-soft)" }}></div>
          <button className="btn btn-outline btn-sm" onClick={() => bulk("publish")}>Publier</button>
          <button className="btn btn-outline btn-sm" onClick={() => bulk("draft")}>Mettre en brouillon</button>
          <button className="btn btn-outline btn-sm" onClick={() => bulk("archive")}>Archiver</button>
          <button className="btn btn-danger btn-sm" onClick={() => bulk("delete")}>Supprimer</button>
        </div>
      )}
    </div>
  );
}
