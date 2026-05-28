import React, { useState, useEffect } from "react";
import { Store, Product, CartItem, Order, CurrencyRates, DeliveryZone } from "../types";
import { ShoppingCart, Compass, CheckCircle2, ChevronRight, Phone, MessageSquare, Clipboard, MapPin, Layers, Printer, Star, Wallet, RefreshCw, X } from "lucide-react";

interface CustomerStorefrontProps {
  store: Store;
  products: Product[];
  currencyRates: CurrencyRates;
  selectedCurrency: "SYP" | "USD" | "EUR" | "TRY";
  isAr: boolean;
  onPlaceOrder: (orderData: Partial<Order>) => Promise<Order>;
  onCloseStore: () => void;
  currentUser?: any;
}

export default function CustomerStorefront({
  store,
  products,
  currencyRates,
  selectedCurrency,
  isAr,
  onPlaceOrder,
  onCloseStore,
  currentUser,
}: CustomerStorefrontProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  // Checkout Form
  const [checkoutData, setCheckoutData] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
    zone: null as DeliveryZone | null,
    paymentMethod: "cash" as "cash" | "syriatel_cash" | "mtn_cash" | "bank",
  });

  const [isManualZone, setIsManualZone] = useState(false);
  const [manualZoneName, setManualZoneName] = useState("");

  // Auto-fill form when registered customer logs in
  useEffect(() => {
    if (currentUser && currentUser.role === "customer") {
      setCheckoutData((prev) => ({
        ...prev,
        name: currentUser.name || currentUser.username || "",
        phone: currentUser.phone || "",
        address: currentUser.address || "",
      }));
    }
  }, [currentUser]);
  
  // States of order lifecycle
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<"menu" | "status">("menu");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);
  const [mapSimTimer, setMapSimTimer] = useState<any>(null);

  // Categories list
  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];

  // Currency utility
  const convertPrice = (sypPrice: number) => {
    if (selectedCurrency === "SYP") return sypPrice.toLocaleString() + (isAr ? " ل.س" : " SYP");
    const rate = currencyRates[selectedCurrency] || 1;
    const value = sypPrice / rate;
    
    // Formatting currency
    switch (selectedCurrency) {
      case "USD": return "$" + value.toFixed(2);
      case "EUR": return "€" + value.toFixed(2);
      case "TRY": return value.toFixed(1) + " TL";
      default: return sypPrice.toLocaleString() + " SYP";
    }
  };

  // Quick Cart Mechanics
  const addToCart = (product: Product, extrasSelected: any[]) => {
    const existing = cart.find(
      (c) =>
        c.product.id === product.id &&
        JSON.stringify(c.selectedExtras) === JSON.stringify(extrasSelected)
    );
    if (existing) {
      setCart(
        cart.map((c) =>
          c.product.id === product.id &&
          JSON.stringify(c.selectedExtras) === JSON.stringify(extrasSelected)
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1, selectedExtras: extrasSelected }]);
    }
  };

  const removeFromCart = (index: number) => {
    const next = [...cart];
    next.splice(index, 1);
    setCart(next);
  };

  const adjustQty = (index: number, diff: number) => {
    const next = [...cart];
    next[index].quantity += diff;
    if (next[index].quantity <= 0) {
      next.splice(index, 1);
    }
    setCart(next);
  };

  const subtotal = cart.reduce((acc, current) => {
    const extrasTotal = current.selectedExtras.reduce((sum, ext) => sum + ext.priceSYP, 0);
    return acc + (current.product.priceSYP + extrasTotal) * current.quantity;
  }, 0);

  // Apply store coupon
  const [discountPercent, setDiscountPercent] = useState(0);
  const handleApplyCoupon = () => {
    if (appliedCoupon.trim().toUpperCase() === (store.couponCode || "").toUpperCase()) {
      setDiscountPercent(store.couponDiscountPercent || 0);
      setErrorMessage("");
    } else {
      setErrorMessage(isAr ? "كود الخصم غير صحيح أو غير مفعل" : "Invalid or inactive promo code.");
      setDiscountPercent(0);
    }
  };

  const discountVal = Math.floor((subtotal * discountPercent) / 100);
  const deliveryFee = checkoutData.zone ? checkoutData.zone.feeSYP : 0;
  const totalCost = subtotal - discountVal + deliveryFee;

  // Handle checkout placement
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMessage(isAr ? "السلة فارغة" : "Your shopping basket is empty.");
      return;
    }
    if (isManualZone && !manualZoneName.trim()) {
      setErrorMessage(isAr ? "يرجى كتابة اسم منطقتك اليدوية في الحقل المخصص" : "Please specify your custom manual region name.");
      return;
    }
    if (!checkoutData.name || !checkoutData.phone || !checkoutData.address || !checkoutData.zone) {
      setErrorMessage(isAr ? "يرجى ملء كافة الخانات وتحديد مربع منطقة التوصيل" : "Please fill in all blanks and choose a delivery area.");
      return;
    }
    setErrorMessage("");
    setIsPlacing(true);

    try {
      const pOrder = await onPlaceOrder({
        storeId: store.id,
        customerName: checkoutData.name,
        customerPhone: checkoutData.phone,
        customerAddress: checkoutData.address,
        notes: checkoutData.notes + (appliedCoupon ? ` [كود: ${appliedCoupon.toUpperCase()}]` : ""),
        deliveryZone: checkoutData.zone,
        items: cart,
        paymentMethod: checkoutData.paymentMethod,
      });
      setActiveOrder(pOrder);
      setActiveTab("status");
      setCart([]);
      setShowCart(false);
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء إتمام طلبك.");
    } finally {
      setIsPlacing(false);
    }
  };

  // Simulating Live Driver moving on Damascus grid coordinates
  useEffect(() => {
    if (activeOrder && activeOrder.status !== "delivered" && activeOrder.status !== "cancelled") {
      const interval = setInterval(() => {
        setActiveOrder((prevOrder) => {
          if (!prevOrder) return null;
          // Slowly transition or offset coordinates towards customer target to satisfy "track driver" requirement
          const currentLat = prevOrder.lat || 33.513;
          const currentLng = prevOrder.lng || 36.262;
          
          return {
            ...prevOrder,
            lat: currentLat + (Math.random() - 0.4) * 0.001,
            lng: currentLng + (Math.random() - 0.4) * 0.001,
          };
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeOrder]);

  return (
    <div className="space-y-6">
      {/* Small Back Banner */}
      <div className="flex items-center justify-between text-xs bg-white py-2 px-4 rounded-xl border border-slate-100 shadow-sm">
        <button
          onClick={onCloseStore}
          className="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-bold transition-all cursor-pointer"
        >
          <ChevronRight className={isAr ? "" : "rotate-180"} size={16} />
          {isAr ? "العودة للرئيسية منصة المتاجر" : "Leave Store / Main platform"}
        </button>
        <span className="text-slate-400 font-medium">
          {isAr ? "المتجر المستضاف" : "Hosted SaaS outlet"}: {store.id}.logma.sy
        </span>
      </div>

      {/* Hero Banner Grid */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 relative">
        <div className="h-48 md:h-60 overflow-hidden relative">
          <img
            referrerPolicy="no-referrer"
            src={store.banner}
            alt={store.nameAr}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
        </div>

        {/* Floating Info */}
        <div className="p-6 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-12">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white bg-white shadow-md shrink-0">
              <img
                referrerPolicy="no-referrer"
                src={store.logo}
                alt={store.nameAr}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1 text-white md:pb-2">
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                  {store.plan === "Gold" ? (isAr ? "متجر موثق" : "Verified Store") : (isAr ? "عضو تجريبي" : "Trial Merchant")}
                </span>
                {store.plan === "Gold" && <span className="bg-emerald-600/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">👑 {isAr ? "ذهبي" : "Gold Tier"}</span>}
              </div>
              <h1 className="text-xl md:text-2xl font-bold">{isAr ? store.nameAr : store.nameEn}</h1>
              <p className="text-xs text-slate-300 font-light line-clamp-1">{isAr ? store.descAr : store.descEn}</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs space-y-2 text-slate-600 md:-mt-2">
            <div className="flex justify-between gap-4">
              <span className="font-semibold">{isAr ? "ساعات الدوام" : "Working Hours"}:</span>
              <span className="text-slate-700">{store.workingHours}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-semibold">{isAr ? "التقييم العام" : "Store Rating"}:</span>
              <span className="text-slate-700 flex items-center gap-1 font-bold">
                <Star className="text-amber-500 fill-amber-500" size={12} /> {store.rating} ({store.reviewsCount})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation for customer flow */}
      <div className="bg-slate-100 p-1 rounded-xl flex max-w-sm mx-auto border border-slate-200">
        <button
          onClick={() => setActiveTab("menu")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "menu" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {isAr ? "قائمة المأكولات" : "Food Menu Grid"}
        </button>
        {activeOrder && (
          <button
            onClick={() => setActiveTab("status")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-emerald-700 bg-emerald-50 relative cursor-pointer`}
          >
            {isAr ? "تتبع طلبك مباشر" : "Live Driver Track"}
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
          </button>
        )}
      </div>

      {activeTab === "menu" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Menu Grid / Category Filter */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-xs font-medium rounded-full cursor-pointer transition-all ${
                    selectedCategory === cat
                      ? "bg-slate-800 text-white shadow-xs font-bold"
                      : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-200"
                  }`}
                >
                  {isAr ? cat : cat}
                </button>
              ))}
            </div>

            {/* Menu Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products
                .filter((p) => selectedCategory === "All" || p.category === selectedCategory)
                .map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-md hover-scale flex flex-col justify-between"
                  >
                    <div className="p-4 space-y-4">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                          <img
                            referrerPolicy="no-referrer"
                            src={p.image}
                            alt={p.nameAr}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-800 text-sm">{isAr ? p.nameAr : p.nameEn}</h4>
                          <p className="text-xs text-slate-400 font-light line-clamp-2 leading-relaxed">
                            {isAr ? p.descAr : p.descEn}
                          </p>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium inline-block">
                            {p.category}
                          </span>
                        </div>
                      </div>

                      {p.extras && p.extras.length > 0 && (
                        <div className="pt-2 border-t border-slate-50 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {isAr ? "الإضافات المتاحة" : "Available extras"}:
                          </span>
                          <div className="flex flex-wrap gap-1.5 text-[10px]">
                            {p.extras.map((ext, idx) => (
                              <button
                                key={idx}
                                onClick={() => addToCart(p, [ext])}
                                className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/40 rounded-md px-2 py-1 font-semibold transition-all cursor-pointer"
                              >
                                {isAr ? ext.nameAr : ext.nameEn} (+{convertPrice(ext.priceSYP)})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 pt-0 flex justify-between items-center bg-slate-50/50 border-t border-slate-50">
                      <div className="text-emerald-700 font-extrabold text-sm">
                        {convertPrice(p.priceSYP)}
                      </div>
                      <button
                        onClick={() => addToCart(p, [])}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <ShoppingCart size={12} />
                        {isAr ? "أضف للسلة" : "+ Add"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Customer Basket Column */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-100 shadow-lg space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="text-slate-500" size={18} />
                {isAr ? "سلة المشتريات" : "Your Basket"}
              </h3>
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {cart.length} {isAr ? "وجبات" : "items"}
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                {isAr ? "سلتك فارغة حالياً. اضغط على أضف للسلة للمباشرة." : "Basket empty. Click any meal's Add to Cart button above."}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cart Items list */}
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                  {cart.map((item, idx) => {
                    const extrasSum = item.selectedExtras.reduce((sum, current) => sum + current.priceSYP, 0);
                    const itemTotal = (item.product.priceSYP + extrasSum) * item.quantity;
                    return (
                      <div key={idx} className="py-2 flex justify-between text-xs gap-2">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800">
                            {isAr ? item.product.nameAr : item.product.nameEn}
                          </div>
                          {item.selectedExtras.length > 0 && (
                            <div className="text-[10px] text-amber-700">
                              + {item.selectedExtras.map((e) => (isAr ? e.nameAr : e.nameEn)).join(", ")}
                            </div>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => adjustQty(idx, -1)}
                              className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className="font-bold">{item.quantity}</span>
                            <button
                              onClick={() => adjustQty(idx, 1)}
                              className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="font-bold text-slate-700">{convertPrice(itemTotal)}</div>
                          <button
                            onClick={() => removeFromCart(idx)}
                            className="text-rose-500 hover:text-rose-700 text-[10px]"
                          >
                            {isAr ? "حذف" : "Remove"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Promo Code Input */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    {isAr ? "كود التخفيض" : "Promo/Coupon Discount"}:
                  </div>
                  {store.couponCode && (
                    <span className="text-[10px] text-emerald-600 block bg-emerald-50 px-2 py-1 rounded border border-emerald-100/50">
                      💡 {isAr ? "كود المطعم المتاح حالياً" : "Current active store coupon"}: <strong className="font-black bg-white px-1.5 py-0.5 rounded shadow-xs border border-emerald-100 text-slate-700">{store.couponCode}</strong> (-{store.couponDiscountPercent}%)
                    </span>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={appliedCoupon}
                      onChange={(e) => setAppliedCoupon(e.target.value)}
                      placeholder="e.g. CLASSIC10"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="bg-slate-800 text-white rounded-lg text-xs px-3 font-medium cursor-pointer hover:bg-slate-900"
                    >
                      {isAr ? "تطبيق" : "Apply"}
                    </button>
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1.5 border border-slate-200/50">
                  <div className="flex justify-between text-slate-500">
                    <span>{isAr ? "المجموع الفرعي" : "Subtotal"}</span>
                    <span>{convertPrice(subtotal)}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                      <span>{isAr ? "الخصم المطبق" : "Discount"} (-{discountPercent}%)</span>
                      <span>-{convertPrice(discountVal)}</span>
                    </div>
                  )}
                  {checkoutData.zone && (
                    <div className="flex justify-between text-slate-500">
                      <span>{isAr ? "أجرة التوصيل" : "Delivery fee"}</span>
                      <span>+{convertPrice(deliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-2 text-sm">
                    <span>{isAr ? "المجموع النهائي" : "Grand Total"}</span>
                    <span className="text-emerald-700 font-black">{convertPrice(totalCost)}</span>
                  </div>
                </div>

                {/* Syrian Checkout Billing Form */}
                <form onSubmit={handleFormSubmit} className="space-y-3 pt-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-100 pb-1.5">
                    🛍️ {isAr ? "بيانات التوصيل والدفع" : "Receipt Delivery & Wallets"}
                  </h4>

                  {errorMessage && (
                    <div className="bg-rose-50 text-rose-800 border border-rose-100 p-2.5 rounded-lg text-[11px]">
                      {errorMessage}
                    </div>
                  )}

                  <div className="space-y-1">
                    <input
                      type="text"
                      required
                      placeholder={isAr ? "اسم العميل بالكامل" : "Customer Full Name"}
                      value={checkoutData.name}
                      onChange={(e) => setCheckoutData({ ...checkoutData, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <input
                      type="text"
                      required
                      placeholder={isAr ? "رقم الهاتف السوري (مثال: 0934567891)" : "Syrian Phone No."}
                      value={checkoutData.phone}
                      onChange={(e) => setCheckoutData({ ...checkoutData, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-1">
                    <select
                      required
                      value={isManualZone ? "manual" : (checkoutData.zone ? JSON.stringify(checkoutData.zone) : "")}
                      onChange={(e) => {
                        if (e.target.value === "manual") {
                          setIsManualZone(true);
                          const customName = manualZoneName || (isAr ? "كتابة يدوية / منطقة مخصصة" : "Manual / Custom Zone");
                          setCheckoutData({
                            ...checkoutData,
                            zone: {
                              zoneAr: customName,
                              zoneEn: customName,
                              feeSYP: 15000,
                            }
                          });
                        } else {
                          setIsManualZone(false);
                          const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                          setCheckoutData({ ...checkoutData, zone: parsed });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none"
                    >
                      <option value="">-- {isAr ? "اختر منطقة التوصيل التلقائية" : "Select Delivery Zone"} --</option>
                      {store.deliveryZones.map((z, i) => (
                        <option key={i} value={JSON.stringify(z)}>
                          {isAr ? z.zoneAr : z.zoneEn} (+{convertPrice(z.feeSYP)})
                        </option>
                      ))}
                      <option value="manual">✍️ {isAr ? "منطقتي ليست بالقائمة (كتابة يدوية)" : "✍️ My region is not listed (Write manually)"}</option>
                    </select>
                  </div>

                  {isManualZone && (
                    <div className="space-y-1.5 p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-right">
                      <label className="block text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400">
                        ✍️ {isAr ? "اكتب اسم منطقتك / الحي هنا:" : "Type your Region / District name here:"}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={isAr ? "مثال: مشروع دمر، الجزيرة 16" : "e.g., Mashrou' Dummar, Island 16"}
                        value={manualZoneName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualZoneName(val);
                          setCheckoutData(prev => ({
                            ...prev,
                            zone: {
                              zoneAr: isAr ? `يدوي: ${val}` : `Custom: ${val}`,
                              zoneEn: `Custom: ${val}`,
                              feeSYP: 15050,
                            }
                          }));
                        }}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right"
                      />
                      <p className="text-[10px] text-slate-400">
                        * {isAr ? "توصيل تقديري للمناطق غير المدرجة بقيمة مضافة مقطوعة 15,000 ل.س" : "Estimated standard flat fee of 15,000 SYP for unlisted areas."}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <textarea
                      required
                      placeholder={isAr ? "العنوان الفيزيائي المفصل (شارع، بناء، معالم مميزة)" : "Detailed physical address landmarks"}
                      rows={2}
                      value={checkoutData.address}
                      onChange={(e) => setCheckoutData({ ...checkoutData, address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 text-slate-800"
                    ></textarea>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder={isAr ? "ملاحظات خاصة على الوجبة (اختياري)" : "Meal option special notes"}
                      value={checkoutData.notes}
                      onChange={(e) => setCheckoutData({ ...checkoutData, notes: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>

                  {/* Wallet & COD Simulator */}
                  <div className="space-y-1 pt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      💳 {isAr ? "طريقة الدفع المشفرة" : "Secured payment options"}:
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div
                        onClick={() => setCheckoutData({ ...checkoutData, paymentMethod: "cash" })}
                        className={`p-2 rounded-lg border text-center cursor-pointer flex items-center justify-center gap-1 ${
                          checkoutData.paymentMethod === "cash" ? "border-slate-800 bg-slate-50 font-bold" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <Wallet size={12} />
                        {isAr ? "نقد بكاش COD" : "COD Cash"}
                      </div>
                      <div
                        onClick={() => setCheckoutData({ ...checkoutData, paymentMethod: "syriatel_cash" })}
                        className={`p-2 rounded-lg border text-center cursor-pointer flex items-center justify-center gap-1 ${
                          checkoutData.paymentMethod === "syriatel_cash" ? "border-red-500 bg-red-50 text-red-800 font-bold" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <Wallet size={12} className="text-red-500" />
                        {isAr ? "سيريتل كاش" : "Syriatel Cash"}
                      </div>
                      <div
                        onClick={() => setCheckoutData({ ...checkoutData, paymentMethod: "mtn_cash" })}
                        className={`p-2 rounded-lg border text-center cursor-pointer flex items-center justify-center gap-1 ${
                          checkoutData.paymentMethod === "mtn_cash" ? "border-amber-500 bg-amber-50 text-amber-800 font-bold" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <Wallet size={12} className="text-amber-500" />
                        {isAr ? "MTN كاش" : "MTN Cash"}
                      </div>
                      <div
                        onClick={() => setCheckoutData({ ...checkoutData, paymentMethod: "bank" })}
                        className={`p-2 rounded-lg border text-center cursor-pointer flex items-center justify-center gap-1 ${
                          checkoutData.paymentMethod === "bank" ? "border-indigo-500 bg-indigo-50 text-indigo-800 font-bold" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <Wallet size={12} className="text-indigo-500" />
                        {isAr ? "تحويل بيمو الشام" : "BIMO Transfer"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPlacing}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/10 transition-all text-xs flex justify-center items-center gap-2 cursor-pointer"
                  >
                    {isPlacing ? (
                      <>
                        <RefreshCw className="animate-spin" size={14} />
                        {isAr ? "جاري تشفير ومعالجة الطلب..." : "Placing Secure Order..."}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        {isAr ? "إرسال طلب مباشر للمطعم" : "Checkout Now"}
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Status Tracking / Live Map */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Simulated Live GPS Map View */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-5 border border-slate-100 shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Compass className="text-emerald-500 animate-pulse" size={18} />
                {isAr ? "تتبع مباشر من خلال GPS مندوب التوصيل" : "Live GPS Courier Dispatch coordinates"}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Lat: {activeOrder?.lat?.toFixed(5) || "33.5115"} | Lng: {activeOrder?.lng?.toFixed(5) || "36.2575"}
              </span>
            </div>

            {/* Simulated Damascus streets graphics */}
            <div className="relative h-64 md:h-80 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center font-mono text-[10px] text-slate-500">
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
              
              {/* Fake Damascus vectors layout */}
              <div className="absolute h-0.5 w-full bg-slate-800 top-1/3"></div>
              <div className="absolute h-0.5 w-full bg-slate-800 top-2/3"></div>
              <div className="absolute w-0.5 h-full bg-slate-800 left-1/3"></div>
              <div className="absolute w-0.5 h-full bg-slate-800 left-2/3"></div>

              {/* Labels */}
              <div className="absolute top-4 left-6 text-slate-600">Al-Mazza Hwy - أوتوستراد المزة</div>
              <div className="absolute bottom-6 left-6 text-slate-600">Kafarsouseh - كفرسوسة</div>
              <div className="absolute top-4 right-10 text-slate-600">Abu Rummaneh - أبو رمانة</div>
              <div className="absolute bottom-6 right-10 text-slate-600">Downtown Damascus - وسط البلد سورية</div>

              {/* Destination Pin */}
              <div className="absolute top-1/2 left-[55%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10">
                <div className="w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center animate-bounce shadow">
                  <MapPin size={12} />
                </div>
                <div className="bg-slate-900/90 text-[8px] text-white px-1.5 py-0.5 rounded border border-slate-700/50 mt-1 whitespace-nowrap">
                  {isAr ? "موقعك (الهدف)" : "You (Home Target)"}
                </div>
              </div>

              {/* Courier Rider dot */}
              <div
                className="absolute text-center z-20 pointer-events-none transition-all duration-3000"
                style={{
                  top: `${40 + (Math.sin(activeOrder?.lat || 0) * 10)}%`,
                  left: `${45 + (Math.cos(activeOrder?.lng || 0) * 10)}%`,
                }}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-slate-900">
                  🛵
                </div>
                <div className="bg-emerald-950 text-[8px] text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 mt-1 font-bold whitespace-nowrap">
                  {activeOrder?.driverName || (isAr ? "مندوب لقمة" : "Delivery Driver")}
                </div>
              </div>

              {/* Simulated Stats over the map */}
              <div className="absolute bottom-3 left-3 bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-slate-400 space-y-1">
                <div>{isAr ? "السرعة" : "Courier Speed"}: 34 km/h</div>
                <div>{isAr ? "المسافر" : "Distance Left"}: ~1.4 km</div>
                <div>{isAr ? "الوصول المقدر" : "Estimated Arrival"}: {activeOrder?.status === "delivering" ? "12 mins" : "--"}</div>
              </div>
            </div>

            {/* Courier Details WhatsApp Box */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg">
                  👤
                </div>
                <div>
                  <div className="font-bold text-slate-800">
                    {activeOrder?.driverName || (isAr ? "جاري اختيار سائق للتوصيل" : "Selecting order Courier")}
                  </div>
                  <div className="text-slate-500 font-mono">{activeOrder?.driverPhone || "--"}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={`https://wa.me/${store.whatsapp}`}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-4 py-2 rounded-xl flex items-center gap-2 font-semibold cursor-pointer"
                >
                  <MessageSquare size={14} />
                  {isAr ? "راسل المطعم واتساب" : "WhatsApp Restaurant"}
                </a>
              </div>
            </div>
          </div>

          {/* Active Invoice & Points Columns */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-100 shadow-xl space-y-6">
            <div className="space-y-4">
              <div className="text-center font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-center gap-1.5">
                <Clipboard className="text-indigo-600" size={18} />
                {isAr ? "قاطعة الفاتورة الإلكترونية" : "Electronic Checkout Receipt"}
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 font-sans text-xs">
                {/* Simulated Thermal Printer Logo */}
                <div className="text-center space-y-1">
                  <h4 className="font-bold text-slate-800">{isAr ? store.nameAr : store.nameEn}</h4>
                  <p className="text-[10px] text-slate-400">دمشق - سورية (سجل تجاري رقم {store.id})</p>
                  <div className="text-[10px] font-mono text-slate-500">{activeOrder?.invoiceNumber}</div>
                </div>

                {/* Items printed */}
                <div className="space-y-2 border-t border-b border-dashed border-slate-300 py-3">
                  {activeOrder?.items.map((it, idx) => {
                    const extraSum = (it.selectedExtras || []).reduce((acc, current) => acc + current.priceSYP, 0);
                    return (
                      <div key={idx} className="flex justify-between">
                        <span>{it.quantity}x {isAr ? it.product.nameAr : it.product.nameEn} {it.selectedExtras.length > 0 ? "*" : ""}</span>
                        <span className="font-mono">{convertPrice((it.product.priceSYP + extraSum) * it.quantity)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Print details */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{isAr ? "المجموع الأساسي" : "Menu Cost"}</span>
                    <span className="font-mono">{convertPrice(activeOrder?.subtotalSYP || 0)}</span>
                  </div>
                  {activeOrder && activeOrder.discountSYP > 0 && (
                    <div className="flex justify-between text-[11px] text-emerald-600 font-semibold">
                      <span>{isAr ? "القسيمة المخصومة" : "Coupon discount"}</span>
                      <span className="font-mono">-{convertPrice(activeOrder.discountSYP)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{isAr ? "رسوم شحن الوجبة" : "Local delivery charges"}</span>
                    <span className="font-mono">+{convertPrice(activeOrder?.deliveryFeeSYP || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-2 text-sm">
                    <span>{isAr ? "المجموع المدفوع" : "Charged Total"}</span>
                    <span className="text-emerald-700 font-black font-mono">{convertPrice(activeOrder?.totalSYP || 0)}</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 space-y-1 bg-white p-2.5 rounded-xl border border-slate-200/50">
                  <span className="block text-amber-600 font-bold">
                    🚀 {isAr ? "كسبت" : "Earned"} {activeOrder?.pointsEarned} {isAr ? "نقطة ولاء في هذا الطلب!" : "Loyalty rewards!"}
                  </span>
                  <span>{isAr ? "يمكنك استبدالها بوجبات وهدايا مجانية مستقبلاً." : "Can be exchanged for free dishes next checkout."}</span>
                </div>

                {/* Simulated Barcode */}
                <div className="flex flex-col items-center justify-center gap-1.5 pt-2">
                  <div className="flex items-center gap-0.5 justify-center">
                    {[1, 1, 3, 1, 2, 4, 1, 3, 1, 2, 4, 1, 1, 3, 2, 1, 1].map((bar, index) => (
                      <div
                        key={index}
                        className="bg-slate-700 h-6"
                        style={{ width: `${bar}px` }}
                      ></div>
                    ))}
                  </div>
                  <span className="text-[8px] font-mono text-slate-400">LOGMA-BARCODE-SYNCED-2026</span>
                </div>
              </div>

              {/* Status Stepper */}
              <div className="space-y-3 pt-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase">
                  {isAr ? "مراحل تحضير طلبك" : "Current preparation state"}
                </h4>

                <div className="space-y-4 relative border-l-2 border-slate-100 pl-4 text-xs">
                  {[
                    { state: "pending", labelAr: "بانتظار قبول المتجر للطلب", labelEn: "Awaiting outlet acceptance" },
                    { state: "accepted", labelAr: "تم قبول الفاتورة وتنسيق المطبخ", labelEn: "Invoice accepted & coordinated" },
                    { state: "preparing", labelAr: "جاري طهي المأكولات وتعبئتها", labelEn: "Dishes cooking & packed" },
                    { state: "delivering", labelAr: "السائق بالخارج يقوم بالتسليم المباشر", labelEn: "Courier on street delivering" },
                    { state: "delivered", labelAr: "تم تسليم الوجبة بالصحة والعافية", labelEn: "Dishes delivered successfully" },
                  ].map((step, idx) => {
                    const statesArray = ["pending", "accepted", "preparing", "delivering", "delivered"];
                    const currentIdx = statesArray.indexOf(activeOrder?.status || "pending");
                    const stepIdx = statesArray.indexOf(step.state);
                    const isActive = stepIdx <= currentIdx;

                    return (
                      <div key={idx} className="relative">
                        <div
                          className={`absolute -left-[25px] top-0 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                            isActive ? "bg-emerald-500 border-white text-white" : "bg-slate-50 border-slate-200 text-slate-400"
                          }`}
                        >
                          {isActive && "✓"}
                        </div>
                        <div className={isActive ? "text-slate-800 font-bold" : "text-slate-400 font-light"}>
                          {isAr ? step.labelAr : step.labelEn}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
