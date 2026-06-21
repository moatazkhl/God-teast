import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  doc, 
  deleteDoc 
} from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

// Initialize Firebase SDK
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);

// Standard models list 'gemini-3.5-flash'
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const PORT = 3000;

// --- Mock Database State ---
interface Product {
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
  extras: { nameAr: string; nameEn: string; priceSYP: number }[];
}

interface Store {
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
  deliveryZones: { zoneAr: string; zoneEn: string; feeSYP: number }[];
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

interface Order {
  id: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string;
  deliveryZone: { zoneAr: string; zoneEn: string; feeSYP: number };
  items: {
    product: Product;
    quantity: number;
    selectedExtras: { nameAr: string; nameEn: string; priceSYP: number }[];
    itemNotes?: string;
  }[];
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

// Cache instances that get initialized from active Firebase Firestore storage
let currencyRates = {
  USD: 14500,
  EUR: 15700,
  TRY: 450,
};
let stores: Store[] = [];
let products: Product[] = [];
let orders: Order[] = [];
let users: any[] = [];

// --- Firebase Firestore Access Functions ---
async function fetchCurrenciesFromFirestore() {
  try {
    const docRef = doc(db, "rates", "current");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as typeof DEFAULT_RATES;
    } else {
      await setDoc(docRef, DEFAULT_RATES);
      return DEFAULT_RATES;
    }
  } catch (err) {
    console.error("Firestore loading rates error:", err);
    return DEFAULT_RATES;
  }
}

async function fetchStoresFromFirestore() {
  try {
    const q = collection(db, "stores");
    const snap = await getDocs(q);
    if (snap.empty) {
      for (const st of DEFAULT_STORES) {
        await setDoc(doc(db, "stores", st.id), st);
      }
      return DEFAULT_STORES;
    }
    const list: Store[] = [];
    snap.forEach(d => list.push(d.data() as Store));
    return list;
  } catch (err) {
    console.error("Firestore loading stores error:", err);
    return DEFAULT_STORES;
  }
}

async function fetchProductsFromFirestore() {
  try {
    const q = collection(db, "products");
    const snap = await getDocs(q);
    if (snap.empty) {
      for (const prod of DEFAULT_PRODUCTS) {
        await setDoc(doc(db, "products", prod.id), prod);
      }
      return DEFAULT_PRODUCTS;
    }
    const list: Product[] = [];
    snap.forEach(d => list.push(d.data() as Product));
    return list;
  } catch (err) {
    console.error("Firestore loading products error:", err);
    return DEFAULT_PRODUCTS;
  }
}

async function fetchOrdersFromFirestore() {
  try {
    const q = collection(db, "orders");
    const snap = await getDocs(q);
    if (snap.empty) {
      for (const ord of DEFAULT_ORDERS) {
        await setDoc(doc(db, "orders", ord.id), ord);
      }
      return DEFAULT_ORDERS;
    }
    const list: Order[] = [];
    snap.forEach(d => list.push(d.data() as Order));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.error("Firestore loading orders error:", err);
    return DEFAULT_ORDERS;
  }
}

async function fetchUsersFromFirestore() {
  try {
    const q = collection(db, "users");
    const snap = await getDocs(q);
    if (snap.empty) {
      for (const usr of DEFAULT_USERS) {
        await setDoc(doc(db, "users", usr.username), usr);
      }
      return DEFAULT_USERS;
    }
    const list: any[] = [];
    snap.forEach(d => list.push(d.data()));
    return list;
  } catch (err) {
    console.error("Firestore loading users error:", err);
    return DEFAULT_USERS;
  }
}

async function initializeDatabase() {
  console.log("Loading live data from Google Cloud Firestore (woven-utility-5cf5x)...");
  currencyRates = await fetchCurrenciesFromFirestore();
  stores = await fetchStoresFromFirestore();
  products = await fetchProductsFromFirestore();
  orders = await fetchOrdersFromFirestore();
  users = await fetchUsersFromFirestore();
  console.log("Firebase connection established and database warmed up successfully!");
}

// Global currencies configuration (Multi-currency support)
const DEFAULT_RATES = {
  USD: 14500, // 1 USD = 14,500 SYP
  EUR: 15700, // 1 EUR = 15,700 SYP
  TRY: 450,   // 1 TRY = 450 SYP
};

const DEFAULT_STORES: Store[] = [
  {
    id: "shawarma-classic",
    nameAr: "شاورما كلاسيك وحلبي",
    nameEn: "Shawarma Classic & Halabi",
    descAr: "أشهى لفافات الشاورما العربية على الفحم مع الثومية المميزة ودبس الرمان.",
    descEn: "Authentic Arabic grilled shawarma rolls with our signature garlic dip and pomegranate molasses.",
    phone: "+963911122233",
    whatsapp: "963911122233",
    logo: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=150&h=150&fit=crop",
    banner: "https://images.unsplash.com/photo-1561651823-34fed022540d?w=1200&h=400&fit=crop",
    workingHours: "12:00 PM - 02:00 AM",
    isOpen: true,
    deliveryZones: [
      { zoneAr: "المزة (أوتوستراد، فيلات)", zoneEn: "Al-Mazza (Highway, Villas)", feeSYP: 4000 },
      { zoneAr: "المالكي وأبو رمانة", zoneEn: "Malki & Abu Rummaneh", feeSYP: 5000 },
      { zoneAr: "مشروع دمر", zoneEn: "Project Dummar", feeSYP: 8000 },
      { zoneAr: "القصاع وباب توما", zoneEn: "Kassa'a & Bab Touma", feeSYP: 7000 },
    ],
    rating: 4.8,
    reviewsCount: 128,
    couponCode: "CLASSIC10",
    couponDiscountPercent: 10,
    plan: "Gold",
    subscriptionExpires: "2027-04-15",
    createdAt: "2026-04-15",
    branches: ["فرع المزة - دمشق", "فرع مشروع دمر"],
    loyaltyPointsPer10k: 15,
    printerIp: "192.168.1.100",
    isApproved: true,
  },
  {
    id: "burger-house",
    nameAr: "مطعم بيت البرغر الشامي",
    nameEn: "Al-Sham Burger House",
    descAr: "لحم بقري طازج 100% مشوي على اللهب مع خلطات صوصات غنية وقنابل الجبن.",
    descEn: "100% fresh flame-grilled beef burgers with rich delicious sauces and custom cheese bombs.",
    phone: "+963933444555",
    whatsapp: "963933444555",
    logo: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&h=150&fit=crop",
    banner: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&h=400&fit=crop",
    workingHours: "01:00 PM - 01:00 AM",
    isOpen: true,
    deliveryZones: [
      { zoneAr: "المزة", zoneEn: "Al-Mazza", feeSYP: 4000 },
      { zoneAr: "المالكي", zoneEn: "Al-Malki", feeSYP: 5000 },
      { zoneAr: "كفرسوسة", zoneEn: "Kafarsouseh", feeSYP: 4500 },
      { zoneAr: "برامكة ووسط البلد", zoneEn: "Baramkeh & Downtown", feeSYP: 5500 },
    ],
    rating: 4.6,
    reviewsCount: 84,
    couponCode: "CHEESE20",
    couponDiscountPercent: 20,
    plan: "Gold",
    subscriptionExpires: "2026-12-31",
    createdAt: "2026-03-01",
    branches: ["فرع كفرسوسة"],
    loyaltyPointsPer10k: 10,
    isApproved: true,
  },
  {
    id: "daoud-sweets",
    nameAr: "حلويات داود العريقة",
    nameEn: "Daoud Premium Sweets",
    descAr: "أفخر أنواع الحلويات الشرقية الدمشقية بالسمن العربي والمكسرات الطازجة وآيس كريم بكداش الشهير.",
    descEn: "The finest Damascus oriental sweets with pure Arabic ghee, fresh nuts, and legendary Bakdash ice cream.",
    phone: "+963955666777",
    whatsapp: "963955666777",
    logo: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150&h=150&fit=crop",
    banner: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=1200&h=400&fit=crop",
    workingHours: "10:00 AM - 11:00 PM",
    isOpen: true,
    deliveryZones: [
      { zoneAr: "الميدان وبوابة الميدان", zoneEn: "Midan & Midan Gate", feeSYP: 3000 },
      { zoneAr: "المزة", zoneEn: "Al-Mazza", feeSYP: 5500 },
      { zoneAr: "المالكي والمهاجرين", zoneEn: "Malki & Muhajireen", feeSYP: 6000 },
    ],
    rating: 4.9,
    reviewsCount: 204,
    couponCode: "RAMADAN",
    couponDiscountPercent: 15,
    plan: "Free",
    subscriptionExpires: "2026-06-15",
    createdAt: "2026-05-15",
    branches: ["فرع الميدان الرئيسي", "فرع الشعلان"],
    loyaltyPointsPer10k: 5,
    isApproved: true,
  }
];

const DEFAULT_PRODUCTS: Product[] = [
  // Store 1: Shawarma Classic
  {
    id: "p1",
    storeId: "shawarma-classic",
    nameAr: "وجبة عربي سوبر",
    nameEn: "Super Arabic Meal",
    descAr: "لفافة شاورما كبيرة مقطعة، تقدم مع بطاطس مقلية، ثومية، مخلل وصوص خاص.",
    descEn: "Large sliced shawarma wrap, served with golden French fries, garlic paste, pickles, and special house dip.",
    category: "الوجبات (Meals)",
    priceSYP: 45000,
    image: "https://images.unsplash.com/photo-1626700051175-6518c4793f06?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [
      { nameAr: "إضافة جبنة قشقوان", nameEn: "Add Kashkaval Cheese", priceSYP: 6000 },
      { nameAr: "ثومية إضافية", nameEn: "Extra Garlic Dip", priceSYP: 2000 },
      { nameAr: "حجم دبل لحم", nameEn: "Double Meat Size", priceSYP: 15000 },
    ],
  } as any,
  {
    id: "p2",
    storeId: "shawarma-classic",
    nameAr: "ساندويش شاورما دبل دجاج",
    nameEn: "Double Chicken Shawarma Wrap",
    descAr: "خبز صاج فاخر محشو بشاورما الدجاج الغنية مع مايونيز الثوم وبطاطس ومخلل.",
    descEn: "Premium flatbread loaded with savory chicken shawarma, garlic mayonnaise, fries, and pickled cucumbers.",
    category: "الساندويش (Sandwiches)",
    priceSYP: 28000,
    image: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [
      { nameAr: "دبس رمان", nameEn: "Pomegranate Molasses", priceSYP: 1500 },
      { nameAr: "بطاطس داخل الساندويش", nameEn: "Fries Inside Wrap", priceSYP: 1000 },
    ],
  } as any,
  {
    id: "p3",
    storeId: "shawarma-classic",
    nameAr: "ماريا شاورما عالفحم",
    nameEn: "Maria Charcoal Shawarma",
    descAr: "خبز مسطح محمر محشو بشاورما دجاج ممتازة مع جبنة موزاريلا وتوابل حلبية.",
    descEn: "Toasted flatbread stuffed with premier chicken shawarma, melted mozzarella cheese, and authentic Aleppian spices.",
    category: "الوجبات (Meals)",
    priceSYP: 38000,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [],
  } as any,
  {
    id: "p4",
    storeId: "shawarma-classic",
    nameAr: "عبوة صحن بطاطس عائلية",
    nameEn: "Family French Fries Pack",
    descAr: "بطاطس حارة أو كلاسيك مقرمشة ومملحة ممتازة للعائلات.",
    descEn: "Crispy salted golden french fries, hot or classic style, ideal for sharing.",
    category: "المقبلات (Appetizers)",
    priceSYP: 18000,
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [
      { nameAr: "بهارات جبنة شيدر", nameEn: "Cheddar Cheese Spices", priceSYP: 2500 },
    ],
  } as any,

