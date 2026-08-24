"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { adminApi } from "@/lib/api";

interface AdminOrder {
  id: string;
  client: string;
  clientInitials: string;
  b2b?: boolean;
  items: string;
  total: string;
  status: string;
  statusLabel: string;
  /** Failed refund or open chargeback — money not where the books say (0037). */
  needsAttention?: boolean;
  refundSettlement?: "none" | "pending" | "succeeded" | "failed" | "canceled";
  disputeStatus?: "none" | "open" | "won" | "lost";
  image: string;
  createdAt: string;
  territory: string;
}

const TABS: { label: string; status: string }[] = [
  { label: "Toutes", status: "" },
  { label: "Confirmée", status: "commande_confirmee" },
  { label: "En préparation", status: "en_preparation" },
  { label: "En attente d'expédition", status: "en_attente_expedition" },
  { label: "Expédiée", status: "expediee" },
  { label: "Livrée", status: "livree" },
];

const STATUS_PILL: Record<string, string> = {
  commande_confirmee: "pill-navy",
  en_preparation: "pill-prep",
  en_attente_expedition: "pill-warning",
  expediee: "pill-bronze",
  livree: "pill-success",
};

const ZONES: Record<string, { label: string; flag: string }> = {
  metropole: { label: "Métropole", flag: "🇫🇷" },
  reunion: { label: "La Réunion", flag: "🌴" },
  guadeloupe: { label: "Guadeloupe", flag: "🌴" },
  martinique: { label: "Martinique", flag: "🌴" },
  guyane: { label: "Guyane", flag: "🌴" },
  mayotte: { label: "Mayotte", flag: "🌴" },
};

function relativeTime(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

const PAGE_SIZE = 50;

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [territory, setTerritory] = useState("all");
  const [account, setAccount] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  // Debounce keystrokes so typing doesn't fire a request per character.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [tab, territory, account, query]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (TABS[tab].status) params.set("status", TABS[tab].status);
    if (territory !== "all") params.set("territory", territory);
    if (account !== "all") params.set("accountType", account);
    if (query) params.set("q", query);

    setLoading(true);
    try {
      const res = await adminApi.orders.list<AdminOrder>(`?${params.toString()}`);
      setOrders(res?.items ?? []);
      setTotal(res?.total ?? 0);
      setHasMore(Boolean(res?.hasMore));
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [page, tab, territory, account, query]);

  useEffect(() => {
    load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + orders.length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Commandes</h1>
          <div className="page-subtitle">
            {loading ? "Chargement…" : `${total} commande(s)`}
          </div>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 18, gap: 8 }}>
        {TABS.map((t, i) => (
          <button
            key={t.label}
            className={`chip${tab === i ? " active" : ""}`}
            style={{ height: 36, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}
            onClick={() => setTab(i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card card-padded" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 280, maxWidth: 380 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--outline)", display: "flex" }}>
              <Search size={16} strokeWidth={1.8} />
            </span>
            <input
              className="input-boxed"
              style={{ paddingLeft: 38, width: "100%" }}
              placeholder="Numéro de commande..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="select-wrap">
            <select value={territory} onChange={(e) => setTerritory(e.target.value)}>
              <option value="all">Toutes zones</option>
              {Object.entries(ZONES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="select-wrap">
            <select value={account} onChange={(e) => setAccount(e.target.value)}>
              <option value="all">Tous comptes</option>
              <option value="particulier">Particulier</option>
              <option value="professionnel">Professionnel</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th># Commande</th>
                <th>Client</th>
                <th>Articles</th>
                <th>Territoire</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const zone = ZONES[o.territory] ?? { label: o.territory, flag: "" };
                return (
                  <tr key={o.id} onClick={() => router.push(`/orders/${o.id}`)} style={{ cursor: "pointer" }}>
                    <td>
                      <div className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>#{o.id}</div>
                      <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 2 }}>{relativeTime(o.createdAt)}</div>
                    </td>
                    <td>
                      <div className="hstack" style={{ gap: 10 }}>
                        <div className="avatar sm">{o.clientInitials}</div>
                        <div className="hstack" style={{ gap: 6 }}>
                          <span style={{ fontWeight: 500, fontSize: 13 }}>{o.client}</span>
                          {o.b2b && <span className="pill pill-bronze-soft" style={{ fontSize: 9, padding: "1px 6px" }}>PRO</span>}
                          {/* Surfaced in the list so a bounced refund or a
                              chargeback can't sit unnoticed inside a detail
                              page nobody opened. */}
                          {o.needsAttention && (
                            <span
                              className="pill pill-error"
                              style={{ fontSize: 9, padding: "1px 6px" }}
                              title={
                                o.disputeStatus === "open"
                                  ? "Litige bancaire en cours"
                                  : "Le remboursement a échoué"
                              }
                            >
                              {o.disputeStatus === "open" ? "LITIGE" : "REMB. ÉCHOUÉ"}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="hstack" style={{ gap: 10 }}>
                        {o.image && <div className="thumb sm" style={{ backgroundImage: `url(${o.image})` }}></div>}
                        <span style={{ fontSize: 13 }}>{o.items}</span>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 12.5 }}>{zone.flag} {zone.label}</span></td>
                    <td style={{ textAlign: "right" }} className="num">{o.total}</td>
                    <td><span className={`pill ${STATUS_PILL[o.status] ?? "pill"}`}>{o.statusLabel}</span></td>
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                      <a href={`/orders/${o.id}`} style={{ fontSize: 12, color: "var(--secondary)", fontWeight: 500 }}>Voir →</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && orders.length === 0 && (
            <div style={{ padding: 24, color: "var(--outline)", fontSize: 13 }}>
              Aucune commande.
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderTop: "1px solid var(--outline-soft)" }}>
          <div style={{ fontSize: 12, color: "var(--outline)" }}>
            {total === 0
              ? "Aucune commande"
              : `${rangeStart}–${rangeEnd} sur ${total} commande${total > 1 ? "s" : ""}`}
          </div>
          <div className="hstack" style={{ gap: 10 }}>
            <button
              className="btn btn-outline btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} strokeWidth={2} />
              <span>Précédent</span>
            </button>
            <span style={{ fontSize: 12, color: "var(--outline)" }}>
              Page {page} / {pageCount}
            </span>
            <button
              className="btn btn-outline btn-sm"
              disabled={!hasMore || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <span>Suivant</span>
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
