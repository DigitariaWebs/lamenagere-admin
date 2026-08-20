"use client";

import { formatEnteredDimensions, type AreaDimensions } from "@/lib/area-formulas";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Truck, ArrowRight, Check, Eye } from "lucide-react";
import { adminApi } from "@/lib/api";
import { LayoutPlan, type ConfiguredLayout } from "@/components/OrderConfigView";
import { formatEUR } from "@/lib/format";

const FLOW = ["commande_confirmee", "en_preparation", "en_attente_expedition", "expediee", "livree"] as const;
type Status = (typeof FLOW)[number];
const LABEL: Record<Status, string> = {
  commande_confirmee: "Confirmée",
  en_preparation: "En préparation",
  en_attente_expedition: "En attente d'expédition",
  expediee: "Expédiée",
  livree: "Livrée",
};
const PILL: Record<Status, string> = {
  commande_confirmee: "pill-navy",
  en_preparation: "pill-prep",
  en_attente_expedition: "pill-warning",
  expediee: "pill-bronze",
  livree: "pill-success",
};

interface ConfigEntry {
  blockId: string;
  type: string;
  label: string;
  measurements?: { label: string; value: number; unit?: string }[];
  shape?: { label: string };
  colors?: { label: string; surchargeCents?: number }[];
  accessories?: { title: string; priceCents?: number }[];
  opening?: { label: string; surchargeCents?: number };
  options?: { label: string; surchargeCents?: number }[];
  photos?: { url: string; type: string }[];
  ilot?: { included: boolean; surchargeCents?: number };
  /** The 3D implantation, exactly as the customer arranged it. */
  layout?: ConfiguredLayout;
}

interface RecapRow {
  label: string;
  value: string;
  priceCents?: number;
  sub?: boolean;
}

/**
 * The configuration read back block by block. The previous one-line summary
 * joined everything with " · " into 11px grey text, and silently skipped
 * `options` and `ilot` entries — so an option the customer picked, or an island
 * they paid for, appeared nowhere in the back office.
 */
function configRecapRows(config?: ConfigEntry[]): RecapRow[] {
  const rows: RecapRow[] = [];
  const sum = (xs: { surchargeCents?: number }[]) =>
    xs.reduce((n, x) => n + (x.surchargeCents ?? 0), 0);

  for (const e of config ?? []) {
    const measurements = e.measurements ?? [];
    const detail = () =>
      measurements.forEach((m) =>
        rows.push({ label: m.label, value: `${m.value} ${m.unit ?? "cm"}`, sub: true }),
      );

    if (e.type === "ilot") {
      if (!e.ilot?.included) continue;
      rows.push({ label: e.label, value: "Oui", priceCents: e.ilot.surchargeCents });
      detail();
    } else if (e.type === "measurements") {
      if (!measurements.length) continue;
      rows.push({ label: e.label, value: "" });
      detail();
    } else if (e.shape) {
      rows.push({ label: e.label, value: e.shape.label });
    } else if (e.colors?.length) {
      rows.push({
        label: e.label,
        value: e.colors.map((c) => c.label).join(", "),
        priceCents: sum(e.colors),
      });
    } else if (e.opening) {
      rows.push({ label: e.label, value: e.opening.label, priceCents: e.opening.surchargeCents });
    } else if (e.accessories?.length) {
      rows.push({
        label: e.label,
        value: e.accessories.map((a) => a.title.trim()).join(", "),
        priceCents: e.accessories.reduce((n, a) => n + (a.priceCents ?? 0), 0),
      });
    } else if (e.options?.length) {
      rows.push({
        label: e.label,
        value: e.options.map((o) => o.label).join(", "),
        priceCents: sum(e.options),
      });
    } else if (e.photos?.length) {
      rows.push({
        label: e.label,
        value: `${e.photos.length} fichier${e.photos.length > 1 ? "s" : ""}`,
      });
    } else if (e.layout) {
      // The implantation had no branch at all, so a customer who arranged their
      // whole kitchen in 3D left no trace on this page — the plan existed, but
      // only for whoever thought to open the item.
      const shape =
        e.layout.shape === "u" ? "en U" : e.layout.shape === "l" ? "en L" : "en I";
      const count = e.layout.runs.reduce((n, r) => n + r.modules.length, 0);
      const free = e.layout.runs.reduce(
        (n, r) => n + r.modules.filter((m) => m.x != null && m.z != null).length,
        0,
      );
      rows.push({
        label: e.label,
        value: `Cuisine ${shape} · ${count} élément${count > 1 ? "s" : ""}`,
      });
      rows.push({
        label: "Pièce",
        value: `${e.layout.room.widthM.toFixed(2).replace(".", ",")} × ${e.layout.room.depthM
          .toFixed(2)
          .replace(".", ",")} m`,
        sub: true,
      });
      // Worth saying on the order itself: these are the units the customer took
      // out of a row and stood somewhere of their own, which is the part of the
      // plan a fitter cannot guess from a parts list.
      if (free > 0) {
        rows.push({
          label: "Dont posés librement",
          value: `${free} élément${free > 1 ? "s" : ""}`,
          sub: true,
        });
      }
      if (e.layout.runs.some((r) => r.overlaps)) {
        rows.push({ label: "À vérifier", value: "Côtés en chevauchement", sub: true });
      }
    }
  }
  return rows;
}