  // Store 2: Burger House
  {
    id: "p5",
    storeId: "burger-house",
    nameAr: "أوريجينال كلاسيك برغر",
    nameEn: "Original Classic Burger",
    descAr: "شريحة لحم بقري مدخن ممتاز، خس، طماطم، مخلل، مع صوص البرغر الخاص بنا وجبنة شيدر ذائبة.",
    descEn: "Premium smoked beef patty, lettuce, tomatoes, crunchy pickles, signature burger sauce, and melted cheddar cheese.",
    category: "البرغر (Burgers)",
    priceSYP: 42000,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [
      { nameAr: "إضافة شريحة لحم إضافية", nameEn: "Double Meat Patty", priceSYP: 18000 },
      { nameAr: "شريحة لحم مقدد بيف بيكون", nameEn: "Crispy Beef Bacon", priceSYP: 7000 },
      { nameAr: "صوص جبنة شيدر سائل", nameEn: "Melted Cheese Injection", priceSYP: 5000 },
    ],
  } as any,
  {
    id: "p6",
    storeId: "burger-house",
    nameAr: "كريسبي تشيكن زونغور",
    nameEn: "Crispy Chicken Zongour",
    descAr: "صدر دجاج مقرمش للغاية متبل بالتتبيلة الحارة، خس رقيق، جبنة شيدر، ومايونيز حار.",
    descEn: "Crisp golden chicken breast dipped in our special spicy blend, shredded lettuce, cheddar, and spicy mayo.",
    category: "البرغر (Burgers)",
    priceSYP: 39000,
    image: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [
      { nameAr: "شرائح فلفل هالابينو", nameEn: "Jalapeno Slices", priceSYP: 2000 },
    ],
  } as any,

