"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { adminApi } from "@/lib/api";
import { formatEUR } from "@/lib/format";
import { Sparkline, Donut, TrendChart, VBars, PALETTE } from "@/components/charts/Charts";

/** Slices the category donut can stay readable with. Display size, not a data limit. */
const DONUT_SEGMENTS = 8;

interface Kpi { value: number; previous: number; spark: number[] }
interface Analytics {
  rangeDays: number;
  kpis: {
    revenue: Kpi; orders: Kpi; avgOrderValue: Kpi;
    unitsSold: Kpi; newCustomers: Kpi; conversionRate: Kpi;
  };
  trend: { labels: string[]; revenue: number[]; orders: number[]; units: number[]; prevRevenue: number[] };
  categoryMix: { category: string; revenue: number; units: number; pct: number }[];
  territory: { territory: string; revenue: number; orders: number; pct: number }[];
  ordersByStatus: { status: string; label: string; count: number }[];
  quoteFunnel: { requested: number; sent: number; accepted: number; rejected: number };
  weekday: number[];
  topProducts: { name: string; image: string | null; units: number; revenue: number; pct: number }[];
  topCustomers: { name: string; totalSpent: number; orders: number }[];
  customers: { distinct: number; repeat: number };
}

const ZONE: Record<string, string> = {
  metropole: "🇫🇷 Métropole", reunion: "🌴 Réunion", guadeloupe: "🌴 Guadeloupe",
  martinique: "🌴 Martinique", guyane: "🌴 Guyane", mayotte: "🌴 Mayotte",
};
const STATUS_COLOR: Record<string, string> = {
  commande_confirmee: "#2EA3F2", en_preparation: "#F59E0B",
  en_attente_expedition: "#9b6bdf", expediee: "#7f5531", livree: "#10B981",
};
const RANGES = [{ label: "7 j", days: 7 }, { label: "30 j", days: 30 }, { label: "90 j", days: 90 }, { label: "1 an", days: 365 }];
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function compactEUR(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)} k€`;
  return `${Math.round(n)} €`;
}
function delta(value: number, previous: number): { pct: number; up: boolean } {
  if (previous <= 0) return { pct: value > 0 ? 100 : 0, up: value >= 0 };
  const pct = Math.round(((value - previous) / previous) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<"revenue" | "orders" | "units">("revenue");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.analytics(days).then((d) => setData(d as Analytics)).finally(() => setLoading(false));
  }, [days]);

  const k = data?.kpis;
  const kpiCards = k
    ? [
        { key: "revenue", caption: "Chiffre d'affaires", value: formatEUR(k.revenue.value), kpi: k.revenue, color: "#10B981", money: true },
        { key: "orders", caption: "Commandes", value: String(k.orders.value), kpi: k.orders, color: "#002444", money: false },
        { key: "aov", caption: "Panier moyen", value: formatEUR(k.avgOrderValue.value), kpi: k.avgOrderValue, color: "#7f5531", money: true },
        { key: "units", caption: "Unités vendues", value: String(k.unitsSold.value), kpi: k.unitsSold, color: "#2EA3F2", money: false },
        { key: "newcust", caption: "Nouveaux clients", value: String(k.newCustomers.value), kpi: k.newCustomers, color: "#9b6bdf", money: false },
        { key: "conv", caption: "Conversion devis", value: `${k.conversionRate.value} %`, kpi: k.conversionRate, color: "#F59E0B", money: false },
      ]
    : [];

  const trendSeries = data
    ? metric === "revenue"
      ? { current: data.trend.revenue, previous: data.trend.prevRevenue, fmt: compactEUR, color: "#002444" }
      : metric === "orders"
        ? { current: data.trend.orders, previous: undefined, fmt: (n: number) => String(Math.round(n)), color: "#2EA3F2" }
        : { current: data.trend.units, previous: undefined, fmt: (n: number) => String(Math.round(n)), color: "#7f5531" }
    : null;

  const fn = data?.quoteFunnel;
  const funnelMax = fn ? Math.max(fn.requested, 1) : 1;
  const funnelRows = fn
    ? [
        { label: "Demandes reçues", value: fn.requested, color: "#2EA3F2" },
        { label: "Devis envoyés", value: fn.sent, color: "#7f5531" },
        { label: "Acceptés", value: fn.accepted, color: "#10B981" },
      ]
    : [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <div className="page-subtitle">
            {loading ? "Chargement…" : `Performance des ventes · ${days} derniers jours · vs période précédente`}
          </div>
        </div>
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r.days} className={`seg-btn${days === r.days ? " active" : ""}`} onClick={() => setDays(r.days)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards with delta + sparkline */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
        {kpiCards.map((c) => {
          const d = delta(c.kpi.value, c.kpi.previous);
          return (
            <div key={c.key} className="card card-padded">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="kpi-caption">{c.caption}</div>
                  <div className="kpi-value" style={{ marginTop: 4 }}>{c.value}</div>
                </div>
                <span className={`kpi-trend ${d.up ? "up" : "down"}`}>
                  {d.up ? <TrendingUp size={12} strokeWidth={2.5} /> : <TrendingDown size={12} strokeWidth={2.5} />}
                  <span>{d.pct}%</span>
                </span>
              </div>
              <div style={{ marginTop: 10 }}>
                <Sparkline data={c.kpi.spark} color={c.color} width={260} height={38} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main trend with metric toggle */}
      <div className="card card-padded" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ padding: 0, marginBottom: 18, border: "none" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Évolution</div>
            <div style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 24 }}>
              {data ? (metric === "revenue" ? formatEUR(k!.revenue.value) : metric === "orders" ? `${k!.orders.value} commandes` : `${k!.unitsSold.value} unités`) : "—"}
            </div>
          </div>
          <div className="hstack" style={{ gap: 14 }}>
            {metric === "revenue" && (
              <div className="hstack-sm" style={{ fontSize: 11, color: "var(--outline)" }}>
                <span className="dot-mark" style={{ background: "var(--primary)" }} /> Actuel
                <span style={{ marginLeft: 12, borderTop: "1px dashed var(--outline)", width: 14, height: 1 }} /> Précédent
              </div>
            )}
            <div className="seg">
              <button className={`seg-btn${metric === "revenue" ? " active" : ""}`} onClick={() => setMetric("revenue")}>CA</button>
              <button className={`seg-btn${metric === "orders" ? " active" : ""}`} onClick={() => setMetric("orders")}>Commandes</button>
              <button className={`seg-btn${metric === "units" ? " active" : ""}`} onClick={() => setMetric("units")}>Unités</button>
            </div>
          </div>
        </div>
        {data && trendSeries && data.trend.labels.length > 0 ? (
          <TrendChart labels={data.trend.labels} current={trendSeries.current} previous={trendSeries.previous} formatValue={trendSeries.fmt} color={trendSeries.color} />
        ) : (
          <div style={{ padding: 24, color: "var(--outline)", fontSize: 13 }}>Aucune donnée sur la période.</div>
        )}
      </div>

      {/* Donuts: category + status */}
      <div className="row-1-1" style={{ marginBottom: 24 }}>
        <div className="card card-padded">
          <div className="eyebrow" style={{ marginBottom: 18 }}>Répartition du CA par catégorie</div>
          <Donut
            segments={(data?.categoryMix ?? []).slice(0, DONUT_SEGMENTS).map((c, i) => ({ label: c.category, value: c.revenue, color: PALETTE[i % PALETTE.length] }))}
            centerTop="Total"
            centerValue={data ? compactEUR(data.categoryMix.reduce((n, c) => n + c.revenue, 0)) : ""}
          />
        </div>
        <div className="card card-padded">
          <div className="eyebrow" style={{ marginBottom: 18 }}>Commandes par statut</div>
          <Donut
            segments={(data?.ordersByStatus ?? []).map((s) => ({ label: s.label, value: s.count, color: STATUS_COLOR[s.status] ?? "#73777f" }))}
            centerTop="Commandes"
            centerValue={data ? String(data.ordersByStatus.reduce((n, s) => n + s.count, 0)) : ""}
          />
        </div>
      </div>

      {/* Quote funnel + weekday */}
      <div className="row-1-1" style={{ marginBottom: 24 }}>
        <div className="card card-padded">
          <div className="eyebrow" style={{ marginBottom: 18 }}>Tunnel de conversion des devis</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {funnelRows.map((r, i) => (
              <div key={r.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 500 }}>{r.label}</span>
                  <span style={{ fontFamily: "var(--display)", fontWeight: 600 }}>
                    {r.value}
                    {i > 0 && fn && fn.requested > 0 && (
                      <span style={{ color: "var(--outline)", fontWeight: 400, fontSize: 12 }}> · {Math.round((r.value / fn.requested) * 100)}%</span>
                    )}
                  </span>
                </div>
                <div style={{ height: 10, background: "var(--surface-container-low)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round((r.value / funnelMax) * 100)}%`, background: r.color, borderRadius: 999 }} />
                </div>
              </div>
            ))}
            {fn && fn.rejected > 0 && (
              <div style={{ fontSize: 12, color: "var(--error)" }}>{fn.rejected} devis refusé(s)</div>
            )}
          </div>
        </div>
        <div className="card card-padded">
          <div className="eyebrow" style={{ marginBottom: 4 }}>CA par jour de la semaine</div>
          {data ? <VBars data={data.weekday} labels={WEEKDAYS} formatValue={compactEUR} color="#7f5531" /> : null}
        </div>
      </div>

      {/* Territory bars */}
      <div className="card card-padded" style={{ marginBottom: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>Ventes par territoire</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {(data?.territory ?? []).map((t) => (
            <div key={t.territory}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 500 }}>{ZONE[t.territory] ?? t.territory}</span>
                <span className="num" style={{ fontFamily: "var(--display)", fontWeight: 600, color: "var(--secondary)" }}>
                  {formatEUR(t.revenue)} <span style={{ color: "var(--outline)", fontWeight: 400 }}>· {t.orders} cmd · {t.pct}%</span>
                </span>
              </div>
              <div style={{ height: 6, background: "var(--surface-container-low)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${t.pct}%`, background: "linear-gradient(90deg, var(--primary), var(--primary-container))", borderRadius: 999 }} />
              </div>
            </div>
          ))}
          {!loading && (data?.territory ?? []).length === 0 && <div style={{ color: "var(--outline)", fontSize: 13 }}>Aucune vente.</div>}
        </div>
      </div>

      {/* Best sellers + top customers */}
      <div className="row-1-1">
        <div className="card">
          <div className="card-header"><div className="card-title">Meilleures ventes</div></div>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead><tr><th>Produit</th><th style={{ textAlign: "center" }}>Unités</th><th style={{ textAlign: "right" }}>CA</th><th style={{ width: 90 }}>Part</th></tr></thead>
              <tbody>
                {(data?.topProducts ?? []).map((p, i) => (
                  <tr key={p.name + i}>
                    <td>
                      <div className="hstack" style={{ gap: 12 }}>
                        {p.image && <div className="thumb sm" style={{ backgroundImage: `url(${p.image})` }} />}
                        <span style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{p.units}</td>
                    <td style={{ textAlign: "right" }} className="num">{formatEUR(p.revenue)}</td>
                    <td>
                      <div style={{ height: 5, background: "var(--surface-container-low)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${p.pct}%`, background: "var(--secondary)", borderRadius: 999 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && (data?.topProducts ?? []).length === 0 && <div style={{ padding: 24, color: "var(--outline)", fontSize: 13 }}>Aucune vente.</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Meilleurs clients</div>
            {data && <span style={{ fontSize: 12, color: "var(--outline)" }}>{data.customers.repeat}/{data.customers.distinct} fidèles</span>}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead><tr><th>Client</th><th style={{ textAlign: "center" }}>Cmd</th><th style={{ textAlign: "right" }}>Dépensé</th></tr></thead>
              <tbody>
                {(data?.topCustomers ?? []).map((c, i) => (
                  <tr key={c.name + i}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ textAlign: "center" }}>{c.orders}</td>
                    <td style={{ textAlign: "right" }} className="num">{formatEUR(c.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && (data?.topCustomers ?? []).length === 0 && <div style={{ padding: 24, color: "var(--outline)", fontSize: 13 }}>Aucun client.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
