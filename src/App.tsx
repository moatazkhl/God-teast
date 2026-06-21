import React, { useState, useEffect } from "react";
import { Store, Product, Order, User, CurrencyRates } from "./types";
import SaaSOverview from "./components/SaaSOverview";
import CustomerStorefront from "./components/CustomerStorefront";
import OwnerDashboard from "./components/OwnerDashboard";
import CustomerOrdersTracker from "./components/CustomerOrdersTracker";
import { ListCollapse, LogIn, LogOut, Award, RefreshCw, Star, ArrowRight, Settings, LayoutDashboard, Globe, ChevronDown, Check, Info, ShieldCheck, Sun, Moon, TrendingUp, DollarSign, Smartphone } from "lucide-react";

export default function App() {
  // Global App States
  const [isAr, setIsAr] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<"SYP" | "USD" | "EUR" | "TRY">("SYP");
  const [darkTheme, setDarkTheme] = useState(true);
  const [activeSpace, setActiveSpace] = useState<"saas" | "customer_store" | "owner_dashboard" | "super_admin" | "customer_orders">("saas");
  
  // Data States
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [activeStoreProducts, setActiveStoreProducts] = useState<Product[]>([]);
  const [activeStoreOrders, setActiveStoreOrders] = useState<Order[]>([]);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

  // SaaS General Stats
  const [saasStats, setSaasStats] = useState({
    totalStores: 3,
    totalOrders: 2,
    totalRevenueSYP: 111550,
    planFreeCount: 1,
    planGoldCount: 2,
  });

  const [currencyRates, setCurrencyRates] = useState<CurrencyRates>({
    USD: 14500,
    EUR: 15700,
    TRY: 450,
  });

  // Helper to calculate days remaining until subscription expires
  const getDaysRemaining = (expireStr: string) => {
    if (!expireStr) return 0;
    const parts = expireStr.split("-");
    if (parts.length < 3) return 0;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    // Construct in local timezone to avoid UTC mismatch off-by-one errors
    const expireDate = new Date(year, month, day, 0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = expireDate.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // User Authentication
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    email: "",
    name: "",
    phone: "",
    address: ""
  });
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // Android Settings States
  const [showAndroidServerModal, setShowAndroidServerModal] = useState(false);
  const [androidServerUrl, setAndroidServerUrl] = useState(localStorage.getItem('backend_url') || "https://ais-pre-4cqcy7ci4xtp542lrh3kfz-807175329121.europe-west2.run.app");

  // Admin Dashboard States
  const [rateUSD, setRateUSD] = useState(14500);
  const [rateEUR, setRateEUR] = useState(15700);
  const [rateTRY, setRateTRY] = useState(450);
  const [saasStoresFilter, setSaasStoresFilter] = useState<Store[]>([]);

  // Admin password change states
  const [adminCurrentPassword, setAdminCurrentPassword] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // CSS Document directional tag & class on toggle lang
  useEffect(() => {
    document.documentElement.dir = isAr ? "rtl" : "ltr";
    document.documentElement.lang = isAr ? "ar" : "en";
  }, [isAr]);

  // Dark theme body injector
  useEffect(() => {
    if (darkTheme) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }, [darkTheme]);

  // Fetch initial SaaS data
  const loadSaaSData = async () => {
    setLoading(true);
    try {
      // Fetch Stores
      const storesRes = await fetch("/api/stores");
      const storesData = await storesRes.json();
      setStores(storesData);
      setSaasStoresFilter(storesData);

      // Fetch currencies
      const currRes = await fetch("/api/currencies");
      const currData = await currRes.json();
      setCurrencyRates(currData);
      setRateUSD(currData.USD);
      setRateEUR(currData.EUR);
      setRateTRY(currData.TRY);

      // Fetch overview summary stats
      const statsRes = await fetch("/api/admin/overview");
      const statsData = await statsRes.json();
      setSaasStats(statsData);
    } catch (err) {
      console.error("Failed to fetch server SaaS statistics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaaSData();
  }, []);

  // Fetch single active store catalog (For customer storefront)
  const loadCustomerStore = async (storeId: string) => {
    setActiveStoreId(storeId);
    try {
      const res = await fetch(`/api/stores/${storeId}`);
      const data = await res.json();
      setActiveStoreProducts(data.products || []);
      setActiveSpace("customer_store");
    } catch (err) {
      console.error("Could not load storefront menu", err);
    }
  };

  // Fetch active store orders (For logged in merchant controller or active client tracking)
  const loadStoreOrdersAndProducts = async (storeId: string) => {
    try {
      const pRes = await fetch(`/api/stores/${storeId}/all-products`);
      const pData = await pRes.json();
      setActiveStoreProducts(pData);

      const oRes = await fetch(`/api/stores/${storeId}/orders`);
      const oData = await oRes.json();
      setActiveStoreOrders(oData);
    } catch (err) {
      console.error("Could not fetch active dashboard dataset", err);
    }
  };

  const loadCustomerOrders = async (username: string) => {
    try {
      const res = await fetch(`/api/customer/${username}/orders`);
      const data = await res.json();
      setCustomerOrders(data || []);
    } catch (err) {
      console.error("Could not fetch customer orders list", err);
    }
  };

  // Polling incoming orders periodically when Owner Dashboard is open
  useEffect(() => {
    if (currentUser?.role === "restaurant_owner" && currentUser.storeId) {
      const interval = setInterval(() => {
        loadStoreOrdersAndProducts(currentUser.storeId!);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Polling customer orders periodically when logged in as customer
  useEffect(() => {
    if (currentUser?.role === "customer") {
      loadCustomerOrders(currentUser.username);
      const interval = setInterval(() => {
        loadCustomerOrders(currentUser.username);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Handle store SaaS registering
  const handleRegisterStore = async (regData: {
    username: string;
    email: string;
    phone: string;
    password?: string;
    storeNameAr: string;
    storeNameEn: string;
    plan: "Free" | "Gold";
    paymentMethod?: string;
    paymentReference?: string;
  }) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...regData, register: true, role: "restaurant_owner", password: regData.password || "123" }),
      });
      const data = await res.json();
      if (data.success) {
        await loadSaaSData();
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err: any) {
      console.error("Could not register store", err);
      return { success: false, error: err.message || (isAr ? "فشل الاتصال بالخادم." : "Could not connect to SaaS server.") };
    }
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginForm.username, password: loginForm.password }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setShowLoginModal(false);
        setLoginForm({ username: "", password: "" });
        
        if (data.user.role === "super_admin") {
          setActiveSpace("super_admin");
        } else if (data.user.role === "restaurant_owner" && data.user.storeId) {
          await loadStoreOrdersAndProducts(data.user.storeId);
          setActiveSpace("owner_dashboard");
        } else if (data.user.role === "customer") {
          await loadCustomerOrders(data.user.username);
          setActiveSpace("customer_orders");
        }
      } else {
        setLoginError(data.error || (isAr ? "بيانات الدخول المدخلة غير صحيحة." : "Invalid login credentials."));
      }
    } catch (err) {
      setLoginError(isAr ? "فشل الاتصال بالخادم السحابي" : "Communication failure to backend SaaS server.");
    }
  };

  // Customer Register Handler
  const handleCustomerRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          register: true,
          role: "customer",
          username: registerForm.username,
          password: registerForm.password,
          email: registerForm.email,
          phone: registerForm.phone,
          name: registerForm.name,
          address: registerForm.address
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setShowLoginModal(false);
        setIsRegisterMode(false);
        setRegisterForm({
          username: "",
          password: "",
          email: "",
          name: "",
          phone: "",
          address: ""
        });
        await loadCustomerOrders(data.user.username);
        setActiveSpace("customer_orders");
      } else {
        setLoginError(data.error || (isAr ? "فشل إنشاء الحساب، يرجى المحاولة مرة أخرى." : "Signup failed, please retry."));
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      setLoginError(isAr ? "عذراً، حدث خطأ أثناء الاتصال بالخادم." : "Connection error with server.");
    }
  };

  // SaaS Customer Register Wrapper Hook call
  const handleSaaSCustomerRegister = async (data: any) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          register: true,
          role: "customer",
          username: data.username,
          password: data.password,
          email: data.email,
          phone: data.phone,
          name: data.name,
          address: data.address
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setCurrentUser(resJson.user);
        await loadCustomerOrders(resJson.user.username);
        setActiveSpace("customer_orders");
        return { success: true };
      } else {
        return { success: false, error: resJson.error };
      }
    } catch (err) {
      console.error("SaaS signup error:", err);
      return { success: false, error: isAr ? "عذراً، حدث خطأ أثناء الاتصال بالخادم." : "Connection error with server." };
    }
  };

  // Admin password change handler
  const handleAdminChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (!currentUser) return;

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser.username,
          currentPassword: adminCurrentPassword,
          newPassword: adminNewPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordSuccess(isAr ? "🎉 تم تحديث كلمة المرور الخاصة بك بنجاح الحساب محمي!" : "🎉 Password updated successfully! Admin domain secured.");
        setAdminCurrentPassword("");
        setAdminNewPassword("");
      } else {
        setPasswordError(data.error || (isAr ? "فشل التحديث. يرجى التحقق من كلمة المرور الحالية." : "Failed to update password. Check current value."));
      }
    } catch (err) {
      console.error("Change password error:", err);
      setPasswordError(isAr ? "خطأ في الاتصال بالخادم السحابي." : "Server cloud communication error.");
    }
  };

  // Customer places checkout order
  const handlePlaceCustomerOrder = async (orderData: Partial<Order>) => {
    if (!activeStoreId) throw new Error("A store must be targeted first");
    
    // Inject customerUsername if logged in as customer
    const payload = {
      ...orderData,
      customerUsername: currentUser?.role === "customer" ? currentUser.username : undefined
    };

    const res = await fetch(`/api/stores/${activeStoreId}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (result.success) {
      loadSaaSData(); // reload total SaaS metrics
      if (currentUser?.role === "customer") {
        loadCustomerOrders(currentUser.username); // instantly poll for tracker
      }
      return result.order;
    } else {
      throw new Error(result.error || "Order failed");
    }
  };

  // Owner changes order status
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success && currentUser?.storeId) {
        loadStoreOrdersAndProducts(currentUser.storeId);
      }
    } catch (err) {
      console.error("Order update state transition failed", err);
    }
  };

  // Owner saves / creates products
  const handleAddOrEditProduct = async (productData: Partial<Product>) => {
    if (!currentUser?.storeId) return;
    const res = await fetch(`/api/stores/${currentUser.storeId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    const result = await res.json();
    if (result.success) {
      loadStoreOrdersAndProducts(currentUser.storeId);
      return result.product;
    } else {
      throw new Error(result.error || "Failed product persistence");
    }
  };

  // Owner deletes product
  const handleDeleteProduct = async (productId: string) => {
    if (!currentUser?.storeId) return;
    const res = await fetch(`/api/stores/${currentUser.storeId}/products/${productId}`, {
      method: "DELETE",
    });
    const result = await res.json();
    if (result.success) {
      loadStoreOrdersAndProducts(currentUser.storeId);
    }
  };

  // Owner updates store settings
  const handleUpdateStore = async (updatedFields: Partial<Store>) => {
    const targetId = currentUser?.storeId || activeStoreId;
    if (!targetId) return;
    try {
      const res = await fetch(`/api/stores/${targetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
      const data = await res.json();
      if (data.success) {
        loadSaaSData();
        if (currentUser?.storeId) {
          loadStoreOrdersAndProducts(currentUser.storeId);
        }
      }
    } catch (err) {
      console.error("Failed to update merchant config", err);
    }
  };

  // Upgrade subscription plan
  const handleUpgradeSubscription = async (plan: "Gold", months: number) => {
    if (!currentUser?.storeId) return;
    try {
      const res = await fetch(`/api/stores/${currentUser.storeId}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, durationMonths: months }),
      });
      const data = await res.json();
      if (data.success) {
        loadSaaSData();
        loadStoreOrdersAndProducts(currentUser.storeId);
      }
    } catch (err) {
      console.error("Failed subscription pricing upgrade", err);
    }
  };

  // Super Admin approves restaurant store
  const handleApproveStore = async (storeId: string) => {
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await loadSaaSData();
      }
    } catch (err) {
      console.error("Failed to approve register request", err);
    }
  };

  // Super Admin rejects restaurant store request
  const handleRejectStore = async (storeId: string) => {
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/reject`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await loadSaaSData();
      }
    } catch (err) {
      console.error("Failed to reject register request", err);
    }
  };

  // Super Admin toggles restaurant suspension (freeze / unfreeze)
  const handleToggleSuspendStore = async (storeId: string) => {
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/toggle-suspend`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await loadSaaSData();
      }
    } catch (err) {
      console.error("Failed to toggle suspension", err);
    }
  };

  // Super Admin completely deletes a store subscription/restaurant due to violations
  const handleDeleteStoreSubscription = async (storeId: string) => {
    const confirmMsg = isAr
      ? `🚨 تحذير نهائي وصارم!\nهل أنت متأكد من رغبتك في حذف هذا الاشتراك وإزالة المطعم نهائياً؟\nسيؤدي هذا إلى مسح حساب المالك، وكافة الوجبات والمنتجات، وسجل المبيعات بالكامل، ولا يمكن التراجع عن هذه الخطوة أبداً!`
      : `🚨 CRITICAL WARNING!\nAre you absolutely sure you want to completely erase this restaurant subscription?\nThis deletes the store, the owner credentials, full menu products list, and order histories permanently!`;

    if (window.confirm && !window.confirm(confirmMsg)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/stores/${storeId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await loadSaaSData();
      }
    } catch (err) {
      console.error("Failed to delete store subscription", err);
    }
  };

  // Super Admin approves Gold plan upgrade
  const handleApproveUpgrade = async (storeId: string) => {
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/approve-upgrade`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await loadSaaSData();
      }
    } catch (err) {
      console.error("Failed to approve Gold plan upgrade", err);
    }
  };

  // Super Admin rejects Gold plan upgrade
  const handleRejectUpgrade = async (storeId: string) => {
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/reject-upgrade`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await loadSaaSData();
      }
    } catch (err) {
      console.error("Failed to reject Gold plan upgrade", err);
    }
  };

  // Admin updates global Syrian exchange rates
  const handleUpdateCurrencies = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/currencies/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ USD: rateUSD, EUR: rateEUR, TRY: rateTRY }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrencyRates(data.rates);
        alert(isAr ? "✓ تم تحديث أسعار الصرف لجميع قوائم المأكولات بنجاح." : "✓ Currencies updated successfully.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors ${darkTheme ? "dark-theme" : ""}`}>
      {/* Dynamic Top Announcement Banner */}
      <div className="bg-emerald-600 text-white text-xs py-2 px-4 text-center font-bold relative flex items-center justify-center gap-1">
        <span>🎉 {isAr ? "منصة لقمة SaaS توفر دعماً كاملاً لربط طابعات تحضير الطلبات والمدفوعات المشفرة لجميع المطاعم!" : "Logma SaaS Platform now supports direct thermal kitchen print and encrypted mobile wallets!"}</span>
      </div>

      {/* Main SaaS Header */}
      <header className="bg-white/95 dark:bg-slate-900/90 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              onClick={() => {
                setActiveSpace("saas");
                setActiveStoreId(null);
              }}
              className="font-extrabold text-xl md:text-2xl text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1.5"
            >
              <span className="text-2xl">🍔</span>
              <span>{isAr ? "لقمة SaaS" : "Logma SaaS"}</span>
            </div>
            
            <div className="hidden lg:flex items-center gap-2 text-slate-400 dark:text-slate-500 font-mono text-[9px] uppercase tracking-wider bg-slate-50 dark:bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <span>ONLINE PORT: 3000 (Secured Proxy)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4 font-sans text-xs">
            {/* Lang switcher toggler */}
            <button
              onClick={() => setIsAr(!isAr)}
              className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold transition-all border border-slate-200/50 dark:border-slate-700 cursor-pointer"
            >
              <Globe size={14} />
              <span>{isAr ? "English" : "العربية"}</span>
            </button>

            {/* Currency Selector */}
            <div className="relative group">
              <button className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl flex items-center gap-1 transition-all border border-slate-200/50 cursor-pointer font-bold font-mono">
                {selectedCurrency}
                <ChevronDown size={12} />
              </button>
              <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-xl py-1 hidden group-hover:block w-24">
                {(["SYP", "USD", "EUR", "TRY"] as const).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setSelectedCurrency(curr)}
                    className="w-full text-right px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer font-mono"
                  >
                    {curr} {selectedCurrency === curr && "✓"}
                  </button>
                ))}
              </div>
            </div>

            {/* Android Connection Setting */}
            <button
              onClick={() => {
                setAndroidServerUrl(localStorage.getItem('backend_url') || "https://ais-pre-4cqcy7ci4xtp542lrh3kfz-807175329121.europe-west2.run.app");
                setShowAndroidServerModal(true);
              }}
              className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 p-2 rounded-xl border border-slate-200/50 cursor-pointer flex items-center gap-1.5"
              title={isAr ? "إعدادات اتصال الأندرويد" : "Android Server Connection"}
            >
              <Smartphone size={14} />
              <span className="hidden md:inline text-[10px] font-bold">{isAr ? "اتصال أندرويد" : "Android API"}</span>
            </button>

            {/* Theme selector */}
            <button
              onClick={() => setDarkTheme(!darkTheme)}
              className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 p-2 rounded-xl border border-slate-200/50 cursor-pointer"
            >
              {darkTheme ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* User Login/Logout status actions */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (currentUser.role === "super_admin") {
                      setActiveSpace("super_admin");
                    } else if (currentUser.role === "restaurant_owner") {
                      setActiveSpace("owner_dashboard");
                    } else if (currentUser.role === "customer") {
                      setActiveSpace("customer_orders");
                    }
                  }}
                  className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold cursor-pointer transition-all animate-bounce"
                >
                  <LayoutDashboard size={14} />
                  <span>
                    {currentUser.role === "super_admin"
                      ? (isAr ? "لوحة الإدارة" : "SaaS Admin")
                      : currentUser.role === "restaurant_owner"
                      ? (isAr ? "تحكم الشريك" : "Owner Dashboard")
                      : (isAr ? "تتبع طلباتي 🛵" : "Track My Orders 🛵")}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setCurrentUser(null);
                    setActiveSpace("saas");
                    setActiveStoreId(null);
                  }}
                  className="bg-rose-50 border border-rose-200 text-rose-600 p-2 rounded-xl cursor-pointer"
                  title="Logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setLoginError("");
                  setShowLoginModal(true);
                }}
                className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md shadow-slate-800/10 cursor-pointer"
              >
                <LogIn size={14} />
                <span>{isAr ? "بوابة الدخول والصلاحيات" : "Access & Logins"}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 text-xs">
            <RefreshCw className="animate-spin text-emerald-600" size={32} />
            <span>{isAr ? "جاري تحميل خادم المنصة..." : "Synchronizing smart SaaS outlet structures..."}</span>
          </div>
        ) : (
          <div className="space-y-12">
            {activeSpace === "saas" && (
              <SaaSOverview
                stores={stores}
                currencyRates={currencyRates}
                selectedCurrency={selectedCurrency}
                isAr={isAr}
                onRegisterStore={handleRegisterStore}
                onRegisterCustomer={handleSaaSCustomerRegister}
                onSelectStore={loadCustomerStore}
                stats={saasStats}
              />
            )}

            {activeSpace === "customer_store" && activeStoreId && (
              <div className="space-y-6">
                {/* Active Store banner alert */}
                <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-2xl text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏪</span>
                    <div>
                      {isAr ? "أنت تتصفح الآن المتجر المستقل لـ" : "You are currently visiting the self-contained store of"}{" "}
                      <strong className="text-slate-800 dark:text-white">
                        {isAr
                          ? stores.find((s) => s.id === activeStoreId)?.nameAr
                          : stores.find((s) => s.id === activeStoreId)?.nameEn}
                      </strong>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveSpace("saas");
                      setActiveStoreId(null);
                    }}
                    className="bg-white dark:bg-slate-800 hover:shadow border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                  >
                    {isAr ? "العودة للرئيسية" : "Home Platform"}
                  </button>
                </div>

                <CustomerStorefront
                  store={stores.find((s) => s.id === activeStoreId)!}
                  products={activeStoreProducts}
                  currencyRates={currencyRates}
                  selectedCurrency={selectedCurrency}
                  isAr={isAr}
                  onPlaceOrder={handlePlaceCustomerOrder}
                  onCloseStore={() => {
                    setActiveSpace("saas");
                    setActiveStoreId(null);
                  }}
                  currentUser={currentUser}
                />
              </div>
            )}

            {activeSpace === "customer_orders" && (
              <CustomerOrdersTracker
                orders={customerOrders}
                isAr={isAr}
                currentUser={currentUser}
                currencyRates={currencyRates}
                selectedCurrency={selectedCurrency}
                onBackToShopping={() => setActiveSpace("saas")}
                onRefresh={() => currentUser && loadCustomerOrders(currentUser.username)}
                storesList={stores}
                darkTheme={darkTheme}
              />
            )}

            {activeSpace === "owner_dashboard" && currentUser?.storeId && (
              <div className="space-y-4">
                <div className="bg-slate-100 dark:bg-slate-950/40 p-4 rounded-2xl flex items-center justify-between text-xs border border-slate-200">
                  <span>{isAr ? "مرحبا بك شريكنا" : "Welcome Partner"}: <strong>{currentUser.username}</strong></span>
                  <button
                    onClick={() => {
                      setActiveSpace("saas");
                      setActiveStoreId(null);
                    }}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    {isAr ? "المرور لمتصفح الزبائن الرئيسي" : "View Customer Showcase"}
                  </button>
                </div>

                <OwnerDashboard
                  store={stores.find((s) => s.id === currentUser.storeId)!}
                  products={activeStoreProducts}
                  orders={activeStoreOrders}
                  isAr={isAr}
                  onUpdateStore={handleUpdateStore}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onAddOrEditProduct={handleAddOrEditProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onUpgradeSubscription={handleUpgradeSubscription}
                />
              </div>
            )}

            {activeSpace === "super_admin" && currentUser?.role === "super_admin" && (
              <div className="space-y-8">
                <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 space-y-4">
                  <h2 className="text-2xl font-black">👑 {isAr ? "لوحة التحكم العامة للمنصة (Super Admin Workspace)" : "Logma SaaS Platform Control Arena"}</h2>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">
                    {isAr
                      ? "بصفتك المدير العام للمنصة، تتيح لك هذه اللوحة إدارة اشتراكات المطاعم، تفقد المبيعات العامة، وتحديث أسعار صرف العملات للير السورية لتعديل الأسعار لقوائم الطعام آلياً."
                      : "SaaS Platform Management Workspace. Update exchange rates, coordinate active restaurant plans and manage server payloads."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Column 1: Config & Safety settings */}
                  <div className="space-y-6">
                    {/* Exchange rates block */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 text-right">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{isAr ? "أسعار الصرف لليرة السورية" : "Configure SYP Exchange rates"}</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500">تحديث هذه القيم يؤثر فوراً في تحويل قوائم الطعام لجميع المطاعم.</p>

                      <form onSubmit={handleUpdateCurrencies} className="space-y-3.5 text-xs text-right">
                        <div className="space-y-1">
                          <label className="text-slate-500 font-bold font-mono block">1 USD (Basis SYP):</label>
                          <input
                            type="number"
                            value={rateUSD}
                            onChange={(e) => setRateUSD(Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-2.5 font-mono text-slate-800 dark:text-slate-200 text-right"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-500 font-bold font-mono block">1 EUR (Basis SYP):</label>
                          <input
                            type="number"
                            value={rateEUR}
                            onChange={(e) => setRateEUR(Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-2.5 font-mono text-slate-800 dark:text-slate-200 text-right"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-500 font-bold font-mono block">1 TRY (Basis SYP):</label>
                          <input
                            type="number"
                            value={rateTRY}
                            onChange={(e) => setRateTRY(Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-2.5 font-mono text-slate-800 dark:text-slate-200 text-right"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                          {isAr ? "تحديث أسعار صرف العملات" : "Broadcast rates"}
                        </button>
                      </form>
                    </div>

                    {/* Super Admin Change Password Block */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 text-right">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5 justify-end">
                        <span>🔒</span>
                        <span>{isAr ? "أمان السوبر أدمن وتغيير كلمة المرور" : "Admin Security Password"}</span>
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                        {isAr ? "قم بتعيين كلمة مرور جديدة فوراً لضمان حماية لوحة إدارة المنصة من الوصول غير المصرح به." : "Set a new administrative security pass signature to isolate the Super Admin gateway."}
                      </p>

                      <form onSubmit={handleAdminChangePassword} className="space-y-3.5 text-xs text-right">
                        {passwordError && (
                          <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 p-2.5 border border-rose-150 dark:border-rose-900 rounded-xl text-center text-[11px] font-bold">
                            ⚠️ {passwordError}
                          </div>
                        )}
                        {passwordSuccess && (
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 p-2.5 border border-emerald-150 dark:border-emerald-900/50 rounded-xl text-center text-[11px] font-bold">
                            {passwordSuccess}
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-slate-500 dark:text-slate-400 font-bold block">{isAr ? "كلمة المرور الحالية للمدير:" : "Current Password:"}</label>
                          <input
                            type="password"
                            required
                            value={adminCurrentPassword}
                            onChange={(e) => setAdminCurrentPassword(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-right font-mono text-slate-800 dark:text-slate-200"
                            placeholder="••••••"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-500 dark:text-slate-400 font-bold block">{isAr ? "كلمة المرور الجديدة المقترحة:" : "New Password:"}</label>
                          <input
                            type="password"
                            required
                            value={adminNewPassword}
                            onChange={(e) => setAdminNewPassword(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-right font-mono text-slate-800 dark:text-slate-200"
                            placeholder="••••••"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/15"
                        >
                          {isAr ? "تحديث كلمة المرور" : "Save Secure Password"}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* SaaS General Analytics metrics */}
                  <div className="space-y-6 col-span-2">
                    {/* SECTION 1: Pending Join Requests & Financial Verifications */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          <span className="text-amber-500">⏳</span>
                          <span>{isAr ? "طلبات التسجيل الجديدة والتحقق المالي" : "Pending SaaS Subscriptions & Payment Verifications"}</span>
                        </h3>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                          {stores.filter((s) => s.isApproved === false).length} {isAr ? "معلق" : "Pending"}
                        </span>
                      </div>

                      <div className="space-y-4 max-h-[300px] overflow-y-auto font-sans">
                        {stores.filter((s) => s.isApproved === false).length === 0 ? (
                          <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                            🎉 {isAr ? "جميع طلبات المطاعم تمت معالجتها والتحقق الفوري منها بنجاح!" : "All registration requests have been fully reviewed!"}
                          </div>
                        ) : (
                          stores.filter((s) => s.isApproved === false).map((st) => {
                            const estSYPSub = st.plan === "Gold" ? 5 * currencyRates.USD : 0;
                            return (
                              <div
                                key={st.id}
                                className="p-4 bg-amber-50/20 rounded-2xl border border-amber-150/50 space-y-3.5 text-xs text-slate-700"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                  <div>
                                    <div className="font-bold text-slate-900 text-sm">
                                      {isAr ? st.nameAr : st.nameEn}
                                    </div>
                                    <div className="text-[10px] text-slate-400">Subdomain ID: {st.id}</div>
                                  </div>
                                  <div>
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">
                                      {st.plan === "Gold" ? (isAr ? "💎 باقة ذهبية" : "Gold") : (isAr ? "تجريبية" : "Free")}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-mono">
                                  <div>
                                    <div className="text-slate-400 text-[10px] uppercase font-sans">{isAr ? "طريقة الدفع:" : "Method:"}</div>
                                    <div className="font-bold text-slate-800">
                                      {st.paymentMethod === "syriatel_cash" && (isAr ? "سيريتل كاش" : "Syriatel Cash")}
                                      {st.paymentMethod === "mtn_cash" && (isAr ? "MTN كاش" : "MTN Cash")}
                                      {st.paymentMethod === "alharam_transfer" && (isAr ? "حوالة هرم/فؤاد" : "Al-Haram Transfer")}
                                      {st.paymentMethod === "bank_transfer" && (isAr ? "حساب بنكي" : "Bank")}
                                      {!["syriatel_cash", "mtn_cash", "alharam_transfer", "bank_transfer"].includes(st.paymentMethod || "") && (st.paymentMethod || "Trial/N/A")}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-slate-400 text-[10px] uppercase font-sans">{isAr ? "رمز المرجع المالي:" : "Doc Reference:"}</div>
                                    <div className="font-bold text-emerald-700">{st.paymentReference || "Trial Free - N/A"}</div>
                                  </div>

                                  <div>
                                    <div className="text-slate-400 text-[10px] uppercase font-sans">{isAr ? "قيمة الاشتراك:" : "Amount due:"}</div>
                                    <div className="font-bold text-slate-800">
                                      {estSYPSub > 0 ? estSYPSub.toLocaleString() + " ل.س" : (isAr ? "0 ل.س / تجربة" : "0 SYP")}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-slate-400 text-[10px] uppercase font-sans">{isAr ? "جوال مقدم الطلب:" : "Contact Phone:"}</div>
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5 pt-0.5">
                                      {st.phone ? (
                                        <a
                                          href={`tel:${st.phone}`}
                                          className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-0.5"
                                          title={isAr ? "انقر للاتصال الهاتفي المباشر بنقرة واحدة" : "Click to Dial"}
                                        >
                                          <span>📞</span>
                                          <span>{st.phone}</span>
                                        </a>
                                      ) : (
                                        <span className="text-slate-400">N/A</span>
                                      )}
                                      {st.phone && st.phone !== "+963900000000" && (
                                        <a
                                          href={`https://wa.me/${st.phone.replace(/[\s+-]/g, "")}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          referrerPolicy="no-referrer"
                                          className="text-emerald-600 hover:text-emerald-700 font-extrabold text-[10px] font-sans underline ml-1"
                                          title="WhatsApp"
                                        >
                                          (واتساب)
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-1 font-sans">
                                  <button
                                    onClick={() => handleRejectStore(st.id)}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-1.5 rounded-xl text-[11px] transition-all cursor-pointer"
                                  >
                                    {isAr ? "رفض وإلغاء" : "Reject"}
                                  </button>
                                  <button
                                    onClick={() => handleApproveStore(st.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-xl text-[11px] transition-all cursor-pointer"
                                  >
                                    {isAr ? "تأكيد الدفع والتفعيل" : "Approve & Activate"}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* SECTION 1.5: Pending Gold subscription upgrades */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          <span className="text-amber-500">👑</span>
                          <span>{isAr ? "طلبات الترقية الذهبية المعلقة" : "Pending Premium Gold Upgrades"}</span>
                        </h3>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                          {stores.filter((s) => s.requestedUpgrade === true).length} {isAr ? "طلب معلق" : "Pending"}
                        </span>
                      </div>

                      <div className="space-y-4 max-h-[300px] overflow-y-auto font-sans">
                        {stores.filter((s) => s.requestedUpgrade === true).length === 0 ? (
                          <div className="text-center py-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                            {isAr ? "لا توجد طلبات ترقية معلقة حالياً." : "No pending premium upgrade requests found."}
                          </div>
                        ) : (
                          stores.filter((s) => s.requestedUpgrade === true).map((st) => (
                            <div
                              key={st.id}
                              className="p-4 bg-amber-50/30 rounded-2xl border border-amber-150/40 space-y-3 text-xs text-slate-700"
                            >
                              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div>
                                  <div className="font-bold text-slate-900 text-sm">{isAr ? st.nameAr : st.nameEn}</div>
                                  <div className="text-[10px] text-slate-400">Subdomain ID: {st.id}</div>
                                </div>
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-md font-sans">
                                  {isAr ? "👑 طلب باقة غولد" : "Gold Tier ticket"}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[11px] font-mono">
                                <div>
                                  <div className="text-slate-400 text-[10px] uppercase font-sans">{isAr ? "قناة دفع الترقية:" : "Payment method:"}</div>
                                  <span className="font-bold text-slate-800">
                                    {st.pendingPaymentMethod === "syriatel_cash" && (isAr ? "سيريتل كاش" : "Syriatel Cash")}
                                    {st.pendingPaymentMethod === "mtn_cash" && (isAr ? "إم تي إن كاش" : "MTN Cash")}
                                    {st.pendingPaymentMethod === "alharam_transfer" && (isAr ? "حوالة هرم/فؤاد" : "Al-Haram Transfer")}
                                    {st.pendingPaymentMethod === "bank_transfer" && (isAr ? "حساب مصرفي" : "Bank Transfer")}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-slate-400 text-[10px] uppercase font-sans">{isAr ? "رمز المعاملة المالي:" : "Ref transaction ID:"}</div>
                                  <span className="font-bold text-indigo-700">{st.pendingPaymentReference || "N/A"}</span>
                                </div>
                                <div>
                                  <div className="text-slate-400 text-[10px] uppercase font-sans">{isAr ? "الباقة المطلوبة:" : "Requested Package:"}</div>
                                  <span className="font-black text-amber-700 bg-amber-100/40 px-1.5 py-0.5 rounded-md border border-amber-200">
                                    {st.pendingUpgradeType === "annual" ? (isAr ? "💎 سنوي (12 شهر)" : "💎 Annual (12 mo)") : (
                                      isAr 
                                        ? `📅 شهري (${st.pendingUpgradeMonths || 1} شهر)` 
                                        : `📅 Monthly (${st.pendingUpgradeMonths || 1} mo)`
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-slate-400 text-[10px] uppercase font-sans">{isAr ? "الاشتراك الحالي:" : "Current plan:"}</div>
                                  <span className="text-slate-500">{st.plan} Plan</span>
                                </div>
                                <div>
                                  <div className="text-slate-400 text-[10px] uppercase font-sans">{isAr ? "جوال صاحب المطعم:" : "Contact Phone:"}</div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1">
                                    {st.phone ? (
                                      <a
                                        href={`tel:${st.phone}`}
                                        className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-0.5"
                                        title={isAr ? "انقر للاتصال الهاتفي المباشر بنقرة واحدة" : "Click to Dial"}
                                      >
                                        <span>📞</span>
                                        <span>{st.phone}</span>
                                      </a>
                                    ) : (
                                      <span className="text-slate-400">N/A</span>
                                    )}
                                    {st.phone && st.phone !== "+963900000000" && (
                                      <a
                                        href={`https://wa.me/${st.phone.replace(/[\s+-]/g, "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-600 hover:text-emerald-700 font-extrabold text-[10px] font-sans underline"
                                        title="WhatsApp"
                                      >
                                        (واتساب)
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1 font-sans">
                                <button
                                  onClick={() => handleRejectUpgrade(st.id)}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-1.5 rounded-xl text-[11px] cursor-pointer transition-all"
                                >
                                  {isAr ? "رفض الطلب" : "Deny Upgrade"}
                                </button>
                                <button
                                  onClick={() => handleApproveUpgrade(st.id)}
                                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-1.5 rounded-xl text-[11px] cursor-pointer transition-all"
                                >
                                  {isAr ? "تأكيد واستلام وتحديث الاشتراك الذهبي" : "Approve & Activate Gold"}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* SECTION 2: Active Verified Outlets & Freeze Switch */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <span className="text-emerald-500">🟢</span>
                        <span>{isAr ? "المطاعم النشطة والتحكم الإداري بالاشتراك والتجميد" : "Active Verified Restaurant Subscriptions & Freeze Control"}</span>
                      </h3>

                      <div className="space-y-3 max-h-96 overflow-y-auto font-sans">
                        {stores.filter((s) => s.isApproved !== false).length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs">
                            {isAr ? "لا يوجد مطاعم نشطة حالياً." : "No active trading outlets found."}
                          </div>
                        ) : (
                          stores.filter((s) => s.isApproved !== false).map((st) => {
                            const daysRemaining = getDaysRemaining(st.subscriptionExpires);
                            const isExpired = daysRemaining < 0;
                            const isNearExpiry = daysRemaining >= 0 && daysRemaining <= 5;
                            return (
                              <div
                                key={st.id}
                                className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3 transition-all ${
                                  st.isSuspended
                                    ? "bg-rose-50/40 border-rose-100"
                                    : isExpired
                                    ? "bg-red-50/30 border-red-200"
                                    : isNearExpiry
                                    ? "bg-amber-50/30 border-amber-200/60"
                                    : "bg-slate-50 border-slate-200/50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <img
                                    referrerPolicy="no-referrer"
                                    src={st.logo}
                                    alt={st.nameAr}
                                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                                  />
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <div className="font-bold text-slate-800 text-sm">{isAr ? st.nameAr : st.nameEn}</div>
                                      {st.isSuspended ? (
                                        <span className="bg-rose-100 text-rose-800 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                                          {isAr ? "🚨 مجمد مؤقتاً" : "🚨 Frozen"}
                                        </span>
                                      ) : isExpired ? (
                                        <span className="bg-red-650 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md animate-bounce">
                                          {isAr ? "🚨 منتهي" : "🚨 Expired"}
                                        </span>
                                      ) : isNearExpiry ? (
                                        <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md animate-pulse">
                                          {isAr ? "⚠️ وشيك" : "⚠️ Warning"}
                                        </span>
                                      ) : (
                                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-md animate-pulse">
                                          {isAr ? "🟢 نشط" : "🟢 Running"}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      Slug: {st.id} | Plan: <strong className="text-slate-600">
                                        {st.plan}
                                        {st.plan === "Gold" && (
                                          st.subscriptionType === "annual"
                                            ? (isAr ? " (سنوي 12 شهر)" : " (Annual 12 mo)")
                                            : (isAr ? ` (شهري ${st.subscriptionMonths || 1} شهر)` : ` (Monthly ${st.subscriptionMonths || 1} mo)`)
                                        )}
                                      </strong>
                                    </div>
                                    {st.createdAt && (
                                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                                        📅 {isAr ? "تاريخ تسجيل المشترك:" : "Joined:"} <strong className="text-slate-700 font-mono">{st.createdAt}</strong>
                                      </div>
                                    )}
                                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                                      <span>{isAr ? "جوال صاحب المطعم:" : "Phone:"}</span>
                                      {st.phone ? (
                                        <a
                                          href={`tel:${st.phone}`}
                                          className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline flex items-center gap-0.5"
                                          title={isAr ? "اتصال هاتفي مباشر بنقرة واحدة" : "Click to Call"}
                                        >
                                          <span>📞</span>
                                          <span>{st.phone}</span>
                                        </a>
                                      ) : (
                                        <span className="text-slate-400">N/A</span>
                                      )}
                                      {st.phone && st.phone !== "+963900000000" && (
                                        <a
                                          href={`https://wa.me/${st.phone.replace(/[\s+-]/g, "")}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          referrerPolicy="no-referrer"
                                          className="text-[10px] text-emerald-600 hover:text-emerald-700 font-extrabold underline block ml-1"
                                          title="WhatsApp"
                                        >
                                          (واتساب)
                                        </a>
                                      )}
                                    </div>
                                    
                                    {isExpired ? (
                                      <div className="mt-1 flex items-center gap-1 text-red-600 font-extrabold text-[10px]">
                                        <span>🚫 {isAr ? "تجاوز الصلاحية! يرجى التواصل أو التجميد تجنباً لسلب النطاق" : "Subscription expired! Freeze store if unpaid."}</span>
                                      </div>
                                    ) : isNearExpiry ? (
                                      <div className="mt-1 flex items-center gap-1 text-amber-700 font-bold text-[10px]">
                                        <span>⚠️ {isAr ? `تنبيه: متبقي فقط ${daysRemaining} أيام لتجديد الاشتراك!` : `Alert: Only ${daysRemaining} days left! Notify owner.`}</span>
                                      </div>
                                    ) : (
                                      <div className="mt-1 flex items-center gap-1 text-emerald-600 text-[10px]">
                                        <span>✓ {isAr ? `الاشتراك آمن ومستمر لمستقبل ${daysRemaining} يوم` : `Subscription safe: ${daysRemaining} days remaining`}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-start gap-4 text-right">
                                  <div className="text-right">
                                    <div className="text-[10px] text-slate-400">
                                      Expires: <span className="font-mono font-bold text-slate-700">{st.subscriptionExpires}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      Ref: <span className="font-mono text-slate-500">{st.paymentReference || "N/A"}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {st.isSuspended ? (
                                      <button
                                        onClick={() => handleToggleSuspendStore(st.id)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-[11px] cursor-pointer transition-all"
                                        title={isAr ? "إلغاء التجميد وإعادة تمكين المطعم تجارياً" : "Unfreeze and activate restaurant sales"}
                                      >
                                        {isAr ? "تنشيط وإزالة التجميد" : "Reactivate"}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleToggleSuspendStore(st.id)}
                                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-1.5 rounded-xl text-[11px] cursor-pointer transition-all"
                                        title={isAr ? "تجميد الحساب فوراً بسبب سوء الاستخدام أو مشاكل الدفع" : "Temporarily freeze due to unpaid dues or violations"}
                                      >
                                        {isAr ? "تجميد مؤقت للحساب" : "Freeze Store"}
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleDeleteStoreSubscription(st.id)}
                                      className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                                      title={isAr ? "حذف الاشتراك والمطعم بالكامل بشكل نهائي في حال المخالفات الصارخة" : "Permanently erase subscription & store due to critical violations"}
                                    >
                                      ❌ {isAr ? "حذف الاشتراك" : "Delete Plan"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modern footer with custom local Syrian tags */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-2">
          <span>© 2026 {isAr ? "لقمة ساس - جميع الحقوق محفوظة لرواد دمشق وحلب" : "Logma SaaS - Structured and developed for Damascus, Syria"}</span>
          <div className="flex justify-center gap-3 font-mono text-[10px] text-slate-300 dark:text-slate-700">
            <span>Server CJS Compiled</span>
            <span>•</span>
            <span>Secure Port 3000 Ingress</span>
            <span>•</span>
            <span>Gemini LLM Synthesis</span>
          </div>
        </div>
      </footer>

      {/* DIALOG ANDROID SERVER SETTINGS MODAL */}
      {showAndroidServerModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 space-y-6 shadow-2xl border border-slate-150 dark:border-slate-800 text-right">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <span>📱</span>
                {isAr ? "إعدادات اتصال الأندرويد" : "Android Server Configuration"}
              </h3>
              <button
                onClick={() => setShowAndroidServerModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAr 
                  ? "تحديد خادم الـ API للمنصة عندما تعمل كـ تطبيق هجين (Android APK) على محاكي أو جوال حقيقي لتوجيه الطلبات بنجاح."
                  : "Specify the main API Backend URL to successfully communicate when running the platform as an Android native hybrid application."}
              </p>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 block">
                  {isAr ? "عنوان خادم الـ API الحالي" : "Current API Server URL"}
                </label>
                <input
                  type="text"
                  value={androidServerUrl}
                  onChange={(e) => setAndroidServerUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-mono text-left text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl p-3 text-[10px] space-y-1">
                <span className="font-bold block">💡 {isAr ? "عناوين مفيدة:" : "Quick references:"}</span>
                <div className="font-mono space-y-0.5">
                  <div>• {isAr ? "المنصة الحية:" : "Live system:"} <span className="underline">https://ais-pre-4cqcy7ci4xtp542lrh3kfz-807175329121.europe-west2.run.app</span></div>
                  <div>• {isAr ? "لوحة التطوير:" : "Development system:"} <span className="underline">https://ais-dev-4cqcy7ci4xtp542lrh3kfz-807175329121.europe-west2.run.app</span></div>
                  <div>• {isAr ? "محاكي أندرويد (تطوير محلي):" : "Android Emulator (local PC):"} <span className="underline">http://10.0.2.2:3000</span></div>
                </div>
              </div>
            </div>

            <div className="flex justify-start gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  localStorage.setItem('backend_url', androidServerUrl);
                  setShowAndroidServerModal(false);
                  window.location.reload();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                {isAr ? "حفظ وإعادة تحميل" : "Save & Reload"}
              </button>
              <button
                onClick={() => {
                  const defaultBackend = 'https://ais-pre-4cqcy7ci4xtp542lrh3kfz-807175329121.europe-west2.run.app';
                  setAndroidServerUrl(defaultBackend);
                  localStorage.setItem('backend_url', defaultBackend);
                  setShowAndroidServerModal(false);
                  window.location.reload();
                }}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                {isAr ? "استعادة الافتراضي" : "Reset Default"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 max-w-xl w-full rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl border border-slate-150 dark:border-slate-800 text-right">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
                <span>{isRegisterMode ? "📝" : "🔐"}</span>
                {isRegisterMode 
                  ? (isAr ? "إنشاء حساب زبون جديد" : "Create New Customer Profile")
                  : (isAr ? "بوابة الدخول واختيار الصلاحيات" : "Access Control & Roles Portal")}
              </h3>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setIsRegisterMode(false);
                  setLoginError("");
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Switching Tabs */}
            <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-950 border border-slate-200/65 dark:border-slate-800/80 rounded-2xl p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setLoginError("");
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                  !isRegisterMode
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/40"
                }`}
              >
                🔑 {isAr ? "تسجيل الدخول والأدوار" : "Sign In & Quick Roles"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  setLoginError("");
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                  isRegisterMode
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/40"
                }`}
              >
                👤 {isAr ? "إنشاء حساب زبون جديد" : "Register Customer"}
              </button>
            </div>

            {loginError && (
              <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 p-3 border border-rose-150 dark:border-rose-900 text-xs rounded-xl text-center font-bold animate-pulse">
                ⚠️ {loginError}
              </div>
            )}

            {!isRegisterMode ? (
              <div className="space-y-6">
                {/* Unified Role Chooser Dropdown switcher */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-800 rounded-3xl space-y-3.5 text-right">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-350">
                    👥 {isAr ? "اختر نوع الحساب / الدور لتجربته بنقرة واحدة (تعبئة تلقائية):" : "Select Demo Account / Role (Fills automatically):"}
                  </label>
                  
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "guest") {
                        setShowLoginModal(false);
                        setLoginError("");
                        setCurrentUser(null);
                        setActiveSpace("saas");
                      } else if (val === "admin") {
                        setLoginForm({ username: "admin", password: "123" });
                        setLoginError("");
                      } else if (val === "owner_burger") {
                        setLoginForm({ username: "owner_burger", password: "123" });
                        setLoginError("");
                      } else if (val === "customer_moataz") {
                        setLoginForm({ username: "customer_moataz", password: "123" });
                        setLoginError("");
                      }
                    }}
                    defaultValue=""
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-550 text-right font-medium"
                  >
                    <option value="" disabled>{isAr ? "-- اضغط لاختيار دور وبدء التجربة --" : "-- Choose a role to auto-complete credentials --"}</option>
                    <option value="guest">🌐 {isAr ? "دخول سريع كزائر عام (تصفح كامل للمأكولات والمنصة)" : "Public Guest Mode (Browse freely without accounts)"}</option>
                    <option value="customer_moataz">🛍️ {isAr ? "دخول كزبون مسجل (معتز الخالدي - تتبع دمشق والولاء)" : "Registered Customer (Moataz - Syrian Customer)"}</option>
                    <option value="owner_burger">🏪 {isAr ? "دخول كمالك مطعم تجريبي (التحكم بالطلبات والطباعة)" : "Store Partner Owner (Manage kitchen & simulate tickets)"}</option>
                    <option value="admin">👑 {isAr ? "دخول كمدير عام للمنصة (أمن كامل وتغيير باسورد)" : "Platform Super Admin (Full SaaS administration)"}</option>
                  </select>

                  {/* Dynamic Help Description Box */}
                  <div className="p-3 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-850 rounded-2xl text-right text-[11px] leading-relaxed space-y-1.5 min-h-[60px] flex flex-col justify-center">
                    {loginForm.username === "admin" && (
                      <div>
                        <strong className="text-indigo-600 dark:text-indigo-400 block mb-0.5">👑 {isAr ? "مدير النظام الشامل (سوبر أدمن)" : "Super Admin"}</strong>
                        <span className="text-slate-500 dark:text-slate-400">
                          {isAr 
                            ? "كامل الصلاحيات لإعتماد المتاجر الجديدة وتسيير المدفوعات، تعديل سعر صرف الليرة، والأهم: الميزة الأمنية المضافة حديثاً لتحديث كلمة مرور المدير وعرض إيميله لحماية المنصة."
                            : "Full workspace power. Grant/suspend subdomains, update exchange currency grids, and safely test our newly integrated Change Password portal."}
                        </span>
                      </div>
                    )}
                    {loginForm.username === "owner_burger" && (
                      <div>
                        <strong className="text-amber-600 dark:text-amber-400 block mb-0.5">🏪 {isAr ? "صاحب مطعم (الشركة الشريكة)" : "Store Partner Merchant"}</strong>
                        <span className="text-slate-500 dark:text-slate-400">
                          {isAr 
                            ? "متابعة تجهيز الطلبات، طباعة الإيصالات الحرارية، كود الخصومات، شحن نقاط الولاء للزبائن، وتحديث حالات توصيل السائقين."
                            : "Kitchen monitor system. Accept/prepare burgers, view client details, assign Damascus delivery coordinates, and simulate local bills."}
                        </span>
                      </div>
                    )}
                    {loginForm.username === "customer_moataz" && (
                      <div>
                        <strong className="text-emerald-700 dark:text-emerald-400 block mb-0.5">🛍️ {isAr ? "الزبون المسجل بالشبكة" : "Registered Client Portal"}</strong>
                        <span className="text-slate-500 dark:text-slate-400">
                          {isAr 
                            ? "تقديم الطلبات وتحديد عنوان يدوي للمناطق البعيدة، كسب نقاط لقمة، تتبع السائق مع بث إحداثياته الحية، والحفاظ على فواتيره السابقة."
                            : "Choose from unlisted regions with our custom manual address entry, receive rewards automatically, and trace simulated shipping."}
                        </span>
                      </div>
                    )}
                    {!loginForm.username && (
                      <span className="text-slate-400 dark:text-slate-500 text-center italic">
                        {isAr ? "💡 حدد خياراً من القائمة المنسدلة أعلاه لتعبئة تفاصيل الدخول التلقائية والبدء في جولة حية." : "💡 Pick an entry option from the dropdown menu to securely populate demo values instantly."}
                      </span>
                    )}
                  </div>
                </div>

                {/* Credential Submit Form */}
                <form onSubmit={handleLoginSubmit} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-850">
                  <div className="text-right text-[11px] text-slate-400 font-bold mb-1">
                    {isAr ? "أو أدخل تفاصيل الدخول لأي حساب يدوي:" : "Or enter login credentials below:"}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      required
                      placeholder={isAr ? "اسم المستخدم أو البريد" : "Username / Email"}
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 text-right font-medium"
                    />
                    
                    <input
                      type="password"
                      required
                      placeholder={isAr ? "كلمة المرور المشفرة" : "Password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 text-right font-medium"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLoginModal(false);
                        setLoginError("");
                      }}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
                    >
                      {isAr ? "إلغاء الأمر" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-750 text-white px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-indigo-650/15"
                    >
                      🔑 {isAr ? "تسجيل الدخول الآمن" : "Verify Secure Sign in"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Customer Registration Form */
              <form onSubmit={handleCustomerRegisterSubmit} className="space-y-4 animate-fade-in">
                <div className="text-right text-[11px] text-slate-400 font-bold mb-1">
                  {isAr ? "يرجى تعبئة الحقول التالية بدقة لإنشاء حسابك وتتبع وجباتك فوراً:" : "Please fill in the following details to setup your customer identity instantly:"}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{isAr ? "الاسم الكامل (مثلا: معتز الخالدي)" : "Full Name for Invoices"}</label>
                    <input
                      type="text"
                      required
                      placeholder={isAr ? "أدخل اسمك الكريم للتوصيل" : "e.g., Moataz Al-Khaled"}
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 text-right font-medium focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{isAr ? "رقم الجوال السوري (للاتصال والتوصيل)" : "Syrian Phone Number"}</label>
                    <input
                      type="tel"
                      required
                      placeholder={isAr ? "مثال: 0934567891" : "e.g. 0934567891"}
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 text-right font-medium focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{isAr ? "البريد الإلكتروني" : "Email address"}</label>
                    <input
                      type="email"
                      required
                      placeholder={isAr ? "example@domain.sy" : "example@domain.sy"}
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 text-right font-medium focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{isAr ? "اسم مستخدم فريد (للدخول لاحقاً)" : "Choose unique username"}</label>
                    <input
                      type="text"
                      required
                      placeholder={isAr ? "مثال: moataz_sy" : "e.g., moataz_sy"}
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 text-right font-medium focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{isAr ? "كلمة مرور الدخول" : "Account Password"}</label>
                    <input
                      type="password"
                      required
                      placeholder={isAr ? "أكتب كلمة مرور آمنة" : "Password to log back in"}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 text-right font-medium focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{isAr ? "عنوان التسليم والمنزل المفصل (لتوصيل سريع ومضمون)" : "Detailed delivery and home address"}</label>
                    <textarea
                      required
                      rows={2}
                      placeholder={isAr ? "مثال: دمشق - المزة أوتوستراد - جانب جامع الأكرم بـ 100 متر" : "e.g., Damascus - Mezzeh Autostrad - 100 meters close to Al Akram mosque"}
                      value={registerForm.address}
                      onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-200 text-right font-medium resize-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-850">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(false);
                      setLoginError("");
                    }}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    {isAr ? "العودة لتسجيل الدخول" : "Back to Sign In"}
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-emerald-600/15"
                  >
                    ✨ {isAr ? "إنشاء الحساب والتسجيل" : "Create Account & Sign in"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