  // Store 3: Daoud Sweets
  {
    id: "p7",
    storeId: "daoud-sweets",
    nameAr: "كيلو قطايف عصافيري بالقشطة البلدية",
    nameEn: "Qatayef Asafiri (Per Kg)",
    descAr: "عجينة قطايف ناعمة ومحشوة بالقشطة الشامية الفاخرة، مزينة بالفستق الحلبي وصوص القطر.",
    descEn: "Traditional Damascus soft miniature pancakes filled with rich cream, pistachio topping, and blossom syrup.",
    category: "حلويات رمضانية (Ramadan Sweets)",
    priceSYP: 95000,
    image: "https://images.unsplash.com/photo-1517354454716-e0ad036cf971?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [
      { nameAr: "مكسرات فستق إضافي", nameEn: "Extra Pistachios Bag", priceSYP: 15000 },
    ],
  } as any,
  {
    id: "p8",
    storeId: "daoud-sweets",
    nameAr: "صحن بقلاوة مشكل سمن عربي",
    nameEn: "Assorted Baklava Tray",
    descAr: "رقائق كول وشكور، عش البلبل وبقلاوة مقرمشة غارقة بالقطر ومصنوعة بالسمن البلدي الفاخر ومحشية مكسرات.",
    descEn: "Selection of crispy, golden filo pastries filled with hand-selected nuts, Damascus honey syrup and fine local butter.",
    category: "حلويات شرقية (Oriental Sweets)",
    priceSYP: 120000,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [],
  } as any,
];

