import { AdminRole } from "./types";
import { NAV } from "./nav";

/**
 * Modules accessibles par rôle.
 * Doit rester aligné avec les guards `@Roles(...)` des contrôleurs
 * `server/src/modules/admin/*` — c'est le back-end qui fait foi.
 */
export const ROLE_NAV_KEYS: Record<AdminRole, string[]> = {
  super_admin: ["dashboard", "analytics", "products", "orders", "quotes", "messages", "tickets", "customers", "categories", "featured", "popups", "promoCodes", "campaigns", "settings", "users", "activity"],
  admin: ["dashboard", "analytics", "products", "orders", "quotes", "messages", "tickets", "customers", "categories", "featured", "popups", "promoCodes", "campaigns", "activity"],
  manager: ["dashboard", "orders", "quotes", "messages", "tickets", "customers"],
  editor: ["dashboard", "products", "categories", "featured", "popups", "campaigns"],
  support: ["dashboard", "messages", "tickets", "customers"],
};

/** Rôles que le super admin peut attribuer (le super_admin n'est pas attribuable). */
export const GRANTABLE_ROLES: AdminRole[] = ["admin", "manager", "editor", "support"];

export interface RoleDoc {
  /** Résumé en une phrase, affiché sous le sélecteur de rôle. */
  summary: string;
  /** Ce que la personne fait au quotidien. */
  can: string[];
  /** Limites explicites, pour lever toute ambiguïté. */
  cannot: string[];
}

export const ROLE_DOCS: Record<AdminRole, RoleDoc> = {
  super_admin: {
    summary:
      "Accès total, sans restriction. Seul rôle capable de gérer l'équipe et les paramètres de la boutique.",
    can: [
      "Tous les modules du CRM",
      "Créer, modifier et révoquer les comptes administrateurs",
      "Modifier les paramètres de la boutique",
      "Consulter le journal d'activité de toute l'équipe",
    ],
    cannot: [],
  },
  admin: {
    summary:
      "Bras droit du super admin : pilote tout le CRM au quotidien, sans toucher à l'équipe ni aux réglages de la boutique.",
    can: [
      "Catalogue complet : produits, catégories, mises en avant, pop-ups",
      "Commandes, devis, remboursements",
      "Messages, tickets SAV et fiches clients",
      "Codes promo, campagnes de notification et analytics",
      "Consulter le journal d'activité",
    ],
    cannot: [
      "Créer ou révoquer des utilisateurs administrateurs",
      "Modifier les paramètres de la boutique",
    ],
  },
  manager: {
    summary:
      "Exploitation commerciale : traite les commandes, les devis et la relation client. N'intervient pas sur le catalogue.",
    can: [
      "Traiter les commandes : statuts, livraisons, remboursements",
      "Créer, chiffrer et envoyer les devis",
      "Répondre aux messages clients et aux tickets SAV",
      "Consulter et modifier les fiches clients",
    ],
    cannot: [
      "Créer ou modifier des produits, catégories ou mises en avant",
      "Gérer les codes promo, pop-ups et campagnes",
      "Accéder aux analytics, aux paramètres et aux utilisateurs",
    ],
  },
  editor: {
    summary:
      "Contenu & catalogue : construit et met à jour la vitrine de l'application. Ne voit ni les commandes ni les clients.",
    can: [
      "Créer et modifier les produits, prix, options et photos",
      "Organiser les catégories et les mises en avant de la page d'accueil",
      "Publier les pop-ups marketing",
      "Envoyer les campagnes de notification",
    ],
    cannot: [
      "Voir ou traiter les commandes et les devis",
      "Accéder aux messages, tickets SAV et fiches clients",
      "Gérer les codes promo, les analytics, les paramètres et les utilisateurs",
    ],
  },
  support: {
    summary:
      "Service client : répond aux messages et aux tickets SAV. Lecture seule côté commercial, aucun accès au catalogue.",
    can: [
      "Répondre aux conversations clients",
      "Prendre en charge et résoudre les tickets SAV",
      "Consulter les fiches clients et leur historique",
    ],
    cannot: [
      "Traiter les commandes, les devis et les remboursements",
      "Modifier le catalogue (produits, catégories, mises en avant)",
      "Gérer les codes promo, pop-ups, campagnes et analytics",
      "Accéder aux paramètres et aux utilisateurs",
    ],
  },
};

/** Modules du CRM, dans l'ordre de la navigation, pour la matrice des permissions. */
export const PERMISSION_MODULES: { key: string; label: string; hint: string }[] = [
  { key: "dashboard", label: "Tableau de bord", hint: "Vue d'ensemble et indicateurs du jour" },
  { key: "analytics", label: "Analytics", hint: "Chiffre d'affaires, conversion, rapports" },
  { key: "products", label: "Produits", hint: "Catalogue, prix, options, photos" },
  { key: "categories", label: "Catégories", hint: "Arborescence du catalogue" },
  { key: "featured", label: "Mise en avant", hint: "Sélections de la page d'accueil" },
  { key: "popups", label: "Pop-ups", hint: "Visuels marketing au lancement de l'app" },
  { key: "orders", label: "Commandes", hint: "Suivi, statuts, remboursements" },
  { key: "quotes", label: "Devis", hint: "Demandes sur mesure et chiffrage" },
  { key: "messages", label: "Messages", hint: "Conversations clients" },
  { key: "tickets", label: "Tickets SAV", hint: "Réclamations après-vente" },
  { key: "customers", label: "Clients", hint: "Fiches, historique, comptes pro" },
  { key: "promoCodes", label: "Codes promo", hint: "Remises et conditions d'usage" },
  { key: "campaigns", label: "Campagnes", hint: "Notifications push" },
  { key: "activity", label: "Journal d'activité", hint: "Traçabilité des actions de l'équipe" },
  { key: "settings", label: "Paramètres", hint: "Réglages de la boutique" },
  { key: "users", label: "Utilisateurs", hint: "Comptes et rôles de l'équipe" },
];

export function roleHasModule(role: AdminRole, moduleKey: string): boolean {
  return (ROLE_NAV_KEYS[role] ?? []).includes(moduleKey);
}

/** Libellés des modules accessibles à un rôle, pour les résumés courts. */
export function roleModuleLabels(role: AdminRole): string[] {
  const keys = ROLE_NAV_KEYS[role] ?? [];
  return NAV.filter((n) => keys.includes(n.key)).map((n) => n.label);
}
