export interface Extra {
  nameAr: string;
  nameEn: string;
  priceSYP: number;
}

export interface Product {
  id: string;
  storeId: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  category: string;
  priceSYP: number;
  image: string;
  inStock: boolean;
  isHidden: boolean;
  extras: Extra[];
}

export interface DeliveryZone {
  zoneAr: string;
  zoneEn: string;
  feeSYP: number;
}

export interface Store {
  id: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  phone: string;
  whatsapp: string;
  logo: string;
  banner: string;
  workingHours: string;
  isOpen: boolean;
  deliveryZones: DeliveryZone[];
  rating: number;
  reviewsCount: number;
  couponCode?: string;
  couponDiscountPercent?: number;
  plan: "Free" | "Gold";
  subscriptionExpires: string;
  subscriptionType?: "monthly" | "annual";
  subscriptionMonths?: number;
  branches: string[];
  loyaltyPointsPer10k: number;
  printerIp?: string;
  isApproved?: boolean;
  isSuspended?: boolean;
  requestedUpgrade?: boolean;
  paymentReference?: string;
  paymentMethod?: string;
  pendingPaymentMethod?: string;
  pendingPaymentReference?: string;
  pendingUpgradeType?: "monthly" | "annual";
  pendingUpgradeMonths?: number;
  createdAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedExtras: Extra[];
  itemNotes?: string;
}

export interface Order {
  id: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string;
  deliveryZone: DeliveryZone;
  items: CartItem[];
  paymentMethod: "cash" | "syriatel_cash" | "mtn_cash" | "bank";
  subtotalSYP: number;
  discountSYP: number;
  deliveryFeeSYP: number;
  totalSYP: number;
  status: "pending" | "accepted" | "preparing" | "delivering" | "delivered" | "cancelled";
  driverName?: string;
  driverPhone?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
  pointsEarned: number;
  invoiceNumber: string;
}

export interface User {
  username: string;
  role: "super_admin" | "restaurant_owner" | "customer";
  storeId?: string;
  email: string;
}

export interface CurrencyRates {
  USD: number;
  EUR: number;
  TRY: number;
}