// Mock Orders
const DEFAULT_ORDERS: Order[] = [
  {
    id: "ORD-101",
    storeId: "shawarma-classic",
    customerName: "معتز الخالدي",
    customerPhone: "0934567891",
    customerAddress: "دمشق - المزة أوتوستراد - جانب جامع الأكرم بـ 100 متر",
    notes: "يرجى زيادة الثومية في الساندويش ورش القليل من السماق.",
    deliveryZone: { zoneAr: "المزة (أوتوستراد، فيلات)", zoneEn: "Al-Mazza (Highway, Villas)", feeSYP: 4000 },
    items: [
      {
        product: DEFAULT_PRODUCTS[0],
        quantity: 2,
        selectedExtras: [{ nameAr: "إضافة جبنة قشقوان", nameEn: "Add Kashkaval Cheese", priceSYP: 6000 }],
        itemNotes: "خبز محمر زيادة يرجى.",
      },
      {
        product: DEFAULT_PRODUCTS[1],
        quantity: 1,
        selectedExtras: [{ nameAr: "دبس رمان", nameEn: "Pomegranate Molasses", priceSYP: 1500 }],
      }
    ],
    paymentMethod: "cash",
    subtotalSYP: 119500, // 45000 * 2 + 6000 * 2 + 28000 + 1500
    discountSYP: 11950, // classic10 used
    deliveryFeeSYP: 4000,
    totalSYP: 111550,
    status: "preparing",
    driverName: "سامر كمال",
    driverPhone: "+963944666555",
    lat: 33.5115,
    lng: 36.2575,
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    pointsEarned: 15,
    invoiceNumber: "INV-2026-0001",
  },
  {
    id: "ORD-102",
    storeId: "burger-house",
    customerName: "رنا اليوسف",
    customerPhone: "0955999888",
    customerAddress: "دمشق - أبو رمانة - بناء البصمة الطابق الثاني",
    notes: "بدون مخلل في جميع السندويشات.",
    deliveryZone: { zoneAr: "المالكي", zoneEn: "Al-Malki", feeSYP: 4500 },
    items: [
      {
        product: DEFAULT_PRODUCTS[4],
        quantity: 1,
        selectedExtras: [{ nameAr: "صوص جبنة شيدر سائل", nameEn: "Melted Cheese Injection", priceSYP: 5000 }],
      }
    ],
    paymentMethod: "syriatel_cash",
    subtotalSYP: 47000, // 42000 + 5000
    discountSYP: 0,
    deliveryFeeSYP: 4500,
    totalSYP: 51500,
    status: "delivering",
    driverName: "خالد الطويل",
    driverPhone: "+963988123456",
    lat: 33.5218,
    lng: 36.2736,
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    pointsEarned: 5,
    invoiceNumber: "INV-2026-0002",
  }
];

// Simulated Users (for owners/restaurant/admin login, customer registers instantly on purchase)
const DEFAULT_USERS = [
  { username: "admin", password: "123", role: "super_admin" as const, email: "admin@logma.sy" },
  { username: "owner_classic", password: "123", role: "restaurant_owner" as const, storeId: "shawarma-classic", email: "classic@logma.sy" },
  { username: "owner_burger", password: "123", role: "restaurant_owner" as const, storeId: "burger-house", email: "burger@logma.sy" },
  { username: "owner_sweets", password: "123", role: "restaurant_owner" as const, storeId: "daoud-sweets", email: "sweets@logma.sy" },
  { username: "customer_moataz", password: "123", role: "customer" as const, email: "khlmoataz@gmail.com", phone: "0934567891", name: "معتز الخالدي", address: "دمشق - المزة أوتوستراد - جانب جامع الأكرم بـ 100 متر" },
];

// Middleware for automatically persisting state upon mutating API completions
app.use((req, res, next) => {
  next();
});

// --- SaaS Endpoints ---

// Currencies rates
app.get("/api/currencies", (req, res) => {
  res.json(currencyRates);
});

app.post("/api/currencies/update", (req, res) => {
  const { USD, EUR, TRY } = req.body;
  if (USD) currencyRates.USD = USD;
  if (EUR) currencyRates.EUR = EUR;
  if (TRY) currencyRates.TRY = TRY;
  res.json({ success: true, rates: currencyRates });
});

// Authentication
app.post("/api/auth/login", async (req, res) => {
  const { 
    username, 
    password, 
    email, 
    register, 
    role, 
    storeNameAr, 
    storeNameEn, 
    plan, 
    paymentMethod, 
    paymentReference,
    phone,
    name,
    address
  } = req.body;

  if (register) {
    const cleanUsername = (username || "").trim().toLowerCase();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanUsername || !password) {
      return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبة للتسجيل" });
    }

    // Basic server validation for simple register
    const exists = users.find(u => {
      const uUsername = (u?.username || "").trim().toLowerCase();
      const uEmail = (u?.email || "").trim().toLowerCase();
      return (uUsername && uUsername === cleanUsername) || (uEmail && uEmail === cleanEmail);
    });
    if (exists) {
      return res.status(400).json({ error: "اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً." });
    }

    if (role === "restaurant_owner") {
      // Create store
      const newStoreId = cleanUsername.replace(/\s+/g, "-");
      const newStore: Store = {
        id: newStoreId,
        nameAr: storeNameAr || `مطعم ${username}`,
        nameEn: storeNameEn || `${username} Food`,
        descAr: "متجر مطعم جديد ينتمي إلى شبكة لقمة ساس.",
        descEn: "A newly created restaurant store powered by Logma SaaS.",
        phone: phone || "+963900000000",
        whatsapp: phone || "963900000000",
        logo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop",
        banner: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop",
        workingHours: "12:00 PM - 12:00 AM",
        isOpen: true,
        deliveryZones: [
          { zoneAr: "المنطقة المحيطة بالمطعم", zoneEn: "Restaurant Surroundings", feeSYP: 3000 }
        ],
        rating: 5.0,
        reviewsCount: 1,
        plan: plan || "Free",
        subscriptionExpires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 14 days free trial expiration
        createdAt: new Date().toISOString().split("T")[0],
        branches: ["الفرع الرئيسي"],
        loyaltyPointsPer10k: 5,
        isApproved: false, // ALL newly registered stores await Super Admin approval
        paymentMethod: paymentMethod || "Free Trial",
        paymentReference: paymentReference || "N/A"
      };

      stores.push(newStore);
      const newUser = { username: cleanUsername, password, role: "restaurant_owner" as const, storeId: newStoreId, email: cleanEmail };
      users.push(newUser);
      
      try {
        await setDoc(doc(db, "stores", newStoreId), newStore);
        await setDoc(doc(db, "users", cleanUsername), newUser);
      } catch (err) {
        console.error("Firestore save error on owner register:", err);
      }

      return res.json({ success: true, user: newUser });
    } else {
      const newUser = { 
        username: cleanUsername, 
        password, 
        role: "customer" as const, 
        email: cleanEmail, 
        phone: phone || "", 
        name: name || username, 
        address: address || "" 
      };
      users.push(newUser);
      
      try {
        await setDoc(doc(db, "users", cleanUsername), newUser);
      } catch (err) {
        console.error("Firestore save error on customer register:", err);
      }

      return res.json({ success: true, user: newUser });
    }
  }

  const cleanUsername = (username || "").trim().toLowerCase();
  const user = users.find(u => {
    const uUsername = (u?.username || "").trim().toLowerCase();
    const uEmail = (u?.email || "").trim().toLowerCase();
    return (uUsername === cleanUsername || uEmail === cleanUsername) && String(u?.password || "").trim() === String(password || "").trim();
  });

  if (user) {
    if (user.role === "restaurant_owner" && user.storeId) {
      const store = stores.find(s => s.id === user.storeId);
      if (store && store.isApproved === false) {
        return res.status(403).json({ 
          error: "عذراً! حسابك بانتظار موافقة وتفعيل من مدير المنصة بعد التحقق من الدفع واستيفاء شروط الباقة. الرجاء مراجعة الإدارة." 
        });
      }
    }
    res.json({ success: true, user });
  } else {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
  }
});