function ConfigRecap({ config }: { config?: ConfigEntry[] }) {
  const rows = configRecapRows(config);
  if (!rows.length) return null;
  return (
    <table style={{ marginTop: 8, borderCollapse: "collapse", width: "100%", maxWidth: 520 }}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.label}-${i}`}>
            <td
              style={{
                padding: "3px 10px 3px 0",
                fontSize: 12,
                fontWeight: r.sub ? 400 : 600,
                color: r.sub ? "var(--outline)" : "var(--on-surface)",
                paddingLeft: r.sub ? 14 : 0,
                whiteSpace: "nowrap",
                verticalAlign: "top",
              }}
            >
              {r.label}
            </td>
            <td style={{ padding: "3px 10px 3px 0", fontSize: 12, color: "var(--on-surface-variant)" }}>
              {r.value}
            </td>
            <td
              style={{
                padding: "3px 0",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--secondary)",
                textAlign: "right",
                whiteSpace: "nowrap",
              }}
            >
              {r.priceCents ? `+ ${formatEUR(r.priceCents / 100)}` : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
interface OrderItem {
  id: string;
  product: { name: string; images: string[] };
  quantity: number;
  price: number;
  customDimensions?: AreaDimensions;
  configuration?: ConfigEntry[];
}

function configPhotos(config?: ConfigEntry[]): string[] {
  if (!config?.length) return [];
  return config.flatMap((e) => (e.photos ?? []).filter((p) => p.type !== "video").map((p) => p.url));
}
interface OrderDto {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  status: Status;
  total: number;
  subtotal: number;
  shippingCost: number;
  shippingAddress: { firstName: string; lastName: string; street: string; postalCode: string; city: string; country: string; phone?: string };
  territory: string;
  estimatedDelivery: string;
  createdAt: string;
  paymentStatus?: "unpaid" | "paid" | "failed" | "refunded";
  refundStatus?: "none" | "requested" | "refunded" | "rejected";
  refundReason?: string;
  refundDecisionNote?: string;
  refundAmount?: number;
  refundRequestedAt?: string;
  refundDecidedAt?: string;
  timeline: { status: Status; label: string; timestamp?: string; completed: boolean }[];
}
interface Detail {
  order: OrderDto;
  client: { id: string; name: string; accountType: string } | null;
  notes: { id: string; body: string; createdAt: string }[];
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [d, setD] = useState<Detail | null>(null);
  const [eta, setEta] = useState("");
  const [note, setNote] = useState("");

  function load() {
    if (!id) return;
    adminApi.orders
      .detail(id)
      .then((r) => {
        const detail = r as Detail;
        setD(detail);
        setEta(detail.order.estimatedDelivery ?? "");
      })
      .catch((e: { message?: string }) => toast.error(e?.message ?? "Commande introuvable"));
  }
  useEffect(load, [id]);

  if (!d) return <div className="page"><div className="page-subtitle">Chargement…</div></div>;
  const o = d.order;
  const currentIdx = FLOW.indexOf(o.status);

  async function advance() {
    const next = FLOW[Math.min(FLOW.length - 1, currentIdx + 1)];
    if (next === o.status) return;
    try {
      await adminApi.orders.setStatus(o.id, { status: next });
      toast.success(`Statut : ${LABEL[next]}`);
      load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec");
    }
  }
  async function ship() {
    const carrier = prompt("Transporteur ?");
    if (!carrier) return;
    const trackingNumber = prompt("Numéro de suivi ?") ?? "";
    try {
      await adminApi.orders.ship(o.id, { carrier, trackingNumber });
      toast.success("Commande marquée expédiée");
      load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec");
    }
  }
  async function saveEta() {
    try {
      await adminApi.orders.update(o.id, { estimatedDelivery: eta });
      toast.success("Date enregistrée");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec");
    }
  }
  async function addNote() {
    if (!note.trim()) return;
    try {
      await adminApi.orders.note(o.id, { body: note.trim() });
      setNote("");
      load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec");
    }
  }
  async function acceptRefund() {
    const input = prompt(
      `Montant à rembourser en €.\nLaissez vide pour un remboursement TOTAL de ${formatEUR(o.total)}.`,
      "",
    );
    if (input === null) return; // cancelled
    let amountCents: number | undefined;
    if (input.trim() !== "") {
      const euros = parseFloat(input.replace(",", "."));
      if (!Number.isFinite(euros) || euros <= 0 || euros > o.total) {
        toast.error("Montant invalide");
        return;
      }
      amountCents = Math.round(euros * 100);
    }
    const label = amountCents != null ? `${formatEUR(amountCents / 100)} (partiel)` : `${formatEUR(o.total)} (total)`;
    if (!confirm(`Rembourser ${label} via Stripe ? Cette action est irréversible.`)) return;
    try {
      await adminApi.orders.acceptRefund(o.id, amountCents);
      toast.success("Remboursement Stripe effectué");
      load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec du remboursement");
    }
  }
  async function rejectRefund() {
    const reason = prompt("Motif du refus (facultatif) ?") ?? undefined;
    try {
      await adminApi.orders.rejectRefund(o.id, reason);
      toast.success("Demande de remboursement refusée");
      load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="hstack" style={{ gap: 14, marginBottom: 6, flexWrap: "wrap" }}>
            <h1 className="page-title">Commande #{o.orderNumber}</h1>
            <span className={`pill ${PILL[o.status]}`}>{LABEL[o.status]}</span>
          </div>
          <div className="page-subtitle">
            {new Date(o.createdAt).toLocaleDateString("fr-FR")} · {d.client?.name ?? ""} · {o.territory}
          </div>
        </div>
        <div className="hstack">
          {o.status !== "livree" && (
            <button className="btn btn-primary" onClick={advance}>
              Faire avancer le statut <ArrowRight size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {o.refundStatus === "requested" && (
        <div
          style={{
            background: "#FDECEA",
            border: "1px solid #F2B8B5",
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: "#B02A37" }}>
              Ce client a une demande de remboursement en attente
            </div>
            <div style={{ fontSize: 13, color: "#8A2A2A", marginTop: 2 }}>
              {o.refundReason ? `« ${o.refundReason} » — ` : ""}
              traitez-la dans la section Paiement ci-dessous.
            </div>
          </div>
        </div>
      )}

      <div className="row-8-4">
        <div className="stack">
          <div className="card card-padded">
            <div className="card-title" style={{ marginBottom: 18 }}>Statut & expédition</div>
            <div className="stepper">
              {FLOW.map((s, i) => {
                const cls = i < currentIdx ? "step done" : i === currentIdx ? "step current" : "step";
                return (
                  <div key={s} className={cls}>
                    <div className="step-icon">{i <= currentIdx ? <Check size={14} strokeWidth={3} /> : <Truck size={14} strokeWidth={1.7} />}</div>
                    <div className="step-label" style={i > currentIdx ? { color: "var(--outline)" } : i === currentIdx ? { color: "var(--primary)" } : undefined}>{LABEL[s]}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--outline-soft)", alignItems: "end" }}>
              <div className="field">
                <label className="field-label">Date de livraison estimée</label>
                <input className="input" value={eta} onChange={(e) => setEta(e.target.value)} />
              </div>
              <button className="btn btn-outline btn-sm" onClick={saveEta}>Enregistrer</button>
            </div>
            <div className="hstack" style={{ marginTop: 22, gap: 10 }}>
              {o.status !== "expediee" && o.status !== "livree" && (
                <button className="btn btn-primary" onClick={ship}>
                  <Truck size={14} strokeWidth={1.7} /> <span>Marquer comme expédiée</span>
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Articles commandés</div>
              <span style={{ fontSize: 12, color: "var(--outline)" }}>{o.items.length} ligne(s)</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr><th>Article</th><th>Dimensions</th><th style={{ textAlign: "center" }}>Qté</th><th style={{ textAlign: "right" }}>P.U.</th><th style={{ textAlign: "right" }}>Total</th></tr>
                </thead>
                <tbody>
                  {o.items.map((it) => {
                    const photos = configPhotos(it.configuration);
                    const rows = configRecapRows(it.configuration);
                    const supplements = rows.reduce((n, r) => n + (r.priceCents ?? 0), 0);
                    const w = it.customDimensions?.width;
                    const h = it.customDimensions?.height;
                    // Both formulas actually in use bill width × height, so this
                    // is the surface the unit price was computed on.
                    const sqm = w && h ? (w * h) / 10000 : null;
                    return (
                      <Fragment key={it.id}>
                        <tr>
                          <td>
                            <div className="hstack" style={{ gap: 14 }}>
                              {it.product.images?.[0] && <div className="thumb" style={{ backgroundImage: `url(${it.product.images[0]})` }}></div>}
                              <div style={{ fontWeight: 500 }}>{it.product.name}</div>
                            </div>
                          </td>
                          <td>
                            {sqm ? (
                              <>
                                <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                                  {sqm.toFixed(2)} m² facturés
                                </div>
                                <div style={{ fontSize: 11, color: "var(--outline)" }}>
                                  {formatEnteredDimensions(it.customDimensions!)}
                                </div>
                              </>
                            ) : (
                              <span style={{ fontSize: 12.5, color: "var(--outline)" }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>{it.quantity}</td>
                          <td style={{ textAlign: "right" }} className="num">{formatEUR(it.price)}</td>
                          <td style={{ textAlign: "right" }} className="num">{formatEUR(it.price * it.quantity)}</td>
                        </tr>
                        {(rows.length > 0 || photos.length > 0) && (
                          <tr>
                            {/* Full width: the configuration is what the workshop
                                builds from, it must not be squeezed into a cell. */}
                            <td colSpan={5} style={{ background: "var(--surface-container-low)" }}>
                              <div
                                className="hstack"
                                style={{ justifyContent: "space-between", marginBottom: 10, gap: 12 }}
                              >
                                <span className="eyebrow">Configuration choisie par le client</span>
                                <Link
                                  href={`/orders/${o.id}/items/${it.id}`}
                                  className="btn btn-outline btn-sm"
                                >
                                  <Eye size={14} />
                                  <span>Voir en détail</span>
                                </Link>
                              </div>
                              <ConfigRecap config={it.configuration} />
                              {supplements > 0 && (
                                <div
                                  style={{
                                    marginTop: 10,
                                    fontSize: 12,
                                    color: "var(--on-surface-variant)",
                                  }}
                                >
                                  Suppléments inclus dans le prix unitaire :{" "}
                                  <strong>{formatEUR(supplements / 100)}</strong>
                                </div>
                              )}
                              {photos.length > 0 && (
                                <>
                                  <div className="eyebrow" style={{ margin: "16px 0 8px" }}>
                                    Photos envoyées par le client
                                  </div>
                                  <div className="hstack" style={{ gap: 8, flexWrap: "wrap" }}>
                                    {photos.map((url, i) => (
                                      <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Ouvrir en grand"
                                        style={{ width: 72, height: 72, borderRadius: 8, background: `url(${url}) center/cover`, display: "block", border: "1px solid var(--outline-variant)" }}
                                      />
                                    ))}
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "20px 24px", borderTop: "1px solid var(--outline-soft)", display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: 300, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--outline)" }}>Sous-total</span><span>{formatEUR(o.subtotal)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--outline)" }}>Livraison</span><span>{formatEUR(o.shippingCost)}</span></div>
                <div style={{ height: 1, background: "var(--outline-soft)", margin: "8px 0" }}></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600 }}>Total TTC</span>
                  <span style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 600, color: "var(--secondary)" }}>{formatEUR(o.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-padded">
            <div className="card-title" style={{ marginBottom: 18 }}>Adresse de livraison</div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>{o.shippingAddress.firstName} {o.shippingAddress.lastName}</div>
            <div style={{ fontSize: 13, color: "var(--on-surface-variant)", lineHeight: 1.6 }}>
              {o.shippingAddress.street}<br />{o.shippingAddress.postalCode} {o.shippingAddress.city}<br />{o.shippingAddress.country}
            </div>
            {o.shippingAddress.phone && (
              <div style={{ fontSize: 13, color: "var(--primary)", marginTop: 8 }}>
                📞 {o.shippingAddress.phone}
              </div>
            )}
          </div>

          <div className="card card-padded">
            <div className="card-title" style={{ marginBottom: 18 }}>Paiement</div>
            <div className="hstack" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div className="hstack" style={{ gap: 8, flexWrap: "wrap" }}>
                <span className={`pill ${o.paymentStatus === "refunded" ? "pill-warning" : o.paymentStatus === "paid" ? "pill-success" : "pill-navy"}`}>
                  {o.paymentStatus === "refunded" ? "Remboursée" : o.paymentStatus === "paid" ? "Payée" : o.paymentStatus === "failed" ? "Échec" : "Non payée"} · {formatEUR(o.total)}
                </span>
                {o.refundStatus && o.refundStatus !== "none" && (
                  <span className={`pill ${o.refundStatus === "refunded" ? "pill-success" : o.refundStatus === "rejected" ? "pill-warning" : "pill-prep"}`}>
                    Remb. {o.refundStatus === "requested" ? "demandé" : o.refundStatus === "refunded" ? "effectué" : "refusé"}
                  </span>
                )}
              </div>

              {/* Direct admin refund only when no customer request is pending and not already refunded */}
              {o.paymentStatus === "paid" &&
                (!o.refundStatus || o.refundStatus === "none") && (
                  <button className="btn btn-danger btn-sm" onClick={acceptRefund}>Rembourser</button>
                )}
            </div>

            {o.refundStatus === "requested" && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--outline-soft)" }}>
                <div style={{ fontSize: 12, color: "var(--outline)", marginBottom: 4 }}>
                  Demande de remboursement du client
                  {o.refundRequestedAt ? ` · ${new Date(o.refundRequestedAt).toLocaleString("fr-FR")}` : ""}
                </div>
                <div style={{ fontSize: 13, marginBottom: 14 }}>{o.refundReason || "— Aucun motif précisé —"}</div>
                <div className="hstack" style={{ gap: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={acceptRefund}>Accepter & rembourser</button>
                  <button className="btn btn-outline btn-sm" onClick={rejectRefund}>Refuser</button>
                </div>
              </div>
            )}

            {o.refundStatus === "refunded" && (
              <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--outline)" }}>
                {formatEUR(o.refundAmount ?? o.total)} remboursés{o.refundDecidedAt ? ` le ${new Date(o.refundDecidedAt).toLocaleDateString("fr-FR")}` : ""}.
              </div>
            )}
            {o.refundStatus === "rejected" && (
              <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--outline)" }}>
                Demande refusée{o.refundDecisionNote ? ` : ${o.refundDecisionNote}` : ""}.
              </div>
            )}
          </div>

          <div className="card card-padded">
            <div className="card-title" style={{ marginBottom: 18 }}>Notes internes</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {d.notes.map((n) => (
                <div key={n.id} style={{ display: "flex", gap: 12 }}>
                  <div className="avatar sm">AZ</div>
                  <div style={{ flex: 1, background: "var(--surface-container-low)", padding: "12px 14px", borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--outline)", marginBottom: 4 }}>{new Date(n.createdAt).toLocaleString("fr-FR")}</div>
                    <div style={{ fontSize: 13 }}>{n.body}</div>
                  </div>
                </div>
              ))}
              {d.notes.length === 0 && <div style={{ color: "var(--outline)", fontSize: 13 }}>Aucune note.</div>}
            </div>
            <textarea className="input-boxed" style={{ marginTop: 18, width: "100%", minHeight: 70 }} placeholder="Ajouter une note..." value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={addNote}>Ajouter la note</button>
          </div>
        </div>

        <div className="stack">
          <div className="card card-padded">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Client</div>
            <div style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 600 }}>{d.client?.name ?? "—"}</div>
            <div style={{ fontSize: 12, color: "var(--outline)", marginTop: 2 }}>{d.client?.accountType}</div>
            {d.client && (
              <Link href={`/customers/${d.client.id}`} className="btn btn-outline btn-sm" style={{ marginTop: 14 }}>
                Voir la fiche client
              </Link>
            )}
          </div>

          <div className="card card-padded">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Historique du statut</div>
            <div className="timeline">
              {o.timeline.filter((t) => t.completed).reverse().map((t, i) => (
                <div key={i} className="tl-row">
                  <span className="tl-dot" style={{ background: "var(--primary)" }}></span>
                  <div className="tl-text">
                    <div>{t.label}</div>
                    {t.timestamp && <div className="tl-meta">{new Date(t.timestamp).toLocaleString("fr-FR")}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
