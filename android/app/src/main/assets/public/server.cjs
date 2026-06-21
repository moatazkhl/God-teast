var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "woven-utility-5cf5x",
  appId: "1:15117847967:web:2db6e66a7b0ce8623381aa",
  apiKey: "AIzaSyDDE5L4WRGS8ln-uUUg_gdtTZkjqqSo-UM",
  authDomain: "woven-utility-5cf5x.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-4bf0c9f7-ebe1-4605-a626-a4b2c2c4c1f1",
  storageBucket: "woven-utility-5cf5x.firebasestorage.app",
  messagingSenderId: "15117847967",
  measurementId: ""
};

// server.ts
import_dotenv.default.config();
var appFirebase = (0, import_app.initializeApp)(firebase_applet_config_default);
var db = (0, import_firestore.getFirestore)(appFirebase, firebase_applet_config_default.firestoreDatabaseId);
var aiClient = null;
function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
var PORT = 3e3;
var currencyRates = {
  USD: 14500,
  EUR: 15700,
  TRY: 450
};
var stores = [];
var products = [];
var orders = [];
var users = [];
async function fetchCurrenciesFromFirestore() {
  try {
    const docRef = (0, import_firestore.doc)(db, "rates", "current");
    const docSnap = await (0, import_firestore.getDoc)(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      await (0, import_firestore.setDoc)(docRef, DEFAULT_RATES);
      return DEFAULT_RATES;
    }
  } catch (err) {
    console.error("Firestore loading rates error:", err);
    return DEFAULT_RATES;
  }
}
async function fetchStoresFromFirestore() {
  try {
    const q = (0, import_firestore.collection)(db, "stores");
    const snap = await (0, import_firestore.getDocs)(q);
    if (snap.empty) {
      for (const st of DEFAULT_STORES) {
        await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "stores", st.id), st);
      }
      return DEFAULT_STORES;
    }
    const list = [];
    snap.forEach((d) => list.push(d.data()));
    return list;
  } catch (err) {
    console.error("Firestore loading stores error:", err);
    return DEFAULT_STORES;
  }
}
async function fetchProductsFromFirestore() {
  try {
    const q = (0, import_firestore.collection)(db, "products");
    const snap = await (0, import_firestore.getDocs)(q);
    if (snap.empty) {
      for (const prod of DEFAULT_PRODUCTS) {
        await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "products", prod.id), prod);
      }
      return DEFAULT_PRODUCTS;
    }
    const list = [];
    snap.forEach((d) => list.push(d.data()));
    return list;
  } catch (err) {
    console.error("Firestore loading products error:", err);
    return DEFAULT_PRODUCTS;
  }
}
async function fetchOrdersFromFirestore() {
  try {
    const q = (0, import_firestore.collection)(db, "orders");
    const snap = await (0, import_firestore.getDocs)(q);
    if (snap.empty) {
      for (const ord of DEFAULT_ORDERS) {
        await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "orders", ord.id), ord);
      }
      return DEFAULT_ORDERS;
    }
    const list = [];
    snap.forEach((d) => list.push(d.data()));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.error("Firestore loading orders error:", err);
    return DEFAULT_ORDERS;
  }
}
async function fetchUsersFromFirestore() {
  try {
    const q = (0, import_firestore.collection)(db, "users");
    const snap = await (0, import_firestore.getDocs)(q);
    if (snap.empty) {
      for (const usr of DEFAULT_USERS) {
        await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "users", usr.username), usr);
      }
      return DEFAULT_USERS;
    }
    const list = [];
    snap.forEach((d) => list.push(d.data()));
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
var DEFAULT_RATES = {
  USD: 14500,
  // 1 USD = 14,500 SYP
  EUR: 15700,
  // 1 EUR = 15,700 SYP
  TRY: 450
  // 1 TRY = 450 SYP
};
var DEFAULT_STORES = [
  {
    id: "shawarma-classic",
    nameAr: "\u0634\u0627\u0648\u0631\u0645\u0627 \u0643\u0644\u0627\u0633\u064A\u0643 \u0648\u062D\u0644\u0628\u064A",
    nameEn: "Shawarma Classic & Halabi",
    descAr: "\u0623\u0634\u0647\u0649 \u0644\u0641\u0627\u0641\u0627\u062A \u0627\u0644\u0634\u0627\u0648\u0631\u0645\u0627 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0639\u0644\u0649 \u0627\u0644\u0641\u062D\u0645 \u0645\u0639 \u0627\u0644\u062B\u0648\u0645\u064A\u0629 \u0627\u0644\u0645\u0645\u064A\u0632\u0629 \u0648\u062F\u0628\u0633 \u0627\u0644\u0631\u0645\u0627\u0646.",
    descEn: "Authentic Arabic grilled shawarma rolls with our signature garlic dip and pomegranate molasses.",
    phone: "+963911122233",
    whatsapp: "963911122233",
    logo: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=150&h=150&fit=crop",
    banner: "https://images.unsplash.com/photo-1561651823-34fed022540d?w=1200&h=400&fit=crop",
    workingHours: "12:00 PM - 02:00 AM",
    isOpen: true,
    deliveryZones: [
      { zoneAr: "\u0627\u0644\u0645\u0632\u0629 (\u0623\u0648\u062A\u0648\u0633\u062A\u0631\u0627\u062F\u060C \u0641\u064A\u0644\u0627\u062A)", zoneEn: "Al-Mazza (Highway, Villas)", feeSYP: 4e3 },
      { zoneAr: "\u0627\u0644\u0645\u0627\u0644\u0643\u064A \u0648\u0623\u0628\u0648 \u0631\u0645\u0627\u0646\u0629", zoneEn: "Malki & Abu Rummaneh", feeSYP: 5e3 },
      { zoneAr: "\u0645\u0634\u0631\u0648\u0639 \u062F\u0645\u0631", zoneEn: "Project Dummar", feeSYP: 8e3 },
      { zoneAr: "\u0627\u0644\u0642\u0635\u0627\u0639 \u0648\u0628\u0627\u0628 \u062A\u0648\u0645\u0627", zoneEn: "Kassa'a & Bab Touma", feeSYP: 7e3 }
    ],
    rating: 4.8,
    reviewsCount: 128,
    couponCode: "CLASSIC10",
    couponDiscountPercent: 10,
    plan: "Gold",
    subscriptionExpires: "2027-04-15",
    createdAt: "2026-04-15",
    branches: ["\u0641\u0631\u0639 \u0627\u0644\u0645\u0632\u0629 - \u062F\u0645\u0634\u0642", "\u0641\u0631\u0639 \u0645\u0634\u0631\u0648\u0639 \u062F\u0645\u0631"],
    loyaltyPointsPer10k: 15,
    printerIp: "192.168.1.100",
    isApproved: true
  },
  {
    id: "burger-house",
    nameAr: "\u0645\u0637\u0639\u0645 \u0628\u064A\u062A \u0627\u0644\u0628\u0631\u063A\u0631 \u0627\u0644\u0634\u0627\u0645\u064A",
    nameEn: "Al-Sham Burger House",
    descAr: "\u0644\u062D\u0645 \u0628\u0642\u0631\u064A \u0637\u0627\u0632\u062C 100% \u0645\u0634\u0648\u064A \u0639\u0644\u0649 \u0627\u0644\u0644\u0647\u0628 \u0645\u0639 \u062E\u0644\u0637\u0627\u062A \u0635\u0648\u0635\u0627\u062A \u063A\u0646\u064A\u0629 \u0648\u0642\u0646\u0627\u0628\u0644 \u0627\u0644\u062C\u0628\u0646.",
    descEn: "100% fresh flame-grilled beef burgers with rich delicious sauces and custom cheese bombs.",
    phone: "+963933444555",
    whatsapp: "963933444555",
    logo: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&h=150&fit=crop",
    banner: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&h=400&fit=crop",
    workingHours: "01:00 PM - 01:00 AM",
    isOpen: true,
    deliveryZones: [
      { zoneAr: "\u0627\u0644\u0645\u0632\u0629", zoneEn: "Al-Mazza", feeSYP: 4e3 },
      { zoneAr: "\u0627\u0644\u0645\u0627\u0644\u0643\u064A", zoneEn: "Al-Malki", feeSYP: 5e3 },
      { zoneAr: "\u0643\u0641\u0631\u0633\u0648\u0633\u0629", zoneEn: "Kafarsouseh", feeSYP: 4500 },
      { zoneAr: "\u0628\u0631\u0627\u0645\u0643\u0629 \u0648\u0648\u0633\u0637 \u0627\u0644\u0628\u0644\u062F", zoneEn: "Baramkeh & Downtown", feeSYP: 5500 }
    ],
    rating: 4.6,
    reviewsCount: 84,
    couponCode: "CHEESE20",
    couponDiscountPercent: 20,
    plan: "Gold",
    subscriptionExpires: "2026-12-31",
    createdAt: "2026-03-01",
    branches: ["\u0641\u0631\u0639 \u0643\u0641\u0631\u0633\u0648\u0633\u0629"],
    loyaltyPointsPer10k: 10,
    isApproved: true
  },
  {
    id: "daoud-sweets",
    nameAr: "\u062D\u0644\u0648\u064A\u0627\u062A \u062F\u0627\u0648\u062F \u0627\u0644\u0639\u0631\u064A\u0642\u0629",
    nameEn: "Daoud Premium Sweets",
    descAr: "\u0623\u0641\u062E\u0631 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062D\u0644\u0648\u064A\u0627\u062A \u0627\u0644\u0634\u0631\u0642\u064A\u0629 \u0627\u0644\u062F\u0645\u0634\u0642\u064A\u0629 \u0628\u0627\u0644\u0633\u0645\u0646 \u0627\u0644\u0639\u0631\u0628\u064A \u0648\u0627\u0644\u0645\u0643\u0633\u0631\u0627\u062A \u0627\u0644\u0637\u0627\u0632\u062C\u0629 \u0648\u0622\u064A\u0633 \u0643\u0631\u064A\u0645 \u0628\u0643\u062F\u0627\u0634 \u0627\u0644\u0634\u0647\u064A\u0631.",
    descEn: "The finest Damascus oriental sweets with pure Arabic ghee, fresh nuts, and legendary Bakdash ice cream.",
    phone: "+963955666777",
    whatsapp: "963955666777",
    logo: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150&h=150&fit=crop",
    banner: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=1200&h=400&fit=crop",
    workingHours: "10:00 AM - 11:00 PM",
    isOpen: true,
    deliveryZones: [
      { zoneAr: "\u0627\u0644\u0645\u064A\u062F\u0627\u0646 \u0648\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0645\u064A\u062F\u0627\u0646", zoneEn: "Midan & Midan Gate", feeSYP: 3e3 },
      { zoneAr: "\u0627\u0644\u0645\u0632\u0629", zoneEn: "Al-Mazza", feeSYP: 5500 },
      { zoneAr: "\u0627\u0644\u0645\u0627\u0644\u0643\u064A \u0648\u0627\u0644\u0645\u0647\u0627\u062C\u0631\u064A\u0646", zoneEn: "Malki & Muhajireen", feeSYP: 6e3 }
    ],
    rating: 4.9,
    reviewsCount: 204,
    couponCode: "RAMADAN",
    couponDiscountPercent: 15,
    plan: "Free",
    subscriptionExpires: "2026-06-15",
    createdAt: "2026-05-15",
    branches: ["\u0641\u0631\u0639 \u0627\u0644\u0645\u064A\u062F\u0627\u0646 \u0627\u0644\u0631\u0626\u064A\u0633\u064A", "\u0641\u0631\u0639 \u0627\u0644\u0634\u0639\u0644\u0627\u0646"],
    loyaltyPointsPer10k: 5,
    isApproved: true
  }
];
var DEFAULT_PRODUCTS = [
  // Store 1: Shawarma Classic
  {
    id: "p1",
    storeId: "shawarma-classic",
    nameAr: "\u0648\u062C\u0628\u0629 \u0639\u0631\u0628\u064A \u0633\u0648\u0628\u0631",
    nameEn: "Super Arabic Meal",
    descAr: "\u0644\u0641\u0627\u0641\u0629 \u0634\u0627\u0648\u0631\u0645\u0627 \u0643\u0628\u064A\u0631\u0629 \u0645\u0642\u0637\u0639\u0629\u060C \u062A\u0642\u062F\u0645 \u0645\u0639 \u0628\u0637\u0627\u0637\u0633 \u0645\u0642\u0644\u064A\u0629\u060C \u062B\u0648\u0645\u064A\u0629\u060C \u0645\u062E\u0644\u0644 \u0648\u0635\u0648\u0635 \u062E\u0627\u0635.",
    descEn: "Large sliced shawarma wrap, served with golden French fries, garlic paste, pickles, and special house dip.",
    category: "\u0627\u0644\u0648\u062C\u0628\u0627\u062A (Meals)",
    priceSYP: 45e3,
    image: "https://images.unsplash.com/photo-1626700051175-6518c4793f06?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [
      { nameAr: "\u0625\u0636\u0627\u0641\u0629 \u062C\u0628\u0646\u0629 \u0642\u0634\u0642\u0648\u0627\u0646", nameEn: "Add Kashkaval Cheese", priceSYP: 6e3 },
      { nameAr: "\u062B\u0648\u0645\u064A\u0629 \u0625\u0636\u0627\u0641\u064A\u0629", nameEn: "Extra Garlic Dip", priceSYP: 2e3 },
      { nameAr: "\u062D\u062C\u0645 \u062F\u0628\u0644 \u0644\u062D\u0645", nameEn: "Double Meat Size", priceSYP: 15e3 }
    ]
  },
  {
    id: "p2",
    storeId: "shawarma-classic",
    nameAr: "\u0633\u0627\u0646\u062F\u0648\u064A\u0634 \u0634\u0627\u0648\u0631\u0645\u0627 \u062F\u0628\u0644 \u062F\u062C\u0627\u062C",
    nameEn: "Double Chicken Shawarma Wrap",
    descAr: "\u062E\u0628\u0632 \u0635\u0627\u062C \u0641\u0627\u062E\u0631 \u0645\u062D\u0634\u0648 \u0628\u0634\u0627\u0648\u0631\u0645\u0627 \u0627\u0644\u062F\u062C\u0627\u062C \u0627\u0644\u063A\u0646\u064A\u0629 \u0645\u0639 \u0645\u0627\u064A\u0648\u0646\u064A\u0632 \u0627\u0644\u062B\u0648\u0645 \u0648\u0628\u0637\u0627\u0637\u0633 \u0648\u0645\u062E\u0644\u0644.",
    descEn: "Premium flatbread loaded with savory chicken shawarma, garlic mayonnaise, fries, and pickled cucumbers.",
    category: "\u0627\u0644\u0633\u0627\u0646\u062F\u0648\u064A\u0634 (Sandwiches)",
    priceSYP: 28e3,
    image: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [
      { nameAr: "\u062F\u0628\u0633 \u0631\u0645\u0627\u0646", nameEn: "Pomegranate Molasses", priceSYP: 1500 },
      { nameAr: "\u0628\u0637\u0627\u0637\u0633 \u062F\u0627\u062E\u0644 \u0627\u0644\u0633\u0627\u0646\u062F\u0648\u064A\u0634", nameEn: "Fries Inside Wrap", priceSYP: 1e3 }
    ]
  },
  {
    id: "p3",
    storeId: "shawarma-classic",
    nameAr: "\u0645\u0627\u0631\u064A\u0627 \u0634\u0627\u0648\u0631\u0645\u0627 \u0639\u0627\u0644\u0641\u062D\u0645",
    nameEn: "Maria Charcoal Shawarma",
    descAr: "\u062E\u0628\u0632 \u0645\u0633\u0637\u062D \u0645\u062D\u0645\u0631 \u0645\u062D\u0634\u0648 \u0628\u0634\u0627\u0648\u0631\u0645\u0627 \u062F\u062C\u0627\u062C \u0645\u0645\u062A\u0627\u0632\u0629 \u0645\u0639 \u062C\u0628\u0646\u0629 \u0645\u0648\u0632\u0627\u0631\u064A\u0644\u0627 \u0648\u062A\u0648\u0627\u0628\u0644 \u062D\u0644\u0628\u064A\u0629.",
    descEn: "Toasted flatbread stuffed with premier chicken shawarma, melted mozzarella cheese, and authentic Aleppian spices.",
    category: "\u0627\u0644\u0648\u062C\u0628\u0627\u062A (Meals)",
    priceSYP: 38e3,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: []
  },
  {
    id: "p4",
    storeId: "shawarma-classic",
    nameAr: "\u0639\u0628\u0648\u0629 \u0635\u062D\u0646 \u0628\u0637\u0627\u0637\u0633 \u0639\u0627\u0626\u0644\u064A\u0629",
    nameEn: "Family French Fries Pack",
    descAr: "\u0628\u0637\u0627\u0637\u0633 \u062D\u0627\u0631\u0629 \u0623\u0648 \u0643\u0644\u0627\u0633\u064A\u0643 \u0645\u0642\u0631\u0645\u0634\u0629 \u0648\u0645\u0645\u0644\u062D\u0629 \u0645\u0645\u062A\u0627\u0632\u0629 \u0644\u0644\u0639\u0627\u0626\u0644\u0627\u062A.",
    descEn: "Crispy salted golden french fries, hot or classic style, ideal for sharing.",
    category: "\u0627\u0644\u0645\u0642\u0628\u0644\u0627\u062A (Appetizers)",
    priceSYP: 18e3,
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [
      { nameAr: "\u0628\u0647\u0627\u0631\u0627\u062A \u062C\u0628\u0646\u0629 \u0634\u064A\u062F\u0631", nameEn: "Cheddar Cheese Spices", priceSYP: 2500 }
    ]
  },
  // Store 2: Burger House
  {
    id: "p5",
    storeId: "burger-house",
    nameAr: "\u0623\u0648\u0631\u064A\u062C\u064A\u0646\u0627\u0644 \u0643\u0644\u0627\u0633\u064A\u0643 \u0628\u0631\u063A\u0631",
    nameEn: "Original Classic Burger",
    descAr: "\u0634\u0631\u064A\u062D\u0629 \u0644\u062D\u0645 \u0628\u0642\u0631\u064A \u0645\u062F\u062E\u0646 \u0645\u0645\u062A\u0627\u0632\u060C \u062E\u0633\u060C \u0637\u0645\u0627\u0637\u0645\u060C \u0645\u062E\u0644\u0644\u060C \u0645\u0639 \u0635\u0648\u0635 \u0627\u0644\u0628\u0631\u063A\u0631 \u0627\u0644\u062E\u0627\u0635 \u0628\u0646\u0627 \u0648\u062C\u0628\u0646\u0629 \u0634\u064A\u062F\u0631 \u0630\u0627\u0626\u0628\u0629.",
    descEn: "Premium smoked beef patty, lettuce, tomatoes, crunchy pickles, signature burger sauce, and melted cheddar cheese.",
    category: "\u0627\u0644\u0628\u0631\u063A\u0631 (Burgers)",
    priceSYP: 42e3,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [
      { nameAr: "\u0625\u0636\u0627\u0641\u0629 \u0634\u0631\u064A\u062D\u0629 \u0644\u062D\u0645 \u0625\u0636\u0627\u0641\u064A\u0629", nameEn: "Double Meat Patty", priceSYP: 18e3 },
      { nameAr: "\u0634\u0631\u064A\u062D\u0629 \u0644\u062D\u0645 \u0645\u0642\u062F\u062F \u0628\u064A\u0641 \u0628\u064A\u0643\u0648\u0646", nameEn: "Crispy Beef Bacon", priceSYP: 7e3 },
      { nameAr: "\u0635\u0648\u0635 \u062C\u0628\u0646\u0629 \u0634\u064A\u062F\u0631 \u0633\u0627\u0626\u0644", nameEn: "Melted Cheese Injection", priceSYP: 5e3 }
    ]
  },
  {
    id: "p6",
    storeId: "burger-house",
    nameAr: "\u0643\u0631\u064A\u0633\u0628\u064A \u062A\u0634\u064A\u0643\u0646 \u0632\u0648\u0646\u063A\u0648\u0631",
    nameEn: "Crispy Chicken Zongour",
    descAr: "\u0635\u062F\u0631 \u062F\u062C\u0627\u062C \u0645\u0642\u0631\u0645\u0634 \u0644\u0644\u063A\u0627\u064A\u0629 \u0645\u062A\u0628\u0644 \u0628\u0627\u0644\u062A\u062A\u0628\u064A\u0644\u0629 \u0627\u0644\u062D\u0627\u0631\u0629\u060C \u062E\u0633 \u0631\u0642\u064A\u0642\u060C \u062C\u0628\u0646\u0629 \u0634\u064A\u062F\u0631\u060C \u0648\u0645\u0627\u064A\u0648\u0646\u064A\u0632 \u062D\u0627\u0631.",
    descEn: "Crisp golden chicken breast dipped in our special spicy blend, shredded lettuce, cheddar, and spicy mayo.",
    category: "\u0627\u0644\u0628\u0631\u063A\u0631 (Burgers)",
    priceSYP: 39e3,
    image: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [
      { nameAr: "\u0634\u0631\u0627\u0626\u062D \u0641\u0644\u0641\u0644 \u0647\u0627\u0644\u0627\u0628\u064A\u0646\u0648", nameEn: "Jalapeno Slices", priceSYP: 2e3 }
    ]
  },
  // Store 3: Daoud Sweets
  {
    id: "p7",
    storeId: "daoud-sweets",
    nameAr: "\u0643\u064A\u0644\u0648 \u0642\u0637\u0627\u064A\u0641 \u0639\u0635\u0627\u0641\u064A\u0631\u064A \u0628\u0627\u0644\u0642\u0634\u0637\u0629 \u0627\u0644\u0628\u0644\u062F\u064A\u0629",
    nameEn: "Qatayef Asafiri (Per Kg)",
    descAr: "\u0639\u062C\u064A\u0646\u0629 \u0642\u0637\u0627\u064A\u0641 \u0646\u0627\u0639\u0645\u0629 \u0648\u0645\u062D\u0634\u0648\u0629 \u0628\u0627\u0644\u0642\u0634\u0637\u0629 \u0627\u0644\u0634\u0627\u0645\u064A\u0629 \u0627\u0644\u0641\u0627\u062E\u0631\u0629\u060C \u0645\u0632\u064A\u0646\u0629 \u0628\u0627\u0644\u0641\u0633\u062A\u0642 \u0627\u0644\u062D\u0644\u0628\u064A \u0648\u0635\u0648\u0635 \u0627\u0644\u0642\u0637\u0631.",
    descEn: "Traditional Damascus soft miniature pancakes filled with rich cream, pistachio topping, and blossom syrup.",
    category: "\u062D\u0644\u0648\u064A\u0627\u062A \u0631\u0645\u0636\u0627\u0646\u064A\u0629 (Ramadan Sweets)",
    priceSYP: 95e3,
    image: "https://images.unsplash.com/photo-1517354454716-e0ad036cf971?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: [
      { nameAr: "\u0645\u0643\u0633\u0631\u0627\u062A \u0641\u0633\u062A\u0642 \u0625\u0636\u0627\u0641\u064A", nameEn: "Extra Pistachios Bag", priceSYP: 15e3 }
    ]
  },
  {
    id: "p8",
    storeId: "daoud-sweets",
    nameAr: "\u0635\u062D\u0646 \u0628\u0642\u0644\u0627\u0648\u0629 \u0645\u0634\u0643\u0644 \u0633\u0645\u0646 \u0639\u0631\u0628\u064A",
    nameEn: "Assorted Baklava Tray",
    descAr: "\u0631\u0642\u0627\u0626\u0642 \u0643\u0648\u0644 \u0648\u0634\u0643\u0648\u0631\u060C \u0639\u0634 \u0627\u0644\u0628\u0644\u0628\u0644 \u0648\u0628\u0642\u0644\u0627\u0648\u0629 \u0645\u0642\u0631\u0645\u0634\u0629 \u063A\u0627\u0631\u0642\u0629 \u0628\u0627\u0644\u0642\u0637\u0631 \u0648\u0645\u0635\u0646\u0648\u0639\u0629 \u0628\u0627\u0644\u0633\u0645\u0646 \u0627\u0644\u0628\u0644\u062F\u064A \u0627\u0644\u0641\u0627\u062E\u0631 \u0648\u0645\u062D\u0634\u064A\u0629 \u0645\u0643\u0633\u0631\u0627\u062A.",
    descEn: "Selection of crispy, golden filo pastries filled with hand-selected nuts, Damascus honey syrup and fine local butter.",
    category: "\u062D\u0644\u0648\u064A\u0627\u062A \u0634\u0631\u0642\u064A\u0629 (Oriental Sweets)",
    priceSYP: 12e4,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
    inStock: true,
    isHidden: false,
    extras: []
  }
];
var DEFAULT_ORDERS = [
  {
    id: "ORD-101",
    storeId: "shawarma-classic",
    customerName: "\u0645\u0639\u062A\u0632 \u0627\u0644\u062E\u0627\u0644\u062F\u064A",
    customerPhone: "0934567891",
    customerAddress: "\u062F\u0645\u0634\u0642 - \u0627\u0644\u0645\u0632\u0629 \u0623\u0648\u062A\u0648\u0633\u062A\u0631\u0627\u062F - \u062C\u0627\u0646\u0628 \u062C\u0627\u0645\u0639 \u0627\u0644\u0623\u0643\u0631\u0645 \u0628\u0640 100 \u0645\u062A\u0631",
    notes: "\u064A\u0631\u062C\u0649 \u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u062B\u0648\u0645\u064A\u0629 \u0641\u064A \u0627\u0644\u0633\u0627\u0646\u062F\u0648\u064A\u0634 \u0648\u0631\u0634 \u0627\u0644\u0642\u0644\u064A\u0644 \u0645\u0646 \u0627\u0644\u0633\u0645\u0627\u0642.",
    deliveryZone: { zoneAr: "\u0627\u0644\u0645\u0632\u0629 (\u0623\u0648\u062A\u0648\u0633\u062A\u0631\u0627\u062F\u060C \u0641\u064A\u0644\u0627\u062A)", zoneEn: "Al-Mazza (Highway, Villas)", feeSYP: 4e3 },
    items: [
      {
        product: DEFAULT_PRODUCTS[0],
        quantity: 2,
        selectedExtras: [{ nameAr: "\u0625\u0636\u0627\u0641\u0629 \u062C\u0628\u0646\u0629 \u0642\u0634\u0642\u0648\u0627\u0646", nameEn: "Add Kashkaval Cheese", priceSYP: 6e3 }],
        itemNotes: "\u062E\u0628\u0632 \u0645\u062D\u0645\u0631 \u0632\u064A\u0627\u062F\u0629 \u064A\u0631\u062C\u0649."
      },
      {
        product: DEFAULT_PRODUCTS[1],
        quantity: 1,
        selectedExtras: [{ nameAr: "\u062F\u0628\u0633 \u0631\u0645\u0627\u0646", nameEn: "Pomegranate Molasses", priceSYP: 1500 }]
      }
    ],
    paymentMethod: "cash",
    subtotalSYP: 119500,
    // 45000 * 2 + 6000 * 2 + 28000 + 1500
    discountSYP: 11950,
    // classic10 used
    deliveryFeeSYP: 4e3,
    totalSYP: 111550,
    status: "preparing",
    driverName: "\u0633\u0627\u0645\u0631 \u0643\u0645\u0627\u0644",
    driverPhone: "+963944666555",
    lat: 33.5115,
    lng: 36.2575,
    createdAt: new Date(Date.now() - 25 * 60 * 1e3).toISOString(),
    pointsEarned: 15,
    invoiceNumber: "INV-2026-0001"
  },
  {
    id: "ORD-102",
    storeId: "burger-house",
    customerName: "\u0631\u0646\u0627 \u0627\u0644\u064A\u0648\u0633\u0641",
    customerPhone: "0955999888",
    customerAddress: "\u062F\u0645\u0634\u0642 - \u0623\u0628\u0648 \u0631\u0645\u0627\u0646\u0629 - \u0628\u0646\u0627\u0621 \u0627\u0644\u0628\u0635\u0645\u0629 \u0627\u0644\u0637\u0627\u0628\u0642 \u0627\u0644\u062B\u0627\u0646\u064A",
    notes: "\u0628\u062F\u0648\u0646 \u0645\u062E\u0644\u0644 \u0641\u064A \u062C\u0645\u064A\u0639 \u0627\u0644\u0633\u0646\u062F\u0648\u064A\u0634\u0627\u062A.",
    deliveryZone: { zoneAr: "\u0627\u0644\u0645\u0627\u0644\u0643\u064A", zoneEn: "Al-Malki", feeSYP: 4500 },
    items: [
      {
        product: DEFAULT_PRODUCTS[4],
        quantity: 1,
        selectedExtras: [{ nameAr: "\u0635\u0648\u0635 \u062C\u0628\u0646\u0629 \u0634\u064A\u062F\u0631 \u0633\u0627\u0626\u0644", nameEn: "Melted Cheese Injection", priceSYP: 5e3 }]
      }
    ],
    paymentMethod: "syriatel_cash",
    subtotalSYP: 47e3,
    // 42000 + 5000
    discountSYP: 0,
    deliveryFeeSYP: 4500,
    totalSYP: 51500,
    status: "delivering",
    driverName: "\u062E\u0627\u0644\u062F \u0627\u0644\u0637\u0648\u064A\u0644",
    driverPhone: "+963988123456",
    lat: 33.5218,
    lng: 36.2736,
    createdAt: new Date(Date.now() - 40 * 60 * 1e3).toISOString(),
    pointsEarned: 5,
    invoiceNumber: "INV-2026-0002"
  }
];
var DEFAULT_USERS = [
  { username: "admin", password: "123", role: "super_admin", email: "admin@logma.sy" },
  { username: "owner_classic", password: "123", role: "restaurant_owner", storeId: "shawarma-classic", email: "classic@logma.sy" },
  { username: "owner_burger", password: "123", role: "restaurant_owner", storeId: "burger-house", email: "burger@logma.sy" },
  { username: "owner_sweets", password: "123", role: "restaurant_owner", storeId: "daoud-sweets", email: "sweets@logma.sy" },
  { username: "customer_moataz", password: "123", role: "customer", email: "khlmoataz@gmail.com", phone: "0934567891", name: "\u0645\u0639\u062A\u0632 \u0627\u0644\u062E\u0627\u0644\u062F\u064A", address: "\u062F\u0645\u0634\u0642 - \u0627\u0644\u0645\u0632\u0629 \u0623\u0648\u062A\u0648\u0633\u062A\u0631\u0627\u062F - \u062C\u0627\u0646\u0628 \u062C\u0627\u0645\u0639 \u0627\u0644\u0623\u0643\u0631\u0645 \u0628\u0640 100 \u0645\u062A\u0631" }
];
app.use((req, res, next) => {
  next();
});
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
    const cleanUsername2 = (username || "").trim().toLowerCase();
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanUsername2 || !password) {
      return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u062A\u0633\u062C\u064A\u0644" });
    }
    const exists = users.find((u) => {
      const uUsername = (u?.username || "").trim().toLowerCase();
      const uEmail = (u?.email || "").trim().toLowerCase();
      return uUsername && uUsername === cleanUsername2 || uEmail && uEmail === cleanEmail;
    });
    if (exists) {
      return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B." });
    }
    if (role === "restaurant_owner") {
      const newStoreId = cleanUsername2.replace(/\s+/g, "-");
      const newStore = {
        id: newStoreId,
        nameAr: storeNameAr || `\u0645\u0637\u0639\u0645 ${username}`,
        nameEn: storeNameEn || `${username} Food`,
        descAr: "\u0645\u062A\u062C\u0631 \u0645\u0637\u0639\u0645 \u062C\u062F\u064A\u062F \u064A\u0646\u062A\u0645\u064A \u0625\u0644\u0649 \u0634\u0628\u0643\u0629 \u0644\u0642\u0645\u0629 \u0633\u0627\u0633.",
        descEn: "A newly created restaurant store powered by Logma SaaS.",
        phone: phone || "+963900000000",
        whatsapp: phone || "963900000000",
        logo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop",
        banner: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop",
        workingHours: "12:00 PM - 12:00 AM",
        isOpen: true,
        deliveryZones: [
          { zoneAr: "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0645\u062D\u064A\u0637\u0629 \u0628\u0627\u0644\u0645\u0637\u0639\u0645", zoneEn: "Restaurant Surroundings", feeSYP: 3e3 }
        ],
        rating: 5,
        reviewsCount: 1,
        plan: plan || "Free",
        subscriptionExpires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
        // 14 days free trial expiration
        createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        branches: ["\u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0631\u0626\u064A\u0633\u064A"],
        loyaltyPointsPer10k: 5,
        isApproved: false,
        // ALL newly registered stores await Super Admin approval
        paymentMethod: paymentMethod || "Free Trial",
        paymentReference: paymentReference || "N/A"
      };
      stores.push(newStore);
      const newUser = { username: cleanUsername2, password, role: "restaurant_owner", storeId: newStoreId, email: cleanEmail };
      users.push(newUser);
      try {
        await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "stores", newStoreId), newStore);
        await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "users", cleanUsername2), newUser);
      } catch (err) {
        console.error("Firestore save error on owner register:", err);
      }
      return res.json({ success: true, user: newUser });
    } else {
      const newUser = {
        username: cleanUsername2,
        password,
        role: "customer",
        email: cleanEmail,
        phone: phone || "",
        name: name || username,
        address: address || ""
      };
      users.push(newUser);
      try {
        await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "users", cleanUsername2), newUser);
      } catch (err) {
        console.error("Firestore save error on customer register:", err);
      }
      return res.json({ success: true, user: newUser });
    }
  }
  const cleanUsername = (username || "").trim().toLowerCase();
  const user = users.find((u) => {
    const uUsername = (u?.username || "").trim().toLowerCase();
    const uEmail = (u?.email || "").trim().toLowerCase();
    return (uUsername === cleanUsername || uEmail === cleanUsername) && String(u?.password || "").trim() === String(password || "").trim();
  });
  if (user) {
    if (user.role === "restaurant_owner" && user.storeId) {
      const store = stores.find((s) => s.id === user.storeId);
      if (store && store.isApproved === false) {
        return res.status(403).json({
          error: "\u0639\u0630\u0631\u0627\u064B! \u062D\u0633\u0627\u0628\u0643 \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0645\u0648\u0627\u0641\u0642\u0629 \u0648\u062A\u0641\u0639\u064A\u0644 \u0645\u0646 \u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0646\u0635\u0629 \u0628\u0639\u062F \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062F\u0641\u0639 \u0648\u0627\u0633\u062A\u064A\u0641\u0627\u0621 \u0634\u0631\u0648\u0637 \u0627\u0644\u0628\u0627\u0642\u0629. \u0627\u0644\u0631\u062C\u0627\u0621 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629."
        });
      }
    }
    res.json({ success: true, user });
  } else {
    res.status(401).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
  }
});
app.post("/api/auth/change-password", async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  if (user.password !== currentPassword) {
    return res.status(400).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
  }
  if (!newPassword || newPassword.length < 3) {
    return res.status(400).json({ error: "\u064A\u062C\u0628 \u0627\u062E\u062A\u064A\u0627\u0631 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u0635\u0627\u0644\u062D\u0629 \u0644\u0627 \u062A\u0642\u0644 \u0639\u0646 3 \u0623\u062D\u0631\u0641" });
  }
  user.password = newPassword;
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "users", user.username), user);
  } catch (err) {
    console.error("Firestore error on change password:", err);
  }
  res.json({ success: true, message: "\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062C\u0627\u062D" });
});
app.post("/api/admin/stores/:id/approve", async (req, res) => {
  const store = stores.find((s) => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "\u0627\u0644\u0645\u0637\u0639\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  store.isApproved = true;
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "stores", store.id), store);
  } catch (err) {
    console.error("Firestore approve store error:", err);
  }
  res.json({ success: true, store });
});
app.post("/api/admin/stores/:id/reject", async (req, res) => {
  const index = stores.findIndex((s) => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "\u0627\u0644\u0645\u0637\u0639\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const storeId = stores[index].id;
  stores.splice(index, 1);
  const userIdx = users.findIndex((u) => u.storeId === storeId);
  const usernameToDelete = userIdx !== -1 ? users[userIdx].username : null;
  if (userIdx !== -1) users.splice(userIdx, 1);
  try {
    await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(db, "stores", storeId));
    if (usernameToDelete) {
      await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(db, "users", usernameToDelete));
    }
  } catch (err) {
    console.error("Firestore reject store error:", err);
  }
  res.json({ success: true });
});
app.delete("/api/admin/stores/:id", async (req, res) => {
  const storeId = req.params.id;
  const index = stores.findIndex((s) => s.id === storeId);
  if (index === -1) return res.status(404).json({ error: "\u0627\u0644\u0645\u0637\u0639\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const productsToDelete = [];
  for (let i = products.length - 1; i >= 0; i--) {
    if (products[i].storeId === storeId) {
      productsToDelete.push(products[i].id);
      products.splice(i, 1);
    }
  }
  const ordersToDelete = [];
  for (let i = orders.length - 1; i >= 0; i--) {
    if (orders[i].storeId === storeId) {
      ordersToDelete.push(orders[i].id);
      orders.splice(i, 1);
    }
  }
  const usersToDelete = [];
  for (let i = users.length - 1; i >= 0; i--) {
    if (users[i].storeId === storeId) {
      usersToDelete.push(users[i].username);
      users.splice(i, 1);
    }
  }
  stores.splice(index, 1);
  try {
    await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(db, "stores", storeId));
    for (const prodId of productsToDelete) {
      await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(db, "products", prodId));
    }
    for (const ordId of ordersToDelete) {
      await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(db, "orders", ordId));
    }
    for (const usrId of usersToDelete) {
      await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(db, "users", usrId));
    }
  } catch (err) {
    console.error("Firestore permanent store deletion error:", err);
  }
  res.json({ success: true });
});
app.post("/api/admin/stores/:id/toggle-suspend", async (req, res) => {
  const store = stores.find((s) => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "\u0627\u0644\u0645\u0637\u0639\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  store.isSuspended = !store.isSuspended;
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "stores", store.id), store);
  } catch (err) {
    console.error("Firestore toggle-suspend error:", err);
  }
  res.json({ success: true, store });
});
app.post("/api/admin/stores/:id/approve-upgrade", async (req, res) => {
  const store = stores.find((s) => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "\u0627\u0644\u0645\u0637\u0639\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const oldPlan = store.plan;
  store.plan = "Gold";
  const months = store.pendingUpgradeMonths || (store.pendingUpgradeType === "annual" ? 12 : 1);
  store.subscriptionType = store.pendingUpgradeType || (months === 12 ? "annual" : "monthly");
  store.subscriptionMonths = months;
  let expireDate = /* @__PURE__ */ new Date();
  if (store.subscriptionExpires && oldPlan === "Gold") {
    const currentExpire = new Date(store.subscriptionExpires);
    if (currentExpire.getTime() > Date.now()) {
      expireDate = currentExpire;
    }
  }
  expireDate.setMonth(expireDate.getMonth() + months);
  store.subscriptionExpires = expireDate.toISOString().split("T")[0];
  store.requestedUpgrade = false;
  store.paymentMethod = store.pendingPaymentMethod || "Confirmed Upgrade";
  store.paymentReference = store.pendingPaymentReference || "Confirmed";
  store.pendingPaymentMethod = void 0;
  store.pendingPaymentReference = void 0;
  store.pendingUpgradeType = void 0;
  store.pendingUpgradeMonths = void 0;
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "stores", store.id), store);
  } catch (err) {
    console.error("Firestore approve upgrade error:", err);
  }
  res.json({ success: true, store });
});
app.post("/api/admin/stores/:id/reject-upgrade", async (req, res) => {
  const store = stores.find((s) => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "\u0627\u0644\u0645\u0637\u0639\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  store.requestedUpgrade = false;
  store.pendingPaymentMethod = void 0;
  store.pendingPaymentReference = void 0;
  store.pendingUpgradeType = void 0;
  store.pendingUpgradeMonths = void 0;
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "stores", store.id), store);
  } catch (err) {
    console.error("Firestore reject upgrade error:", err);
  }
  res.json({ success: true, store });
});
app.post("/api/stores/:id/request-upgrade", async (req, res) => {
  const store = stores.find((s) => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "\u0627\u0644\u0645\u0637\u0639\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const { paymentMethod, paymentReference, upgradeType, upgradeMonths } = req.body;
  if (!paymentReference) {
    return res.status(400).json({ error: "\u0627\u0644\u0631\u062C\u0627\u0621 \u0643\u0634\u0631\u064A\u0643 \u0625\u062F\u062E\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0644\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062F\u0641\u0639." });
  }
  store.requestedUpgrade = true;
  store.pendingPaymentMethod = paymentMethod || "syriatel_cash";
  store.pendingPaymentReference = paymentReference;
  store.pendingUpgradeType = upgradeType || "monthly";
  store.pendingUpgradeMonths = Number(upgradeMonths) || (upgradeType === "annual" ? 12 : 1);
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "stores", store.id), store);
  } catch (err) {
    console.error("Firestore request upgrade error:", err);
  }
  res.json({ success: true, store });
});
app.get("/api/admin/overview", (req, res) => {
  const totalStores = stores.length;
  const totalOrders = orders.length;
  const totalRevenueSYP = orders.reduce((acc, current) => current.status === "delivered" ? acc + current.totalSYP : acc, 0);
  const planFreeCount = stores.filter((s) => s.plan === "Free").length;
  const planGoldCount = stores.filter((s) => s.plan === "Gold").length;
  res.json({
    totalStores,
    totalOrders,
    totalRevenueSYP,
    planFreeCount,
    planGoldCount,
    currencyRates
  });
});
app.get("/api/stores", (req, res) => {
  res.json(stores);
});
app.get("/api/stores/:id", (req, res) => {
  const store = stores.find((s) => s.id === req.params.id);
  if (!store) {
    return res.status(404).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0637\u0639\u0645 \u0627\u0644\u0645\u0637\u0644\u0648\u0628" });
  }
  const storeProducts = products.filter((p) => p.storeId === store.id && !p.isHidden);
  res.json({ store, products: storeProducts });
});
app.put("/api/stores/:id", async (req, res) => {
  const index = stores.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0637\u0639\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  stores[index] = { ...stores[index], ...req.body };
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "stores", req.params.id), stores[index]);
  } catch (err) {
    console.error("Firestore PUT store settings error:", err);
  }
  res.json({ success: true, store: stores[index] });
});
app.put("/api/stores/:id/subscription", async (req, res) => {
  const store = stores.find((s) => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "\u0627\u0644\u0645\u0637\u0639\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const { plan, durationMonths } = req.body;
  const oldPlan = store.plan;
  store.plan = plan;
  if (plan === "Gold") {
    let expireDate = /* @__PURE__ */ new Date();
    if (store.subscriptionExpires && oldPlan === "Gold") {
      const currentExpire = new Date(store.subscriptionExpires);
      if (currentExpire.getTime() > Date.now()) {
        expireDate = currentExpire;
      }
    }
    expireDate.setMonth(expireDate.getMonth() + (durationMonths || 1));
    store.subscriptionExpires = expireDate.toISOString().split("T")[0];
  } else {
    const regDate = store.createdAt ? new Date(store.createdAt) : /* @__PURE__ */ new Date();
    const expireDate = new Date(regDate.getTime() + 14 * 24 * 60 * 60 * 1e3);
    store.subscriptionExpires = expireDate.toISOString().split("T")[0];
  }
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "stores", store.id), store);
  } catch (err) {
    console.error("Firestore PUT subscription error:", err);
  }
  res.json({ success: true, store });
});
app.get("/api/stores/:id/all-products", (req, res) => {
  const storeProducts = products.filter((p) => p.storeId === req.params.id);
  res.json(storeProducts);
});
app.post("/api/stores/:id/products", async (req, res) => {
  const store = stores.find((s) => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "\u0627\u0644\u0645\u0637\u0639\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  if (store.plan === "Free") {
    const currentCount = products.filter((p) => p.storeId === store.id).length;
    if (currentCount >= 10 && !req.body.id) {
      return res.status(403).json({
        error: "\u0627\u0644\u0631\u062C\u0627\u0621 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0644\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0630\u0647\u0628\u064A\u0629! \u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u062C\u0627\u0646\u064A \u0645\u062D\u062F\u062F \u0628\u0640 10 \u0645\u0646\u062A\u062C\u0627\u062A \u0643\u062D\u062F \u0623\u0642\u0635\u0649.",
        requiresUpgrade: true
      });
    }
  }
  const payload = req.body;
  if (payload.id) {
    const pIdx = products.findIndex((p) => p.id === payload.id);
    if (pIdx !== -1) {
      products[pIdx] = { ...products[pIdx], ...payload };
      try {
        await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "products", payload.id), products[pIdx]);
      } catch (err) {
        console.error("Firestore edit product error:", err);
      }
      return res.json({ success: true, product: products[pIdx] });
    }
  } else {
    const newProduct = {
      id: "prod-" + Math.floor(1e4 + Math.random() * 9e4),
      storeId: store.id,
      nameAr: payload.nameAr || "\u0648\u062C\u0628\u0629 \u062C\u062F\u064A\u062F\u0629",
      nameEn: payload.nameEn || "New Meal",
      descAr: payload.descAr || "",
      descEn: payload.descEn || "",
      category: payload.category || "\u0639\u0627\u0645",
      priceSYP: Number(payload.priceSYP) || 1e4,
      image: payload.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
      inStock: payload.inStock !== false,
      isHidden: payload.isHidden === true,
      extras: payload.extras || []
    };
    products.push(newProduct);
    try {
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "products", newProduct.id), newProduct);
    } catch (err) {
      console.error("Firestore create product error:", err);
    }
    return res.json({ success: true, product: newProduct });
  }
  res.status(400).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0623\u0648 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0646\u062A\u062C" });
});
app.delete("/api/stores/:id/products/:productId", async (req, res) => {
  const index = products.findIndex((p) => p.id === req.params.productId && p.storeId === req.params.id);
  if (index !== -1) {
    products.splice(index, 1);
    try {
      await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(db, "products", req.params.productId));
    } catch (err) {
      console.error("Firestore delete product error:", err);
    }
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
});
app.get("/api/stores/:id/orders", (req, res) => {
  const storeOrders = orders.filter((o) => o.storeId === req.params.id);
  res.json(storeOrders);
});
app.get("/api/customer/:username/orders", (req, res) => {
  const username = req.params.username;
  const user = users.find((u) => u.username === username);
  if (!user) return res.json([]);
  const userOrders = orders.filter(
    (o) => o.customerUsername === username || o.customerPhone === user.phone || o.customerName === user.name
  );
  res.json(userOrders);
});
app.post("/api/stores/:id/orders", async (req, res) => {
  const store = stores.find((s) => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: "\u0627\u0644\u0645\u0637\u0639\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  if (store.isSuspended) {
    return res.status(403).json({
      error: "\u0627\u0644\u0645\u0637\u0639\u0645 \u0645\u062C\u0645\u062F \u0645\u0624\u0642\u062A\u0627\u064B \u0645\u0646 \u0642\u0628\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0644\u062A\u062C\u0627\u0648\u0632 \u0645\u0634\u0627\u0643\u0644 \u0627\u0644\u062F\u0641\u0639 \u0623\u0648 \u0625\u0633\u0627\u0621\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645. \u0627\u0644\u0631\u062C\u0627\u0621 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B."
    });
  }
  const { customerName, customerPhone, customerAddress, notes, deliveryZone, items, paymentMethod, customerUsername } = req.body;
  if (!customerName || !customerPhone || !customerAddress || !deliveryZone || !items || items.length === 0) {
    return res.status(400).json({ error: "\u0627\u0644\u0631\u062C\u0627\u0621 \u0625\u062F\u062E\u0627\u0644 \u0643\u0627\u0641\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0625\u062A\u0645\u0627\u0645 \u0637\u0644\u0628\u0643." });
  }
  let subtotal = 0;
  items.forEach((it) => {
    let itemBase = it.product.priceSYP;
    let extraCosts = (it.selectedExtras || []).reduce((acc, cur) => acc + cur.priceSYP, 0);
    subtotal += (itemBase + extraCosts) * it.quantity;
  });
  let discount = 0;
  if (notes && notes.toUpperCase().includes(store.couponCode || "CLASSIC_NONE")) {
    const percent = store.couponDiscountPercent || 0;
    discount = Math.floor(subtotal * percent / 100);
  }
  const deliveryFee = deliveryZone.feeSYP || 0;
  const total = subtotal - discount + deliveryFee;
  const pointsEarned = Math.floor(total / 1e4) * (store.loyaltyPointsPer10k || 5);
  const orderId = "ORD-" + Math.floor(100 + Math.random() * 900);
  const newOrder = {
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
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    pointsEarned,
    invoiceNumber: `INV-2026-${Math.floor(1e3 + Math.random() * 9e3)}`,
    customerUsername: customerUsername || void 0
  };
  if (store.plan === "Gold") {
    newOrder.driverName = "\u0643\u0631\u0645 \u0639\u0628\u062F \u0627\u0644\u0644\u0647 (\u0633\u0627\u0626\u0642 \u0627\u0644\u0645\u0637\u0639\u0645)";
    newOrder.driverPhone = "+963966555544";
    newOrder.lat = 33.513;
    newOrder.lng = 36.262;
  }
  orders.unshift(newOrder);
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "orders", newOrder.id), newOrder);
  } catch (err) {
    console.error("Firestore create order error:", err);
  }
  res.json({ success: true, order: newOrder });
});
app.put("/api/orders/:orderId/status", async (req, res) => {
  const { status, lat, lng } = req.body;
  const order = orders.find((o) => o.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  if (status) {
    order.status = status;
    if (status === "delivering") {
      order.lat = 33.513 + (Math.random() - 0.5) * 0.01;
      order.lng = 36.262 + (Math.random() - 0.5) * 0.01;
    }
  }
  if (lat !== void 0) order.lat = lat;
  if (lng !== void 0) order.lng = lng;
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "orders", order.id), order);
  } catch (err) {
    console.error("Firestore update order status error:", err);
  }
  res.json({ success: true, order });
});
app.post("/api/gemini/generate-desc", async (req, res) => {
  const { type, nameAr, nameEn, category, ingredients } = req.body;
  const ai = getGeminiClient();
  if (!ai) {
    if (type === "restaurant") {
      return res.json({
        descAr: `\u0623\u0647\u0644\u0627\u064B \u0628\u0643\u0645 \u0641\u064A ${nameAr || "\u0645\u0637\u0639\u0645\u0646\u0627"}. \u0646\u0642\u062F\u0645 \u0644\u0643\u0645 \u0623\u0634\u0647\u0649 \u0627\u0644\u0648\u062C\u0628\u0627\u062A \u0627\u0644\u0645\u062D\u0636\u0631\u0629 \u0628\u0639\u0646\u0627\u064A\u0629 \u0645\u0646 \u0623\u062C\u0648\u062F \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0637\u0627\u0632\u062C\u0629 \u0648\u0627\u0644\u062A\u0648\u0627\u0628\u0644 \u0627\u0644\u0639\u0631\u064A\u0642\u0629 \u0644\u0646\u0636\u0645\u0646 \u0644\u0643\u0645 \u062A\u062C\u0631\u0628\u0629 \u0641\u0631\u064A\u062F\u0629 \u0644\u0627 \u062A\u064F\u0646\u0633\u0649.`,
        descEn: `Welcome to ${nameEn || "our restaurant"}. We offer the most delicious meals carefully prepared from the freshest ingredients and culinary traditions to guarantee you a unique experience.`,
        isMock: true
      });
    } else {
      return res.json({
        descAr: `\u0648\u062C\u0628\u0629 ${nameAr || "\u0645\u0645\u062A\u0639\u0629"} \u0645\u062D\u0636\u0631\u0629 \u0628\u062E\u0644\u0637\u0629 \u0633\u0631\u064A\u0629 \u0644\u0630\u064A\u0630\u0629\u060C \u063A\u0646\u064A\u0629 \u0628\u0627\u0644\u0646\u0643\u0647\u0629 \u0627\u0644\u0645\u0642\u0631\u0645\u0634\u0629 \u0648\u0627\u0644\u0628\u0647\u0627\u0631\u0627\u062A \u0627\u0644\u0634\u0627\u0645\u064A\u0629 \u0627\u0644\u062E\u0627\u0635\u0629\u060C \u0643\u0627\u0641\u064A\u0629 \u0644\u0625\u0633\u0639\u0627\u062F \u062D\u0648\u0627\u0633\u0643 \u0648\u0646\u0642\u062F\u0645\u0647\u0627 \u062D\u0627\u0631\u0629 \u0648\u0637\u0627\u0632\u062C\u0629 \u0645\u0639 \u0627\u0644\u0645\u0642\u0628\u0644\u0627\u062A.`,
        descEn: `A delicious ${nameEn || "delight"} prepared with our rich secret recipe, packed with authentic flavor and Damascus spices to cheer your day. Served fresh.`,
        isMock: true
      });
    }
  }
  try {
    const prompt = type === "restaurant" ? `You are an expert copywriter for Lebanese and Syrian premium restaurants. Create two descriptive marketing paras/paragraphs for a restaurant named "${nameAr}" (Arabic) and "${nameEn}" (English). Highlight freshness, local Syrian authenticity, hospitality and rapid delivery.
         Format the output STRICTLY as a JSON object with two fields "descAr" and "descEn". Do not write markdown tags other than standard JSON.` : `You are an expert menu description designer. Generate short mouth-watering descriptions (2 sentences max) for a meal named "${nameAr}" / "${nameEn}" in category "${category}" with options/ingredients: "${ingredients || "none specified"}". 
         Write one in Arabic ("descAr") and one in English ("descEn"). Focus on the rich traditional textures, premium taste and appetite.
         Format the output STRICTLY as a JSON object with two fields "descAr" and "descEn". Do not write markdown tags other than standard JSON.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const parsed = JSON.parse(response.text?.trim() || "{}");
    res.json(parsed);
  } catch (err) {
    console.error("Gemini description synthesis failed:", err);
    res.json({
      descAr: `\u0623\u0647\u0644\u0627\u064B \u0628\u0643\u0645 \u0641\u064A ${nameAr || "\u0645\u0637\u0639\u0645\u0646\u0627"}. \u0646\u062D\u0646 \u0641\u062E\u0648\u0631\u0648\u0646 \u0644\u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u0645\u0630\u0627\u0642 \u0627\u0644\u062D\u0642\u064A\u0642\u064A \u0648\u0627\u0644\u0646\u0643\u0647\u0629 \u0627\u0644\u0631\u0627\u0626\u0639\u0629 \u0627\u0644\u0645\u0635\u0646\u0648\u0639\u0629 \u0628\u0634\u063A\u0641 \u0648\u062D\u0628.`,
      descEn: `Welcome to ${nameEn || "our space"}. We take proud in delivering genuine tastes and satisfying meals crafted with passion.`
    });
  }
});
app.post("/api/gemini/translate-menu", async (req, res) => {
  const { textAr } = req.body;
  if (!textAr) return res.status(400).json({ error: "\u0627\u0644\u0631\u062C\u0627\u0621 \u062A\u0648\u0641\u064A\u0631 \u0627\u0644\u0646\u0635 \u0627\u0644\u0639\u0631\u0628\u064A \u0644\u062A\u0631\u062C\u0645\u062A\u0647." });
  const ai = getGeminiClient();
  if (!ai) {
    return res.json({ translatedText: textAr + " Style Plate", isMock: true });
  }
  try {
    const prompt = `Translate the following Syrian/Arabic food item or restaurant menu item into a professional English title of 2 to 4 words. Be gastronome and accurate (e.g. "\u062B\u0648\u0645\u064A\u0629" to "Garlic Dip", "\u0641\u0631\u0648\u062C \u0628\u0631\u0648\u0633\u062A\u062F" to "Broasted Crispy Chicken").
    Text: "${textAr}"
    Format the response strictly as a JSON with a single key "translatedText".`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const parsed = JSON.parse(response.text?.trim() || "{}");
    res.json(parsed);
  } catch (err) {
    res.json({ translatedText: textAr + " Special Dish" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    initializeDatabase().catch((err) => {
      console.error("Delayed database initialization failed:", err);
    });
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