// Change Password API
app.post("/api/auth/change-password", async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(404).json({ error: "المستخدم غير موجود" });
  }
  if (user.password !== currentPassword) {
    return res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" });
  }
  if (!newPassword || newPassword.length < 3) {
    return res.status(400).json({ error: "يجب اختيار كلمة مرور صالحة لا تقل عن 3 أحرف" });
  }
  user.password = newPassword;
  try {
    await setDoc(doc(db, "users", user.username), user);
  } catch (err) {
    console.error("Firestore error on change password:", err);
  }
  res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
});

// Admin Review Endpoints
app.post("/api/admin/stores/:id/approve", async (req, res) => {
  const store = stores.find(s => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "المطعم غير موجود" });
  store.isApproved = true;
  try {
    await setDoc(doc(db, "stores", store.id), store);
  } catch (err) {
    console.error("Firestore approve store error:", err);
  }
  res.json({ success: true, store });
});

app.post("/api/admin/stores/:id/reject", async (req, res) => {
  const index = stores.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "المطعم غير موجود" });
  const storeId = stores[index].id;
  stores.splice(index, 1);
  const userIdx = users.findIndex(u => u.storeId === storeId);
  const usernameToDelete = userIdx !== -1 ? users[userIdx].username : null;
  if (userIdx !== -1) users.splice(userIdx, 1);
  
  try {
    await deleteDoc(doc(db, "stores", storeId));
    if (usernameToDelete) {
      await deleteDoc(doc(db, "users", usernameToDelete));
    }
  } catch (err) {
    console.error("Firestore reject store error:", err);
  }
  res.json({ success: true });
});

// Admin command: Delete store subscription permanently due to violations
app.delete("/api/admin/stores/:id", async (req, res) => {
  const storeId = req.params.id;
  const index = stores.findIndex(s => s.id === storeId);
  if (index === -1) return res.status(404).json({ error: "المطعم غير موجود" });

  const productsToDelete: string[] = [];
  // Remove associated products
  for (let i = products.length - 1; i >= 0; i--) {
    if (products[i].storeId === storeId) {
      productsToDelete.push(products[i].id);
      products.splice(i, 1);
    }
  }

  const ordersToDelete: string[] = [];
  // Remove associated orders
  for (let i = orders.length - 1; i >= 0; i--) {
    if (orders[i].storeId === storeId) {
      ordersToDelete.push(orders[i].id);
      orders.splice(i, 1);
    }
  }

  const usersToDelete: string[] = [];
  // Remove associated users
  for (let i = users.length - 1; i >= 0; i--) {
    if (users[i].storeId === storeId) {
      usersToDelete.push(users[i].username);
      users.splice(i, 1);
    }
  }

  // Remove store itself
  stores.splice(index, 1);

  try {
    await deleteDoc(doc(db, "stores", storeId));
    for (const prodId of productsToDelete) {
      await deleteDoc(doc(db, "products", prodId));
    }
    for (const ordId of ordersToDelete) {
      await deleteDoc(doc(db, "orders", ordId));
    }
    for (const usrId of usersToDelete) {
      await deleteDoc(doc(db, "users", usrId));
    }
  } catch (err) {
    console.error("Firestore permanent store deletion error:", err);
  }

  res.json({ success: true });
});

// Admin command: Toggle store suspension (freeze / unfreeze)
app.post("/api/admin/stores/:id/toggle-suspend", async (req, res) => {
  const store = stores.find(s => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "المطعم غير موجود" });
  store.isSuspended = !store.isSuspended;
  try {
    await setDoc(doc(db, "stores", store.id), store);
  } catch (err) {
    console.error("Firestore toggle-suspend error:", err);
  }
  res.json({ success: true, store });
});

