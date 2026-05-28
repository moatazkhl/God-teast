import React, { useState } from "react";
import { Store, CurrencyRates } from "../types";
import { ShoppingBag, Star, Zap, Percent, ShieldCheck, Globe, DollarSign, PlusCircle, ArrowRight, TrendingUp } from "lucide-react";

interface SaaSOverviewProps {
  stores: Store[];
  currencyRates: CurrencyRates;
  selectedCurrency: "SYP" | "USD" | "EUR" | "TRY";
  isAr: boolean;
  onRegisterStore: (data: {
    username: string;
    email: string;
    phone: string;
    password?: string;
    storeNameAr: string;
    storeNameEn: string;
    plan: "Free" | "Gold";
    paymentMethod?: string;
    paymentReference?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onSelectStore: (storeId: string) => void;
  onRegisterCustomer: (data: {
    username: string;
    email: string;
    password?: string;
    name: string;
    phone: string;
    address: string;
  }) => Promise<{ success: boolean; error?: string }>;
  stats: {
    totalStores: number;
    totalOrders: number;
    totalRevenueSYP: number;
    planFreeCount: number;
    planGoldCount: number;
  };
}

export default function SaaSOverview({
  stores,
  currencyRates,
  selectedCurrency,
  isAr,
  onRegisterStore,
  onSelectStore,
  onRegisterCustomer,
  stats,
}: SaaSOverviewProps) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    storeNameAr: "",
    storeNameEn: "",
    plan: "Free" as "Free" | "Gold",
    paymentMethod: "syriatel_cash",
    paymentReference: "",
  });
  const [customerFormData, setCustomerFormData] = useState({
    username: "",
    password: "",
    email: "",
    name: "",
    phone: "",
    address: "",
  });
  const [activeTab, setActiveTab] = useState<"showcase" | "register_store" | "register_customer">("showcase");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const convertSubPrice = (usdRateValue: number) => {
    if (selectedCurrency === "USD") return "$" + usdRateValue;
    if (selectedCurrency === "SYP") return (usdRateValue * currencyRates.USD).toLocaleString() + (isAr ? " ل.س" : " SYP");
    if (selectedCurrency === "EUR") {
      const value = (usdRateValue * currencyRates.USD) / currencyRates.EUR;
      return "€" + value.toFixed(2);
    }
    if (selectedCurrency === "TRY") {
      const value = (usdRateValue * currencyRates.USD) / currencyRates.TRY;
      return value.toFixed(0) + " TL";
    }
    return "$" + usdRateValue;
  };

  const formatSYP = (val: number) => {
    if (selectedCurrency === "SYP") return val.toLocaleString() + (isAr ? " ل.س" : " SYP");
    const valUSD = val / currencyRates.USD;
    if (selectedCurrency === "USD") return "$" + valUSD.toFixed(1);
    if (selectedCurrency === "EUR") return "€" + (val / currencyRates.EUR).toFixed(1);
    if (selectedCurrency === "TRY") return (val / currencyRates.TRY).toFixed(0) + " TL";
    return val.toLocaleString() + " SYP";
  };

  const [isRegisteringStore, setIsRegisteringStore] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.email || !formData.phone || !formData.storeNameAr || !formData.storeNameEn) {
      setError(isAr ? "جميع الحقول مطلوبة" : "All fields are required");
      return;
    }
    if (formData.password.length < 3) {
      setError(isAr ? "يجب أن تكون كلمة المرور 3 أحرف أو أرقام على الأقل" : "Password must be at least 3 characters.");
      return;
    }
    if (formData.plan === "Gold" && !formData.paymentReference) {
      setError(isAr ? "الرجاء إدخال رقم المعاملة أو رمز الحوالة لتأكيد دفع الاشتراك الذهبي" : "Please input transaction / transfer reference to confirm payment");
      return;
    }
    setError("");
    setIsRegisteringStore(true);
    try {
      const res = await onRegisterStore(formData);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setFormData({ username: "", email: "", phone: "", password: "", storeNameAr: "", storeNameEn: "", plan: "Free" as "Free" | "Gold", paymentMethod: "syriatel_cash", paymentReference: "" });
          setActiveTab("showcase");
        }, 2005);
      } else {
        setError(res.error || (isAr ? "خطأ أثناء تسجيل حساب المطعم. قد يكون اسم المستخدم أو البريد مستخدماً بالفعل." : "Store registration failed. Username or email might be already taken."));
      }
    } catch (err) {
      setError(isAr ? "فشل الاتصال بالخادم. يرجى التحقق من اتصالك." : "Error communicating with server.");
    } finally {
      setIsRegisteringStore(false);
    }
  };

  const handleCustomerRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.username || !customerFormData.password || !customerFormData.email || !customerFormData.name || !customerFormData.phone || !customerFormData.address) {
      setError(isAr ? "جميع الحقول مطلوبة لتسجيل حساب زبون جديد" : "All fields are required for setup");
      return;
    }
    setError("");
    try {
      const res = await onRegisterCustomer(customerFormData);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setCustomerFormData({ username: "", password: "", email: "", name: "", phone: "", address: "" });
        }, 1500);
      } else {
        setError(res.error || (isAr ? "حدث خطأ أثناء التسجيل، اسم المستخدم قد يكون محجوزاً." : "Registration failed. Username might be taken."));
      }
    } catch (err) {
      setError(isAr ? "فشل الاتصال بالخادم" : "Server communication error");
    }
  };

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Hero Header */}
      <div className="text-center max-w-4xl mx-auto space-y-4 pt-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 leading-tight">
          {isAr ? "أطلق متجر مطعمك الذكي خلال ثوانٍ مع" : "Launch Your Smart Restaurant App in Seconds with"}{" "}
          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-1 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
            {isAr ? "لقمة SaaS" : "Logma SaaS"}
          </span>
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 font-light leading-relaxed">
          {isAr
            ? "المنصة السورية المتكاملة لإدارة مبيعات المطاعم والوجبات السريعة. موقع مخصص لكل متجر، سلة مشتريات ذكية، توصيل حقيقي، وإشعارات طابعة الفواتير مع دعم كامل للير السورية والعملات المتعددة."
            : "The premium Syrian full-stack delivery and menu system. Get a custom URL store, smart shopper carts, mapped drivers, direct bills, and multi-currency exchange rates."}
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <button
            onClick={() => setActiveTab("register_store")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle size={20} />
            {isAr ? "أنشئ مطعمك الآن مجاناً" : "Create Your Store for Free"}
          </button>
          
          <button
            onClick={() => setActiveTab("register_customer")}
            className="bg-indigo-600 hover:bg-indigo-750 text-white font-medium px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle size={20} />
            {isAr ? "سجل كزبون جديد 🛍️" : "Register as Customer 🛍️"}
          </button>

          <a
            href="#stores-anchor"
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-250 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 font-medium px-6 py-3 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
          >
            {isAr ? "تصفح المطاعم المشتركة" : "Browse Joined Kitchens"}
          </a>
        </div>
      </div>

      {/* SaaS Live Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-2 text-center md:text-right">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            {isAr ? "إجمالي المطاعم النشطة" : "Total Active Outlets"}
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.totalStores}</div>
          <div className="text-xs text-emerald-600 flex items-center gap-1 font-medium justify-center md:justify-start">
            <TrendingUp size={14} /> {isAr ? "نمو فوري مستمر" : "Instant SaaS spawn"}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-2 text-center md:text-right">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            {isAr ? "إجمالي الطلبات المستلمة" : "Total Customer Orders"}
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.totalOrders}</div>
          <div className="text-xs text-indigo-600 flex items-center gap-1 font-medium justify-center md:justify-start">
            <ShoppingBag size={14} /> {isAr ? "محدث تلقائياً" : "Live synchronization"}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-2 text-center md:text-right">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            {isAr ? "مبيعات شبكة المطاعم" : "Network Gross Sales"}
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-800 truncate">
            {formatSYP(stats.totalRevenueSYP)}
          </div>
          <div className="text-xs text-amber-600 font-medium">
            {isAr ? "مدفوعات آمنة ونقدية" : "COD & Electronic wallets"}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-2 text-center md:text-right">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            {isAr ? "أسعار الصرف المحلية" : "Exchange Rates (Basis SYP)"}
          </div>
          <div className="text-sm font-bold text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span>USD:</span>
              <span className="text-emerald-600">{currencyRates.USD.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>EUR:</span>
              <span className="text-blue-600">{currencyRates.EUR.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400">{isAr ? "تحديث وتوزيع فوري للأسعار" : "Distributed directly to menus"}
          </div>
        </div>
      </div>

      {/* Main SaaS Tabs */}
      <div className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl flex flex-wrap sm:flex-nowrap gap-1 max-w-2xl mx-auto border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            setActiveTab("showcase");
            setError("");
          }}
          className={`flex-1 py-2.5 px-3 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer text-center ${
            activeTab === "showcase" 
              ? "bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-105 shadow-xs border border-slate-200/50 dark:border-slate-750" 
              : "text-slate-500 hover:text-slate-800 dark:text-slate-405 dark:hover:text-slate-200"
          }`}
        >
          {isAr ? "🥗 صالة العرض والمطاعم" : "🥗 Features & Brands"}
        </button>
        <button
          onClick={() => {
            setActiveTab("register_store");
            setError("");
          }}
          className={`flex-1 py-2.5 px-3 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer text-center ${
            activeTab === "register_store" 
              ? "bg-emerald-600 text-white shadow-xs" 
              : "text-slate-500 hover:text-slate-800 dark:text-slate-405 dark:hover:text-slate-200"
          }`}
        >
          {isAr ? "🏪 سجل مطعمك (SaaS)" : "🏪 Register Restaurant"}
        </button>
        <button
          onClick={() => {
            setActiveTab("register_customer");
            setError("");
          }}
          className={`flex-1 py-2.5 px-3 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer text-center ${
            activeTab === "register_customer" 
              ? "bg-indigo-600 text-white shadow-xs" 
              : "text-slate-500 hover:text-slate-800 dark:text-slate-405 dark:hover:text-slate-200"
          }`}
        >
          {isAr ? "👤 سجل كزبون جديد" : "👤 Register Customer"}
        </button>
      </div>

      {activeTab === "showcase" ? (
        <div className="space-y-12">
          {/* Active Stores Showcase */}
          <div id="stores-anchor" className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800">
                {isAr ? "المطاعم والأسواق النشطة الآن" : "Restaurants Actively Trading Today"}
              </h2>
              <p className="text-slate-500 text-sm">
                {isAr ? "اضغط على أي مطعم للدخول لمتجره كعميل وتجربة الشراء والدفع" : "Click any outlet below to browse their food catalog as a customer and test shopping cards"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stores.filter(st => st.isApproved !== false).map((st) => (
                <div
                  key={st.id}
                  onClick={() => onSelectStore(st.id)}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-lg hover:shadow-xl transition-all hover-scale cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="h-40 overflow-hidden relative">
                      <img
                        referrerPolicy="no-referrer"
                        src={st.banner}
                        alt={isAr ? st.nameAr : st.nameEn}
                        className="w-full h-full object-cover"
                      />
                      <span
                        className={`absolute top-4 left-4 text-xs font-semibold px-3 py-1 rounded-full ${
                          st.plan === "Gold" ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {st.plan === "Gold" ? (isAr ? "👑 ذهبي" : "👑 Gold Status") : (isAr ? "تجريبي مجاني" : "Trial Free")}
                      </span>
                      <span
                        className={`absolute top-4 right-4 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500 text-white`}
                      >
                        {isAr ? "مفتوح للطلب" : "Open Now"}
                      </span>
                    </div>

                    <div className="p-5 space-y-2 relative">
                      <div className="absolute -top-10 right-4 w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white">
                        <img
                          referrerPolicy="no-referrer"
                          src={st.logo}
                          alt={st.nameAr}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="pt-2">
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                          <Star className="text-amber-400 fill-amber-400" size={14} />
                          <span className="font-bold text-slate-700">{st.rating}</span>
                          <span>({st.reviewsCount} {isAr ? "تقييم" : "reviews"})</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                          {isAr ? st.nameAr : st.nameEn}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {isAr ? st.descAr : st.descEn}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      <span className="font-bold text-slate-700">{st.branches.length}</span> {isAr ? "فروع" : "Branches"}
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600 font-semibold cursor-pointer">
                      {isAr ? "دخول المتجر للطلب" : "Order Here"} <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Plans Breakdown */}
          <div className="space-y-6 pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800">
                {isAr ? "خطط الاشتراك والأسعار لأصحاب المطاعم" : "Kitchen Subscription Pricing Plans"}
              </h2>
              <p className="text-slate-500 text-sm">
                {isAr ? "ابدأ بفترة تجريبية مجانية، وادفع فقط عند نجاح أعمالك. عمولة 0% على تفاصيل التوصيل!" : "Start with a risk-free trial. Zero transaction commissions on delivery fees."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Premium free plan */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-lg space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                      {isAr ? "الخيار الأساسي" : "Essential Tier"}
                    </span>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {isAr ? "باقة لقمة المجانية" : "Free Trial Plan"}
                    </h3>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800 flex items-baseline gap-1">
                    <span>{isAr ? "0 ل.س" : "0 SYP"}</span>
                    <span className="text-slate-400 text-sm font-medium">/{isAr ? "مؤقت" : "Limited trial"}</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {isAr
                      ? "جرب الميزات الأساسية لخدمة متجرك الإلكتروني واستقبل الطلبات برابط مباشر دون أي التزامات مالية."
                      : "Try essential capabilities to establish your food catalog online and take orders with standard layouts."}
                  </p>

                  <ul className="space-y-3 pt-4 border-t border-slate-100 text-xs">
                    <li className="flex items-center gap-2 text-slate-600">
                      <ShieldCheck className="text-emerald-600 shrink-0" size={16} />
                      <span>{isAr ? "حد أقصى: 10 وجبات/منتجات" : "Maximum: 10 menu meals"}</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-600">
                      <ShieldCheck className="text-emerald-600 shrink-0" size={16} />
                      <span>{isAr ? "تصنيف طعام واحد فقط" : "Single food category block"}</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-600">
                      <ShieldCheck className="text-emerald-600 shrink-0" size={16} />
                      <span>{isAr ? "استلام الطلبات عبر الويب (دون إشعارات ذكية)" : "Basic cart checkout"}</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-400 line-through">
                      <ShieldCheck className="shrink-0" size={16} />
                      <span>{isAr ? "تقارير مالية وتنبؤات ذكية" : "Financial reporting"}</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-400 line-through">
                      <ShieldCheck className="shrink-0" size={16} />
                      <span>{isAr ? "مساعد الذكاء الاصطناعي Gemini للوصف والترجمة" : "Gemini AI menu translation & copywriter"}</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, plan: "Free" }));
                    setActiveTab("register_store");
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-medium transition-all text-xs cursor-pointer"
                >
                  {isAr ? "تفعيل الباقة المجانية" : "Activate Trial"}
                </button>
              </div>

              {/* Gold elite plan */}
              <div className="bg-white rounded-3xl p-6 border-2 border-amber-500 shadow-xl space-y-6 flex flex-col justify-between relative overflow-hidden">
                <span className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  {isAr ? "👑 الأكثر طلباً" : "👑 Best Seller"}
                </span>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs uppercase font-bold text-amber-600 tracking-wider">
                      {isAr ? "الباقة الاحترافية المتكاملة" : "Premium Tier"}
                    </span>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {isAr ? "باقة لقمة الذهبية (Gold)" : "Logma Gold SaaS"}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-extrabold text-amber-600 flex items-baseline gap-1 animate-pulse">
                      <span>{convertSubPrice(5)}</span>
                      <span className="text-slate-400 text-sm font-medium">/{isAr ? "شهرياً" : "monthly"}</span>
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      {isAr ? `أو ${convertSubPrice(50)} سنوياً (شامل الضريبة)` : `or ${convertSubPrice(50)} yearly (all charges included)`}
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {isAr
                      ? "افتح القوة المطلقة لعلامتك التجارية. منتجات لا نهائية، مساعدة Gemini AI، طابعة فواتير ذكية، نقاط ولاء للعملاء وتتبع تبرع السائقين."
                      : "The ultimate solution for scaling your business. Unlimited menu products, AI-powered systems, multi-branch control and GPS driver simulation."}
                  </p>

                  <ul className="space-y-3 pt-4 border-t border-slate-100 text-xs">
                    <li className="flex items-center gap-2 text-slate-600">
                      <Zap className="text-amber-500 shrink-0" size={16} />
                      <span className="font-semibold text-slate-800">{isAr ? "منتجات ووجبات وأقسام غير محدودة" : "Unlimited products, meals & divisions"}</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-600">
                      <Zap className="text-amber-500 shrink-0" size={16} />
                      <span>{isAr ? "مساعد الذكاء الاصطناعي لتأليف وجبات ممتعة" : "Gemini AI dynamic meal composition & translation"}</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-600">
                      <Zap className="text-amber-500 shrink-0" size={16} />
                      <span>{isAr ? "تتبع GPS للسائق على خريطة تفاعلية للعميل" : "Live GPS driver simulation tracking map"}</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-600">
                      <Zap className="text-amber-500 shrink-0" size={16} />
                      <span>{isAr ? "نظام ولاء ونقاط مكافآت لتشجيع إعادة الشراء" : "Loyalty rewards points engine to boost re-orders"}</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-600">
                      <Zap className="text-amber-500 shrink-0" size={16} />
                      <span>{isAr ? "توصيل بفروع متعددة وفواتير باركود QR" : "Multi-branches, QR tables, and custom printer setups"}</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, plan: "Gold" }));
                    setActiveTab("register_store");
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-amber-500/20 transition-all text-xs cursor-pointer"
                >
                  {isAr ? "ترقية واشتراك ذهبي الآن" : "Upgrade to Gold Sub"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "register_store" ? (
        /* Register form for restaurant owners (SaaS Registration) */
        <div className="bg-white dark:bg-slate-900 max-w-lg mx-auto rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl p-6 space-y-6">
          <div className="space-y-1 text-center font-bold">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {isAr ? "أهلاً بك في شراكة لقمة ذكية" : "Spawn Your Multi-Tenant Store"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              {isAr
                ? "املأ هذه الحقول وسيقوم الخادم السحابي للمنصة بإعداد عنوان ويب ونموذج كامل لمنتجاتك ومطبخك."
                : "Enter credentials to construct your local restaurant URL subdomain and start cooking."}
            </p>
          </div>

          {success ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 text-center text-xs space-y-3 font-sans">
              <div className="font-bold text-sm">🎉 {isAr ? "تم تسجيل حساب المطعم بنجاح!" : "Store Proposal Submitted Successfully!"}</div>
              <div className="text-slate-650 dark:text-slate-350 leading-relaxed">
                {isAr 
                  ? "طلبك الآن بانتظار مراجعة وتفعيل من قبل إدارة المنصة والتحقق من دفع حوّالة الاشتراك الفورية وتأكيد الشروط. يمكنك محاولة تسجيل الدخول فور تفعيل حسابك."
                  : "Thank you! Your submission is now awaiting administration approval after validating payments and matching core policies. You will be able to log back in as soon as it is approved."}
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 text-right">
              {error && (
                <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-450 p-3 rounded-lg text-xs border border-rose-150 dark:border-rose-900 font-bold text-center">
                  ⚠️ {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {isAr ? "اسم المستخدم للوحة التحكم" : "Owner Username"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g., mustapha"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {isAr ? "كلمة المرور للوحة التحكم" : "Dashboard Password"}
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {isAr ? "البريد الإلكتروني للتواصل" : "Contact Email"}
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="mustapha@kitchen.sy"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {isAr ? "رقم جوال صاحب المطعم" : "Owner Phone Number"}
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., 0933111222"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {isAr ? "اسم المطعم (بالعربية)" : "Restaurant Name (Arabic)"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.storeNameAr}
                    onChange={(e) => setFormData({ ...formData, storeNameAr: e.target.value })}
                    placeholder="مطعم بروستد الزعيم"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-right"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {isAr ? "اسم المطعم (بالإنكليزية)" : "Restaurant Name (English)"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.storeNameEn}
                    onChange={(e) => setFormData({ ...formData, storeNameEn: e.target.value })}
                    placeholder="Al-Zaeem Broasted"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-right"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {isAr ? "اختر باقة التسجيل الأولي" : "Select Subscription Plan"}
                </label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div
                    onClick={() => setFormData({ ...formData, plan: "Free" })}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      formData.plan === "Free"
                        ? "border-slate-850 bg-slate-50 dark:bg-slate-950 font-bold"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950"
                    }`}
                  >
                    <div className="text-xs text-slate-700 dark:text-slate-300">{isAr ? "باقة مجانية محدودة" : "Trial Free Play"}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{isAr ? "0 ل.س / 14 يوم" : "0 SYP"}</div>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, plan: "Gold" })}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      formData.plan === "Gold"
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 font-bold"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950"
                    }`}
                  >
                    <div className="text-xs text-amber-700 dark:text-amber-400 font-bold">💎 {isAr ? "الذهبية الشاملة" : "Gold Pro Plan"}</div>
                    <div className="text-[10px] text-amber-600">{isAr ? "5$ شهرياً فقط" : "$5/month"}</div>
                  </div>
                </div>
              </div>

              {/* Dynamic Payment & Approval Instructions */}
              {formData.plan === "Gold" ? (
                <div className="bg-amber-50/40 dark:bg-amber-950/5 border border-amber-250/40 dark:border-amber-900/40 rounded-2xl p-4 space-y-3 text-xs text-right">
                  <div className="font-bold text-amber-805 dark:text-amber-400 flex items-center justify-end gap-1">
                    <span>{isAr ? "تعليمات دفع اشتراك الباقة الذهبية لقمة" : "Gold subscription payment instructions"}</span>
                    <span>💳</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                    {isAr ? (
                      <>
                        قيمة الاشتراك الشهري هي <strong className="text-slate-900 dark:text-slate-100">5 USD</strong> أي ما يعادل حالياً{" "}
                        <strong className="text-emerald-700 dark:text-emerald-400">{(5 * currencyRates.USD).toLocaleString()} ل.س</strong>.
                        الرجاء إتمام الدفع بإحدى الوسائل التالية، ثم إدخال رقم العملية للتأكيد:
                      </>
                    ) : (
                      <>
                        Monthly fee is <strong className="text-slate-900 dark:text-slate-100">5 USD</strong> (~
                        <strong className="text-emerald-700 dark:text-emerald-400">{(5 * currencyRates.USD).toLocaleString()} SYP</strong>).
                        Please complete payment using one of the local channels:
                      </>
                    )}
                  </p>

                  <div className="p-2.5 bg-white/80 dark:bg-slate-950/80 rounded-xl space-y-1.5 font-mono text-[10px] text-slate-755 dark:text-slate-300 border border-amber-100 dark:border-amber-900/45">
                    <div>• 📱 <span className="font-bold">سيريتل كاش (Syriatel Cash):</span> 0933111222</div>
                    <div>• 📱 <span className="font-bold">إم تي إن كاش (MTN Cash):</span> 0944999888</div>
                    <div>• 🏛️ <span className="font-bold">حوالة هرم / فؤاد:</span> المستفيد "عماد الدين أحمد - دمشق"</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 text-right">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{isAr ? "قناة الدفع المستخدمة" : "Payment Channel"}</label>
                      <select
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                      >
                        <option value="syriatel_cash">{isAr ? "سيريتل كاش" : "Syriatel Cash"}</option>
                        <option value="mtn_cash">{isAr ? "إم تي إن كاش" : "MTN Cash"}</option>
                        <option value="alharam_transfer">{isAr ? "حوالة هرم / فؤاد" : "Al-Haram Transfer"}</option>
                        <option value="bank_transfer">{isAr ? "حساب بنكي (سوري)" : "Bank Transfer"}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{isAr ? "رمز الإرسال / رقم العملية" : "Transaction Ref ID"}</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., 2841974"
                        value={formData.paymentReference}
                        onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/55 dark:border-slate-800/80 rounded-2xl p-4 text-xs text-slate-550 dark:text-slate-400 leading-relaxed space-y-1 text-right">
                  <div className="font-semibold text-slate-705 dark:text-slate-200">📌 {isAr ? "ملاحظة التسجيل المجاني:" : "Trial Registration Notice:"}</div>
                  <p className="text-[11px]">
                    {isAr
                      ? "التسجيل للباقة المجانية يمنحك فترة تجربة 14 يوماً. سيتم تقديم طلب المتجر والاشتراك لإدارة المنصة للموافقة الفورية وتفعيله ليكون متاحاً للعملاء."
                      : "Registering for the free trial delivers your store catalog system to our administration for swift approval review."}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isRegisteringStore}
                className={`w-full font-bold py-3 rounded-xl shadow-lg transition-all text-xs cursor-pointer ${
                  isRegisteringStore
                    ? "bg-emerald-400 text-white cursor-not-allowed opacity-75"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/15"
                }`}
              >
                {isRegisteringStore
                  ? (isAr ? "جاري التجهيز وتسجيل المطعم..." : "Spinning up platform...")
                  : (isAr ? "تأكيد وإنشاء المتجر" : "Spin Up Kitchen")}
              </button>
            </form>
          )}
        </div>
      ) : (
        /* Customer Registration Form */
        <div className="bg-white dark:bg-slate-900 max-w-lg mx-auto rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl p-6 space-y-6 text-right">
          <div className="space-y-1 text-center font-bold">
            <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-400">
              {isAr ? "إنشاء حساب زبون جديد" : "Create Customer Account"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              {isAr
                ? "سجل حسابك كزبون لمتابعة طلباتك وحفظ فواتيرك وحصد نقاط المكافآت لجميع المطاعم السورية."
                : "Register to track your burger and broasted orders, and claim Syrian loyalty points."}
            </p>
          </div>

          {success ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-850 dark:text-emerald-400 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 text-center text-xs space-y-2 font-bold animate-bounce">
              <div>🎉 {isAr ? "تم إنشاء حسابك وتسجيل دخولك بنجاح!" : "Customer Account Spawned!"}</div>
              <div>{isAr ? "جاري تحويلك تلقائياً بقائمة طلباتك..." : "Redirecting to your active order tracking..."}</div>
            </div>
          ) : (
            <form onSubmit={handleCustomerRegisterSubmit} className="space-y-4">
              {error && (
                <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 p-3 rounded-xl text-xs border border-rose-100 dark:border-rose-900 text-center font-bold">
                  ⚠️ {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  {isAr ? "الاسم الكامل للتوصيل" : "Full Name for Delivery"}
                </label>
                <input
                  type="text"
                  required
                  value={customerFormData.name}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                  placeholder={isAr ? "مثال: معتز الخالدي" : "Moataz Al-Khaled"}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    {isAr ? "اسم مستخدم فريد للدخول" : "Unique Username"}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerFormData.username}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="moataz_sy"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    {isAr ? "كلمة المرور" : "Secure Password"}
                  </label>
                  <input
                    type="password"
                    required
                    value={customerFormData.password}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    {isAr ? "البريد الإلكتروني" : "Email Address"}
                  </label>
                  <input
                    type="email"
                    required
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                    placeholder="example@domain.sy"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    {isAr ? "رقم الجوال للتأكيد والتوصيل" : "Syrian Phone Number"}
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerFormData.phone}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                    placeholder="0934567891"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  {isAr ? "العنوان السكني المفصل بدقة للتسليم" : "Detailed Syrian Delivery Address"}
                </label>
                <textarea
                  required
                  rows={2}
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                  placeholder={isAr ? "مثال: دمشق - المزة أوتوستراد - خلف مشفى المواساة بـ 200 متر" : "Damascus - Mezzeh Autostrad"}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/15 transition-all text-xs cursor-pointer"
              >
                ✨ {isAr ? "تأكيد وتسجيل حساب الزبون" : "Confirm & Setup Account"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
