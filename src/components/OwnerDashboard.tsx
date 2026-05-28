import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Store, Product, Order, Extra } from "../types";
import { ListCollapse, Plus, Edit, Award, Printer, Check, Star, Trash2, Languages, Sparkles, RefreshCw, Smartphone, MapPin, Zap, MessageSquare, Upload, Image as ImageIcon } from "lucide-react";

interface OwnerDashboardProps {
  store: Store;
  products: Product[];
  orders: Order[];
  isAr: boolean;
  onUpdateStore: (updated: Partial<Store>) => void;
  onUpdateOrderStatus: (orderId: string, status: string) => void;
  onAddOrEditProduct: (productData: Partial<Product>) => Promise<any>;
  onDeleteProduct: (productId: string) => Promise<any>;
  onUpgradeSubscription: (plan: "Gold", months: number) => void;
}

export default function OwnerDashboard({
  store,
  products,
  orders,
  isAr,
  onUpdateStore,
  onUpdateOrderStatus,
  onAddOrEditProduct,
  onDeleteProduct,
  onUpgradeSubscription,
}: OwnerDashboardProps) {
  // Tabs of owner dashboard
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "marketing" | "settings">("orders");

  // File Upload Refs
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const settingsLogoFileInputRef = useRef<HTMLInputElement>(null);
  const settingsBannerFileInputRef = useRef<HTMLInputElement>(null);

  // Subscription upgrade states
  const [upgradeMethod, setUpgradeMethod] = useState("syriatel_cash");
  const [upgradeReference, setUpgradeReference] = useState("");
  const [upgradeType, setUpgradeType] = useState<"monthly" | "annual">("monthly");
  const [upgradeMonths, setUpgradeMonths] = useState(1);
  const [upgradeError, setUpgradeError] = useState("");
  const [upgradeSubmitting, setUpgradeSubmitting] = useState(false);

  const handleRequestUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeReference) {
      setUpgradeError(isAr ? "الرجاء إدخال رقم المعاملة أو رمز الحوالة لتأكيد الدفع." : "Please input transaction reference ID.");
      return;
    }
    setUpgradeError("");
    setUpgradeSubmitting(true);
    try {
      const res = await fetch(`/api/stores/${store.id}/request-upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: upgradeMethod,
          paymentReference: upgradeReference,
          upgradeType,
          upgradeMonths,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Trigger parent state update
        onUpdateStore(data.store);
        setUpgradeReference("");
      } else {
        setUpgradeError(data.error || "Failed to submit upgrade");
      }
    } catch (err) {
      setUpgradeError(isAr ? "حدث خطأ غير متوقع أثناء إرسال طلبك." : "Unexpected error during submit.");
    } finally {
      setUpgradeSubmitting(false);
    }
  };
  
  // New Product Editor form modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productForm, setProductForm] = useState({
    nameAr: "",
    nameEn: "",
    descAr: "",
    descEn: "",
    category: "",
    priceSYP: 10000,
    image: "",
    inStock: true,
    extrasText: "", // JSON style or comma separated
  });

  const [imageUploading, setImageUploading] = useState(false);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 375;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setProductForm((prev) => ({ ...prev, image: compressedBase64 }));
        }
        setImageUploading(false);
        e.target.value = ""; // Clear file selector choice to enable re-upload
      };
      img.onerror = () => {
        setImageUploading(false);
        e.target.value = "";
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setImageUploading(false);
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  // AI assistant tools helper states
  const [aiInputArText, setAiInputArText] = useState("");
  const [aiTranslatedText, setAiTranslatedText] = useState("");
  const [aiTranslating, setAiTranslating] = useState(false);

  const [aiMealNameAr, setAiMealNameAr] = useState("");
  const [aiMealNameEn, setAiMealNameEn] = useState("");
  const [aiMealCat, setAiMealCat] = useState("");
  const [aiMealIngrid, setAiMealIngrid] = useState("");
  const [aiGeneratedDescAr, setAiGeneratedDescAr] = useState("");
  const [aiGeneratedDescEn, setAiGeneratedDescEn] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const [selectedOrderToPrint, setSelectedOrderToPrint] = useState<Order | null>(null);
  const [printType, setPrintType] = useState<"customer" | "kitchen">("customer");
  const [autoPrintOnOpen, setAutoPrintOnOpen] = useState(true);

  useEffect(() => {
    if (selectedOrderToPrint && autoPrintOnOpen) {
      const timer = setTimeout(() => {
        try {
          handlePrintViaIframe();
        } catch (e) {
          console.error("Auto print error", e);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [selectedOrderToPrint?.id, printType, autoPrintOnOpen]);

  // Bluetooth Thermal Printer Connection States
  const [btDevice, setBtDevice] = useState<any>(null);
  const [btCharacteristic, setBtCharacteristic] = useState<any>(null);
  const [btConnecting, setBtConnecting] = useState(false);
  const [btError, setBtError] = useState("");
  const [btSuccess, setBtSuccess] = useState("");

  // Connect Bluetooth Thermal Printer
  const handleConnectBluetooth = async () => {
    setBtConnecting(true);
    setBtError("");
    setBtSuccess("");
    const nav = navigator as any;
    try {
      if (!nav.bluetooth) {
        throw new Error(isAr 
          ? "متصفحك الحالي لا يدعم ميزة البلوتوث (Web Bluetooth). يرجى فتح الرابط المباشر في متصفح Google Chrome أو Microsoft Edge على حاسوب أو هاتف أندرويد." 
          : "Web Bluetooth is not supported by this browser. Use Chrome/Edge on Desktop/Android and open outside iframe."
        );
      }
      
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb", // Standard ESC/POS POS-58 / POS-80
          "00001101-0000-1000-8000-00805f9b34fb"  // SPP profile
        ]
      });

      setBtSuccess(isAr ? `✓ تم اكتشاف الطابعة: ${device.name || "طابعة حرارية"}, جاري الاتصال...` : `Found ${device.name || "Printer"}, connecting...`);
      
      const server = await device.gatt?.connect();
      if (!server) throw new Error("Could not connect to printer GATT server.");

      const services = await server.getPrimaryServices();
      let writeChar: any = null;

      for (const service of services) {
        try {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeChar = char;
              break;
            }
          }
        } catch (e) {
          console.warn("Could not read chars for service:", service.uuid, e);
        }
        if (writeChar) break;
      }

      if (!writeChar) {
        throw new Error(isAr 
          ? "لم يتم العثور على قناة كتابة متوافقة (Write Characteristic) في هذه الطابعة." 
          : "No write-compatible characteristic found on the selected device."
        );
      }

      setBtDevice(device);
      setBtCharacteristic(writeChar);
      setBtSuccess(isAr ? `🔌 تم اقتران الطابعة ${device.name || "Thermal Printer"} والاتصال بها بنجاح!` : `🔌 Connected to ${device.name || "Thermal Printer"} successfully!`);
      
      device.addEventListener("gattserverdisconnected", () => {
        setBtDevice(null);
        setBtCharacteristic(null);
        setBtSuccess("");
        setBtError(isAr ? "⚠️ انقطع اتصال الطابعة الحرارية." : "⚠️ Printer connection lost.");
      });
    } catch (err: any) {
      console.error("Bluetooth printer connection error:", err);
      setBtError(err.message || String(err));
    } finally {
      setBtConnecting(false);
    }
  };

  const handleDisconnectBluetooth = () => {
    if (btDevice && btDevice.gatt?.connected) {
      btDevice.gatt.disconnect();
    }
    setBtDevice(null);
    setBtCharacteristic(null);
    setBtSuccess("");
    setBtError(isAr ? "تم قطع الاتصال بالطابعة الحرارية." : "Disconnected from Bluetooth printer.");
  };

  // Local state for Store Profile/Logo configure settings
  const [settingsForm, setSettingsForm] = useState({
    nameAr: "",
    nameEn: "",
    descAr: "",
    descEn: "",
    phone: "",
    whatsapp: "",
    logo: "",
    banner: "",
    workingHours: "",
  });

  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  useEffect(() => {
    if (store) {
      setSettingsForm({
        nameAr: store.nameAr || "",
        nameEn: store.nameEn || "",
        descAr: store.descAr || "",
        descEn: store.descEn || "",
        phone: store.phone || "",
        whatsapp: store.whatsapp || "",
        logo: store.logo || "",
        banner: store.banner || "",
        workingHours: store.workingHours || "",
      });
    }
  }, [store]);

  const compressAndSetSettingsImage = (file: File, type: "logo" | "banner") => {
    if (type === "logo") setLogoUploading(true);
    if (type === "banner") setBannerUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = type === "logo" ? 300 : 800;
        const MAX_HEIGHT = type === "logo" ? 300 : 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
          setSettingsForm((prev) => ({ ...prev, [type]: compressedBase64 }));
        }
        if (type === "logo") setLogoUploading(false);
        if (type === "banner") setBannerUploading(false);
      };
      img.onerror = () => {
        if (type === "logo") setLogoUploading(false);
        if (type === "banner") setBannerUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      if (type === "logo") setLogoUploading(false);
      if (type === "banner") setBannerUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSuccess(false);
    try {
      await onUpdateStore(settingsForm);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (e) {
      console.error("Failed saving store profile configurations", e);
    } finally {
      setSettingsSaving(false);
    }
  };

  // Safe RTL encoding and word reversing function for older standard receipt printers which print LTR only
  const encodeUTF8or1256 = (text: string) => {
    const isArabic = /[\u0600-\u06FF]/.test(text);
    if (isArabic) {
      const words = text.split(" ").map(w => {
        if (/[\u0600-\u06FF]/.test(w)) {
          return w.split("").reverse().join("");
        }
        return w;
      });
      const reversed = words.reverse().join(" ");
      const encoder = new TextEncoder();
      return Array.from(encoder.encode(reversed));
    } else {
      const encoder = new TextEncoder();
      return Array.from(encoder.encode(text));
    }
  };

  const handleBluetoothPrint = async () => {
    if (!btCharacteristic || !selectedOrderToPrint) return;
    try {
      setBtConnecting(true);
      setBtError("");
      setBtSuccess(isAr ? "جاري تجميع البيانات وتجهيز أمر الطباعة..." : "Compiling order ESC/POS payload...");
      
      const bytes: number[] = [];
      const ESC = 27;
      const GS = 29;

      // Initialize Printer: ESC @
      bytes.push(ESC, 64);
      // Compact line spacing
      bytes.push(ESC, 51, 30);
      
      // Store Header Section (Centered, double size)
      bytes.push(ESC, 97, 1); // Center alignment
      bytes.push(GS, 33, 17); // Double height / width
      const name = isAr ? (store.nameAr || store.nameEn) : store.nameEn;
      bytes.push(...encodeUTF8or1256(name));
      bytes.push(10); // LF

      // Reset size
      bytes.push(GS, 33, 0);

      // Section label
      bytes.push(...encodeUTF8or1256("--------------------------------"));
      bytes.push(10);
      if (printType === "kitchen") {
        bytes.push(ESC, 69, 1); // Bold on
        bytes.push(...encodeUTF8or1256(isAr ? "⚠️ تذكرة تحضير المطبخ ⚠️" : "⚠️ KITCHEN ORDER PREP ⚠️"));
        bytes.push(10);
        bytes.push(ESC, 69, 0); // Bold off
      } else {
        bytes.push(...encodeUTF8or1256(isAr ? "--- فاتورة زبون ذكية ---" : "--- CUSTOMER INVOICE ---"));
        bytes.push(10);
      }
      bytes.push(...encodeUTF8or1256("--------------------------------"));
      bytes.push(10);

      // Metadata Info (Left aligned)
      bytes.push(ESC, 97, 0); // Left align
      const invoiceNum = selectedOrderToPrint.invoiceNumber || selectedOrderToPrint.id.substring(0, 8).toUpperCase();
      bytes.push(...encodeUTF8or1256((isAr ? "رقم الفاتورة: " : "Invoice #: ") + invoiceNum));
      bytes.push(10);
      
      const dateTime = new Date(selectedOrderToPrint.createdAt || Date.now()).toLocaleString("en-GB", { hour12: false });
      bytes.push(...encodeUTF8or1256((isAr ? "التاريخ: " : "Date: ") + dateTime));
      bytes.push(10);
      
      bytes.push(...encodeUTF8or1256((isAr ? "العميل: " : "Client: ") + selectedOrderToPrint.customerName));
      bytes.push(10);

      if (selectedOrderToPrint.customerPhone) {
        bytes.push(...encodeUTF8or1256((isAr ? "رقم الجوال: " : "Phone: ") + selectedOrderToPrint.customerPhone));
        bytes.push(10);
      }
      if (selectedOrderToPrint.customerAddress) {
        bytes.push(...encodeUTF8or1256((isAr ? "العنوان/التوصيل: " : "Address: ") + selectedOrderToPrint.customerAddress));
        bytes.push(10);
      }
      if (selectedOrderToPrint.notes) {
        bytes.push(10);
        bytes.push(ESC, 69, 1); // Bold key instruction
        bytes.push(...encodeUTF8or1256((isAr ? "💡 ملاحظة الزبون: " : "💡 Notes: ") + selectedOrderToPrint.notes));
        bytes.push(ESC, 69, 0);
        bytes.push(10);
      }

      bytes.push(...encodeUTF8or1256("================================"));
      bytes.push(10);

      // Print Items List
      selectedOrderToPrint.items.forEach((it) => {
        const prodName = isAr ? it.product.nameAr : it.product.nameEn;
        bytes.push(ESC, 69, 1);
        bytes.push(...encodeUTF8or1256(`${it.quantity}x ${prodName}`));
        bytes.push(ESC, 69, 0);
        bytes.push(10);

        if (printType !== "kitchen") {
          bytes.push(...encodeUTF8or1256(`   ${formatSYP(it.product.priceSYP * it.quantity)}`));
          bytes.push(10);
        }

        (it.selectedExtras || []).forEach((ex) => {
          const exName = isAr ? ex.nameAr : ex.nameEn;
          bytes.push(...encodeUTF8or1256(`  + ${exName}`));
          if (printType !== "kitchen") {
            bytes.push(...encodeUTF8or1256(` (${formatSYP(ex.priceSYP)})`));
          }
          bytes.push(10);
        });
      });

      bytes.push(...encodeUTF8or1256("================================"));
      bytes.push(10);

      // Financials (Customer receipt only)
      if (printType !== "kitchen") {
        bytes.push(...encodeUTF8or1256(`${isAr ? "المجموع الفرعي: " : "Subtotal: "}${formatSYP(selectedOrderToPrint.subtotalSYP)}`));
        bytes.push(10);
        
        if (selectedOrderToPrint.discountSYP > 0) {
          bytes.push(...encodeUTF8or1256(`${isAr ? "حسم ترويجي: " : "Promo Discount: "}-${formatSYP(selectedOrderToPrint.discountSYP)}`));
          bytes.push(10);
        }
        
        bytes.push(...encodeUTF8or1256(`${isAr ? "خدمة وتوصيل: " : "Delivery Fee: "}+${formatSYP(selectedOrderToPrint.deliveryFeeSYP)}`));
        bytes.push(10);
        
        bytes.push(...encodeUTF8or1256("--------------------------------"));
        bytes.push(10);

        // Net Total in double sizing
        bytes.push(ESC, 69, 1);
        bytes.push(...encodeUTF8or1256(`${isAr ? "الصافي المستحق: " : "NET TOTAL: "}${formatSYP(selectedOrderToPrint.totalSYP)}`));
        bytes.push(ESC, 69, 0);
        bytes.push(10);

        bytes.push(...encodeUTF8or1256("--------------------------------"));
        bytes.push(10);

        // Payment state indicator
        const payStatus = manuallyMarkedAsPaid
          ? (isAr ? "🟢 تمت العملية (مَدْفُوعَة بالكامل)" : "🟢 PAYMENT SUCCESS (PAID)")
          : (isAr ? "🔴 الدفع عند الاستلام كاش (COD)" : "🔴 PAY ON DELIVERY (CASH/COD)");
        bytes.push(ESC, 97, 1); // Center
        bytes.push(...encodeUTF8or1256(payStatus));
        bytes.push(10);
      } else {
        bytes.push(ESC, 97, 1);
        bytes.push(...encodeUTF8or1256(isAr ? "المطبخ: جهّز الطلب للزبون فوراً" : "Kitchen: Please start food prep ASAP."));
        bytes.push(10);
      }

      // Receipt custom message
      bytes.push(10);
      bytes.push(ESC, 97, 1); // Center
      bytes.push(...encodeUTF8or1256(customReceiptFooter));
      bytes.push(10);
      bytes.push(...encodeUTF8or1256(isAr ? "نظام لقمة السحابي 2026 SaaS" : "Powered by Logma SaaS"));
      bytes.push(10);

      // Line Feed and Automatic Paper Cut: GS V 66 0
      bytes.push(10, 10, 10, 10);
      bytes.push(GS, 86, 66, 0);

      const binaryData = new Uint8Array(bytes);
      const MTU = 20;

      for (let offset = 0; offset < binaryData.length; offset += MTU) {
        const slice = binaryData.slice(offset, offset + MTU);
        try {
          await btCharacteristic.writeValueWithoutResponse(slice);
        } catch {
          await btCharacteristic.writeValue(slice);
        }
        await new Promise(r => setTimeout(r, 25)); // brief throttle delay
      }

      setBtSuccess(isAr ? "✓ تم إرسال الأمر وطباعة الوصل بنجاح!" : "✓ Ticket printed wireless over Bluetooth successfully!");
      setTimeout(() => setBtSuccess(""), 4000);
    } catch (err: any) {
      console.error("BT print error:", err);
      setBtError(isAr ? `خطأ أثناء الطباعة: ${err.message || err}` : `Printing error: ${err.message || err}`);
    } finally {
      setBtConnecting(false);
    }
  };

  const [customReceiptFooter, setCustomReceiptFooter] = useState(isAr ? "نشكر ثقتكم بنا وصحة وهنا!" : "Thank you for your trust! Enjoy your meal!");
  const [receiptPaperWidth, setReceiptPaperWidth] = useState<"80mm" | "58mm">("80mm");
  const [manuallyMarkedAsPaid, setManuallyMarkedAsPaid] = useState<boolean | null>(null);
  const [showLogoInReceipt, setShowLogoInReceipt] = useState(true);

  const [printSuccessMessage, setPrintSuccessMessage] = useState("");
  const [formErr, setFormErr] = useState("");

  const formatSYP = (val: number) => {
    return val.toLocaleString() + (isAr ? " ل.س" : " SYP");
  };

  const handlePrintViaIframe = () => {
    if (!selectedOrderToPrint) return;

    // Remove existing print iframe if any
    const iframeId = "receipt-print-iframe";
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) {
      document.body.removeChild(iframe);
    }
    
    iframe = document.createElement("iframe");
    iframe.id = iframeId;
    iframe.setAttribute("style", "position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: none; visibility: hidden;");
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      console.error("Print Iframe document not accessible.");
      return;
    }

    // Build items HTML
    const itemsHtml = selectedOrderToPrint.items.map((it) => {
      const extrasHtml = (it.selectedExtras || []).length > 0
        ? `<div style="padding-right: 15px; font-size: 11px; color: #555; direction: ${isAr ? 'rtl' : 'ltr'};">
            ${it.selectedExtras.map(ex => `
              <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                <span>+ ${isAr ? ex.nameAr : ex.nameEn}</span>
                ${printType !== "kitchen" ? `<span>${formatSYP(ex.priceSYP)}</span>` : ""}
              </div>
            `).join('')}
           </div>`
        : "";

      return `
        <div style="border-bottom: 1px dotted #ccc; padding: 6px 0; font-size: 11px; font-weight: bold; direction: ${isAr ? 'rtl' : 'ltr'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; font-weight: 900;">${it.quantity}x ${isAr ? it.product.nameAr : it.product.nameEn}</span>
            ${printType !== "kitchen" ? `<span>${formatSYP(it.product.priceSYP * it.quantity)}</span>` : ""}
          </div>
          ${extrasHtml}
        </div>
      `;
    }).join('');

    // Build financial HTML
    let financialHtml = "";
    if (printType !== "kitchen") {
      financialHtml = `
        <div style="font-family: monospace; font-size: 11px; margin-bottom: 12px; border-bottom: 1px dashed #000; padding-bottom: 8px; direction: ${isAr ? 'rtl' : 'ltr'};">
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>${isAr ? "المجموع الفرعي:" : "Subtotal:"}</span>
            <span>${formatSYP(selectedOrderToPrint.subtotalSYP)}</span>
          </div>
          ${selectedOrderToPrint.discountSYP > 0 ? `
            <div style="display: flex; justify-content: space-between; color: red; margin-bottom: 3px;">
              <span>${isAr ? "حسم ترويجي:" : "Promo Discount:"}</span>
              <span>-${formatSYP(selectedOrderToPrint.discountSYP)}</span>
            </div>
          ` : ""}
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>${isAr ? "أجور التوصيل والخدمة:" : "Delivery Fee:"}</span>
            <span>+${formatSYP(selectedOrderToPrint.deliveryFeeSYP)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; border-top: 1px dotted #000; padding-top: 6px; margin-top: 4px; color: #000;">
            <span>${isAr ? "الصافي المستحق:" : "Net Total:"}</span>
            <span>${formatSYP(selectedOrderToPrint.totalSYP)}</span>
          </div>
        </div>
      `;
    } else {
      financialHtml = `
        <div style="text-align: center; margin: 12px 0; padding: 6px; border: 1px dashed #000; font-family: monospace; font-size: 10px; color: #000; background: none;">
          * ${isAr ? "تذكرة عمل المطبخ - لا تعرض تفاصيل مالية" : "KITCHEN PREP COPY - NO FINANCIAL VALUE"} *
        </div>
      `;
    }

    // Logo portion
    let logoHtml = "";
    if (showLogoInReceipt) {
      logoHtml = `
        <div style="text-align: center; margin-bottom: 12px; line-height: 1.2;">
          <div style="font-size: 24px; margin-bottom: 4px;">🖨️</div>
          <div style="font-weight: bold; font-size: 14px; text-transform: uppercase; color: #000;">${store.nameAr || store.nameEn}</div>
          <div style="font-size: 10px; color: #666; margin-top: 2px;">${isAr ? "فاتورة طلب لقمة الذكية" : "Logma Smart Kitchen Ticket"}</div>
        </div>
      `;
    }

    // Notes portion
    let notesHtml = "";
    if (selectedOrderToPrint.notes) {
      notesHtml = `
        <div style="border: 1px dashed #000; padding: 8px; border-radius: 6px; font-size: 11px; font-weight: bold; margin-bottom: 12px; color: #000; text-align: ${isAr ? 'right' : 'left'}; background: none;">
          ⚠️ * ${isAr ? "ملاحظات المطبخ والوجبة:" : "Notes / Prep Instructions:"} ${selectedOrderToPrint.notes}
        </div>
      `;
    }

    // Payment indicators
    let paymentHtml = "";
    if (printType !== "kitchen") {
      if (manuallyMarkedAsPaid) {
        paymentHtml = `
          <div style="text-align: center; margin: 12px 0; padding: 6px; border: 2px solid #000; font-family: monospace;">
            <div style="font-size: 11px; font-weight: bold; color: green; letter-spacing: 0.5px;">
              ★ ${isAr ? "فاتورة مدفوعة بالكامل" : "BILL PAID IN FULL"} ★
            </div>
            <div style="font-size: 9px; color: #555; margin-top: 2px;">
              ${isAr ? "طريقة التسوية: إلكتروني" : "Settled via Electronical POS Channel"} (${selectedOrderToPrint.paymentMethod})
            </div>
          </div>
        `;
      } else {
        paymentHtml = `
          <div style="text-align: center; margin: 12px 0; padding: 8px; border: 2px solid #000; font-family: monospace;">
            <div style="font-size: 11px; font-weight: bold; color: red;">
              ⚠️ ${isAr ? "الدفع عند الاستلام (كاش)" : "CASH ON DELIVERY (COD)"}
            </div>
            <div style="font-size: 9px; color: #555; margin-top: 2px;">
              ${isAr ? "يرجى تحصيل المبلغ من السائق عند التسليم" : "Collect exact cash upon delivery"}
            </div>
          </div>
        `;
      }
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          body {
            margin: 0;
            padding: 8px;
            font-family: 'Courier New', Courier, monospace, 'Arial', sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            box-sizing: border-box;
          }
          .receipt-container {
            width: ${receiptPaperWidth === "80mm" ? "260px" : "180px"};
            margin: 0 auto;
          }
          @media print {
            body {
              padding: 4px;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          ${logoHtml}
          
          <div style="text-align: center; font-weight: bold; font-size: 13px; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 8px;">
            ${printType === "kitchen" 
              ? (isAr ? "👨‍🍳 تـذكـــرة الـمـطـبـــخ 👨‍🍳" : "👨‍🍳 KITCHEN PREPARATION 👨‍🍳")
              : (isAr ? "وصـــــل بـيــــع" : "SALE RECEIPT")}
          </div>
          
          <div style="font-family: monospace; font-size: 11px; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 6px; direction: ${isAr ? 'rtl' : 'ltr'};">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>${isAr ? "رقم الفاتورة:" : "Invoice #:"}</span>
              <span style="font-weight: bold;">${selectedOrderToPrint.invoiceNumber || selectedOrderToPrint.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>${isAr ? "التاريخ والوقت:" : "Date & Time:"}</span>
              <span>${new Date(selectedOrderToPrint.createdAt || Date.now()).toLocaleString("en-GB", { hour12: false })}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>${isAr ? "العميل:" : "Client:"}</span>
              <span style="font-weight: bold;">${selectedOrderToPrint.customerName}</span>
            </div>
            ${selectedOrderToPrint.customerPhone ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>${isAr ? "رقم الجوال:" : "Phone:"}</span>
                <span>${selectedOrderToPrint.customerPhone}</span>
              </div>
            ` : ""}
            ${selectedOrderToPrint.customerAddress ? `
              <div style="text-align: ${isAr ? 'right' : 'left'}; margin-top: 4px;">
                <span style="color: #666; font-size: 10px; display: block;">${isAr ? "العنوان والتوصيل:" : "Delivery Address:"}</span>
                <span style="font-weight: bold;">${selectedOrderToPrint.customerAddress}</span>
              </div>
            ` : ""}
          </div>
          
          ${notesHtml}
          
          <div style="margin-bottom: 12px; direction: ${isAr ? 'rtl' : 'ltr'};">
            <div style="display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px dotted #000; padding-bottom: 3px; font-size: 11px;">
              <span>${isAr ? "المادة" : "Item"}</span>
              ${printType !== "kitchen" ? `<span>${isAr ? "المجموع" : "Total"}</span>` : ""}
            </div>
            ${itemsHtml}
          </div>
          
          ${financialHtml}
          
          ${paymentHtml}
          
          <div style="text-align: center; font-size: 10px; color: #333; margin-top: 8px; border-top: 1px dotted #ccc; padding-top: 8px;">
            <div style="font-weight: bold;">${customReceiptFooter}</div>
            <div style="font-size: 9px; color: #777; margin-top: 4px; font-family: monospace;">${isAr ? "نظام لقمة السحابي 2026 SaaS" : "Logma Cloud SaaS Engine 2026"}</div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              try {
                window.print();
              } catch (e) {
                console.error(e);
              }
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();
  };

  const renderReceiptContent = (order: Order) => {
    return (
      <>
        {/* Receipt Header logo placeholder */}
        {showLogoInReceipt && (
          <div className="text-center space-y-1 mb-3">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center mx-auto text-lg">
              🖨️
            </div>
            <div className="text-xs font-bold uppercase">{store.nameAr || store.nameEn}</div>
            <div className="text-[10px] text-slate-500">{isAr ? "فاتورة طلب لقمة الذكية" : "Logma Smart Client Bill"}</div>
          </div>
        )}

        {/* Receipt title info */}
        <div className="text-center font-bold text-sm border-b border-dashed border-slate-300 pb-2 mb-2">
          {printType === "kitchen" 
            ? (isAr ? "👨‍🍳 تـذكـــرة الـمـطـبـــخ 👨‍🍳" : "👨‍🍳 KITCHEN PREPARATION 👨‍🍳")
            : (isAr ? "وصـــــل بـيــــع" : "SALE RECEIPT")}
        </div>

        <div className="space-y-1 text-[11px] font-mono pb-2 mb-2 border-b border-dashed border-slate-300 text-left" style={{ direction: isAr ? "rtl" : "ltr" }}>
          <div className="flex justify-between">
            <span>{isAr ? "رقم الفاتورة:" : "Invoice #:"}</span>
            <span className="font-bold">{order.invoiceNumber || order.id.substring(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>{isAr ? "التاريخ والوقت:" : "Date & Time:"}</span>
            <span>{new Date(order.createdAt || Date.now()).toLocaleString("en-GB", { hour12: false })}</span>
          </div>
          <div className="flex justify-between">
            <span>{isAr ? "العميل:" : "Client:"}</span>
            <strong>{order.customerName}</strong>
          </div>
          {order.customerPhone && (
            <div className="flex justify-between">
              <span>{isAr ? "رقم الجوال:" : "Phone:"}</span>
              <span>{order.customerPhone}</span>
            </div>
          )}
          {order.customerAddress && (
            <div className="text-right">
              <span className="block text-slate-500 text-[10px]">{isAr ? "العنوان والموقع والتسليم:" : "Delivery destination:"}</span>
              <span className="font-semibold">{order.customerAddress}</span>
            </div>
          )}
          {order.notes && (
            <div className="border border-dashed border-slate-300 p-2 rounded-xl text-xs text-slate-800 font-mono italic font-bold bg-transparent">
              ⚠️ * {isAr ? "ملاحظات المطبخ والوجبة:" : "Notes / Prep Instructions:"} {order.notes}
            </div>
          )}
        </div>

        {/* Items grid */}
        <div className="space-y-1 text-[11px] mb-3 text-left" style={{ direction: isAr ? "rtl" : "ltr" }}>
          <div className="flex justify-between font-bold border-b border-dotted border-slate-300 pb-1">
            <span>{isAr ? "المادة" : "Item"}</span>
            {printType !== "kitchen" && <span>{isAr ? "المجموع" : "Total"}</span>}
          </div>
          
          {order.items.map((it, idx) => {
            return (
              <div key={idx} className="space-y-0.5 border-b border-dotted border-slate-200/60 pb-1.5 pt-1 text-xs font-bold">
                <div className="flex justify-between">
                  <span className="text-sm font-black text-slate-900">{it.quantity}x {isAr ? it.product.nameAr : it.product.nameEn}</span>
                  {printType !== "kitchen" && <span className="text-slate-705">{formatSYP(it.product.priceSYP * it.quantity)}</span>}
                </div>
                {(it.selectedExtras || []).length > 0 && (
                  <div className="pr-3 text-[10px] text-slate-500 space-y-0.5 font-normal">
                    {it.selectedExtras.map((ex, exIdx) => (
                      <div key={exIdx} className="flex justify-between">
                        <span>+ {isAr ? ex.nameAr : ex.nameEn}</span>
                        {printType !== "kitchen" && <span>{formatSYP(ex.priceSYP)}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Financial breakdown */}
        {printType !== "kitchen" ? (
          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2 mb-3 font-mono text-left" style={{ direction: isAr ? "rtl" : "ltr" }}>
            <div className="flex justify-between">
              <span>{isAr ? "المجموع الفرعي:" : "Subtotal:"}</span>
              <span>{formatSYP(order.subtotalSYP)}</span>
            </div>
            {order.discountSYP > 0 && (
              <div className="flex justify-between text-red-600">
                <span>{isAr ? "حسم ترويجي:" : "Discount:"}</span>
                <span>-{formatSYP(order.discountSYP)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{isAr ? "أجور التوصيل والخدمة:" : "Delivery fee:"}</span>
              <span>+{formatSYP(order.deliveryFeeSYP)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-black pt-1.5 border-t border-dotted border-slate-300">
              <span>{isAr ? "الصافي المستحق:" : "Net total:"}</span>
              <span>{formatSYP(order.totalSYP)}</span>
            </div>
          </div>
        ) : (
          <div className="text-center my-3 py-2 border border-dashed border-red-300 font-mono text-[10px] text-red-700 bg-transparent">
            * {isAr ? "تذكرة عمل المطبخ - لا تعرض تفاصيل مالية" : "KITCHEN PREP COPY - NO FINANCIAL VALUE"} *
          </div>
        )}

        {/* Payment Status (حالة الدفع) */}
        {printType !== "kitchen" && (
          <div className="text-center my-4 py-2 border-2 border-black/80 font-mono space-y-1">
            {manuallyMarkedAsPaid ? (
              <>
                <div className="text-xs font-black text-emerald-800 tracking-wider">
                  {"★ " + (isAr ? "فاتورة مدفوعة بالكامل" : "BILL PAID IN FULL") + " ★"}
                </div>
                <div className="text-[9px] text-slate-500 uppercase">
                  {isAr ? "طريقة التسوية: إلكتروني" : "Settled via Electronical POS Channel"} ({order.paymentMethod})
                </div>
              </>
            ) : (
              <>
                <div className="text-xs font-black text-rose-800 tracking-wider">
                  {"⚠️ " + (isAr ? "الدفع عند الاستلام (كاش)" : "CASH ON DELIVERY (COD)")}
                </div>
                <div className="text-[9px] text-slate-500 uppercase">
                  {isAr ? "يرجى تحصيل المبلغ من السائق عند التسليم" : "Collect exact cash upon delivery"}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer text */}
        <div className="text-center text-[10px] text-slate-500 space-y-1 pt-2">
          <div className="font-bold border-t border-dotted border-slate-300 pt-2">{customReceiptFooter}</div>
          <div className="text-[9px] text-slate-400 font-mono">{isAr ? "نظام لقمة السحابي 2026 SaaS" : "Logma Cloud SaaS Engine 2026"}</div>
        </div>
      </>
    );
  };

  // Trigger simulated POS thermal bill print
  const handleSimulatePrint = (order: Order) => {
    setPrintSuccessMessage(isAr ? `🖨️ جاري طباعة الفاتورة ${order.id} عبر الطابعة ${store.printerIp || "192.168.1.100"}...` : `🖨️ Printing invoice ${order.id} on thermal printer ${store.printerIp}...`);
    setTimeout(() => {
      setPrintSuccessMessage(isAr ? `✓ تم الطباعة والتوجيه للمطبخ بنجاح (المجموع: ${formatSYP(order.totalSYP)})` : `✓ Bill printed & dispatched successfully (Total: ${formatSYP(order.totalSYP)})`);
      setTimeout(() => setPrintSuccessMessage(""), 3500);
    }, 1500);
  };

  // Edit product popup trigger
  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      descAr: p.descAr,
      descEn: p.descEn,
      category: p.category,
      priceSYP: p.priceSYP,
      image: p.image,
      inStock: p.inStock,
      extrasText: JSON.stringify(p.extras),
    });
    setFormErr("");
    setShowProductModal(true);
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm({
      nameAr: "",
      nameEn: "",
      descAr: "",
      descEn: "",
      category: "الوجبات الرئيسية",
      priceSYP: 25000,
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
      inStock: true,
      extrasText: "[]",
    });
    setFormErr("");
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr("");

    let parsedExtras: Extra[] = [];
    try {
      if (productForm.extrasText) {
        parsedExtras = JSON.parse(productForm.extrasText);
      }
    } catch (err) {
      setFormErr(isAr ? "صيغة حقل الإضافات غير صحيحة، يجب أن تكون على شكل JSON مصفوفة" : "Extras field format is invalid. Must be correct JSON array.");
      return;
    }

    try {
      await onAddOrEditProduct({
        id: editingProduct ? editingProduct.id : undefined,
        storeId: store.id,
        nameAr: productForm.nameAr,
        nameEn: productForm.nameEn,
        descAr: productForm.descAr,
        descEn: productForm.descEn,
        category: productForm.category,
        priceSYP: Number(productForm.priceSYP),
        image: productForm.image,
        inStock: productForm.inStock,
        extras: parsedExtras,
      });
      setShowProductModal(false);
    } catch (err: any) {
      setFormErr(err.message || "فشلت العملية");
    }
  };

  // Gemini API functions proxy calls
  const handleTranslateMeal = async () => {
    if (!aiInputArText) return;
    setAiTranslating(true);
    try {
      const response = await fetch("/api/gemini/translate-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textAr: aiInputArText }),
      });
      const data = await response.json();
      setAiTranslatedText(data.translatedText || "Failed translation fallback");
    } catch (err) {
      setAiTranslatedText(aiInputArText + " Styled Meal");
    } finally {
      setAiTranslating(false);
    }
  };

  const handleGenerateDescriptions = async () => {
    if (!aiMealNameAr && !aiMealNameEn) return;
    setAiGenerating(true);
    try {
      const response = await fetch("/api/gemini/generate-desc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "product",
          nameAr: aiMealNameAr,
          nameEn: aiMealNameEn,
          category: aiMealCat,
          ingredients: aiMealIngrid,
        }),
      });
      const data = await response.json();
      setAiGeneratedDescAr(data.descAr || "");
      setAiGeneratedDescEn(data.descEn || "");
    } catch (err) {
      setAiGeneratedDescAr("وجبة طيبة ولذيذة جداً.");
      setAiGeneratedDescEn("Extremely delicious and satisfying main dish.");
    } finally {
      setAiGenerating(false);
    }
  };

  // No longer blocking the owner from using the dashboard if not approved yet, we will show a top alert warning banner instead!

  if (store && store.isSuspended === true) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl border border-rose-100 shadow-xl p-8 space-y-6 text-center">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 text-3xl animate-bounce">
          🛑
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-rose-800">
            {isAr ? "تم تجميد حساب مطعمك مؤقتاً" : "Your Account Has Been Frozen"}
          </h2>
          <p className="text-slate-500 text-xs leading-relaxed">
            {isAr
              ? "نعتذر منك، لقد تم تجميد نشاط مطعمك مؤقتاً بموجب قرار من إدارة المنصة لتجاوز مشاكل الدفع أو مراجعة شروط الاستخدام. نظام الطلبات والصفحة التسويقية معطلة للعملاء حالياً."
              : "We apologize, but your trading capabilities are temporarily suspended by the platform administrator due to payment issues or usage violations."}
          </p>
        </div>

        <div className="bg-rose-50/50 rounded-2xl p-5 border border-rose-100 text-right text-xs space-y-2 font-sans">
          <div className="font-bold text-rose-800 pb-1 border-b border-rose-100">
            {isAr ? "تقرير حالة التجميد الإداري:" : "Suspension Report:"}
          </div>
          <div className="flex justify-between text-slate-700">
            <span className="text-slate-500">{isAr ? "المطعم الخاص بك:" : "Restaurant:"}</span>
            <span className="font-bold text-slate-800">{isAr ? store.nameAr : store.nameEn}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span className="text-slate-500">{isAr ? "السبب المتوقع:" : "Reason:"}</span>
            <span className="font-bold text-rose-700">{isAr ? "التحقق المالي من المعاملة أو عدم مطابقة الدفع" : "Financial check or terms violation"}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span className="text-slate-500">{isAr ? "رابط متجرك:" : "Your Store Slug:"}</span>
            <span className="font-mono text-slate-800">{store.id}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-center gap-3">
          <a
            href={`https://wa.me/963911222333?text=${encodeURIComponent(
              isAr
                ? `مرحباً، تم تجميد صفحة مطعمي: ${store.nameAr}. يرجى مساعدتي في مراجعة وتفعيل الحساب وتجاوز المشكلة.`
                : `Hello, my restaurant ${store.nameAr} on Logma was frozen. Please help me reactivate.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <MessageSquare size={16} />
            {isAr ? "تواصل مع مدير الدفع والتحقق لإزالة التجميد" : "Contact Finance Admin"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {store && store.isApproved === false && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-3xl p-5 md:p-6 text-xs space-y-3 shadow-xs font-sans text-right relative overflow-hidden animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="text-xl shrink-0 mt-0.5">⏳</span>
              <div className="space-y-1">
                <h4 className="font-bold text-amber-900 dark:text-amber-300 text-sm">
                  {isAr ? "⚠️ حسابك قيد التدقيق الإداري والمالي" : "⚠️ Your account is under administrative review"}
                </h4>
                <p className="text-amber-800 dark:text-amber-400 text-[11px] leading-relaxed">
                  {isAr
                    ? "أهلاً بك! تم تسجيل حسابك ومتجرك بنجاح. هو غير منشور للعامة حالياً وبانتظار تأكيد الإدارة بعد الدفع، ولكن يمكنك البدء بالتحكم التام مجاناً وتصميم قائمتك وإضافة منتجات جديدة أو فحص إرسال الطلبات للتجربة!"
                    : "Welcome! Your store was successfully registered. It is hidden from the public directories until payment verification, but you can fully customize your menu, add products, adjust pricing, and simulate orders!"}
                </p>
              </div>
            </div>
            
            <a
              href={`https://wa.me/963911222333?text=${encodeURIComponent(
                isAr
                  ? `مرحباً، لقد قمت بالتسجيل في باقة لقمة برقم عملية ${store.paymentReference || "تجريبية"}. يرجى تفعيل مطبخي: ${store.nameAr}`
                  : `Hello, registered store under reference ${store.paymentReference || "trial"}, please approve outlet ID: ${store.id}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-xl text-[11px] flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs"
            >
              <MessageSquare size={14} />
              {isAr ? "تواصل للتفعيل السريع" : "WhatsApp Admin"}
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200/55 dark:border-amber-900/20 text-[10px] text-amber-800 dark:text-amber-400">
            <div>
              <span className="text-amber-600 dark:text-amber-500 opacity-75 block">{isAr ? "المطعم الخاص بك" : "Your Restaurant"}:</span>
              <strong className="font-bold text-slate-800 dark:text-slate-200">{isAr ? store.nameAr : store.nameEn}</strong>
            </div>
            <div>
              <span className="text-amber-600 dark:text-amber-500 opacity-75 block">{isAr ? "باقة الاشتراك" : "Subscription Plan"}:</span>
              <strong className="font-bold text-slate-800 dark:text-slate-200">
                {store.plan === "Gold" ? (
                  isAr 
                    ? `👑 الذهبية (${store.subscriptionType === "annual" ? "سنوية" : `شهرية - ${store.subscriptionMonths || 1} ش`})` 
                    : `Gold (${store.subscriptionType === "annual" ? "Annual" : `${store.subscriptionMonths || 1} Mo`})`
                ) : (
                  isAr ? "العادية المجانية" : "Free Plan"
                )}
              </strong>
            </div>
            <div>
              <span className="text-amber-600 dark:text-amber-500 opacity-75 block">{isAr ? "رقم عملية الحوالة" : "Payment Ref"}:</span>
              <strong className="font-mono font-bold text-slate-800 dark:text-slate-200">{store.paymentReference || "N/A"}</strong>
            </div>
            <div>
              <span className="text-amber-600 dark:text-amber-500 opacity-75 block">{isAr ? "حالة النشر العام" : "Publishing Status"}:</span>
              <span className="font-bold text-rose-600">🚨 {isAr ? "قيد التدقيق (غير مرئي للجمهور)" : "Under review (Invisible to public)"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mini Title bar with status */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
            <img
              referrerPolicy="no-referrer"
              src={store.logo}
              alt={store.nameAr}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-slate-800 text-base">{isAr ? store.nameAr : store.nameEn}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${store.plan === "Gold" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                {store.plan === "Gold" ? (isAr ? "👑 باقة غولد نشطة" : "👑 Gold plan active") : (isAr ? "باقة تجريبية" : "Trial status")}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-light">{isAr ? "رابطك المخصص للتسويق" : "Your unique marketing URL"} : <strong>{store.id}.logma.sy</strong></p>
          </div>
        </div>

        {/* Action Toggle store open / close */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateStore({ isOpen: !store.isOpen })}
            className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
              store.isOpen
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {store.isOpen ? (isAr ? "● مطعمك مفتوح الآن" : "● Store Open") : (isAr ? "○ مطعمك مغلق حالياً" : "○ Store Closed")}
          </button>
        </div>
      </div>

      {/* Internal Owner Navigation tabs */}
      <div className="bg-slate-100 p-1 rounded-xl flex max-w-lg border border-slate-200">
        {[
          { id: "orders", labelAr: "الطلبات الواردة", labelEn: "Incoming Orders" },
          { id: "products", labelAr: "المأكولات والتعديلات", labelEn: "Meal Catalog" },
          { id: "marketing", labelAr: "أدوات الذكاء الاصطناعي الـ AI", labelEn: "Gemini AI Suite" },
          { id: "settings", labelAr: "الملف الشخصي والحساب", labelEn: "Profile & Account" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === tab.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {isAr ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Print Simulator notification feedback */}
      {printSuccessMessage && (
        <div className="bg-indigo-50 text-indigo-800 p-4 rounded-2xl border border-indigo-100 text-xs animate-bounce font-bold">
          {printSuccessMessage}
        </div>
      )}

      {/* TABS PAGES */}

      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200/50">
            <h3 className="font-bold text-slate-800 text-sm">
              {isAr ? "لوحة الطلبات السحابية للمطعم" : "SaaS Live Kitchen Orders"}
            </h3>
            <span className="text-slate-400 text-xs">{(orders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length)} {isAr ? "قيد المعالجة" : "pending/active orders"}</span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-400 text-xs">
              {isAr ? "لم تستقبل أي طلب شحن للوجبات بعد." : "No orders received yet for this store."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <div>
                        <span className="font-bold text-slate-800 font-mono text-xs">{ord.id}</span>
                        <span className="text-[10px] text-slate-400 block">{new Date(ord.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          ord.status === "pending"
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : ord.status === "accepted" || ord.status === "preparing"
                            ? "bg-slate-100 text-slate-700"
                            : ord.status === "delivering"
                            ? "bg-indigo-50 text-indigo-700"
                            : ord.status === "delivered"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>

                    {/* Customer metrics */}
                    <div className="text-xs space-y-1">
                      <div>
                        <strong>{isAr ? "العميل" : "Customer"}:</strong> {ord.customerName} ({ord.customerPhone})
                      </div>
                      <div>
                        <strong>{isAr ? "العنوان" : "Physical Landmarks"}:</strong> {ord.customerAddress}
                      </div>
                      {ord.notes && (
                        <div className="bg-slate-50 text-slate-500 p-2 rounded-lg text-[11px] border border-slate-200/50">
                          <strong>{isAr ? "ملاحظة العميل" : "Buyer notes"}:</strong> {ord.notes}
                        </div>
                      )}
                    </div>

                    {/* Food list ordered */}
                    <div className="space-y-1.5 border-t border-b border-dashed border-slate-100 py-3 text-xs">
                      {ord.items.map((it, i) => (
                        <div key={i} className="flex justify-between">
                          <span>
                            {it.quantity}x {isAr ? it.product.nameAr : it.product.nameEn}
                          </span>
                          <span className="text-slate-500 font-mono">{formatSYP(it.product.priceSYP * it.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between text-xs font-bold text-slate-800 pb-2">
                      <span>{isAr ? "طريقة الدفع" : "Wallet payload"}</span>
                      <span className="text-indigo-600 font-bold uppercase">{ord.paymentMethod}</span>
                    </div>

                    <div className="flex justify-between text-base font-black text-slate-800">
                      <span>{isAr ? "المجموع الكلي" : "Gross Total"}</span>
                      <span className="text-emerald-700">{formatSYP(ord.totalSYP)}</span>
                    </div>
                  </div>

                  {/* Actions Transition order state */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedOrderToPrint(ord);
                          setPrintType("kitchen");
                          setManuallyMarkedAsPaid(ord.paymentMethod !== "cash" || ord.status === "delivered");
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                      >
                        <Printer size={14} />
                        {isAr ? "طباعة تذاكر المطبخ" : "Kitchen Bill"}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedOrderToPrint(ord);
                          setPrintType("customer");
                          setManuallyMarkedAsPaid(ord.paymentMethod !== "cash" || ord.status === "delivered");
                        }}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-150/40 px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-all"
                      >
                        <Printer size={14} className="text-emerald-600" />
                        {isAr ? "طباعة فاتورة الزبون" : "Print Customer Bill"}
                      </button>
                    </div>

                    <div className="flex gap-1.5">
                      {ord.status === "pending" && (
                        <button
                          onClick={() => onUpdateOrderStatus(ord.id, "accepted")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs cursor-pointer"
                        >
                          {isAr ? "قبول وتثبيت" : "Accept"}
                        </button>
                      )}
                      {ord.status === "accepted" && (
                        <button
                          onClick={() => onUpdateOrderStatus(ord.id, "preparing")}
                          className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2 rounded-xl text-xs cursor-pointer"
                        >
                          {isAr ? "بدء المطبخ" : "Start Cooking"}
                        </button>
                      )}
                      {ord.status === "preparing" && (
                        <button
                          onClick={() => onUpdateOrderStatus(ord.id, "delivering")}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-xl text-xs cursor-pointer animate-pulse"
                        >
                          {isAr ? "توجيه سائق التوصيل" : "Dispatch Driver"}
                        </button>
                      )}
                      {ord.status === "delivering" && (
                        <button
                          onClick={() => onUpdateOrderStatus(ord.id, "delivered")}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-2 rounded-xl text-xs cursor-pointer"
                        >
                          {isAr ? "تم التسليم" : "Mark Delivered"}
                        </button>
                      )}

                      {ord.status !== "delivered" && ord.status !== "cancelled" && (
                        <button
                          onClick={() => onUpdateOrderStatus(ord.id, "cancelled")}
                          className="text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 px-2 py-1.5 rounded-xl text-xs cursor-pointer"
                        >
                          {isAr ? "إلغاء الحجز" : "Cancel"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">
              {isAr ? "قائمة الوجبات والمنتجات بالمطعم" : "Your Menu Items Catalog"}
            </h3>
            
            <button
              onClick={openNewProduct}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              {isAr ? "أضف وجبة جديدة" : "Add Meal Option"}
            </button>
          </div>

          {/* Warning Free tier counts */}
          {store.plan === "Free" && (
            <div className="bg-amber-50 text-amber-800 rounded-2xl border border-amber-200/50 p-4 text-xs space-y-2">
              <div className="font-bold">⚠️ {isAr ? "أنت مشترك بالباقة المجانية (حد أقصى 10 وجبات)" : "Free Trial limit is 10 meals"}</div>
              <p>{isAr ? "لقد استهلكت بعض المنتجات. قم بترقية حزمة SaaS للذهبية للاستفادة من وجبات غير محدودة ومساعد الذكاء الاصطناعي." : "Upgrade to the Gold plan for unlimited products, automated description generators, and printed logos."}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex gap-4 justify-between items-start"
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                    <img
                      referrerPolicy="no-referrer"
                      src={p.image}
                      alt={p.nameAr}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-sm">{isAr ? p.nameAr : p.nameEn}</h4>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">{p.category}</span>
                    <div className="text-emerald-700 font-black text-xs pt-1">{formatSYP(p.priceSYP)}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onAddOrEditProduct({ id: p.id, inStock: !p.inStock })}
                      className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${
                        p.inStock
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}
                    >
                      {p.inStock ? (isAr ? "متوفر" : "In Stock") : (isAr ? "غير متوفر" : "Out of stock")}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditProduct(p)}
                      className="p-1.5 rounded-lg hover:bg-slate-50 border border-slate-200 text-slate-600 cursor-pointer"
                      title="Edit Item"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(isAr ? "هل أنت متأكد من حذف هذه الوجبة؟" : "Delete this meal?")) {
                          onDeleteProduct(p.id);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-50 border border-rose-100 text-rose-500 cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "marketing" && (
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-250/40">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Sparkles className="text-amber-500" size={18} />
              {isAr ? "أدوات الذكاء الاصطناعي (مساعد لقمة الذكي - Gemini)" : "Gemini Intelligent AI Assistant"}
            </h3>
            <p className="text-xs text-slate-500">
              {isAr ? "استخدم خوادم الذكاء الاصطناعي من Google لتأليف نصوص للمأكولات بصورة آلية احترافية باللغتين." : "Automated copywriting and translating directly using the powerful server-side Gemini AI Integration."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tool 1: AI Translation */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
              <h4 className="font-bold text-xs text-slate-700 uppercase flex items-center gap-1">
                <Languages size={15} className="text-indigo-600" />
                {isAr ? "مترجم الوجبات للأنكليزية بذكاء" : "AI Multi-language Menu translator"}
              </h4>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500">{isAr ? "اكتب اسم الوجبة بالعربي" : "Insert Arabic title"}</label>
                <input
                  type="text"
                  placeholder="مثال: شاورما سوبر عربي جبن قشقوان"
                  value={aiInputArText}
                  onChange={(e) => setAiInputArText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700"
                />
              </div>

              <button
                onClick={handleTranslateMeal}
                disabled={aiTranslating || !aiInputArText}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                {aiTranslating ? <RefreshCw className="animate-spin" size={12} /> : <Sparkles size={12} />}
                {isAr ? "ترجم الآن بالـ AI" : "Translate Title via AI"}
              </button>

              {aiTranslatedText && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="text-[10px] text-slate-400">{isAr ? "الترجمة المقترحة للمطورين" : "AI English Translation"}:</div>
                  <div className="font-bold text-slate-800">{aiTranslatedText}</div>
                </div>
              )}
            </div>

            {/* Tool 2: Copwriter description generator */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
              <h4 className="font-bold text-xs text-slate-700 uppercase flex items-center gap-1">
                <Sparkles size={15} className="text-amber-500" />
                {isAr ? "مؤلف الأوصاف المغري لشهية الزبون" : "Menu Delicacy Copwriting generator"}
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500">{isAr ? "اسم الوجبة عربي" : "Arabic Meal Title"}</label>
                  <input
                    type="text"
                    value={aiMealNameAr}
                    onChange={(e) => setAiMealNameAr(e.target.value)}
                    placeholder="سوبر لقمة"
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">{isAr ? "اسم الوجبة انكليزي" : "English Meal Title"}</label>
                  <input
                    type="text"
                    value={aiMealNameEn}
                    onChange={(e) => setAiMealNameEn(e.target.value)}
                    placeholder="Super Logma"
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg mt-1"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="text-[10px] text-slate-500">{isAr ? "المواد المستعملة (دجاج، جبنة، سماق...)" : "Ingredients / materials"}</label>
                <input
                  type="text"
                  value={aiMealIngrid}
                  onChange={(e) => setAiMealIngrid(e.target.value)}
                  placeholder="قشقوان حار، كريسبي دجاج صاج"
                  className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg mt-1"
                />
              </div>

              <button
                onClick={handleGenerateDescriptions}
                disabled={aiGenerating || (!aiMealNameAr && !aiMealNameEn)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer shadow-sm shadow-amber-500/10"
              >
                {aiGenerating ? <RefreshCw className="animate-spin" size={12} /> : <Sparkles size={12} />}
                {isAr ? "تأليف الوصف العربي والإنكليزي" : "Generate appetite copy"}
              </button>

              {(aiGeneratedDescAr || aiGeneratedDescAr) && (
                <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs border border-slate-205">
                  <div>
                    <span className="font-bold text-[10px] tracking-wider text-slate-400">ARABIC:</span>
                    <p className="text-slate-800">{aiGeneratedDescAr}</p>
                  </div>
                  <div>
                    <span className="font-bold text-[10px] tracking-wider text-slate-400">ENGLISH:</span>
                    <p className="text-slate-800">{aiGeneratedDescEn}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* COMPLETE RESTAURANT DIGITAL PROFILE CARD & LOGOS GALLERY UPLOADS */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6 text-right">
            <h4 className="font-bold text-xs text-slate-700 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-3 justify-end">
              <span>الملف التعريفي الرقمي وشعار المطعم</span>
              <span className="text-indigo-500">🏢</span>
            </h4>

            {settingsSuccess && (
              <div className="bg-emerald-50 text-emerald-805 border border-emerald-150 p-2.5 rounded-xl text-xs font-bold text-center">
                ✓ {isAr ? "تم حفظ وتحديث تفاصيل وشعار المطعم بنجاح!" : "Store settings and branding saved successfully!"}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Store Name Arabic */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block text-right">{isAr ? "اسم المطعم باللغة العربية" : "Store Name (Arabic)"}</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.nameAr}
                    onChange={(e) => setSettingsForm({ ...settingsForm, nameAr: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl text-right"
                  />
                </div>
                {/* Store Name English */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block text-right">{isAr ? "اسم المطعم بالإنكليزية" : "Store Name (English)"}</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.nameEn}
                    onChange={(e) => setSettingsForm({ ...settingsForm, nameEn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl text-right font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Store Phone */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block text-right">{isAr ? "رقم الهاتف للتواصل" : "Store Phone number"}</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl text-right font-mono"
                  />
                </div>
                {/* Store Whatsapp */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block text-right">{isAr ? "رقم الواتساب بالرمز الدولي (مثال: +96390123456)" : "International Whatsapp"}</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.whatsapp}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl text-right font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Store Slogan Arabic */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block text-right">{isAr ? "شعار أو وصف المطعم بالعربية" : "Slogan/Description (Arabic)"}</label>
                  <input
                    type="text"
                    value={settingsForm.descAr}
                    onChange={(e) => setSettingsForm({ ...settingsForm, descAr: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl text-right"
                  />
                </div>
                {/* Store Slogan English */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block text-right">{isAr ? "شعار أو وصف المطعم بالإنكليزية" : "Slogan/Description (English)"}</label>
                  <input
                    type="text"
                    value={settingsForm.descEn}
                    onChange={(e) => setSettingsForm({ ...settingsForm, descEn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl text-right font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block text-right">{isAr ? "ساعات العمل الرسمية" : "Working Hours"}</label>
                <input
                  type="text"
                  value={settingsForm.workingHours}
                  onChange={(e) => setSettingsForm({ ...settingsForm, workingHours: e.target.value })}
                  placeholder="e.g. 10:00 AM - 12:00 PM"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl text-right"
                />
              </div>

              {/* BRAND IMAGE UPLOADS: LOGO AND BANNER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* 1. STORE LOGO UPLOADER */}
                <div className="space-y-2.5 text-right">
                  <span className="text-xs font-bold text-slate-700 block">
                    {isAr ? "تحميل شعار المطعم (Logo) من المعرض" : "Restaurant Logo Image (Square)"}
                  </span>
                  <div className="flex flex-col sm:flex-row-reverse gap-3 items-center">
                    {/* Logo click area */}
                    <div
                      onClick={() => settingsLogoFileInputRef.current?.click()}
                      className="w-24 h-24 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/25 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group shrink-0"
                    >
                      {logoUploading ? (
                        <RefreshCw className="animate-spin text-indigo-500" size={20} />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center text-slate-500">
                          <Upload size={18} className="text-indigo-600 group-hover:scale-110 transition-transform mb-1" />
                          <span className="text-[10px] font-bold text-indigo-700">{isAr ? "تحميل صورة" : "Choose File"}</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={settingsLogoFileInputRef}
                      id="settings-logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) compressAndSetSettingsImage(file, "logo");
                        e.target.value = "";
                      }}
                      className="hidden"
                    />

                    {/* Logo Preview */}
                    <div className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl flex items-center justify-between gap-3 w-full">
                      {settingsForm.logo ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs shrink-0">
                          <img
                            src={settingsForm.logo}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setSettingsForm({ ...settingsForm, logo: "" })}
                            className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 text-white font-extrabold text-[9px] flex items-center justify-center transition-opacity"
                          >
                            {isAr ? "حذف" : "Clear"}
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-[9px] text-slate-400 font-bold shrink-0">
                          No Logo
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 leading-normal text-right">
                        {isAr ? "شعار المطعم يظهر أعلى الفاتورة المطبوعة وفي قائمة العميل للتصفح والطلب." : "Logo displays on storefront layout & printed thermal receipts."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. STORE BANNER UPLOADER */}
                <div className="space-y-2.5 text-right">
                  <span className="text-xs font-bold text-slate-700 block">
                    {isAr ? "تحميل غلاف/خلفية المحل (Banner) من المعرض" : "Storefront Banner (Landscape)"}
                  </span>
                  <div className="flex flex-col sm:flex-row-reverse gap-3 items-center">
                    {/* Banner click area */}
                    <div
                      onClick={() => settingsBannerFileInputRef.current?.click()}
                      className="w-24 h-24 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/25 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group shrink-0"
                    >
                      {bannerUploading ? (
                        <RefreshCw className="animate-spin text-indigo-500" size={20} />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center text-slate-500">
                          <Upload size={18} className="text-indigo-600 group-hover:scale-110 transition-transform mb-1" />
                          <span className="text-[10px] font-bold text-indigo-700">{isAr ? "تحميل صورة" : "Choose File"}</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={settingsBannerFileInputRef}
                      id="settings-banner-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) compressAndSetSettingsImage(file, "banner");
                        e.target.value = "";
                      }}
                      className="hidden"
                    />

                    {/* Banner Preview */}
                    <div className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl flex items-center justify-between gap-3 w-full">
                      {settingsForm.banner ? (
                        <div className="relative w-20 h-14 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs shrink-0">
                          <img
                            src={settingsForm.banner}
                            alt="Banner preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setSettingsForm({ ...settingsForm, banner: "" })}
                            className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 text-white font-extrabold text-[9px] flex items-center justify-center transition-opacity"
                          >
                            {isAr ? "حذف" : "Clear"}
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-14 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-[9px] text-slate-400 font-bold shrink-0 text-center">
                          No Banner
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 leading-normal text-right">
                        {isAr ? "الغلاف هو الصورة الطولية الكبيرة خلف اسم المطعم في بروفايل العميل." : "Banner shows as hero image behind title in customer display view."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FORM ACTIONS */}
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={settingsSaving || logoUploading || bannerUploading}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/10"
                >
                  {settingsSaving ? (
                    <RefreshCw className="animate-spin" size={12} />
                  ) : (
                    <span>💾</span>
                  )}
                  {isAr ? "حفظ وتثبيت تفاصيل وشعار المطعم" : "Save Storefront Details & Logos"}
                </button>
              </div>
            </form>
          </div>

          {/* Subscription and Membership Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-bold text-xs text-slate-700 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <span className="text-amber-500">👑</span>
              {isAr ? "إدارة اشتراك منفذ لقمة" : "Manage Logma Subscription Plan"}
            </h4>

            {store.plan === "Gold" ? (
              <div className="bg-amber-50/30 border border-amber-200/50 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-amber-800 font-extrabold text-sm flex items-center gap-1">
                      <span>👑</span>
                      <span>{isAr ? "أنت في الباقة الذهبية المميزة لقمة ساس" : "Active Gold Standard Subscription"}</span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {isAr ? "مطعمك يستمتع بكافة الميزات غير المحدودة والدعم المستمر." : "Your restaurant enjoys all premium capabilities and priority updates."}
                    </p>
                  </div>
                  <span className="bg-amber-600 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                    {isAr ? "نشط" : "Active"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
                  <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] uppercase font-sans block">{isAr ? "صلاحية الاشتراك" : "Expires On"}:</span>
                    <span className="font-bold text-slate-800">{store.subscriptionExpires}</span>
                  </div>
                  <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] uppercase font-sans block">{isAr ? "نوع الباقة المعطاة" : "Subscription Plan"}:</span>
                    <span className="font-bold text-amber-700">
                      {store.subscriptionType === "annual" 
                        ? (isAr ? "💎 سنوي (12 شهر)" : "💎 Annual (12 mo)")
                        : (isAr ? `📅 شهري (${store.subscriptionMonths || 1} شهر)` : `📅 Monthly (${store.subscriptionMonths || 1} mo)`)}
                    </span>
                  </div>
                  <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] uppercase font-sans block">{isAr ? "الحد الأقصى للوجبات" : "Menu Capacity"}:</span>
                    <span className="font-bold text-emerald-600">{isAr ? "غير محدود" : "Unlimited"}</span>
                  </div>
                  <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-100 font-sans">
                    <span className="text-slate-400 text-[10px] uppercase block">{isAr ? "تتبع الـ GPS للفواتير" : "GPS Delivery tracking"}:</span>
                    <span className="font-bold text-indigo-600">{isAr ? "مفعّل" : "Enabled"}</span>
                  </div>
                </div>
              </div>
            ) : store.requestedUpgrade ? (
              <div className="bg-indigo-50/30 border border-indigo-200/50 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-800">
                  <RefreshCw className="animate-spin text-indigo-600" size={16} />
                  <span className="font-bold text-sm">
                    {isAr ? "طلب الترقية للباقة الذهبية قيد المعالجة الإدارية والتأكيد" : "Gold Upgrade Ticket Pending Verification"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed text-right">
                  {isAr ? (
                    <>
                      تم إرسال مستندات التحويل المالي الخاصة بك بنجاح. بمجرد قيام مدير منصة لقمة بمطابقة رمز التحويل{" "}
                      <strong className="text-slate-900 font-mono">({store.pendingPaymentReference})</strong> مع كشف حساب{" "}
                      <strong>
                        {store.pendingPaymentMethod === "syriatel_cash" && "سيريتل كاش"}
                        {store.pendingPaymentMethod === "mtn_cash" && "إم تي إن كاش"}
                        {store.pendingPaymentMethod === "alharam_transfer" && "حوالة هرم / فؤاد"}
                        {store.pendingPaymentMethod === "bank_transfer" && "رمز البنك المصرفي"}
                      </strong>{" "}
                      لباقة قيمة{" "}
                      <strong className="text-indigo-700">
                        {store.pendingUpgradeMonths === 12
                          ? "12 شهراً (اشتراك سنوي)"
                          : `${store.pendingUpgradeMonths || 1} شهراً (اشتراك شهري)`}
                      </strong>
                      ، سيتم تفعيل حسابك مباشرة.
                    </>
                  ) : (
                    <>
                      Financial documents are successfully transmitted. Once platform admin matches transfer reference{" "}
                      <strong className="text-slate-900 font-mono">({store.pendingPaymentReference})</strong> on{" "}
                      <strong>{store.pendingPaymentMethod?.toUpperCase()}</strong> for{" "}
                      <strong>
                        {store.pendingUpgradeMonths === 12
                          ? "12 Months (Annual)"
                          : `${store.pendingUpgradeMonths || 1} Months (Monthly)`}
                      </strong>
                      , your subscription is upgraded.
                    </>
                  )}
                </p>
                <div className="flex gap-2 pt-1 justify-end">
                  <a
                    href={`https://wa.me/963911222333?text=${encodeURIComponent(
                      isAr
                        ? `مرحباً، لقد أرسلت طلباً للترقية الذهبية لمتجري ${store.nameAr} لباقة ${
                            store.pendingUpgradeMonths === 12 ? "12 شهر سنوية" : `${store.pendingUpgradeMonths || 1} أشهر`
                          } برقم عملية ${store.pendingPaymentReference}. يرجى التفعيل.`
                        : `Hi, sent upgrade request for store ${store.nameAr} (${
                            store.pendingUpgradeMonths === 12 ? "12 Months" : `${store.pendingUpgradeMonths || 1} Months`
                          }), reference ID ${store.pendingPaymentReference}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <MessageSquare size={14} />
                    {isAr ? "استعجل تفعيل الترقية عبر واتس آب" : "Urge Admin Activation via WhatsApp"}
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="space-y-1 text-right">
                  <span className="text-slate-800 font-bold text-xs flex items-center gap-1 justify-end">
                    <span>💡</span>
                    <span>{isAr ? "أنت مشترك في الباقة التجريبية المجانية" : "You are currently on the Free Trial"}</span>
                  </span>
                  <p className="text-slate-500 text-[11px] leading-relaxed text-slate-600 text-right">
                    {isAr
                      ? "الحسابات المجانية محدودة بـ 10 وجبات كحد أقصى في قائمة الطعام، وبدون تخصيص تتبع السائقين GPS المباشر للزبائن. قم بالترقية الآن واستمتع بمبيعات غير محدودة!"
                      : "Free Trial accounts are restricted to 10 menu items and lack live GPS driver simulation tracking for clients. Go premium now!"}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 block text-right">
                    {isAr ? "🎯 اختر نوع وطول الفئة المرغوبة:" : "Choose Subscription Package Length:"}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {[
                      { type: "monthly", months: 1, labelAr: "شهري (شهر واحد)", labelEn: "1 Month (Monthly)", cost: "5 USD", syp: "~72,500 ل.س" },
                      { type: "monthly", months: 3, labelAr: "ربع سنوي (3 أشهر)", labelEn: "3 Months", cost: "15 USD", syp: "~217,500 ل.س" },
                      { type: "monthly", months: 6, labelAr: "نصف سنوي (6 أشهر)", labelEn: "6 Months", cost: "30 USD", syp: "~435,000 ل.س" },
                      { type: "annual", months: 12, labelAr: "سنوي مميز (12 شهر)", labelEn: "12 Months (Annual)", cost: "50 USD 🎁", syp: "~725,000 ل.س", badge: isAr ? "توفير شهرين!" : "2 Months Free!" },
                    ].map((pkg) => {
                      const isSelected = upgradeType === pkg.type && upgradeMonths === pkg.months;
                      return (
                        <button
                          key={`${pkg.type}-${pkg.months}`}
                          type="button"
                          onClick={() => {
                            setUpgradeType(pkg.type as "monthly" | "annual");
                            setUpgradeMonths(pkg.months);
                          }}
                          className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between h-24 cursor-pointer relative ${
                            isSelected
                              ? "border-amber-500 bg-amber-50/40 shadow-xs ring-1 ring-amber-500"
                              : "border-slate-200 bg-white hover:border-slate-350"
                          }`}
                        >
                          {pkg.badge && (
                            <span className="absolute top-1.5 left-1.5 bg-rose-500 text-white font-black text-[7px] px-1 rounded-sm uppercase tracking-tight">
                              {pkg.badge}
                            </span>
                          )}
                          <div className="text-[11px] font-bold text-slate-800">
                            {isAr ? pkg.labelAr : pkg.labelEn}
                          </div>
                          <div className="mt-1">
                            <div className="text-xs font-black text-amber-700">{pkg.cost}</div>
                            <div className="text-[9px] text-slate-400 font-mono">{pkg.syp}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50/50 border border-amber-200/50 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-amber-800 text-right">
                    💳 {isAr ? "مستندات وتفاصيل الدفع المطلوبة للحوالة المالية:" : "Payment Instructions for your upgrade choice:"}
                  </div>
                  <p className="text-[11px] text-slate-700 text-right">
                    {isAr ? (
                      <>
                        لقد اخترت باقة بقيمة{" "}
                        <strong className="text-slate-900 font-bold">
                          {upgradeMonths === 12 ? "50 USD (~725,000 ل.س)" : `${upgradeMonths * 5} USD (~${(upgradeMonths * 72500).toLocaleString()} ل.س)`}
                        </strong>
                        . يرجى تحويل كامل المبلغ عبر إحدى قنوات الدفع التالية:
                      </>
                    ) : (
                      <>
                        Selected Package value is{" "}
                        <strong className="text-slate-900 font-bold">
                          {upgradeMonths === 12 ? "50 USD (~725,000 SYP)" : `${upgradeMonths * 5} USD (~${(upgradeMonths * 72500).toLocaleString()} SYP)`}
                        </strong>
                        . Transfer to one of our payment keys:
                      </>
                    )}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-slate-700 pt-1 text-right">
                    <div>• 📱 <span className="font-bold">سيريتل كاش:</span> 0933111222</div>
                    <div>• 📱 <span className="font-bold">إم تي إن كاش:</span> 0944999888</div>
                    <div>• 🏛️ <span className="font-bold">حوالة هرم / فؤاد:</span> المستفيد "عماد الدين أحمد - دمشق"</div>
                    <div>• 🏛️ <span className="font-bold">حساب بنك بيمو:</span> 01020304050</div>
                  </div>
                </div>

                {upgradeError && (
                  <div className="bg-rose-50 text-rose-800 border border-rose-100 p-2 text-[10px] rounded-lg">
                    {upgradeError}
                  </div>
                )}

                <form onSubmit={handleRequestUpgrade} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">{isAr ? "مدة الاشتراك المطلوبة" : "Requested Plan Duration"}</label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setUpgradeType("monthly");
                            setUpgradeMonths(1);
                          }}
                          className={`p-2 rounded-xl border font-bold ${
                            upgradeType === "monthly"
                              ? "bg-amber-50 border-amber-600 text-amber-800"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          } transition-all cursor-pointer text-center`}
                        >
                          {isAr ? "📅 اشتراك شهري" : "📅 Monthly"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUpgradeType("annual");
                            setUpgradeMonths(12);
                          }}
                          className={`p-2 rounded-xl border font-bold ${
                            upgradeType === "annual"
                              ? "bg-amber-50 border-amber-600 text-amber-800"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          } transition-all cursor-pointer text-center`}
                        >
                          {isAr ? "💎 اشتراك سنوي" : "💎 Annual (12 mo)"}
                        </button>
                      </div>
                    </div>

                    {upgradeType === "monthly" && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">{isAr ? "عدد الأشهر المطلوبة" : "Number of Months"}</label>
                        <select
                          value={upgradeMonths}
                          onChange={(e) => setUpgradeMonths(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-right pr-4"
                        >
                          <option value="1">{isAr ? "شهر واحد (1)" : "1 Month"}</option>
                          <option value="2">{isAr ? "شهرين (2)" : "2 Months"}</option>
                          <option value="3">{isAr ? "3 أشهر" : "3 Months"}</option>
                          <option value="6">{isAr ? "6 أشهر" : "6 Months"}</option>
                          <option value="9">{isAr ? "9 أشهر" : "9 Months"}</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="space-y-1 text-right">
                      <label className="text-[10px] font-bold text-slate-400">{isAr ? "طريقة تحويل الدفعة" : "Payment Method"}</label>
                      <select
                        value={upgradeMethod}
                        onChange={(e) => setUpgradeMethod(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-right pr-4"
                      >
                        <option value="syriatel_cash">{isAr ? "سيريتل كاش (Syriatel)" : "Syriatel Cash"}</option>
                        <option value="mtn_cash">{isAr ? "إم تي إن كاش (MTN)" : "MTN Cash"}</option>
                        <option value="alharam_transfer">{isAr ? "حوالة هرم أو فؤاد" : "Al-Haram Transfer"}</option>
                        <option value="bank_transfer">{isAr ? "تحويل مصرفي سوري" : "Bank Transfer"}</option>
                      </select>
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-[10px] font-bold text-slate-400">{isAr ? "رمز المعاملة أو رقم الحوالة" : "Transaction Ref ID"}</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 5928174"
                        value={upgradeReference}
                        onChange={(e) => setUpgradeReference(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono text-right"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={upgradeSubmitting}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 h-[38px]"
                    >
                      {upgradeSubmitting ? (
                        <RefreshCw className="animate-spin" size={13} />
                      ) : (
                        <span>👑</span>
                      )}
                      {isAr ? (
                        `تأكيد وإرسال`
                      ) : (
                        `Submit Request`
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Print configuration POS */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-bold text-xs text-slate-700 uppercase flex items-center gap-1">
              <Printer size={15} className="text-slate-600" />
              {isAr ? "ربط طابعات تذاكر تحضير الأطعمة" : "Thermal Receipt Printer configuration"}
            </h4>

            <p className="text-slate-500 text-xs">
              {isAr
                ? "منصة لقمة تدعم اتصالاً مباشراً مع طابعات الفواتير الحلبية والدمشقية بمنافذ USB أو IP محلي لطباعة التذاكر بالمطبخ بشكل فوري بمجرد تأكيد المبيعات."
                : "Bind your kitchen direct printer setups to instantly fire order tickers to chefs on validation."}
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">{isAr ? "عنوان IP الطابعة (محلي)" : "Printer IP address (Local)"}</label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.100"
                  value={store.printerIp || "192.168.1.100"}
                  onChange={(e) => onUpdateStore({ printerIp: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono"
                />
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                <span className="text-xs text-slate-600 font-medium">{isAr ? "حالة الطابعة" : "Printer state"}:</span>
                <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                  <Check size={14} /> {isAr ? "جاهز متصل" : "Ready Online"}
                </span>
              </div>
            </div>
          </div>

          {/* QR Scans and loyalty config */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-bold text-xs text-slate-700 uppercase flex items-center gap-1">
              <Smartphone size={15} className="text-slate-600" />
              {isAr ? "مولد كود الطاولة QR Menu لتناول الطعام" : "Table scan QR Menu Generator"}
            </h4>

            <p className="text-slate-500 text-xs text-justify">
              {isAr ? "اطبع هذا الكود والصقه على طاولات مطعمك ليقوم رواد المطعم بمسحه والطلب كعميل مباشرة بلمسة أصبع من متصفحهم الجوال." : "Print this QR code and paste it to physical dining tables so visitors grab menus directly with responsive cards."}
            </p>

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/50 gap-2">
              <div className="w-28 h-28 bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-center shadow-xs">
                {/* Simulated stylized SVG QR code */}
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z" fill="#1e293b" />
                  <path d="M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z" fill="#1e293b" />
                  <path d="M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z" fill="#1e293b" />
                  <path d="M40,40 h20 v20 h-20 z" fill="#1e293b" />
                  <path d="M40,10 h10 v10 h-10 z M50,20 h10 v10 h-10 z M40,70 h10 v10 h-10 z M80,80 h10 v10 h-10 z" fill="#1e293b" />
                </svg>
              </div>
              <span className="text-[10px] text-indigo-600 font-mono font-bold">https://logma.sy/is-{store.id}</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* NEW PRODUCT EDIT POPUP MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingProduct ? (isAr ? "تعديل الوجبة" : "Edit Meal Product") : (isAr ? "إضافة وجبة طعام جديدة" : "Add New Dish")}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formErr && (
              <div className="bg-rose-50 text-rose-800 border border-rose-100 p-2.5 rounded-lg text-xs">
                {formErr}
              </div>
            )}

            <form onSubmit={handleProductSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">{isAr ? "الاسم بالعربية" : "Arabic title"}</label>
                  <input
                    type="text"
                    required
                    value={productForm.nameAr}
                    onChange={(e) => setProductForm({ ...productForm, nameAr: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">{isAr ? "الاسم بالإنكليزية" : "English title"}</label>
                  <input
                    type="text"
                    required
                    value={productForm.nameEn}
                    onChange={(e) => setProductForm({ ...productForm, nameEn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">{isAr ? "الفئة / القسم" : "Category"}</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                  >
                    <option value="الوجبات (Meals)">الوجبات (Meals)</option>
                    <option value="الساندويش (Sandwiches)">الساندويش (Sandwiches)</option>
                    <option value="المقبلات (Appetizers)">المقبلات (Appetizers)</option>
                    <option value="حلويات رمضانية (Ramadan Sweets)">حلويات رمضانية (Ramadan Sweets)</option>
                    <option value="عام">عام</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">{isAr ? "السعر الأساسي بالليرة السورية" : "Base price (SYP)"}</label>
                  <input
                    type="number"
                    required
                    value={productForm.priceSYP}
                    onChange={(e) => setProductForm({ ...productForm, priceSYP: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">{isAr ? "الوصف باللغة العربية" : "Arabic description"}</label>
                  <textarea
                    rows={2}
                    value={productForm.descAr}
                    onChange={(e) => setProductForm({ ...productForm, descAr: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                  ></textarea>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">{isAr ? "الوصف باللغة الإنكليزية" : "English description"}</label>
                  <textarea
                    rows={2}
                    value={productForm.descEn}
                    onChange={(e) => setProductForm({ ...productForm, descEn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                  ></textarea>
                </div>
              </div>

              <div className="space-y-3">
                <label className="font-semibold text-slate-700 block text-sm">
                  {isAr ? "صورة المنتج والوجبة" : "Product & Meal Image"}
                </label>

                {/* Main Interactive Upload Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                  <div className="flex flex-col justify-center">
                    {/* Programmatic click and a standard button for fallback */}
                    <div 
                      onClick={() => productFileInputRef.current?.click()}
                      className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-indigo-50/20 hover:bg-indigo-50/40 min-h-[140px] text-center relative overflow-hidden group"
                    >
                      {imageUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="animate-spin text-indigo-500" size={24} />
                          <span className="text-xs text-indigo-600 font-bold">
                            {isAr ? "جاري معالجة وضغط الصورة..." : "Uploading & compressing..."}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 p-2">
                          <div className="bg-white p-2.5 rounded-full shadow-xs border border-indigo-100 group-hover:scale-110 transition-transform text-indigo-600">
                            <Upload size={20} />
                          </div>
                          <span className="text-xs font-black text-indigo-700">
                            {isAr ? "📁 اضغط هنا لاختيار صورة الوجبة من جهازك" : "📁 Click here to choose image from your device"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {isAr ? "يدعم كافة صيغ الصور وسيقوم بضغطها تلقائياً" : "Supports all image types, auto-compressed"}
                          </span>
                          <button
                            type="button"
                            className="mt-2 bg-indigo-650 hover:bg-indigo-700 text-white font-black text-[10px] px-3.5 py-1.5 rounded-xl transition-all shadow-xs"
                          >
                            {isAr ? "تصفح الصور بالهاتف / الكمبيوتر" : "Browse Device Files"}
                          </button>
                        </div>
                      )}
                    </div>
                    <input
                      ref={productFileInputRef}
                      id="product-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Image Preview & Active value state */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col justify-between min-h-[140px]">
                    <span className="text-[10px] font-bold text-slate-400 block pb-1">
                      {isAr ? "المعاينة الحالية:" : "Current Preview:"}
                    </span>
                    {productForm.image ? (
                      <div className="relative rounded-xl border border-slate-200 overflow-hidden h-24 bg-slate-100">
                        <img
                          src={productForm.image}
                          alt="preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setProductForm({ ...productForm, image: "" })}
                          className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg p-1 text-[10px] font-bold cursor-pointer transition-all shadow-md"
                        >
                          {isAr ? "حذف" : "Remove"}
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300/60 h-24 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                        {isAr ? "بلا صورة للمنتج" : "No Product Image selected"}
                      </div>
                    )}
                    <span className="text-[9px] text-slate-400 break-all truncate block mt-1">
                      {productForm.image ? (
                        productForm.image.startsWith("data:") 
                          ? (isAr ? "✓ صورة مخصصة مرفوعة ومدمجة بنجاح" : "✓ Uploaded custom embedded image")
                          : productForm.image
                      ) : ""}
                    </span>
                  </div>
                </div>

                {/* Option to input raw link if needed */}
                <details className="bg-slate-100/50 rounded-xl p-2.5 border border-slate-200/50 text-xs text-slate-600">
                  <summary className="cursor-pointer font-bold text-[11px] select-none text-slate-500 hover:text-slate-700">
                    🔗 {isAr ? "خيارات متقدمة: إدخال رابط صورة أو تحديد صورة جاهزة" : "Advanced: Direct URL link / Presets"}
                  </summary>
                  <div className="space-y-2.5 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block">
                        {isAr ? "رابط الصورة (URL):" : "Product Direct URL:"}
                      </label>
                      <input
                        type="text"
                        value={productForm.image}
                        onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                        className="w-full bg-white border border-slate-200 p-2 rounded-lg font-mono text-[11px]"
                      />
                    </div>

                    {/* Image Presets Quick Selector */}
                    <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-150">
                      <span className="text-[10px] text-slate-400 block font-semibold text-right">
                        ✨ {isAr ? "اختر صورة برجر أو شاورما شهية بلمسة واحدة:" : "Insert a high-quality preset photo:"}
                      </span>
                      <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
                        {[
                          { nameAr: "شاورما دجاج عالفحم", nameEn: "Shawarma", url: "https://images.unsplash.com/photo-1561651823-34feb02250e4?w=400&q=80" },
                          { nameAr: "برغر لحم بقري", nameEn: "Beef Burger", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80" },
                          { nameAr: "بيتزا عائلية مميزة", nameEn: "Pizza", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80" },
                          { nameAr: "صحن كباب مشوي", nameEn: "Kabab Plate", url: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&q=80" }
                        ].map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setProductForm({ ...productForm, image: preset.url })}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all shrink-0 border border-slate-350/40"
                          >
                            {isAr ? preset.nameAr : preset.nameEn}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </details>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">
                    {isAr ? "الإضافات المتاحة للطلب (صيغة JSON مصفوفة):" : "Available extras list (JSON array formatting):"}
                  </label>
                  <textarea
                    rows={2}
                    value={productForm.extrasText}
                    onChange={(e) => setProductForm({ ...productForm, extrasText: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl font-mono text-[10px]"
                    placeholder='[{"nameAr":"جبنة إضافية","nameEn":"Extra cheese","priceSYP":4000}]'
                  ></textarea>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-150 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  {editingProduct ? (isAr ? "حفظ وتعديل الوجبة" : "Save Changes") : (isAr ? "إضافة الوجبة" : "Add Dish")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedOrderToPrint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 md:p-4 font-sans text-right no-print">
          <div className="bg-slate-100 max-w-4xl w-full rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] md:max-h-[85vh] overflow-hidden">
            
            {/* Sticky Header */}
            <div className="bg-white px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Printer size={16} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-xs md:text-sm">
                    {isAr ? "تخصيص الفاتورة وتجربة الطباعة الفورية" : "Receipt & Thermal Print Customizer"}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {isAr ? "تحقق وعيّن الخيارات والمظهر ثم وجه الأمر للطابعة الموصولة" : "Adjust bill attributes & launch thermal formatting"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderToPrint(null)}
                className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-full cursor-pointer transition-all border border-slate-200/40 text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12">
              
              {/* Left side: POS Receipt layout sheet mockup */}
              <div className="md:col-span-6 bg-slate-200/60 p-4 md:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-l border-slate-300">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  {isAr ? "🔍 استعراض تذكرة الورق الحراري" : "🔍 Thermal Paper Receipt Preview"}
                </span>

                {/* simulated receipt slip paper */}
                <div
                  id="receipt-print-area"
                  className="bg-white text-slate-900 border border-slate-300 shadow-lg px-4 py-6 font-mono text-xs rounded-xs relative transition-all"
                  style={{
                    width: receiptPaperWidth === "80mm" ? "340px" : "250px",
                    direction: isAr ? "rtl" : "ltr",
                    lineHeight: "1.4"
                  }}
                >
                  {renderReceiptContent(selectedOrderToPrint)}
                </div>
              </div>

              {/* Right side: Control Panel / Configurator */}
              <div className="md:col-span-6 bg-white p-5 md:p-6 space-y-5 overflow-y-auto max-h-[70vh] md:max-h-[75vh]">
                
                {/* Print Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    {isAr ? "♻️ نوع تذكرة الطباعة والفرز المقررة:" : "♻️ Layout Print Type:"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintType("customer")}
                      className={`py-2.5 px-3 rounded-xl font-bold text-[11px] border cursor-pointer transition-all ${
                        printType === "customer"
                          ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      📄 {isAr ? "فاتورة الزبون" : "Customer Bill"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintType("kitchen")}
                      className={`py-2.5 px-3 rounded-xl font-bold text-[11px] border cursor-pointer transition-all ${
                        printType === "kitchen"
                          ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      👨‍🍳 {isAr ? "تذكرة المطبخ" : "Kitchen Ticket"}
                    </button>
                  </div>
                </div>

                {/* Direct Bluetooth Thermal Connection controller section */}
                <div id="bluetooth-section" className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-black text-xs">
                    <span className="text-sm">🔵</span>
                    {isAr ? "الاتصال بطابعة حرارية لاسلكية (Bluetooth POS):" : "Direct Web Bluetooth Printing (ESC/POS):"}
                  </div>
                  
                  {btError && (
                    <div className="bg-red-50 text-red-700 p-2 text-[10px] rounded-lg border border-red-200 font-medium leading-relaxed">
                      ❌ {btError}
                    </div>
                  )}

                  {btSuccess && (
                    <div className="bg-emerald-50 text-emerald-800 p-2 text-[10px] rounded-lg border border-emerald-200 font-medium">
                      {btSuccess}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {!btDevice ? (
                      <button
                        type="button"
                        onClick={handleConnectBluetooth}
                        disabled={btConnecting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-xs disabled:opacity-50"
                      >
                        {btConnecting ? (
                          <>
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                            {isAr ? "جاري البحث..." : "Scanning..."}
                          </>
                        ) : (
                          <>⚡ {isAr ? "بحث واقتران بطابعة بلوتوث حرارية" : "Search & Connect Bluetooth Printer"}</>
                        )}
                      </button>
                    ) : (
                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-between text-[11px] bg-white px-3 py-1.5 rounded-lg border border-indigo-200">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            {btDevice.name || (isAr ? "طابعة بلوتوث حرارية" : "Bluetooth POS Printer")}
                          </span>
                          <button
                            type="button"
                            onClick={handleDisconnectBluetooth}
                            className="text-red-605 hover:text-red-800 font-bold hover:underline"
                          >
                            {isAr ? "قطع الاتصال" : "Disconnect"}
                          </button>
                        </div>
                        
                        <button
                          type="button"
                          onClick={handleBluetoothPrint}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>🖨️</span>
                          {isAr ? "إرسال وطباعة لاسلكية فورية (ESC/POS)" : "Direct Wireless ESC/POS Print"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Iframe Sandbox Helper Alert */}
                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/60 text-[11px] text-slate-700 space-y-2 font-sans">
                  <div className="font-bold text-amber-800 flex items-center gap-1 text-[11px]">
                    <span>⚠️</span>
                    {isAr ? "مستخدمي لوحة المعاينة السحابية (iFrame):" : "Sandbox Preview Warning:"}
                  </div>
                  <p className="leading-relaxed text-[10px]">
                    {isAr
                      ? "تقوم أنظمة حماية الساندبوكس في متصفح إطارات AI Studio أحياناً بحظر نوافذ الطباعة (print) والبلوتوث تلقائياً. لحل المشكلة فوراً، اضغط على الرابط أدناه لفتح التطبيق بصفحة كاملة مستقلة!"
                      : "Browsers occasionally block window.print() and Web Bluetooth from within preview iFrames. Click below to open Logma in a clean standalone tab view to test flawless wireless printing:"}
                  </p>
                  <button
                    type="button"
                    onClick={() => window.open(window.location.origin + window.location.pathname, "_blank")}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg text-[10px] cursor-pointer text-center flex items-center justify-center gap-1 shadow-xs transition-all"
                  >
                    🌐 {isAr ? "فتح النظام في علامة تبويب جديدة" : "Open Direct App in New Tab"}
                  </button>
                </div>

                {/* Select Paper Width */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    {isAr ? "📏 عرض حجم الورق الحراري المتوفر:" : "📏 Receipt roll standard width:"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReceiptPaperWidth("80mm")}
                      className={`py-2 px-3 rounded-xl font-bold text-[11px] border cursor-pointer transition-all ${
                        receiptPaperWidth === "80mm"
                          ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      {isAr ? "80 مم (الطابعات الكبيرة)" : "80mm Standard"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptPaperWidth("58mm")}
                      className={`py-2 px-3 rounded-xl font-bold text-[11px] border cursor-pointer transition-all ${
                        receiptPaperWidth === "58mm"
                          ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      {isAr ? "58 مم (طابعات الملوف المحمولة)" : "58mm Bluetooth/Mini"}
                    </button>
                  </div>
                </div>

                {/* Interactive Payment Switch Toggle */}
                {printType !== "kitchen" && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-3 font-sans">
                    <span className="text-[11px] font-black text-slate-700 block">
                      {isAr ? "💳 التحكم بحالة الدفع في الفاتورة المطبوعة:" : "💳 Toggle printed payment billing state:"}
                    </span>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[11px]">
                          {manuallyMarkedAsPaid ? (isAr ? "🟢 الفاتورة مَدْفُوعَة بالكامل" : "🟢 Bill Paid in Full") : (isAr ? "🔴 الدفع عند الاستلام كاش" : "🔴 Unpaid / CASH ON DELIVERY")}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isAr ? "يحدد هذا التبديل العلامة المطبوعة على الوصل لموظفك وسائق التوصيل" : "Controls the status logo stamped on the customer paper"}
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer font-sans text-xs">
                        <input
                          type="checkbox"
                          checked={!!manuallyMarkedAsPaid}
                          onChange={(e) => setManuallyMarkedAsPaid(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 animate-pulse"></div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Additional controls */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    {isAr ? "🖨️ إظهار الشعار وترويسة المطعم:" : "🖨️ Hide or show bill custom header:"}
                  </label>
                  <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
                    <input
                      type="checkbox"
                      id="toggleLogoReceipt"
                      checked={showLogoInReceipt}
                      onChange={(e) => setShowLogoInReceipt(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="toggleLogoReceipt" className="text-[11px] font-medium text-slate-700 cursor-pointer">
                      {isAr ? "تضمين شعار المطعم واسم الفاتورة بالأعلى" : "Render store logo & metadata header"}
                    </label>
                  </div>
                </div>

                {/* Custom Receipt Bottom Footer text */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    {isAr ? "✍️ تذييل الفاتورة الترحيبي (أسفل الورقة):" : "✍️ Receipt bottom footer text:"}
                  </label>
                  <input
                    type="text"
                    value={customReceiptFooter}
                    onChange={(e) => setCustomReceiptFooter(e.target.value)}
                    placeholder={isAr ? "مثلاً: صحة وعافية لقمتكم تسعدنا!" : "e.g. Hope to serve you again soon!"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                  />
                </div>

                {/* Visual indicator that main actions are below */}
                <div className="pt-4 border-t border-slate-100 text-center text-slate-400 text-[10px] leading-relaxed">
                  <p>
                    {isAr 
                      ? "💡 خيارات الطباعة المباشرة وإعدادات الورق تظهر بالأسفل بشكل دائم للوصول السريع." 
                      : "💡 Core print operations are located on the sticky bar below for instant access."}
                  </p>
                </div>
              </div>

            </div>

            {/* Sticky Footer for Instant Print Actions - ALWAYS VISIBLE */}
            <div className="bg-white px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 no-print">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer text-xs font-bold text-slate-705 select-none font-sans">
                  <input
                    type="checkbox"
                    checked={autoPrintOnOpen}
                    onChange={(e) => setAutoPrintOnOpen(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  <span className="mr-2 ml-2">
                    {isAr ? "🖨️ تفعيل الطباعة التلقائية عند الفتح" : "🖨️ Auto-print on open"}
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOrderToPrint(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all border border-slate-200 font-sans"
                >
                  {isAr ? "إغلاق المعاينة" : "Close Preview"}
                </button>

                {btDevice ? (
                  <button
                    type="button"
                    onClick={handleBluetoothPrint}
                    disabled={btConnecting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm font-sans"
                  >
                    <span>🔵</span>
                    {btConnecting ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "طباعة بلوتوث لاسلكية" : "Print via Bluetooth")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const container = document.getElementById("bluetooth-section");
                      if (container) {
                        container.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all border border-indigo-200/50 font-sans"
                  >
                    <span>🔌</span>
                    {isAr ? "توصيل طابعة بلوتوث" : "Connect BT Printer"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePrintViaIframe}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer transition-all font-sans"
                >
                  <Printer size={15} />
                  {isAr ? "طباعة الآن (طابعة حرارية USB/Wi-Fi)" : "Print Now (USB/Wi-Fi)"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