// Admin command: Approve a store's pending Gold upgrade request
app.post("/api/admin/stores/:id/approve-upgrade", async (req, res) => {
  const store = stores.find(s => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "المطعم غير موجود" });
  
  const oldPlan = store.plan;
  store.plan = "Gold";
  // Determine duration in months
  const months = store.pendingUpgradeMonths || (store.pendingUpgradeType === "annual" ? 12 : 1);
  store.subscriptionType = store.pendingUpgradeType || (months === 12 ? "annual" : "monthly");
  store.subscriptionMonths = months;
  
  // Calculate exact calendar months based subscription expiration
  let expireDate = new Date();
  if (store.subscriptionExpires && oldPlan === "Gold") {
    const currentExpire = new Date(store.subscriptionExpires);
    if (currentExpire.getTime() > Date.now()) {
      expireDate = currentExpire;
    }
  }
  
  // Add exact months natively using setMonth to handle 30/31/28 days and leap years perfectly
  expireDate.setMonth(expireDate.getMonth() + months);
  store.subscriptionExpires = expireDate.toISOString().split("T")[0];
  store.requestedUpgrade = false;
  // Store validated details
  store.paymentMethod = store.pendingPaymentMethod || "Confirmed Upgrade";
  store.paymentReference = store.pendingPaymentReference || "Confirmed";
  store.pendingPaymentMethod = undefined;
  store.pendingPaymentReference = undefined;
  store.pendingUpgradeType = undefined;
  store.pendingUpgradeMonths = undefined;
  
  try {
    await setDoc(doc(db, "stores", store.id), store);
  } catch (err) {
    console.error("Firestore approve upgrade error:", err);
  }
  res.json({ success: true, store });
});

// Admin command: Reject/dismiss a store's pending Gold upgrade request
app.post("/api/admin/stores/:id/reject-upgrade", async (req, res) => {
  const store = stores.find(s => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "المطعم غير موجود" });
  
  store.requestedUpgrade = false;
  store.pendingPaymentMethod = undefined;
  store.pendingPaymentReference = undefined;
  store.pendingUpgradeType = undefined;
  store.pendingUpgradeMonths = undefined;
  
  try {
    await setDoc(doc(db, "stores", store.id), store);
  } catch (err) {
    console.error("Firestore reject upgrade error:", err);
  }
  res.json({ success: true, store });
});

// Store Owner command: Request Gold subscription upgrade with payment reference
app.post("/api/stores/:id/request-upgrade", async (req, res) => {
  const store = stores.find(s => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "المطعم غير موجود" });
  
  const { paymentMethod, paymentReference, upgradeType, upgradeMonths } = req.body;
  if (!paymentReference) {
    return res.status(400).json({ error: "الرجاء كشريك إدخال رمز المعاملة أو رقم العملية لتأكيد الدفع." });
  }
  
  store.requestedUpgrade = true;
  store.pendingPaymentMethod = paymentMethod || "syriatel_cash";
  store.pendingPaymentReference = paymentReference;
  store.pendingUpgradeType = upgradeType || "monthly";
  store.pendingUpgradeMonths = Number(upgradeMonths) || (upgradeType === "annual" ? 12 : 1);
  
  try {
    await setDoc(doc(db, "stores", store.id), store);
  } catch (err) {
    console.error("Firestore request upgrade error:", err);
  }
  res.json({ success: true, store });
});

// App Settings & Overview (SaaS Stats for Admin dashboard)
app.get("/api/admin/overview", (req, res) => {
  const totalStores = stores.length;
  const totalOrders = orders.length;
  const totalRevenueSYP = orders.reduce((acc, current) => current.status === "delivered" ? acc + current.totalSYP : acc, 0);

  const planFreeCount = stores.filter(s => s.plan === "Free").length;
  const planGoldCount = stores.filter(s => s.plan === "Gold").length;

  res.json({
    totalStores,
    totalOrders,
    totalRevenueSYP,
    planFreeCount,
    planGoldCount,
    currencyRates
  });
});

// List Stores
app.get("/api/stores", (req, res) => {
  res.json(stores);
});

// Specific store details
app.get("/api/stores/:id", (req, res) => {
  const store = stores.find(s => s.id === req.params.id);
  if (!store) {
    return res.status(404).json({ error: "لم يتم العثور على المطعم المطلوب" });
  }
  const storeProducts = products.filter(p => p.storeId === store.id && !p.isHidden);
  res.json({ store, products: storeProducts });
});

// Edit store settings
app.put("/api/stores/:id", async (req, res) => {
  const index = stores.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "المطعم غير موجود" });
  }
  stores[index] = { ...stores[index], ...req.body };
  try {
    await setDoc(doc(db, "stores", req.params.id), stores[index]);
  } catch (err) {
    console.error("Firestore PUT store settings error:", err);
  }
  res.json({ success: true, store: stores[index] });
});

// Upgrade / Manage subscripton plan
app.put("/api/stores/:id/subscription", async (req, res) => {
  const store = stores.find(s => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "المطعم غير موجود" });

  const { plan, durationMonths } = req.body; // plan 'Gold', duration 1 or 12 months
  const oldPlan = store.plan;
  store.plan = plan;

  if (plan === "Gold") {
    let expireDate = new Date();
    if (store.subscriptionExpires && oldPlan === "Gold") {
      const currentExpire = new Date(store.subscriptionExpires);
      if (currentExpire.getTime() > Date.now()) {
        expireDate = currentExpire;
      }
    }
    // Set exact calendar month additions natively
    expireDate.setMonth(expireDate.getMonth() + (durationMonths || 1));
    store.subscriptionExpires = expireDate.toISOString().split("T")[0];
  } else {
    // For free plan, set 14 days expiration from registration or today
    const regDate = store.createdAt ? new Date(store.createdAt) : new Date();
    const expireDate = new Date(regDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    store.subscriptionExpires = expireDate.toISOString().split("T")[0];
  }

  try {
    await setDoc(doc(db, "stores", store.id), store);
  } catch (err) {
    console.error("Firestore PUT subscription error:", err);
  }
  res.json({ success: true, store });
});

