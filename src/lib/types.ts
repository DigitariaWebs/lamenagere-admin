export type AccountType = "particulier" | "professionnel";

export type AdminRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "editor"
  | "support";

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  editor: "Éditeur",
  support: "Support",
};

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  lastActivityAt: string | null;
  createdAt: string;
}

export type ActivityKind =
  | "order"
  | "quote"
  | "message"
  | "product"
  | "customer"
  | "auth"
  | "campaign"
  | "system";

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  actorId: string | null;
  actorEmail: string | null;
  summary: string;
  entityRef: string | null;
  action: string | null;
  ipAddress: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface CurrentAdminUser {
  id: string;
  email: string;
  role: AdminRole;
  fullName: string;
}
export type ProductType = "standard" | "configurable" | "quote_only";
export type PriceMode = "fixed" | "calculated" | "per_sqm" | "quote";

export type ShippingZone =
  | "metropole"
  | "reunion"
  | "guadeloupe"
  | "martinique"
  | "guyane"
  | "mayotte";
export type OrderStatus =
  | "commande_confirmee"
  | "en_preparation"
  | "en_attente_expedition"
  | "expediee"
  | "livree";
export type QuoteStatus =
  | "en_attente_devis"
  | "devis_envoye"
  | "devis_accepte"
  | "devis_rejete";

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: string;
  productType: ProductType;
  price?: number;
  priceLabel: string;
  stock: "en_stock" | "stock_faible" | "rupture" | null;
  status: "publie" | "brouillon" | "archive";
  image: string;
}

export interface Order {
  id: string;
  client: string;
  clientInitials: string;
  b2b?: boolean;
  items: string;
  total: string;
  status: OrderStatus;
  statusLabel: string;
  image: string;
  createdAt: string;
  territory: ShippingZone;
}

export interface Quote {
  id: string;
  product: string;
  productImage: string;
  client: string;
  b2b?: boolean;
  dimensions?: string;
  status: QuoteStatus;
  statusLabel: string;
  quotedPrice?: string;
  createdAt: string;
  attachments?: number;
}

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  type: AccountType;
  company?: string;
  siret?: string;
  territory: ShippingZone;
  orders: number;
  totalSpent: string;
  lastActivity: string;
  createdAt: string;
  avatarInitials: string;
}

export interface Conversation {
  id: string;
  vendorName: string;
  subject: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  b2b?: boolean;
  pinnedEntity?: {
    kind: "order" | "quote";
    ref: string;
    label: string;
  };
  product?: {
    id: string;
    name: string;
    image?: string;
    priceLabel: string;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  sender: "admin" | "client";
  content: string;
  attachments?: { type: string; url: string }[];
  createdAt: string;
}
