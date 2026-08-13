"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import { formatEUR } from "@/lib/format";
import { formatEnteredDimensions, type AreaDimensions } from "@/lib/area-formulas";
import { OrderConfigView, type ConfigEntry } from "@/components/OrderConfigView";

interface Item {
  id: string;
  product: { id?: string; name: string; images: string[] };
  quantity: number;
  price: number;
  customDimensions?: AreaDimensions;
  configuration?: ConfigEntry[];
}
interface Detail {
  order: { id: string; orderNumber: string; items: Item[] };
}

/**
 * Everything one ordered line was configured with, shown the way the customer
 * saw it. The order page lists the choices as text so it stays scannable; this
 * is where the workshop comes to actually read a made-to-measure order.
 */
export default function OrderItemConfigPage() {
  const params = useParams<{ id: string; itemId: string }>();
  const [d, setD] = useState<Detail | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    adminApi.orders
      .detail(params.id)
      .then((r) => setD(r as Detail))
      .catch((e: { message?: string }) => toast.error(e?.message ?? "Commande introuvable"));
  }, [params?.id]);

  if (!d) {
    return (
      <div className="page">
        <div className="skel" style={{ height: 28, width: 260, marginBottom: 24 }} />
        <div className="skel" style={{ height: 220, borderRadius: 14 }} />
      </div>
    );
  }

  const item = d.order.items.find((i) => i.id === params.itemId);
  if (!item) {
    return (
      <div className="page">
        <div className="card card-padded">Ligne de commande introuvable.</div>
      </div>
    );
  }

  const w = item.customDimensions?.width;
  const h = item.customDimensions?.height;
  const sqm = w && h ? (w * h) / 10000 : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="hstack" style={{ gap: 10 }}>
            <Link
              href={`/orders/${params.id}`}
              className="icon-btn"
              style={{ width: 32, height: 32 }}
              aria-label="Retour à la commande"
            >
              <ArrowLeft size={17} />
            </Link>
            <h1 className="page-title" style={{ fontSize: 28 }}>
              Configuration
            </h1>
          </div>
          <div className="page-subtitle">
            {item.product.name} · commande {d.order.orderNumber}
          </div>
        </div>
        {item.product.id && (
          <Link href={`/products/${item.product.id}`} className="btn btn-outline btn-sm">
            Voir la fiche produit
          </Link>
        )}
      </div>

      <div className="row-8-4">
        <OrderConfigView config={item.configuration} />

        <div className="stack">
          <div className="card card-padded">
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              La ligne
            </div>
            {item.product.images?.[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.product.images[0]}
                alt={item.product.name}
                style={{
                  width: "100%",
                  aspectRatio: "4 / 3",
                  objectFit: "cover",
                  borderRadius: 12,
                  marginBottom: 14,
                }}
              />
            )}
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{item.product.name}</div>
            <div className="divider" style={{ margin: "14px 0" }} />
            <Row label="Quantité" value={String(item.quantity)} />
            {sqm && <Row label="Surface facturée" value={`${sqm.toFixed(2)} m²`} />}
            {item.customDimensions && (
              <Row label="Cotes retenues" value={formatEnteredDimensions(item.customDimensions)} />
            )}
            <Row label="Prix unitaire" value={formatEUR(item.price)} />
            <Row label="Total ligne" value={formatEUR(item.price * item.quantity)} strong />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0" }}>
      <span style={{ fontSize: 13, color: "var(--outline)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: strong ? 700 : 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}