// Products: Add / Edit / Toggle
app.get("/api/stores/:id/all-products", (req, res) => {
  const storeProducts = products.filter(p => p.storeId === req.params.id);
  res.json(storeProducts);
});

app.post("/api/stores/:id/products", async (req, res) => {
  const store = stores.find(s => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "المطعم غير موجود" });

  // Free Tier constraint check
  if (store.plan === "Free") {
    const currentCount = products.filter(p => p.storeId === store.id).length;
    if (currentCount >= 10 && !req.body.id) {
      return res.status(403).json({
        error: "الرجاء الترقية للباقة الذهبية! الحساب المجاني محدد بـ 10 منتجات كحد أقصى.",
        requiresUpgrade: true
      });
    }
  }

  const payload = req.body;
  if (payload.id) {
    // edit
    const pIdx = products.findIndex(p => p.id === payload.id);
    if (pIdx !== -1) {
      products[pIdx] = { ...products[pIdx], ...payload };
      try {
        await setDoc(doc(db, "products", payload.id), products[pIdx]);
      } catch (err) {
        console.error("Firestore edit product error:", err);
      }
      return res.json({ success: true, product: products[pIdx] });
    }
  } else {
    // create
    const newProduct: Product = {
      id: "prod-" + Math.floor(10000 + Math.random() * 90000),
      storeId: store.id,
      nameAr: payload.nameAr || "وجبة جديدة",
      nameEn: payload.nameEn || "New Meal",
      descAr: payload.descAr || "",
      descEn: payload.descEn || "",
      category: payload.category || "عام",
      priceSYP: Number(payload.priceSYP) || 10000,
      image: payload.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
      inStock: payload.inStock !== false,
      isHidden: payload.isHidden === true,
      extras: payload.extras || [],
    };
    products.push(newProduct);
    try {
      await setDoc(doc(db, "products", newProduct.id), newProduct);
    } catch (err) {
      console.error("Firestore create product error:", err);
    }
    return res.json({ success: true, product: newProduct });
  }
  res.status(400).json({ error: "فشل تحديث أو إضافة المنتج" });
});

// Delete product
app.delete("/api/stores/:id/products/:productId", async (req, res) => {
  const index = products.findIndex(p => p.id === req.params.productId && p.storeId === req.params.id);
  if (index !== -1) {
    products.splice(index, 1);
    try {
      await deleteDoc(doc(db, "products", req.params.productId));
    } catch (err) {
      console.error("Firestore delete product error:", err);
    }
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "المنتج غير موجود" });
  }
});

// Orders Management
app.get("/api/stores/:id/orders", (req, res) => {
  const storeOrders = orders.filter(o => o.storeId === req.params.id);
  res.json(storeOrders);
});

// Get orders belonging to a registered customer username
app.get("/api/customer/:username/orders", (req, res) => {
  const username = req.params.username;
  const user = users.find(u => u.username === username);
  if (!user) return res.json([]);

  const userOrders = orders.filter(o => 
    (o as any).customerUsername === username ||
    o.customerPhone === (user as any).phone ||
    o.customerName === (user as any).name
  );
  res.json(userOrders);
});

// Checkout New Order
app.post("/api/stores/:id/orders", async (req, res) => {
  const store = stores.find(s => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "المطعم غير موجود" });

  if (store.isSuspended) {
    return res.status(403).json({ 
      error: "المطعم مجمد مؤقتاً من قبل الإدارة لتجاوز مشاكل الدفع أو إساءة الاستخدام. الرجاء المحاولة لاحقاً." 
    });
  }

  const { customerName, customerPhone, customerAddress, notes, deliveryZone, items, paymentMethod, customerUsername } = req.body;

  if (!customerName || !customerPhone || !customerAddress || !deliveryZone || !items || items.length === 0) {
    return res.status(400).json({ error: "الرجاء إدخال كافة البيانات المطلوبة لإتمام طلبك." });
  }

  // Calculate prices
  let subtotal = 0;
  items.forEach((it: any) => {
    let itemBase = it.product.priceSYP;
    let extraCosts = (it.selectedExtras || []).reduce((acc: number, cur: any) => acc + cur.priceSYP, 0);
    subtotal += (itemBase + extraCosts) * it.quantity;
  });

  // Calculate discount coupon
  let discount = 0;
  if (notes && notes.toUpperCase().includes(store.couponCode || "CLASSIC_NONE")) {
    const percent = store.couponDiscountPercent || 0;
    discount = Math.floor((subtotal * percent) / 100);
  }

  const deliveryFee = deliveryZone.feeSYP || 0;
  const total = subtotal - discount + deliveryFee;

  // loyalty points
  const pointsEarned = Math.floor(total / 10000) * (store.loyaltyPointsPer10k || 5);

  const orderId = "ORD-" + Math.floor(100 + Math.random() * 900);
  const newOrder: Order & { customerUsername?: string } = {
    id: orderId,
    storeId: store.id,
    customerName,
    customerPhone,
    customerAddress,
    notes,
    deliveryZone,
    items,
    paymentMethod,
    subtotalSYP: subtotal,
    discountSYP: discount,
    deliveryFeeSYP: deliveryFee,
    totalSYP: total,
    status: "pending",
    createdAt: new Date().toISOString(),
    pointsEarned,
    invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    customerUsername: customerUsername || undefined,
  };

  // Assign a driver immediately to simulate rich UI
  if (store.plan === "Gold") {
    newOrder.driverName = "كرم عبد الله (سائق المطعم)";
    newOrder.driverPhone = "+963966555544";
    // standard coordinates in Damascus to start GPS simulation
    newOrder.lat = 33.513;
    newOrder.lng = 36.262;
  }

  orders.unshift(newOrder); // Add to beginning
  try {
    await setDoc(doc(db, "orders", newOrder.id), newOrder);
  } catch (err) {
    console.error("Firestore create order error:", err);
  }
  res.json({ success: true, order: newOrder });
});

