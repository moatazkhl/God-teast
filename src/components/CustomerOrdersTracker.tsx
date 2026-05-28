import React, { useState, useEffect } from "react";
import { Order, CurrencyRates } from "../types";
import { ShoppingBag, ChevronLeft, MapPin, Phone, Clock, Bike, CheckCircle2, ShieldAlert, Utensils, MessageSquare, Clipboard, ExternalLink } from "lucide-react";

interface CustomerOrdersTrackerProps {
  orders: Order[];
  isAr: boolean;
  currentUser: any;
  currencyRates: CurrencyRates;
  selectedCurrency: "SYP" | "USD" | "EUR" | "TRY";
  onBackToShopping: () => void;
  onRefresh: () => void;
  storesList: any[];
  darkTheme: boolean;
}

export default function CustomerOrdersTracker({
  orders,
  isAr,
  currentUser,
  currencyRates,
  selectedCurrency,
  onBackToShopping,
  onRefresh,
  storesList,
  darkTheme,
}: CustomerOrdersTrackerProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Set the first order as selected by default if exists
  useEffect(() => {
    if (orders.length > 0 && !selectedOrder) {
      setSelectedOrder(orders[0]);
    } else if (selectedOrder) {
      // Keep it synced with fresh data (e.g. status changes)
      const fresh = orders.find((o) => o.id === selectedOrder.id);
      if (fresh) setSelectedOrder(fresh);
    }
  }, [orders, selectedOrder]);

  const convertPrice = (sypPrice: number) => {
    if (selectedCurrency === "SYP") return sypPrice.toLocaleString() + (isAr ? " ل.س" : " SYP");
    const rate = currencyRates[selectedCurrency] || 1;
    const value = sypPrice / rate;
    
    switch (selectedCurrency) {
      case "USD": return "$" + value.toFixed(2);
      case "EUR": return "€" + value.toFixed(2);
      case "TRY": return value.toFixed(1) + " TL";
      default: return sypPrice.toLocaleString() + " SYP";
    }
  };

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "pending": return isAr ? "بانتظار الموافقة" : "Pending Confirmation";
      case "accepted": return isAr ? "تم قبول الطلب" : "Accepted";
      case "preparing": return isAr ? "يتم التحضير في المطبخ" : "Preparing in Kitchen";
      case "delivering": return isAr ? "جاري التوصيل مع السائق" : "Out for Delivery";
      case "delivered": return isAr ? "تم التوصيل بنجاح" : "Delivered";
      case "cancelled": return isAr ? "ملغي" : "Cancelled";
      default: return status;
    }
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800";
      case "accepted": return "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800";
      case "preparing": return "text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800";
      case "delivering": return "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800";
      case "delivered": return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800";
      case "cancelled": return "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800";
      default: return "text-slate-500 bg-slate-50";
    }
  };

  // Timeline Steps
  const steps: { nameAr: string; nameEn: string; code: Order["status"] }[] = [
    { nameAr: "مستلم", nameEn: "Received", code: "pending" },
    { nameAr: "مقبول", nameEn: "Accepted", code: "accepted" },
    { nameAr: "قيد التحضير", nameEn: "Preparing", code: "preparing" },
    { nameAr: "مع السائق", nameEn: "On the Way", code: "delivering" },
    { nameAr: "تم التسليم", nameEn: "Delivered", code: "delivered" },
  ];

  const getStepIndex = (status: Order["status"]) => {
    if (status === "cancelled") return -1;
    return steps.findIndex((s) => s.code === status);
  };

  const activeStepIdx = selectedOrder ? getStepIndex(selectedOrder.status) : 0;

  const currentStore = selectedOrder 
    ? storesList.find(s => s.id === selectedOrder.storeId) 
    : null;

  return (
    <div className="space-y-8 animate-fade-in" id="customer-orders-tracker-root">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full">
              {isAr ? "زبون مسجل بموثقية" : "Registered Customer Profile"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isAr ? `أهلاً بك، ${currentUser?.name || currentUser?.username || "معتز"}` : `Welcome back, ${currentUser?.name || currentUser?.username}`}
          </h1>
          <p className="text-xs text-slate-500">
            {isAr 
              ? `لوحة متابعة طلبات المطاعم المسجلة برقم هاتف: ${currentUser?.phone || "0934567891"}` 
              : `Tracking dining requests placed with phone: ${currentUser?.phone || "0934567891"}`}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all"
          >
            🔄 {isAr ? "تحديث الحالات" : "Refresh States"}
          </button>
          <button
            onClick={onBackToShopping}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/15"
          >
            <ShoppingBag size={14} />
            {isAr ? "اطلب وجبة جديدة" : "New Order / Browse Inlets"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Orders Side-List */}
        <div className="space-y-4">
          <h2 className="text-md font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            🍕 {isAr ? "قائمة طلباتك السابقة والجارية" : "My Placed Culinary Requests"} 
            <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {orders.length}
            </span>
          </h2>

          {orders.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
              <span className="text-3xl">🥡</span>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                {isAr 
                  ? "لا يوجد أي طلبات نشطة مسجلة باسمك حالياً. يمكنك الذهاب سريعاً لأي مطعم للبدء بإرسال وجباتك المشتهاة!" 
                  : "No active restaurant orders under your record yet. Let's find your preferred meal!"}
              </p>
              <button
                onClick={onBackToShopping}
                className="mx-auto bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                {isAr ? "تصفح المطاعم السورية" : "Review Syria Eateries"}
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {orders.map((ord) => {
                const store = storesList.find((s) => s.id === ord.storeId);
                const isSelected = selectedOrder?.id === ord.id;
                
                return (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-right relative ${
                      isSelected
                        ? "bg-white dark:bg-slate-850 border-emerald-500 shadow-sm"
                        : "bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="text-right">
                        <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                          {isAr ? (store?.nameAr || "مطعم مجهول") : (store?.nameEn || "Unknown Outlet")}
                        </h4>
                        <span className="font-mono text-[9px] text-slate-400">
                          ID: {ord.id} • {ord.invoiceNumber}
                        </span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(ord.status)}`}>
                        {getStatusText(ord.status)}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 flex justify-between items-center mt-3 pt-2.5 border-t border-slate-50 dark:border-slate-800/40">
                      <span>{isAr ? "تاريخ الطلب:" : "Ordered:"} <span className="font-mono">{new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>
                      <strong className="text-slate-800 dark:text-emerald-400 font-bold">{convertPrice(ord.totalSYP)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right & Middle Side: Full Interactive Tracker View */}
        <div className="lg:col-span-2 space-y-6">
          {selectedOrder ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 text-right">
              
              {/* Card Title & General Action */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📈</span>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      {isAr ? `تتبع طلبك: ${selectedOrder.id}` : `Track Order: ${selectedOrder.id}`}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isAr 
                      ? `الفاتورة المانحة: ${selectedOrder.invoiceNumber} • صادر من ${currentStore ? (isAr ? currentStore.nameAr : currentStore.nameEn) : "المطعم"}` 
                      : `Invoice reference: ${selectedOrder.invoiceNumber} • Issued by ${currentStore ? (isAr ? currentStore.nameAr : currentStore.nameEn) : "Store"}`}
                  </p>
                </div>
                
                <div className={`p-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 ${getStatusColor(selectedOrder.status)}`}>
                  <span>{getStatusText(selectedOrder.status)}</span>
                </div>
              </div>

              {/* Status Timeline Stepper */}
              {selectedOrder.status === "cancelled" ? (
                <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 p-4 rounded-2xl border border-rose-100 dark:border-rose-900 flex items-center gap-3">
                  <ShieldAlert size={20} className="shrink-0" />
                  <p className="text-xs leading-relaxed font-semibold">
                    {isAr 
                      ? "نأسف شريكنا، لقد تم إلغاء هذا الطلب من قبل إدارة المطعم للتفاصيل يرجى الاتصال المباشر بالمطعم." 
                      : "We apologize, this culinary request was cancelled by the eatery. Please contact store directly."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500">{isAr ? "مراحل تنفيذ وتوصيل الوجبة المباشرة:" : "Real-time kitchen execution phases:"}</h4>
                  
                  {/* Graphical Stepper */}
                  <div className="relative pt-4 pb-8">
                    {/* Progress Bar Backline */}
                    <div className="absolute top-[37px] left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
                    <div 
                      className="absolute top-[37px] right-0 h-1 bg-gradient-to-l from-emerald-500 to-indigo-500 -translate-y-1/2 z-0 transition-all duration-1000"
                      style={{ 
                        width: `${(activeStepIdx / (steps.length - 1)) * 100}%`,
                        right: isAr ? 0 : 'auto',
                        left: isAr ? 'auto' : 0
                      }}
                    ></div>

                    <div className="grid grid-cols-5 relative z-10 text-center">
                      {steps.map((step, idx) => {
                        const isCompleted = idx < activeStepIdx;
                        const isActive = idx === activeStepIdx;
                        
                        return (
                          <div key={idx} className="flex flex-col items-center space-y-2">
                            {/* Circle Indicator */}
                            <div 
                              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                isActive 
                                  ? "bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-md scale-110" 
                                  : isCompleted 
                                  ? "bg-emerald-500 border-emerald-500 text-white" 
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
                              }`}
                            >
                              {isCompleted ? <CheckCircle2 size={16} /> : (idx + 1)}
                            </div>
                            
                            {/* Text labels */}
                            <span className={`text-[10px] sm:text-[11px] font-bold ${isActive ? "text-indigo-600 dark:text-indigo-400" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
                              {isAr ? step.nameAr : step.nameEn}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Middle Grid: GPS Active Map & Kitchen Bill details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Visual Tracker Map */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between overflow-hidden relative min-h-[260px]">
                  
                  {/* Map Header */}
                  <div className="z-10 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xs p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] font-semibold flex items-center justify-between shadow-xs">
                    <span className="flex items-center gap-1">
                      <Bike size={12} className="text-indigo-600 animate-bounce" />
                      {isAr ? "بث السائق GPS المباشر" : "GPS Live Outpost Tracker"}
                    </span>
                    <span className="font-mono text-emerald-600">{selectedOrder.status === "delivering" ? "Active" : "Static Map"}</span>
                  </div>

                  {/* SVG Damascus Vector Map Simulation */}
                  <div className="absolute inset-0 z-0 opacity-80 select-none">
                    <svg className="w-full h-full" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Grid Roads */}
                      <path d="M 0 50 L 300 50 M 0 150 L 300 150 M 0 250 L 300 250 M 70 0 L 70 300 M 180 0 L 180 300" stroke="#000" strokeOpacity={darkTheme ? "0.15" : "0.05"} strokeWidth="5" />
                      <path d="M 10 10 L 290 290 M 290 10 L 10 290" stroke="#000" strokeOpacity={darkTheme ? "0.12" : "0.04"} strokeWidth="2.5" />
                      <circle cx="70" cy="50" r="105" stroke="#10b981" strokeOpacity="0.04" strokeWidth="2" fill="#10b981" fillOpacity="0.01" />

                      {/* Landmarks */}
                      <text x="75" y="45" fill="#94a3b8" fontSize="7" fontWeight="bold">المزة أوتوستراد</text>
                      <text x="185" y="145" fill="#94a3b8" fontSize="7" fontWeight="bold">ساحة الأمويين</text>
                      <text x="20" y="245" fill="#94a3b8" fontSize="7" fontWeight="bold">أوتوستراد كفرسوسة</text>

                      {/* Store Pin (Damas Center) */}
                      <circle cx="180" cy="150" r="6" fill="#10b981" fillOpacity="0.4" />
                      <circle cx="180" cy="150" r="3" fill="#10b981" />
                      <text x="190" y="153" fill="#10b981" fontSize="6" fontWeight="extrabold">{isAr ? "المطعم" : "Kitchen"}</text>

                      {/* Customer Target Home Pin */}
                      <circle cx="70" cy="50" r="6" fill="#f43f5e" fillOpacity="0.4" />
                      <circle cx="70" cy="50" r="3" fill="#f43f5e" />
                      <text x="35" y="45" fill="#f43f5e" fontSize="6" fontWeight="bold">منزلك 🏠</text>

                      {/* Driver Scooter Indicator */}
                      {selectedOrder.status === "delivering" ? (
                        <g transform={`translate(${selectedOrder.lng ? (selectedOrder.lng - 36.25) * 5000 + 130 : 130}, ${selectedOrder.lat ? (33.52 - selectedOrder.lat) * 5000 + 140 : 140})`}>
                          <circle cx="0" cy="0" r="10" fill="#4f46e5" fillOpacity="0.3" className="animate-ping" />
                          <circle cx="0" cy="0" r="5" fill="#4f46e5" />
                          <path d="M-8,-14 L8,-14 L0,-5 Z" fill="#4f46e5" />
                        </g>
                      ) : (
                        // Static representation if not out for delivery
                        <g transform="translate(180, 150)">
                          <circle cx="0" cy="0" r="4" fill="#64748b" />
                        </g>
                      )}
                    </svg>
                  </div>

                  {/* Delivery Crew Box */}
                  <div className="z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 mt-auto shadow-sm">
                    {selectedOrder.driverName ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400">{isAr ? "كابتن التوصيل:" : "Rider Name:"}</span>
                          <strong className="text-slate-700 dark:text-slate-300 font-extrabold">{selectedOrder.driverName}</strong>
                        </div>

                        {selectedOrder.status === "delivering" ? (
                          <div className="flex gap-2 text-[10px]">
                            <a
                              href={`tel:${selectedOrder.driverPhone || "0966555544"}`}
                              className="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-100 py-1.5 rounded-lg font-bold hover:bg-emerald-100 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Phone size={10} />
                              {isAr ? "اتصال بالسائق" : "Call Driver"}
                            </a>
                            <a
                              href={`https://wa.me/${selectedOrder.driverPhone?.replace(/\+/g, '') || "963966555544"}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 bg-slate-100 text-slate-700 py-1.5 rounded-lg hover:bg-slate-200 transition-all text-center flex items-center justify-center gap-1 cursor-pointer font-bold"
                            >
                              💬 WhatsApp
                            </a>
                          </div>
                        ) : (
                          <div className="text-[9px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1.5 rounded-lg text-center font-medium">
                            {isAr ? "سيركب السائق لتوصيل الطلب فور الانتهاء من التحضير في المطبخ!" : "The driver will be dispatched once cooking is completed!"}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-[9px] text-slate-400 py-1 font-medium">
                        {isAr ? "بانتظار تخصيص السائق من المطعم" : "Awaiting dispatch allocations"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Receipt and Details Card */}
                <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1">
                    📋 {isAr ? "مفاتيح الفاتورة ومكونها" : "Meal Details & Bill Spec"}
                  </h4>

                  {/* Items List */}
                  <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1">
                    {selectedOrder.items.map((it, idx) => {
                      const extrasTotal = it.selectedExtras.reduce((acc, cur) => acc + cur.priceSYP, 0);
                      
                      return (
                        <div key={idx} className="text-xs text-slate-600 dark:text-slate-400 space-y-1 bg-white dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                          <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                            <span>x{it.quantity} {isAr ? it.product.nameAr : it.product.nameEn}</span>
                            <span>{convertPrice((it.product.priceSYP + extrasTotal) * it.quantity)}</span>
                          </div>

                          {it.selectedExtras.length > 0 && (
                            <div className="text-[10px] text-slate-400 font-medium">
                              + {it.selectedExtras.map(ex => isAr ? ex.nameAr : ex.nameEn).join(", ")}
                            </div>
                          )}

                          {it.itemNotes && (
                            <div className="text-[9px] text-rose-500 bg-rose-50/50 rounded px-1 py-0.5 inline-block">
                              ✍️ {it.itemNotes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Pricing */}
                  <div className="text-xs space-y-1.5 pt-3 border-t border-slate-150 dark:border-slate-800 font-semibold text-slate-500">
                    <div className="flex justify-between">
                      <span>{isAr ? "المجموع الفرعي" : "Subtotal"}:</span>
                      <span className="text-slate-700 dark:text-slate-300">{convertPrice(selectedOrder.subtotalSYP)}</span>
                    </div>

                    {selectedOrder.discountSYP > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>{isAr ? "الخصم المطبق" : "Deduction Discount"}:</span>
                        <span>-{convertPrice(selectedOrder.discountSYP)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>{isAr ? "أجرة خدمات التوصيل" : "Delivery Service"}:</span>
                      <span className="text-slate-705 dark:text-slate-305">{convertPrice(selectedOrder.deliveryFeeSYP)}</span>
                    </div>

                    <div className="flex justify-between text-xs font-black text-slate-800 dark:text-emerald-400 border-t border-dashed border-slate-200 dark:border-slate-800 pt-2 pb-1">
                      <span>{isAr ? "المجموع النهائي الصافي" : "Total Net Invoiced"}:</span>
                      <span>{convertPrice(selectedOrder.totalSYP)}</span>
                    </div>
                  </div>

                  {/* Delivery Location & Method */}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-[10px] text-slate-500 font-medium">
                    <div className="flex justify-between">
                      <span>{isAr ? "وجهة التوصيل الشاملة:" : "Target Address:"}</span>
                      <span className="text-slate-700 dark:text-slate-300 font-bold truncate max-w-[150px]">{selectedOrder.customerAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isAr ? "طريقة التسوية:" : "Settlement Method:"}</span>
                      <span className="text-slate-700 dark:text-slate-300 font-bold uppercase">{selectedOrder.paymentMethod}</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-xs">
              🤖 {isAr ? "الرجاء النقر على أي طلب من سلة طلباتك لاستعراض حالته والخرائط فوراً!" : "Please select a culinary order to trace the stages immediately!"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
