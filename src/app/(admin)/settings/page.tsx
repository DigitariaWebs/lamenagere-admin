"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi, api } from "@/lib/api";

interface StoreSettings {
  storeName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  warehouseAddress: string | null;
  siret: string | null;
  tvaIntracom: string | null;
  tvaRate: number;
  freeShippingThreshold: number | null;
  autoShippingByWeight: boolean;
  maintenanceMode: boolean;
  /** Interrupteur général du verrou de version de l'app mobile. */
  forceUpdateEnabled: boolean;
  minAppVersionIos: string | null;
  minAppVersionAndroid: string | null;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
  forceUpdateMessage: string | null;
}
interface ZoneFee {
  zone: string;
  delay: string;
  fee: number;
  isActive: boolean;
}

const ZONE_LABEL: Record<string, string> = {
  metropole: "🇫🇷 Métropole",
  reunion: "🌴 La Réunion",
  mayotte: "🌴 Mayotte",
  guadeloupe: "🌴 Guadeloupe",
  martinique: "🌴 Martinique",
  guyane: "🌴 Guyane",
};

export default function SettingsPage() {
  const [s, setS] = useState<StoreSettings | null>(null);
  const [zones, setZones] = useState<ZoneFee[]>([]);
  const [savingStore, setSavingStore] = useState(false);
  const [savingShip, setSavingShip] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);

  async function load() {
    const res = (await adminApi.settings.get()) as {
      settings: StoreSettings;
      shippingZones: ZoneFee[];
    };
    setS(res.settings);
    setZones(res.shippingZones ?? []);
  }
  useEffect(() => {
    load().catch((e: { message?: string }) =>
      toast.error(e?.message ?? "Chargement impossible"),
    );
  }, []);

  function patch(p: Partial<StoreSettings>) {
    setS((cur) => (cur ? { ...cur, ...p } : cur));
  }

  async function saveStore() {
    if (!s) return;
    setSavingStore(true);
    try {
      await adminApi.settings.update({
        storeName: s.storeName,
        contactEmail: s.contactEmail,
        contactPhone: s.contactPhone,
        warehouseAddress: s.warehouseAddress,
        siret: s.siret,
        tvaIntracom: s.tvaIntracom,
        maintenanceMode: s.maintenanceMode,
      });
      toast.success("Boutique enregistrée");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec");
    } finally {
      setSavingStore(false);
    }
  }

  async function saveShipping() {
    if (!s) return;
    setSavingShip(true);
    try {
      await adminApi.settings.update({
        freeShippingThreshold: s.freeShippingThreshold,
        autoShippingByWeight: s.autoShippingByWeight,
      });
      for (const z of zones) {
        await api.put("/admin/settings/shipping-zone", {
          zone: z.zone,
          delay: z.delay,
          feeCents: Math.round(z.fee * 100),
          isActive: z.isActive,
        });
      }
      toast.success("Livraison enregistrée");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec");
    } finally {
      setSavingShip(false);
    }
  }

  async function saveVersion() {
    if (!s) return;
    setSavingVersion(true);
    try {
      await adminApi.settings.update({
        forceUpdateEnabled: s.forceUpdateEnabled,
        minAppVersionIos: s.minAppVersionIos ?? "",
        minAppVersionAndroid: s.minAppVersionAndroid ?? "",
        iosStoreUrl: s.iosStoreUrl ?? "",
        androidStoreUrl: s.androidStoreUrl ?? "",
        forceUpdateMessage: s.forceUpdateMessage ?? "",
      });
      toast.success("Verrou de version enregistré");
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Échec");
    } finally {
      setSavingVersion(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <div className="page-subtitle">Configurez votre boutique et la livraison</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        {/* Boutique (live) */}
        <div className="card card-padded">
          <div className="card-title" style={{ marginBottom: 6 }}>Boutique</div>
          <div style={{ fontSize: 12, color: "var(--outline)", marginBottom: 18 }}>Informations légales et contact</div>
          {s && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="field"><label className="field-label">Nom de la boutique</label>
                <input className="input" value={s.storeName ?? ""} onChange={(e) => patch({ storeName: e.target.value })} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="field"><label className="field-label">Email contact</label>
                  <input className="input" value={s.contactEmail ?? ""} onChange={(e) => patch({ contactEmail: e.target.value })} /></div>
                <div className="field"><label className="field-label">Téléphone</label>
                  <input className="input" value={s.contactPhone ?? ""} onChange={(e) => patch({ contactPhone: e.target.value })} /></div>
              </div>
              <div className="field"><label className="field-label">Adresse entrepôt</label>
                <textarea className="textarea" style={{ minHeight: 60 }} value={s.warehouseAddress ?? ""} onChange={(e) => patch({ warehouseAddress: e.target.value })} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="field"><label className="field-label">SIRET</label>
                  <input className="input mono" value={s.siret ?? ""} onChange={(e) => patch({ siret: e.target.value })} /></div>
                <div className="field"><label className="field-label">TVA intracom</label>
                  <input className="input mono" value={s.tvaIntracom ?? ""} onChange={(e) => patch({ tvaIntracom: e.target.value })} /></div>
              </div>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>Mode maintenance</div>
                  <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 2 }}>Affiche un écran maintenance dans l&apos;app</div>
                </div>
                <span className="switch"><input type="checkbox" checked={s.maintenanceMode} onChange={(e) => patch({ maintenanceMode: e.target.checked })} /><span className="slider"></span></span>
              </label>
              <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }} onClick={saveStore} disabled={savingStore}>
                {savingStore ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          )}
        </div>

        {/* Livraison (live) */}
        <div className="card card-padded">
          <div className="card-title" style={{ marginBottom: 6 }}>Livraison</div>
          <div style={{ fontSize: 12, color: "var(--outline)", marginBottom: 18 }}>Délais et frais par zone</div>
          <table className="tbl" style={{ marginBottom: 14 }}>
            <thead><tr><th>Zone</th><th>Délai</th><th style={{ textAlign: "right" }}>Frais (€)</th></tr></thead>
            <tbody>
              {zones.map((z, i) => (
                <tr key={z.zone}>
                  <td>{ZONE_LABEL[z.zone] ?? z.zone}</td>
                  <td>
                    <input className="input" style={{ height: 32, fontSize: 12 }} value={z.delay}
                      onChange={(e) => setZones((zs) => zs.map((x, j) => (j === i ? { ...x, delay: e.target.value } : x)))} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <input className="input num" style={{ height: 32, width: 90, textAlign: "right", fontSize: 12 }} type="number" value={z.fee}
                      onChange={(e) => setZones((zs) => zs.map((x, j) => (j === i ? { ...x, fee: Number(e.target.value) } : x)))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {s && (
            <>
              <div className="field" style={{ marginBottom: 14 }}>
                <label className="field-label">Seuil franco de port (€)</label>
                <input className="input" type="number" value={s.freeShippingThreshold ?? 0}
                  onChange={(e) => patch({ freeShippingThreshold: Number(e.target.value) })} />
              </div>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 13 }}>Calcul auto selon poids/volume</span>
                <span className="switch"><input type="checkbox" checked={s.autoShippingByWeight} onChange={(e) => patch({ autoShippingByWeight: e.target.checked })} /><span className="slider"></span></span>
              </label>
            </>
          )}
          <button className="btn btn-primary btn-sm" onClick={saveShipping} disabled={savingShip}>
            {savingShip ? "Enregistrement…" : "Enregistrer la livraison"}
          </button>
        </div>

        {/* Verrou de version de l'app mobile (mise à jour forcée) */}
        <div className="card card-padded" style={{ gridColumn: "1 / -1" }}>
          <div className="card-title" style={{ marginBottom: 6 }}>Application mobile — mise à jour forcée</div>
          <div style={{ fontSize: 12, color: "var(--outline)", marginBottom: 18 }}>
            Bloque les versions trop anciennes sur un écran « Mise à jour requise ». À utiliser
            quand une faille est corrigée dans une nouvelle version.
          </div>
          {s && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>Activer le verrou</div>
                  <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 2 }}>
                    Une fois activé, toute version inférieure au minimum ci-dessous ne peut plus
                    ouvrir l&apos;application.
                  </div>
                </div>
                <span className="switch"><input type="checkbox" checked={s.forceUpdateEnabled} onChange={(e) => patch({ forceUpdateEnabled: e.target.checked })} /><span className="slider"></span></span>
              </label>

              {s.forceUpdateEnabled && (
                <div style={{ fontSize: 12, lineHeight: 1.5, padding: "10px 12px", borderRadius: 8, background: "rgba(245, 158, 11, 0.12)", color: "var(--foreground)" }}>
                  ⚠️ N&apos;activez le verrou qu&apos;une fois la nouvelle version <strong>réellement
                  disponible au téléchargement</strong> sur les deux stores. Une version encore en
                  revue App Store ou en déploiement progressif Play laisserait les utilisateurs
                  bloqués sans pouvoir mettre à jour.
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="field">
                  <label className="field-label">Version minimale iOS</label>
                  <input className="input mono" placeholder="1.3.0" value={s.minAppVersionIos ?? ""}
                    onChange={(e) => patch({ minAppVersionIos: e.target.value })} />
                  <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 4 }}>Vide = aucun blocage sur iOS</div>
                </div>
                <div className="field">
                  <label className="field-label">Version minimale Android</label>
                  <input className="input mono" placeholder="1.3.0" value={s.minAppVersionAndroid ?? ""}
                    onChange={(e) => patch({ minAppVersionAndroid: e.target.value })} />
                  <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 4 }}>Vide = aucun blocage sur Android</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="field">
                  <label className="field-label">Lien App Store</label>
                  <input className="input" placeholder="https://apps.apple.com/app/id…" value={s.iosStoreUrl ?? ""}
                    onChange={(e) => patch({ iosStoreUrl: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label">Lien Google Play</label>
                  <input className="input" placeholder="https://play.google.com/store/apps/details?id=…" value={s.androidStoreUrl ?? ""}
                    onChange={(e) => patch({ androidStoreUrl: e.target.value })} />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Message affiché (optionnel)</label>
                <textarea className="textarea" style={{ minHeight: 60 }}
                  placeholder="Laissez vide pour le message par défaut de l'application."
                  value={s.forceUpdateMessage ?? ""}
                  onChange={(e) => patch({ forceUpdateMessage: e.target.value })} />
              </div>

              <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }} onClick={saveVersion} disabled={savingVersion}>
                {savingVersion ? "Enregistrement…" : "Enregistrer le verrou"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