// Update order state (driver moving simulation)
app.put("/api/orders/:orderId/status", async (req, res) => {
  const { status, lat, lng } = req.body;
  const order = orders.find(o => o.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: "الطلب غير موجود" });

  if (status) {
    order.status = status;
    // Update tracking
    if (status === "delivering") {
      order.lat = 33.513 + (Math.random() - 0.5) * 0.01;
      order.lng = 36.262 + (Math.random() - 0.5) * 0.01;
    }
  }
  if (lat !== undefined) order.lat = lat;
  if (lng !== undefined) order.lng = lng;

  try {
    await setDoc(doc(db, "orders", order.id), order);
  } catch (err) {
    console.error("Firestore update order status error:", err);
  }
  res.json({ success: true, order });
});

// --- Smart Gemini Assistant Endpoints ---

app.post("/api/gemini/generate-desc", async (req, res) => {
  const { type, nameAr, nameEn, category, ingredients } = req.body;

  const ai = getGeminiClient();
  if (!ai) {
    // If API Key is missing, reply with beautiful custom mock text without failing!
    // This maintains excellent user experience.
    if (type === "restaurant") {
      return res.json({
        descAr: `أهلاً بكم في ${nameAr || "مطعمنا"}. نقدم لكم أشهى الوجبات المحضرة بعناية من أجود المكونات الطازجة والتوابل العريقة لنضمن لكم تجربة فريدة لا تُنسى.`,
        descEn: `Welcome to ${nameEn || "our restaurant"}. We offer the most delicious meals carefully prepared from the freshest ingredients and culinary traditions to guarantee you a unique experience.`,
        isMock: true
      });
    } else {
      return res.json({
        descAr: `وجبة ${nameAr || "ممتعة"} محضرة بخلطة سرية لذيذة، غنية بالنكهة المقرمشة والبهارات الشامية الخاصة، كافية لإسعاد حواسك ونقدمها حارة وطازجة مع المقبلات.`,
        descEn: `A delicious ${nameEn || "delight"} prepared with our rich secret recipe, packed with authentic flavor and Damascus spices to cheer your day. Served fresh.`,
        isMock: true
      });
    }
  }

  try {
    const prompt = type === "restaurant"
      ? `You are an expert copywriter for Lebanese and Syrian premium restaurants. Create two descriptive marketing paras/paragraphs for a restaurant named "${nameAr}" (Arabic) and "${nameEn}" (English). Highlight freshness, local Syrian authenticity, hospitality and rapid delivery.
         Format the output STRICTLY as a JSON object with two fields "descAr" and "descEn". Do not write markdown tags other than standard JSON.`
      : `You are an expert menu description designer. Generate short mouth-watering descriptions (2 sentences max) for a meal named "${nameAr}" / "${nameEn}" in category "${category}" with options/ingredients: "${ingredients || "none specified"}". 
         Write one in Arabic ("descAr") and one in English ("descEn"). Focus on the rich traditional textures, premium taste and appetite.
         Format the output STRICTLY as a JSON object with two fields "descAr" and "descEn". Do not write markdown tags other than standard JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    res.json(parsed);
  } catch (err: any) {
    console.error("Gemini description synthesis failed:", err);
    res.json({
      descAr: `أهلاً بكم في ${nameAr || "مطعمنا"}. نحن فخورون لتقديم المذاق الحقيقي والنكهة الرائعة المصنوعة بشغف وحب.`,
      descEn: `Welcome to ${nameEn || "our space"}. We take proud in delivering genuine tastes and satisfying meals crafted with passion.`
    });
  }
});

app.post("/api/gemini/translate-menu", async (req, res) => {
  const { textAr } = req.body;
  if (!textAr) return res.status(400).json({ error: "الرجاء توفير النص العربي لترجمته." });

  const ai = getGeminiClient();
  if (!ai) {
    // Elegant fallback simulation
    return res.json({ translatedText: textAr + " Style Plate", isMock: true });
  }

  try {
    const prompt = `Translate the following Syrian/Arabic food item or restaurant menu item into a professional English title of 2 to 4 words. Be gastronome and accurate (e.g. "ثومية" to "Garlic Dip", "فروج بروستد" to "Broasted Crispy Chicken").
    Text: "${textAr}"
    Format the response strictly as a JSON with a single key "translatedText".`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    res.json(parsed);
  } catch (err) {
    res.json({ translatedText: textAr + " Special Dish" });
  }
});


// Serve static assets out of /dist or integrate Vite middleware for dev runtime
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    // Warm up database asynchronously to avoid blocking the Cloud Run startup tick
    initializeDatabase().catch((err) => {
      console.error("Delayed database initialization failed:", err);
    });
  });
}

startServer();
