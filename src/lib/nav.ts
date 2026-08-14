import {
  LayoutGrid,
  Package,
  ShoppingCart,
  FileText,
  MessageSquare,
  Users,
  FolderTree,
  Star,
  Ticket,
  Bell,
  Settings,
  BarChart3,
  LifeBuoy,
  ShieldCheck,
  Activity,
  ImagePlay,
  Images,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeClass?: "warn" | "accent";
};

export const NAV: NavItem[] = [
  { key: "dashboard", label: "Tableau de bord", href: "/dashboard", icon: LayoutGrid },
  { key: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
  { key: "products", label: "Produits", href: "/products", icon: Package, badge: "32" },
  { key: "orders", label: "Commandes", href: "/orders", icon: ShoppingCart, badge: "12", badgeClass: "warn" },
  { key: "quotes", label: "Devis", href: "/quotes", icon: FileText, badge: "12", badgeClass: "accent" },
  { key: "messages", label: "Messages", href: "/messages", icon: MessageSquare, badge: "5", badgeClass: "warn" },
  { key: "tickets", label: "Tickets SAV", href: "/tickets", icon: LifeBuoy },
  { key: "customers", label: "Clients", href: "/customers", icon: Users },
  { key: "categories", label: "Catégories", href: "/categories", icon: FolderTree },
  { key: "gallery", label: "Galerie", href: "/gallery", icon: Images },
  { key: "featured", label: "Mise en avant", href: "/featured", icon: Star },
  { key: "popups", label: "Pop-ups", href: "/popups", icon: ImagePlay },
  { key: "promoCodes", label: "Codes promo", href: "/promo-codes", icon: Ticket },
  { key: "campaigns", label: "Campagnes", href: "/campaigns", icon: Bell },
  { key: "settings", label: "Paramètres", href: "/settings", icon: Settings },
  { key: "users", label: "Utilisateurs", href: "/users", icon: ShieldCheck },
  { key: "activity", label: "Journal d'activité", href: "/activity", icon: Activity },
];

export type Crumb = { label: string; href?: string };

const STATIC_CRUMBS: Record<string, Crumb[]> = {
  "/dashboard": [{ label: "Tableau de bord" }],
  "/analytics": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Analytics" },
  ],
  "/products": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Produits" },
  ],
  "/products/new": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Produits", href: "/products" },
    { label: "Nouveau" },
  ],
  "/orders": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Commandes" },
  ],
  "/quotes": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Devis" },
  ],
  "/messages": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Messages" },
  ],
  "/tickets": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Tickets SAV" },
  ],
  "/customers": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Clients" },
  ],
  "/gallery": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Galerie" },
  ],
  "/categories": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Catégories" },
  ],
  "/featured": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Mise en avant" },
  ],
  "/popups": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Pop-ups" },
  ],
  "/promo-codes": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Codes promo" },
  ],
  "/campaigns": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Campagnes" },
  ],
  "/settings": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Paramètres" },
  ],
  "/users": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Utilisateurs" },
  ],
  "/activity": [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Journal d'activité" },
  ],
};

export function getBreadcrumb(pathname: string): Crumb[] {
  if (STATIC_CRUMBS[pathname]) return STATIC_CRUMBS[pathname];
  // Dynamic routes
  if (pathname.startsWith("/products/")) {
    return [
      { label: "Tableau de bord", href: "/dashboard" },
      { label: "Produits", href: "/products" },
      { label: "Modifier" },
    ];
  }
  if (pathname.startsWith("/orders/")) {
    const id = pathname.split("/").pop() ?? "";
    return [
      { label: "Tableau de bord", href: "/dashboard" },
      { label: "Commandes", href: "/orders" },
      { label: `#${id}` },
    ];
  }
  if (pathname.startsWith("/quotes/")) {
    const id = pathname.split("/").pop() ?? "";
    return [
      { label: "Tableau de bord", href: "/dashboard" },
      { label: "Devis", href: "/quotes" },
      { label: `#${id}` },
    ];
  }
  if (pathname.startsWith("/messages/")) {
    return [
      { label: "Tableau de bord", href: "/dashboard" },
      { label: "Messages", href: "/messages" },
      { label: "Conversation" },
    ];
  }
  if (pathname.startsWith("/customers/")) {
    return [
      { label: "Tableau de bord", href: "/dashboard" },
      { label: "Clients", href: "/customers" },
      { label: "Fiche client" },
    ];
  }
  return [{ label: "Tableau de bord" }];
}

export function getActiveKey(pathname: string): string {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/products")) return "products";
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/quotes")) return "quotes";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/tickets")) return "tickets";
  if (pathname.startsWith("/customers")) return "customers";
  if (pathname.startsWith("/categories")) return "categories";
  if (pathname.startsWith("/featured")) return "featured";
  if (pathname.startsWith("/popups")) return "popups";
  if (pathname.startsWith("/promo-codes")) return "promoCodes";
  if (pathname.startsWith("/campaigns")) return "campaigns";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/users")) return "users";
  if (pathname.startsWith("/activity")) return "activity";
  return "";
}
