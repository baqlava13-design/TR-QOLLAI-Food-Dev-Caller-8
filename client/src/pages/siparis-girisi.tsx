import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Customer, MenuItem, Category, Order, OrderItem } from "@shared/schema";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  Search,
  User,
  MapPin,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  RotateCcw,
  CheckCircle,
  Clock,
  Package,
  X,
  UserPlus,
  Edit,
  Save,
  LogOut,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Link } from "wouter";

function formatPhoneForWhatsApp(phone: string): string {
  let formatted = phone.replace(/\D/g, "");
  if (formatted.startsWith("0")) {
    formatted = "90" + formatted.substring(1);
  } else if (!formatted.startsWith("90")) {
    formatted = "90" + formatted;
  }
  return formatted;
}

type OrderWithItems = Order & { items: OrderItem[] };

interface CartItemEntry {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Giris basarisiz");
      if (data.token) localStorage.setItem("adminToken", data.token);
      onLogin();
    } catch (err: any) {
      setError(err.message || "Giris basarisiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
            <Phone className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Siparis Paneli Girisi</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="op-username">Kullanici Adi</Label>
              <Input id="op-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" required data-testid="input-op-username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-password">Sifre</Label>
              <Input id="op-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" required data-testid="input-op-password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-op-login">
              {loading ? "Giris yapiliyor..." : "Giris Yap"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SiparisGirisi() {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch("/api/admin/me", { credentials: "include", headers })
      .then((res) => { if (res.ok) setIsLoggedIn(true); })
      .finally(() => setCheckingAuth(false));
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("adminToken");
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setIsLoggedIn(false);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Yukleniyor...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginForm onLogin={() => setIsLoggedIn(true)} />;
  }

  return <SiparisPanel onLogout={handleLogout} />;
}

function SiparisPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast();
  const [phoneInput, setPhoneInput] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<OrderWithItems[]>([]);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [cart, setCart] = useState<CartItemEntry[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pos">("cash");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [activeTab, setActiveTab] = useState("menu");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);

  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phone: "",
    mahalle: "",
    sokak: "",
    binaNo: "",
    daireNo: "",
    notes: "",
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.isAvailable) return false;
    const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const lookupCustomer = useCallback(async (phone: string) => {
    if (!phone || phone.length < 3) return;
    try {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/customers/phone/${encodeURIComponent(phone)}`, { credentials: "include", headers });
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomer(data.customer);
        setCustomerOrders(data.orders);
        setIsNewCustomer(false);
        setIsEditingCustomer(false);
        toast({ title: "Musteri bulundu", description: data.customer.name });
      } else {
        setSelectedCustomer(null);
        setCustomerOrders([]);
        setIsNewCustomer(true);
        setNewCustomerForm((prev) => ({ ...prev, phone }));
        toast({ title: "Yeni musteri", description: "Bu numara ile kayitli musteri bulunamadi" });
      }
    } catch {
      toast({ title: "Hata", description: "Musteri arama basarisiz", variant: "destructive" });
    }
  }, [toast]);

  const handlePhoneLookup = () => {
    lookupCustomer(phoneInput);
  };

  const createCustomerMutation = useMutation({
    mutationFn: async (data: typeof newCustomerForm) => {
      const address = [data.mahalle, data.sokak, data.binaNo ? `No:${data.binaNo}` : "", data.daireNo ? `D:${data.daireNo}` : ""].filter(Boolean).join(", ");
      const res = await apiRequest("POST", "/api/customers", { ...data, address });
      return res.json();
    },
    onSuccess: (customer: Customer) => {
      setSelectedCustomer(customer);
      setIsNewCustomer(false);
      setCustomerOrders([]);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Musteri kaydedildi", description: customer.name });
    },
    onError: () => {
      toast({ title: "Hata", description: "Musteri kaydi basarisiz", variant: "destructive" });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: Partial<typeof newCustomerForm>) => {
      if (!selectedCustomer) throw new Error("No customer");
      const address = [data.mahalle, data.sokak, data.binaNo ? `No:${data.binaNo}` : "", data.daireNo ? `D:${data.daireNo}` : ""].filter(Boolean).join(", ");
      const res = await apiRequest("PATCH", `/api/customers/${selectedCustomer.id}`, { ...data, address });
      return res.json();
    },
    onSuccess: (customer: Customer) => {
      setSelectedCustomer(customer);
      setIsEditingCustomer(false);
      toast({ title: "Musteri guncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Guncelleme basarisiz", variant: "destructive" });
    },
  });

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id
            ? { ...c, quantity: c.quantity + 1, totalPrice: (parseFloat(c.unitPrice) * (c.quantity + 1)).toFixed(2) }
            : c
        );
      }
      return [...prev, { menuItemId: item.id, menuItemName: item.name, quantity: 1, unitPrice: item.price, totalPrice: item.price }];
    });
  };

  const updateCartQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.menuItemId !== menuItemId) return c;
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null;
          return { ...c, quantity: newQty, totalPrice: (parseFloat(c.unitPrice) * newQty).toFixed(2) };
        })
        .filter(Boolean) as CartItemEntry[];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);

  const reorderFromPrevious = (order: OrderWithItems) => {
    const newCart: CartItemEntry[] = order.items.map((item) => ({
      menuItemId: item.menuItemId || "",
      menuItemName: item.menuItemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));
    setCart(newCart);
    setActiveTab("menu");
    toast({ title: "Onceki siparis sepete eklendi" });
  };

  const buildWhatsAppUrl = useCallback((customerPhone: string, itemsText: string, total: string, orderDeliveryType: string) => {
    const phone = formatPhoneForWhatsApp(customerPhone);
    const deliveryText = orderDeliveryType === "pickup" ? "Gel Al" : "Eve Teslim";
    const storeName = siteSettings?.logo_text || siteSettings?.site_name || "Lezzet Express";
    const message = `Merhaba! ${storeName} siparisiniz alindi.\n\nSiparis: ${itemsText}\nToplam: ${total} TL\nTeslimat: ${deliveryText}\n\nTahmini teslimat: 30-45 dk. Afiyet olsun!`;
    const encoded = encodeURIComponent(message);
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
  }, [siteSettings]);

  const sendWhatsAppFromCart = useCallback((customerPhone: string, orderItems: CartItemEntry[], total: number, orderDeliveryType: string) => {
    const itemsText = orderItems.map(i => `${i.quantity}x ${i.menuItemName}`).join(", ");
    const url = buildWhatsAppUrl(customerPhone, itemsText, total.toFixed(2), orderDeliveryType);
    window.open(url, "_blank");
  }, [buildWhatsAppUrl]);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error("Musteri secilmedi");
      if (cart.length === 0) throw new Error("Sepet bos");

      const orderData = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerAddress: deliveryType === "pickup" ? "Gel Al" : (selectedCustomer.address || ""),
        status: "confirmed",
        paymentMethod,
        deliveryType,
        subtotal: cartTotal.toFixed(2),
        total: cartTotal.toFixed(2),
        notes: orderNotes,
        items: cart,
      };

      const res = await apiRequest("POST", "/api/orders", orderData);
      return res.json();
    },
    onSuccess: (order: Order) => {
      setLastCreatedOrder(order);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Siparis olusturuldu", description: `Siparis No: ${order.id.slice(0, 8)}` });
      if (selectedCustomer) {
        const itemsText = cart.map(i => `${i.quantity}x ${i.menuItemName}`).join(", ");
        const url = buildWhatsAppUrl(selectedCustomer.phone, itemsText, cartTotal.toFixed(2), deliveryType);
        window.open(url, "_blank");
      }
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateOrder = () => {
    createOrderMutation.mutate();
  };

  const resetAll = () => {
    setPhoneInput("");
    setSelectedCustomer(null);
    setCustomerOrders([]);
    setIsNewCustomer(false);
    setIsEditingCustomer(false);
    setCart([]);
    setOrderNotes("");
    setPaymentMethod("cash");
    setDeliveryType("delivery");
    setLastCreatedOrder(null);
    setNewCustomerForm({ name: "", phone: "", mahalle: "", sokak: "", binaNo: "", daireNo: "", notes: "" });
  };

  const printOrder = (order?: Order | null) => {
    const orderToPrint = order || lastCreatedOrder;
    if (!orderToPrint && cart.length === 0) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    const customerInfo = selectedCustomer;
    const itemsList = cart.length > 0 ? cart : [];

    const statusMap: Record<string, string> = {
      pending: "Beklemede",
      confirmed: "Onaylandi",
      preparing: "Hazirlaniyor",
      delivered: "Teslim Edildi",
      cancelled: "Iptal",
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Siparis Fisi</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; width: 280px; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
          .header h2 { font-size: 16px; margin-bottom: 4px; }
          .info { margin-bottom: 8px; }
          .info p { margin: 2px 0; }
          .info .label { font-weight: bold; }
          .items { width: 100%; border-collapse: collapse; margin: 8px 0; }
          .items th, .items td { text-align: left; padding: 3px 0; }
          .items th { border-bottom: 1px dashed #000; font-size: 11px; }
          .items td { font-size: 11px; }
          .items .qty { width: 30px; text-align: center; }
          .items .price { text-align: right; width: 60px; }
          .total { border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; font-weight: bold; font-size: 14px; text-align: right; }
          .footer { text-align: center; margin-top: 10px; border-top: 1px dashed #000; padding-top: 8px; font-size: 10px; }
          .notes { margin-top: 6px; padding: 4px; border: 1px dashed #000; font-size: 11px; }
          @media print { body { width: 280px; } }
        </style>
      </head>
      <body>
        <div class="header">
          ${siteSettings?.company_logo ? `<img src="${siteSettings.company_logo}" alt="Logo" style="max-width:120px;max-height:60px;margin:0 auto 6px auto;display:block;" />` : ""}
          <h1 style="font-size:18px;font-weight:bold;margin-bottom:2px;">${siteSettings?.logo_name || "Siparis Kolay"}</h1>
          ${siteSettings?.footer_phone ? `<p>${siteSettings.footer_phone}</p>` : ""}
          ${siteSettings?.footer_address ? `<p style="font-size:10px;">${siteSettings.footer_address}</p>` : ""}
          <p style="margin-top:4px;">- SIPARIS FISI -</p>
          <p>${new Date().toLocaleString("tr-TR")}</p>
          ${orderToPrint ? `<p>Siparis No: ${orderToPrint.id.slice(0, 8)}</p>` : ""}
          ${orderToPrint ? `<p>Durum: ${statusMap[orderToPrint.status || "pending"] || orderToPrint.status}</p>` : ""}
        </div>
        <div class="info">
          <p><span class="label">Musteri:</span> ${customerInfo?.name || "-"}</p>
          <p><span class="label">Telefon:</span> ${customerInfo?.phone || "-"}</p>
          <p><span class="label">Adres:</span> ${customerInfo?.address || [customerInfo?.mahalle, customerInfo?.sokak, customerInfo?.binaNo ? "No:" + customerInfo.binaNo : "", customerInfo?.daireNo ? "D:" + customerInfo.daireNo : ""].filter(Boolean).join(", ") || "-"}</p>
          <p><span class="label">Odeme:</span> ${paymentMethod === "cash" ? "Nakit" : "POS"}</p>
          <p><span class="label">Teslimat:</span> ${deliveryType === "pickup" ? "Gel Al" : "Eve Teslim"}</p>
        </div>
        <table class="items">
          <thead><tr><th>Urun</th><th class="qty">Ad</th><th class="price">Fiyat</th></tr></thead>
          <tbody>
            ${itemsList.map((item) => `<tr><td>${item.menuItemName}</td><td class="qty">${item.quantity}</td><td class="price">${parseFloat(item.totalPrice).toFixed(2)} TL</td></tr>`).join("")}
          </tbody>
        </table>
        <div class="total">TOPLAM: ${cartTotal.toFixed(2)} TL</div>
        ${orderNotes ? `<div class="notes"><strong>Not:</strong> ${orderNotes}</div>` : ""}
        <div class="footer">
          <p>Afiyet olsun!</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    const logoImg = printWindow.document.querySelector("img");
    if (logoImg) {
      logoImg.onload = () => { printWindow.focus(); printWindow.print(); };
      logoImg.onerror = () => { printWindow.focus(); printWindow.print(); };
      setTimeout(() => { printWindow.focus(); printWindow.print(); }, 3000);
    } else {
      printWindow.focus();
      printWindow.print();
    }
  };

  const printPreviousOrder = (order: OrderWithItems) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    const statusMap: Record<string, string> = {
      pending: "Beklemede",
      confirmed: "Onaylandi",
      preparing: "Hazirlaniyor",
      delivered: "Teslim Edildi",
      cancelled: "Iptal",
    };

    const total = order.items.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Siparis Fisi</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; width: 280px; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
          .header h2 { font-size: 16px; margin-bottom: 4px; }
          .info { margin-bottom: 8px; }
          .info p { margin: 2px 0; }
          .info .label { font-weight: bold; }
          .items { width: 100%; border-collapse: collapse; margin: 8px 0; }
          .items th, .items td { text-align: left; padding: 3px 0; }
          .items th { border-bottom: 1px dashed #000; font-size: 11px; }
          .items td { font-size: 11px; }
          .items .qty { width: 30px; text-align: center; }
          .items .price { text-align: right; width: 60px; }
          .total { border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; font-weight: bold; font-size: 14px; text-align: right; }
          .footer { text-align: center; margin-top: 10px; border-top: 1px dashed #000; padding-top: 8px; font-size: 10px; }
          @media print { body { width: 280px; } }
        </style>
      </head>
      <body>
        <div class="header">
          ${siteSettings?.company_logo ? `<img src="${siteSettings.company_logo}" alt="Logo" style="max-width:120px;max-height:60px;margin:0 auto 6px auto;display:block;" />` : ""}
          <h1 style="font-size:18px;font-weight:bold;margin-bottom:2px;">${siteSettings?.logo_name || "Siparis Kolay"}</h1>
          ${siteSettings?.footer_phone ? `<p>${siteSettings.footer_phone}</p>` : ""}
          ${siteSettings?.footer_address ? `<p style="font-size:10px;">${siteSettings.footer_address}</p>` : ""}
          <p style="margin-top:4px;">- SIPARIS FISI -</p>
          <p>${order.createdAt ? new Date(order.createdAt).toLocaleString("tr-TR") : ""}</p>
          <p>Siparis No: ${order.id.slice(0, 8)}</p>
          <p>Durum: ${statusMap[order.status || "pending"] || order.status}</p>
        </div>
        <div class="info">
          <p><span class="label">Musteri:</span> ${order.customerName}</p>
          <p><span class="label">Telefon:</span> ${order.customerPhone}</p>
          <p><span class="label">Adres:</span> ${order.customerAddress || "-"}</p>
          <p><span class="label">Odeme:</span> ${order.paymentMethod === "cash" ? "Nakit" : "POS"}</p>
          <p><span class="label">Teslimat:</span> ${(order as any).deliveryType === "pickup" ? "Gel Al" : "Eve Teslim"}</p>
        </div>
        <table class="items">
          <thead><tr><th>Urun</th><th class="qty">Ad</th><th class="price">Fiyat</th></tr></thead>
          <tbody>
            ${order.items.map((item) => `<tr><td>${item.menuItemName}</td><td class="qty">${item.quantity}</td><td class="price">${parseFloat(item.totalPrice).toFixed(2)} TL</td></tr>`).join("")}
          </tbody>
        </table>
        <div class="total">TOPLAM: ${total.toFixed(2)} TL</div>
        ${order.notes ? `<div class="notes"><strong>Not:</strong> ${order.notes}</div>` : ""}
        <div class="footer">
          <p>Afiyet olsun!</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    const logoImg2 = printWindow.document.querySelector("img");
    if (logoImg2) {
      logoImg2.onload = () => { printWindow.focus(); printWindow.print(); };
      logoImg2.onerror = () => { printWindow.focus(); printWindow.print(); };
      setTimeout(() => { printWindow.focus(); printWindow.print(); }, 3000);
    } else {
      printWindow.focus();
      printWindow.print();
    }
  };

  const startEditCustomer = () => {
    if (!selectedCustomer) return;
    setNewCustomerForm({
      name: selectedCustomer.name,
      phone: selectedCustomer.phone,
      mahalle: selectedCustomer.mahalle || "",
      sokak: selectedCustomer.sokak || "",
      binaNo: selectedCustomer.binaNo || "",
      daireNo: selectedCustomer.daireNo || "",
      notes: selectedCustomer.notes || "",
    });
    setIsEditingCustomer(true);
  };

  if (lastCreatedOrder) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-accent mx-auto" />
              <h2 className="text-xl font-bold" data-testid="text-order-success">Siparis Olusturuldu</h2>
              <p className="text-muted-foreground">Siparis No: {lastCreatedOrder.id.slice(0, 8)}</p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => printOrder(lastCreatedOrder)} data-testid="button-print-order">
                  <Printer className="w-4 h-4 mr-2" />
                  Fisi Yazdir
                </Button>
                <Button variant="outline" onClick={resetAll} data-testid="button-new-order">
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Siparis
                </Button>
                <Link href="/admin">
                  <Button variant="outline" className="w-full" data-testid="button-go-admin">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Admin Paneli
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Telefon Siparis Girisi</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedCustomer && (
              <Badge variant="secondary" data-testid="badge-customer-name">
                <User className="w-3 h-3 mr-1" />
                {selectedCustomer.name}
              </Badge>
            )}
            {cart.length > 0 && (
              <Badge data-testid="badge-cart-count">
                <ShoppingCart className="w-3 h-3 mr-1" />
                {cart.length} urun - {cartTotal.toFixed(2)} TL
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={resetAll} data-testid="button-reset">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Link href="/admin">
              <Button size="sm" variant="ghost" data-testid="button-admin-panel">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={onLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Phone Lookup & Customer Card */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Arayan Numara
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Telefon numarasi girin..."
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePhoneLookup()}
                    data-testid="input-phone"
                  />
                  <Button onClick={handlePhoneLookup} data-testid="button-lookup">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Customer Card */}
            {selectedCustomer && !isEditingCustomer && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Musteri Karti
                  </CardTitle>
                  <Button size="icon" variant="ghost" onClick={startEditCustomer} data-testid="button-edit-customer">
                    <Edit className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="font-semibold text-lg" data-testid="text-customer-name">{selectedCustomer.name}</p>
                    <p className="text-muted-foreground text-sm" data-testid="text-customer-phone">{selectedCustomer.phone}</p>
                  </div>
                  {(selectedCustomer.address || selectedCustomer.mahalle) && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span data-testid="text-customer-address">
                        {selectedCustomer.address || [selectedCustomer.mahalle, selectedCustomer.sokak, selectedCustomer.binaNo ? `No:${selectedCustomer.binaNo}` : "", selectedCustomer.daireNo ? `D:${selectedCustomer.daireNo}` : ""].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  {selectedCustomer.notes && (
                    <p className="text-sm text-muted-foreground" data-testid="text-customer-notes">Not: {selectedCustomer.notes}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="secondary" data-testid="badge-order-count">
                      {customerOrders.length} siparis
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Edit Customer Form */}
            {(isNewCustomer || isEditingCustomer) && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    {isNewCustomer ? "Yeni Musteri Kaydi" : "Musteri Bilgileri Duzenle"}
                  </CardTitle>
                  {isEditingCustomer && (
                    <Button size="icon" variant="ghost" onClick={() => setIsEditingCustomer(false)} data-testid="button-cancel-edit">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Ad Soyad</Label>
                    <Input
                      value={newCustomerForm.name}
                      onChange={(e) => setNewCustomerForm((p) => ({ ...p, name: e.target.value }))}
                      data-testid="input-customer-name"
                    />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input
                      value={newCustomerForm.phone}
                      onChange={(e) => setNewCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                      data-testid="input-customer-phone"
                    />
                  </div>
                  <div>
                    <Label>Mahalle</Label>
                    <Input
                      value={newCustomerForm.mahalle}
                      onChange={(e) => setNewCustomerForm((p) => ({ ...p, mahalle: e.target.value }))}
                      data-testid="input-customer-mahalle"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Sokak</Label>
                      <Input
                        value={newCustomerForm.sokak}
                        onChange={(e) => setNewCustomerForm((p) => ({ ...p, sokak: e.target.value }))}
                        data-testid="input-customer-sokak"
                      />
                    </div>
                    <div>
                      <Label>Bina No</Label>
                      <Input
                        value={newCustomerForm.binaNo}
                        onChange={(e) => setNewCustomerForm((p) => ({ ...p, binaNo: e.target.value }))}
                        data-testid="input-customer-bina"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Daire No</Label>
                    <Input
                      value={newCustomerForm.daireNo}
                      onChange={(e) => setNewCustomerForm((p) => ({ ...p, daireNo: e.target.value }))}
                      data-testid="input-customer-daire"
                    />
                  </div>
                  <div>
                    <Label>Notlar</Label>
                    <Textarea
                      value={newCustomerForm.notes}
                      onChange={(e) => setNewCustomerForm((p) => ({ ...p, notes: e.target.value }))}
                      className="resize-none"
                      data-testid="input-customer-notes"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (isNewCustomer) {
                        createCustomerMutation.mutate(newCustomerForm);
                      } else {
                        updateCustomerMutation.mutate(newCustomerForm);
                      }
                    }}
                    disabled={!newCustomerForm.name || !newCustomerForm.phone || createCustomerMutation.isPending || updateCustomerMutation.isPending}
                    data-testid="button-save-customer"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isNewCustomer ? "Musteri Kaydet" : "Guncelle"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Previous Orders */}
            {customerOrders.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Onceki Siparisler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-3">
                      {customerOrders.slice(0, 10).map((order) => {
                        const orderTotal = order.items.reduce((s, i) => s + parseFloat(i.totalPrice), 0);
                        const statusMap: Record<string, string> = {
                          pending: "Beklemede",
                          confirmed: "Onaylandi",
                          preparing: "Hazirlaniyor",
                          delivered: "Teslim Edildi",
                          cancelled: "Iptal",
                        };
                        return (
                          <div key={order.id} className="p-3 rounded-md border space-y-2" data-testid={`card-order-${order.id}`}>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString("tr-TR") : ""}
                                </p>
                                <Badge variant="secondary" className="text-xs">
                                  {statusMap[order.status || "pending"]}
                                </Badge>
                              </div>
                              <p className="font-semibold text-sm">{orderTotal.toFixed(2)} TL</p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {order.items.map((i) => `${i.menuItemName} x${i.quantity}`).join(", ")}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => reorderFromPrevious(order)} data-testid={`button-reorder-${order.id}`}>
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Tekrarla
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => printPreviousOrder(order)} data-testid={`button-print-prev-${order.id}`}>
                                <Printer className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Center: Menu Items */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Menu</CardTitle>
                <div className="space-y-2 pt-2">
                  <Input
                    placeholder="Urun ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-menu-search"
                  />
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Kategori sec" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tum Kategoriler</SelectItem>
                      {categories.filter((c) => c.isActive).map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {filteredMenuItems.map((item) => {
                      const inCart = cart.find((c) => c.menuItemId === item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 p-3 rounded-md border hover-elevate cursor-pointer"
                          onClick={() => addToCart(item)}
                          data-testid={`menu-item-${item.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-semibold text-sm">{parseFloat(item.price).toFixed(2)} TL</span>
                            {inCart && (
                              <Badge variant="default" className="text-xs">{inCart.quantity}</Badge>
                            )}
                            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); addToCart(item); }} data-testid={`button-add-${item.id}`}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {filteredMenuItems.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">Urun bulunamadi</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right: Cart & Order */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Sepet ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Sepet bos</p>
                ) : (
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.menuItemId} className="flex items-center justify-between gap-2 p-2 rounded-md border" data-testid={`cart-item-${item.menuItemId}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.menuItemName}</p>
                            <p className="text-xs text-muted-foreground">
                              {parseFloat(item.unitPrice).toFixed(2)} TL x {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" variant="ghost" onClick={() => updateCartQuantity(item.menuItemId, -1)} data-testid={`button-decrease-${item.menuItemId}`}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <Button size="icon" variant="ghost" onClick={() => updateCartQuantity(item.menuItemId, 1)} data-testid={`button-increase-${item.menuItemId}`}>
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => removeFromCart(item.menuItemId)} data-testid={`button-remove-${item.menuItemId}`}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            <span className="font-semibold text-sm w-16 text-right">{parseFloat(item.totalPrice).toFixed(2)} TL</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {cart.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between font-bold text-lg" data-testid="text-cart-total">
                      <span>Toplam</span>
                      <span>{cartTotal.toFixed(2)} TL</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Siparis Detaylari
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Teslimat Tipi</Label>
                  <Select value={deliveryType} onValueChange={(v) => setDeliveryType(v as "delivery" | "pickup")}>
                    <SelectTrigger data-testid="select-delivery-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivery">Eve Teslim</SelectItem>
                      <SelectItem value="pickup">Gel Al</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Odeme Yontemi</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "cash" | "pos")}>
                    <SelectTrigger data-testid="select-payment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Nakit</SelectItem>
                      <SelectItem value="pos">POS / Kart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Siparis Notu</Label>
                  <Textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Ek notlar..."
                    className="resize-none"
                    data-testid="input-order-notes"
                  />
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    className="w-full"
                    onClick={handleCreateOrder}
                    disabled={!selectedCustomer || cart.length === 0 || createOrderMutation.isPending}
                    data-testid="button-create-order"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {createOrderMutation.isPending ? "Olusturuluyor..." : "Siparisi Onayla"}
                  </Button>
                  {cart.length > 0 && (
                    <Button variant="outline" onClick={() => printOrder()} data-testid="button-print-preview">
                      <Printer className="w-4 h-4 mr-2" />
                      Yazdir
                    </Button>
                  )}
                  {lastCreatedOrder && selectedCustomer && (
                    <Button
                      variant="outline"
                      className="w-full text-green-700 dark:text-green-400 border-green-300 dark:border-green-700"
                      onClick={() => sendWhatsAppFromCart(selectedCustomer.phone, cart.length > 0 ? cart : [], cartTotal, deliveryType)}
                      data-testid="button-whatsapp-customer"
                    >
                      <SiWhatsapp className="w-4 h-4 mr-2" />
                      WhatsApp Mesaji Gonder
                    </Button>
                  )}
                </div>
                {!selectedCustomer && cart.length > 0 && (
                  <p className="text-xs text-destructive text-center">Siparis olusturmak icin once musteri secin</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
