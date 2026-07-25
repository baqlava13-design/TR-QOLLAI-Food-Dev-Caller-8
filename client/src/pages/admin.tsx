import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUpload } from "@/hooks/use-upload";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingBag,
  CheckCircle,
  Truck,
  Users,
  TrendingUp,
  Printer,
  Eye,
  ArrowLeft,
  Sun,
  Moon,
  LogOut,
  Settings,
  UtensilsCrossed,
  FolderOpen,
  Star,
  Image,
  Pencil,
  Trash2,
  Plus,
  Save,
  Download,
  Upload,
  Type,
  Gift,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Palette,
  Phone,
  Bell,
  BellOff,
  Shield,
  UserCog,
  BarChart3,
  CalendarDays,
} from "lucide-react";
import { SiWhatsapp, SiFacebook, SiInstagram } from "react-icons/si";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Order, OrderItem, Category, MenuItem, Review, Customer, Neighborhood, ProfitChannel, DailyChannelRevenue } from "@shared/schema";

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioCtx;
}

function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}

if (typeof window !== "undefined") {
  document.addEventListener("click", unlockAudio, { once: true });
  document.addEventListener("keydown", unlockAudio, { once: true });
}

async function playNotificationSound() {
  try {
    const audioCtx = getAudioContext();
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    const strike = (freq: number, time: number, dur: number, vol: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, time + dur);
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.start(time);
      osc.stop(time + dur);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(freq * 2.76, time);
      gain2.gain.setValueAtTime(vol * 0.3, time);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.5);
      osc2.start(time);
      osc2.stop(time + dur * 0.5);
    };

    strike(830, now, 0.8, 0.35);
    strike(830, now + 0.25, 0.8, 0.2);
    strike(1046, now + 0.6, 1.0, 0.3);
  } catch (e) {
    console.warn("Could not play notification sound", e);
  }
}

interface OrderWithItems extends Order {
  items?: OrderItem[];
}

interface DashboardStats {
  todayOrders: number;
  confirmedOrders: number;
  deliveredOrders: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalCustomers: number;
}

// Sortable table head component
type SortDirection = "asc" | "desc" | null;
type SortConfig = { key: string; direction: SortDirection };

function SortableTableHead({
  column,
  label,
  sortConfig,
  onSort,
}: {
  column: string;
  label: string;
  sortConfig: SortConfig;
  onSort: (column: string) => void;
}) {
  const isActive = sortConfig.key === column;
  return (
    <TableHead
      className="cursor-pointer select-none hover-elevate"
      onClick={() => onSort(column)}
      data-testid={`sort-${column}`}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          sortConfig.direction === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}

type ColumnType = "string" | "number" | "boolean" | "date";
type ColumnDef = ColumnType | { type: ColumnType; accessor?: (item: any) => any };
type ColumnDefs = Record<string, ColumnDef>;

function useSorting<T>(initialKey: string = "", initialDirection: SortDirection = null) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: initialKey, direction: initialDirection });

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        if (prev.direction === "desc") return { key: "", direction: null };
        return { key, direction: "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortData = useCallback((data: T[], columnDefs: ColumnDefs = {}) => {
    if (!sortConfig.key || !sortConfig.direction) return data;
    
    const colDef = columnDefs[sortConfig.key];
    const colType: ColumnType = typeof colDef === "object" ? colDef.type : (colDef || "string");
    const accessor = typeof colDef === "object" && colDef.accessor ? colDef.accessor : (item: any) => getNestedValue(item, sortConfig.key);
    
    return [...data].sort((a, b) => {
      const aVal = accessor(a);
      const bVal = accessor(b);
      
      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortConfig.direction === "asc" ? 1 : -1;
      if (bVal == null) return sortConfig.direction === "asc" ? -1 : 1;
      
      let comparison = 0;
      
      switch (colType) {
        case "number": {
          const aNum = parseFloat(String(aVal));
          const bNum = parseFloat(String(bVal));
          comparison = aNum - bNum;
          break;
        }
        case "boolean": {
          const aBool = aVal === true || aVal === "true" ? 1 : 0;
          const bBool = bVal === true || bVal === "true" ? 1 : 0;
          comparison = aBool - bBool;
          break;
        }
        case "date": {
          const aDate = aVal instanceof Date ? aVal : new Date(String(aVal));
          const bDate = bVal instanceof Date ? bVal : new Date(String(bVal));
          const aTime = aDate.getTime();
          const bTime = bDate.getTime();
          // Guard against invalid dates
          if (isNaN(aTime) && isNaN(bTime)) {
            comparison = 0;
          } else if (isNaN(aTime)) {
            comparison = 1; // Invalid dates sort last
          } else if (isNaN(bTime)) {
            comparison = -1;
          } else {
            comparison = aTime - bTime;
          }
          break;
        }
        default: // string
          comparison = String(aVal).localeCompare(String(bVal), "tr");
      }
      
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [sortConfig.key, sortConfig.direction]);

  return { sortConfig, handleSort, sortData };
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  preparing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  out_for_delivery: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

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

      if (!response.ok) {
        throw new Error(data.error || "Giriş başarısız");
      }

      // Save token to localStorage for subsequent requests
      if (data.token) {
        localStorage.setItem("adminToken", data.token);
      }

      onLogin();
    } catch (err: any) {
      setError(err.message || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">DP</span>
          </div>
          <CardTitle className="text-2xl">Yönetici Girişi</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                data-testid="input-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersTab({ notificationsEnabled, setNotificationsEnabled }: { notificationsEnabled: boolean; setNotificationsEnabled: (v: boolean) => void }) {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const { sortConfig, handleSort, sortData } = useSorting<OrderWithItems>("createdAt", "desc");
  const orderColumnDefs: ColumnDefs = {
    id: "string",
    createdAt: "date",
    customerName: "string",
    total: "number",
    status: "string",
  };

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
  });

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/orders/export/${format}`, { credentials: "include", headers });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `siparisler.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Dışa aktarma başarılı" });
    } catch {
      toast({ title: "Hata", description: "Dışa aktarma başarısız", variant: "destructive" });
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Sipariş güncellendi" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest("DELETE", `/api/admin/orders/${orderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Sipariş silindi" });
    },
  });

  const filteredOrders = sortData(orders.filter((order) => {
    // Status filter
    if (filterStatus !== "all" && order.status !== filterStatus) return false;
    
    // Date range filter
    if (startDate || endDate) {
      const orderDate = order.createdAt ? new Date(order.createdAt) : null;
      if (!orderDate) return false;
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
    }
    
    return true;
  }), orderColumnDefs);

  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  const sendWhatsAppToCustomer = (order: OrderWithItems) => {
    let phone = (order.customerPhone || "").replace(/\D/g, "");
    if (phone.startsWith("0")) {
      phone = "90" + phone.substring(1);
    } else if (!phone.startsWith("90")) {
      phone = "90" + phone;
    }
    const itemsText = order.items?.map(i => `${i.quantity}x ${i.menuItemName}`).join(", ") || "";
    const total = parseFloat(order.total).toFixed(2);
    const deliveryText = (order as any).deliveryType === "pickup" ? "Gel Al" : "Eve Teslim";
    const message = `Merhaba! Siparisiniz alindi.\n\nSiparis: ${itemsText}\nToplam: ${total} TL\nTeslimat: ${deliveryText}\n\nTahmini teslimat: 30-45 dk. Afiyet olsun!`;
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`, "_blank");
  };

  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const handlePrint = (order: OrderWithItems) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    const statusMap: Record<string, string> = {
      pending: "Beklemede",
      confirmed: "Onaylandi",
      preparing: "Hazirlaniyor",
      out_for_delivery: "Yola Cikti",
      delivered: "Teslim Edildi",
      cancelled: "Iptal",
    };

    const total = order.items?.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0) || parseFloat(order.total);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Siparis Fisi</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; width: 280px; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
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
            ${(order.items || []).map((item) => `<tr><td>${item.menuItemName}</td><td class="qty">${item.quantity}</td><td class="price">${parseFloat(item.totalPrice).toFixed(2)} TL</td></tr>`).join("")}
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

  const defaultStats: DashboardStats = {
    todayOrders: 0, confirmedOrders: 0, deliveredOrders: 0,
    todayRevenue: 0, weekRevenue: 0, monthRevenue: 0, totalCustomers: 0,
  };

  const displayStats = stats || defaultStats;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bugün</p>
                <p className="text-2xl font-bold">{displayStats.todayOrders}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Onaylanan</p>
                <p className="text-2xl font-bold">{displayStats.confirmedOrders}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Teslim</p>
                <p className="text-2xl font-bold">{displayStats.deliveredOrders}</p>
              </div>
              <Truck className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bugün Ciro</p>
                <p className="text-2xl font-bold">{displayStats.todayRevenue.toFixed(0)} TL</p>
              </div>
              <span className="h-8 w-8 flex items-center justify-center text-xl font-bold text-primary opacity-50">₺</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Haftalık Ciro</p>
                <p className="text-2xl font-bold text-blue-600">{displayStats.weekRevenue.toFixed(0)} TL</p>
              </div>
              <span className="h-8 w-8 flex items-center justify-center text-xl font-bold text-blue-500 opacity-50">₺</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aylık Ciro</p>
                <p className="text-2xl font-bold text-green-600">{displayStats.monthRevenue.toFixed(0)} TL</p>
              </div>
              <span className="h-8 w-8 flex items-center justify-center text-xl font-bold text-green-500 opacity-50">₺</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <CardTitle>Siparişler</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")} data-testid="button-orders-export-excel">
                <Download className="h-4 w-4 mr-1" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("csv")} data-testid="button-orders-export-csv">
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="confirmed">Onaylandı</SelectItem>
                  <SelectItem value="preparing">Hazırlanıyor</SelectItem>
                  <SelectItem value="out_for_delivery">Yola Çıktı</SelectItem>
                  <SelectItem value="delivered">Teslim Edildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Başlangıç:</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
                data-testid="input-start-date"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Bitiş:</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
                data-testid="input-end-date"
              />
            </div>
            {(startDate || endDate) && (
              <Button variant="outline" size="sm" onClick={clearDateFilters} data-testid="button-clear-date-filter">
                Temizle
              </Button>
            )}
            <Button
              size="icon"
              variant={notificationsEnabled ? "default" : "ghost"}
              onClick={() => {
                const next = !notificationsEnabled;
                setNotificationsEnabled(next);
                if (next) {
                  playNotificationSound();
                }
              }}
              data-testid="button-toggle-notifications"
            >
              {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Sipariş yok</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead column="id" label="No" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableTableHead column="createdAt" label="Tarih / Saat" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableTableHead column="customerName" label="Müşteri" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableTableHead column="total" label="Toplam" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableTableHead column="status" label="Durum" sortConfig={sortConfig} onSort={handleSort} />
                    <TableHead>İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">#{order.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {order.createdAt ? `${new Date(order.createdAt).toLocaleDateString("tr-TR")} ${new Date(order.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}` : "-"}
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell className="font-bold">{parseFloat(order.total).toFixed(2)} TL</TableCell>
                      <TableCell>
                        <Select
                          value={order.status || "pending"}
                          onValueChange={(value) => updateStatusMutation.mutate({ orderId: order.id, status: value })}
                        >
                          <SelectTrigger className={`w-[130px] ${statusColors[order.status || "pending"]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Beklemede</SelectItem>
                            <SelectItem value="confirmed">Onaylandı</SelectItem>
                            <SelectItem value="preparing">Hazırlanıyor</SelectItem>
                            <SelectItem value="out_for_delivery">Yola Çıktı</SelectItem>
                            <SelectItem value="delivered">Teslim Edildi</SelectItem>
                            <SelectItem value="cancelled">İptal</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setSelectedOrder(order)} data-testid={`button-view-order-${order.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => sendWhatsAppToCustomer(order)} data-testid={`button-whatsapp-order-${order.id}`}>
                            <SiWhatsapp className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handlePrint(order)} data-testid={`button-print-order-${order.id}`}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(order.id)} data-testid={`button-delete-order-${order.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sipariş #{selectedOrder.id.slice(0, 8)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="font-semibold">{selectedOrder.customerName}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone}</p>
                <p className="text-sm">{selectedOrder.customerAddress}</p>
              </div>
              <Separator />
              {selectedOrder.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.menuItemName}</span>
                  <span>{parseFloat(item.totalPrice).toFixed(2)} TL</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Toplam</span>
                <span>{parseFloat(selectedOrder.total).toFixed(2)} TL</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CategoriesTab() {
  const { toast } = useToast();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", description: "", image: "" });
  const [showNew, setShowNew] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const { sortConfig, handleSort, sortData } = useSorting<Category>();
  const categoryColumnDefs: ColumnDefs = {
    name: "string",
    description: "string",
  };

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/categories/export/${format}`, { credentials: "include", headers });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kategoriler.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Dışa aktarma başarılı" });
    } catch {
      toast({ title: "Hata", description: "Dışa aktarma başarısız", variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("file", file);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/categories/import", { method: "POST", body: formData, credentials: "include", headers });
      if (!res.ok) throw new Error("Import failed");
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "İçe aktarma tamamlandı", description: `${result.imported} kategori eklendi, ${result.skipped} atlandı` });
    } catch {
      toast({ title: "Hata", description: "İçe aktarma başarısız", variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setNewCategory({ name: "", description: "", image: "" });
      setShowNew(false);
      toast({ title: "Kategori eklendi" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setEditingCategory(null);
      toast({ title: "Kategori güncellendi" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Kategori silindi" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-bold">Kategoriler</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")} data-testid="button-categories-export-excel">
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} data-testid="button-categories-export-csv">
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing} data-testid="button-categories-import">
            <Upload className="h-4 w-4 mr-1" /> {importing ? "Yükleniyor..." : "İçe Aktar"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} className="hidden" />
          <Button onClick={() => setShowNew(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Yeni Kategori
          </Button>
        </div>
      </div>

      {showNew && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Kategori Adı</Label>
                <Input value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
              </div>
              <div>
                <Label>Açıklama</Label>
                <Input value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} />
              </div>
              <div>
                <Label>Resim</Label>
                <div className="flex gap-2">
                  <Input value={newCategory.image} onChange={(e) => setNewCategory({ ...newCategory, image: e.target.value })} placeholder="URL veya dosya yükle" className="flex-1" />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const formData = new FormData();
                          formData.append("file", file);
                          const res = await fetch("/api/uploads/local", { method: "POST", body: formData });
                          if (!res.ok) throw new Error("Yükleme hatası");
                          const { path } = await res.json();
                          setNewCategory({ ...newCategory, image: path });
                          toast({ title: "Resim yüklendi" });
                        } catch {
                          toast({ title: "Hata", description: "Resim yüklenemedi", variant: "destructive" });
                        }
                      }}
                      data-testid="input-new-category-image-file"
                    />
                    <Button type="button" variant="outline" size="icon" asChild><span><Upload className="h-4 w-4" /></span></Button>
                  </label>
                </div>
                {newCategory.image && <img src={newCategory.image} alt="Önizleme" className="w-20 h-20 object-cover rounded mt-2" />}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate(newCategory)}>Kaydet</Button>
              <Button variant="outline" onClick={() => setShowNew(false)}>İptal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="name" label="Ad" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHead column="description" label="Açıklama" sortConfig={sortConfig} onSort={handleSort} />
                  <TableHead>Resim</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortData(categories, categoryColumnDefs).map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>{cat.description || "-"}</TableCell>
                    <TableCell>
                      {cat.image ? <img src={cat.image} alt="" className="w-12 h-12 object-cover rounded" /> : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditingCategory(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(cat.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editingCategory && (
        <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kategori Düzenle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Ad</Label>
                <Input value={editingCategory.name} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} />
              </div>
              <div>
                <Label>Açıklama</Label>
                <Input value={editingCategory.description || ""} onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })} />
              </div>
              <div>
                <Label>Resim</Label>
                <div className="flex gap-2">
                  <Input value={editingCategory.image || ""} onChange={(e) => setEditingCategory({ ...editingCategory, image: e.target.value })} placeholder="URL veya dosya yükle" className="flex-1" />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const formData = new FormData();
                          formData.append("file", file);
                          const res = await fetch("/api/uploads/local", { method: "POST", body: formData });
                          if (!res.ok) throw new Error("Yükleme hatası");
                          const { path } = await res.json();
                          setEditingCategory({ ...editingCategory, image: path });
                          toast({ title: "Resim yüklendi" });
                        } catch {
                          toast({ title: "Hata", description: "Resim yüklenemedi", variant: "destructive" });
                        }
                      }}
                      data-testid="input-edit-category-image-file"
                    />
                    <Button type="button" variant="outline" size="icon" asChild><span><Upload className="h-4 w-4" /></span></Button>
                  </label>
                </div>
                {editingCategory.image && <img src={editingCategory.image} alt="Önizleme" className="w-20 h-20 object-cover rounded mt-2" />}
              </div>
              <Button onClick={() => updateMutation.mutate({ id: editingCategory.id, data: editingCategory })}>
                Kaydet
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MenuItemsTab() {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "", description: "", price: "", originalPrice: "", image: "", categoryId: "", isAvailable: true, isKampanya: false, kampanyaTag: ""
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const { sortConfig, handleSort, sortData } = useSorting<MenuItem>();

  const { data: items = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const categoryMap = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.id] = cat.name;
      return acc;
    }, {} as Record<string, string>);
  }, [categories]);

  const menuItemColumnDefs: ColumnDefs = useMemo(() => ({
    name: "string",
    price: "number",
    originalPrice: "number",
    categoryId: { type: "string", accessor: (item: MenuItem) => categoryMap[item.categoryId ?? ""] || "" },
    isKampanya: "boolean",
    isAvailable: "boolean",
  }), [categoryMap]);

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/menu-items/export/${format}`, { credentials: "include", headers });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `menu.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Dışa aktarma başarılı" });
    } catch {
      toast({ title: "Hata", description: "Dışa aktarma başarısız", variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("file", file);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/menu-items/import", { method: "POST", body: formData, credentials: "include", headers });
      if (!res.ok) throw new Error("Import failed");
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({ title: "İçe aktarma tamamlandı", description: `${result.imported} ürün eklendi, ${result.skipped} atlandı` });
    } catch {
      toast({ title: "Hata", description: "İçe aktarma başarısız", variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const cleanedData = {
        ...data,
        categoryId: data.categoryId || null,
        originalPrice: data.originalPrice || null,
      };
      return apiRequest("POST", "/api/admin/menu-items", cleanedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setNewItem({ name: "", description: "", price: "", originalPrice: "", image: "", categoryId: "", isAvailable: true, isKampanya: false, kampanyaTag: "" });
      setShowNew(false);
      toast({ title: "Ürün eklendi" });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: "Ürün eklenemedi: " + error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/menu-items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setEditingItem(null);
      toast({ title: "Ürün güncellendi" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/menu-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({ title: "Ürün silindi" });
    },
    onError: (error: Error) => {
      console.error("Delete error:", error);
      toast({ title: "Silme hatası", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-bold">Menü Ürünleri</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")} data-testid="button-menu-export-excel">
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} data-testid="button-menu-export-csv">
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing} data-testid="button-menu-import">
            <Upload className="h-4 w-4 mr-1" /> {importing ? "Yükleniyor..." : "İçe Aktar"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} className="hidden" />
          <Button onClick={() => setShowNew(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Yeni Ürün
          </Button>
        </div>
      </div>

      {showNew && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Ürün Adı</Label>
                <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
              </div>
              <div>
                <Label>Fiyat (TL)</Label>
                <Input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
              </div>
              <div>
                <Label>Orijinal Fiyat (TL) - Kampanya için</Label>
                <Input type="number" value={newItem.originalPrice} onChange={(e) => setNewItem({ ...newItem, originalPrice: e.target.value })} placeholder="Kampanya öncesi fiyat" />
              </div>
              <div>
                <Label>Açıklama</Label>
                <Textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
              </div>
              <div>
                <Label>Resim</Label>
                <div className="flex gap-2">
                  <Input value={newItem.image} onChange={(e) => setNewItem({ ...newItem, image: e.target.value })} placeholder="URL veya dosya yükle" className="flex-1" />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const formData = new FormData();
                          formData.append("file", file);
                          const res = await fetch("/api/uploads/local", { method: "POST", body: formData });
                          if (!res.ok) throw new Error("Yükleme hatası");
                          const { path } = await res.json();
                          setNewItem({ ...newItem, image: path });
                          toast({ title: "Resim yüklendi" });
                        } catch {
                          toast({ title: "Hata", description: "Resim yüklenemedi", variant: "destructive" });
                        }
                      }}
                      data-testid="input-new-item-image-file"
                    />
                    <Button type="button" variant="outline" size="icon" asChild><span><Upload className="h-4 w-4" /></span></Button>
                  </label>
                </div>
                {newItem.image && <img src={newItem.image} alt="Önizleme" className="w-20 h-20 object-cover rounded mt-2" />}
              </div>
              <div>
                <Label>Kategori</Label>
                <Select value={newItem.categoryId} onValueChange={(v) => setNewItem({ ...newItem, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Kategori seç" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kampanya Etiketi</Label>
                <Input value={newItem.kampanyaTag} onChange={(e) => setNewItem({ ...newItem, kampanyaTag: e.target.value })} placeholder="ornek: %20 indirim" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={newItem.isAvailable} onCheckedChange={(v) => setNewItem({ ...newItem, isAvailable: v })} />
                  <Label>Mevcut</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newItem.isKampanya} onCheckedChange={(v) => setNewItem({ ...newItem, isKampanya: v })} />
                  <Label>Kampanya</Label>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate(newItem)}>Kaydet</Button>
              <Button variant="outline" onClick={() => setShowNew(false)}>İptal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resim</TableHead>
                    <SortableTableHead column="name" label="Ad" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableTableHead column="price" label="Fiyat" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableTableHead column="originalPrice" label="Orijinal Fiyat" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableTableHead column="categoryId" label="Kategori" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableTableHead column="isKampanya" label="Kampanya" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableTableHead column="isAvailable" label="Durum" sortConfig={sortConfig} onSort={handleSort} />
                    <TableHead>İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortData(items, menuItemColumnDefs).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.image ? <img src={item.image} alt="" className="w-12 h-12 object-cover rounded" /> : "-"}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className={item.originalPrice && parseFloat(item.originalPrice) > parseFloat(item.price) ? "text-red-600 font-bold" : ""}>
                        {parseFloat(item.price).toFixed(2)} TL
                      </TableCell>
                      <TableCell>
                        {item.originalPrice ? <span className="line-through text-muted-foreground">{parseFloat(item.originalPrice).toFixed(2)} TL</span> : "-"}
                      </TableCell>
                      <TableCell>{categories.find(c => c.id === item.categoryId)?.name || "-"}</TableCell>
                      <TableCell>
                        {item.isKampanya ? <Badge className="bg-red-500">{item.kampanyaTag || "Kampanya"}</Badge> : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isAvailable ? "default" : "secondary"}>
                          {item.isAvailable ? "Mevcut" : "Yok"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditingItem(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ürün Düzenle</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Ürün Adı</Label>
                <Input value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} />
              </div>
              <div>
                <Label>Fiyat (TL)</Label>
                <Input type="number" value={editingItem.price} onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })} />
              </div>
              <div>
                <Label>Orijinal Fiyat (TL)</Label>
                <Input type="number" value={editingItem.originalPrice || ""} onChange={(e) => setEditingItem({ ...editingItem, originalPrice: e.target.value })} placeholder="Kampanya öncesi fiyat" />
              </div>
              <div className="md:col-span-2">
                <Label>Açıklama</Label>
                <Textarea value={editingItem.description || ""} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} />
              </div>
              <div>
                <Label>Resim</Label>
                <div className="flex gap-2">
                  <Input value={editingItem.image || ""} onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })} placeholder="URL veya dosya yükle" className="flex-1" />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const formData = new FormData();
                          formData.append("file", file);
                          const res = await fetch("/api/uploads/local", { method: "POST", body: formData });
                          if (!res.ok) throw new Error("Yükleme hatası");
                          const { path } = await res.json();
                          setEditingItem({ ...editingItem, image: path });
                          toast({ title: "Resim yüklendi" });
                        } catch {
                          toast({ title: "Hata", description: "Resim yüklenemedi", variant: "destructive" });
                        }
                      }}
                      data-testid="input-edit-item-image-file"
                    />
                    <Button type="button" variant="outline" size="icon" asChild><span><Upload className="h-4 w-4" /></span></Button>
                  </label>
                </div>
                {editingItem.image && <img src={editingItem.image} alt="Önizleme" className="w-20 h-20 object-cover rounded mt-2" />}
              </div>
              <div>
                <Label>Kategori</Label>
                <Select value={editingItem.categoryId || ""} onValueChange={(v) => setEditingItem({ ...editingItem, categoryId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kampanya Etiketi</Label>
                <Input value={editingItem.kampanyaTag || ""} onChange={(e) => setEditingItem({ ...editingItem, kampanyaTag: e.target.value })} />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={editingItem.isAvailable ?? true} onCheckedChange={(v) => setEditingItem({ ...editingItem, isAvailable: v })} />
                  <Label>Mevcut</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editingItem.isKampanya ?? false} onCheckedChange={(v) => setEditingItem({ ...editingItem, isKampanya: v })} />
                  <Label>Kampanya</Label>
                </div>
              </div>
            </div>
            <Button onClick={() => updateMutation.mutate({ id: editingItem.id, data: editingItem })} className="mt-4">
              Kaydet
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ReviewsTab() {
  const { toast } = useToast();
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const { sortConfig, handleSort, sortData } = useSorting<Review>();
  const reviewColumnDefs: ColumnDefs = {
    customerName: "string",
    comment: "string",
    rating: "number",
    isApproved: "boolean",
  };

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["/api/admin/reviews"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reviews", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/reviews/export/${format}`, { credentials: "include", headers });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yorumlar.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Dışa aktarma başarılı" });
    } catch {
      toast({ title: "Hata", description: "Dışa aktarma başarısız", variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("file", file);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/reviews/import", { method: "POST", body: formData, credentials: "include", headers });
      if (!res.ok) throw new Error("Import failed");
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: "İçe aktarma tamamlandı", description: `${result.imported} yorum eklendi, ${result.skipped} atlandı` });
    } catch {
      toast({ title: "Hata", description: "İçe aktarma başarısız", variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      setEditingReview(null);
      toast({ title: "Yorum güncellendi" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/admin/reviews/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: "Yorum silindi" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-bold">Müşteri Yorumları</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")} data-testid="button-reviews-export-excel">
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} data-testid="button-reviews-export-csv">
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing} data-testid="button-reviews-import">
            <Upload className="h-4 w-4 mr-1" /> {importing ? "Yükleniyor..." : "İçe Aktar"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} className="hidden" />
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Yorum yok</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="customerName" label="Müşteri" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHead column="comment" label="Yorum" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHead column="rating" label="Puan" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHead column="isApproved" label="Onaylı" sortConfig={sortConfig} onSort={handleSort} />
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortData(reviews, reviewColumnDefs).map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">{review.customerName}</TableCell>
                    <TableCell className="max-w-xs truncate">{review.comment}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {review.rating} <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={review.isApproved ?? false}
                        onCheckedChange={(v) => updateMutation.mutate({ id: review.id, data: { isApproved: v } })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditingReview(review)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(review.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editingReview && (
        <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yorum Düzenle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Müşteri Adı</Label>
                <Input value={editingReview.customerName} onChange={(e) => setEditingReview({ ...editingReview, customerName: e.target.value })} />
              </div>
              <div>
                <Label>Yorum</Label>
                <Textarea value={editingReview.comment || ""} onChange={(e) => setEditingReview({ ...editingReview, comment: e.target.value })} />
              </div>
              <div>
                <Label>Puan (1-5)</Label>
                <Input type="number" min="1" max="5" value={editingReview.rating} onChange={(e) => setEditingReview({ ...editingReview, rating: parseInt(e.target.value) })} />
              </div>
              <Button onClick={() => updateMutation.mutate({ id: editingReview.id, data: editingReview })}>
                Kaydet
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CrossSellTab() {
  const { toast } = useToast();
  
  const { data: crossSellProducts = [], isLoading: loadingCrossSell } = useQuery({
    queryKey: ["/api/admin/cross-sell"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/cross-sell", { credentials: "include", headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: menuItems = [], isLoading: loadingMenu } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const addMutation = useMutation({
    mutationFn: async (menuItemId: string) => {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/cross-sell", {
        method: "POST",
        headers,
        body: JSON.stringify({ menuItemId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cross-sell"] });
      toast({ title: "Ürün eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ürün eklenemedi", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(`/api/admin/cross-sell/${id}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cross-sell"] });
      toast({ title: "Ürün kaldırıldı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ürün kaldırılamadı", variant: "destructive" });
    },
  });

  const selectedIds = crossSellProducts.map((p: any) => p.menuItemId);
  const availableItems = menuItems.filter((item: MenuItem) => !selectedIds.includes(item.id));

  if (loadingCrossSell || loadingMenu) {
    return <div className="p-8 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Sepet Upsell / Cross-sell Ürünleri</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" /> Sepette Gösterilecek Önerilen Ürünler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Müşteriler sepetlerini görüntülerken bu ürünler öneri olarak gösterilecek.
          </p>

          <div className="space-y-2">
            <Label>Yeni Ürün Ekle</Label>
            <Select onValueChange={(value) => addMutation.mutate(value)}>
              <SelectTrigger data-testid="select-cross-sell-product">
                <SelectValue placeholder="Ürün seçin..." />
              </SelectTrigger>
              <SelectContent>
                {availableItems.map((item: MenuItem) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} - {parseFloat(item.price).toFixed(2)} TL
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 mt-4">
            <Label>Seçili Ürünler ({crossSellProducts.length})</Label>
            {crossSellProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz ürün eklenmedi.</p>
            ) : (
              <div className="space-y-2">
                {crossSellProducts.map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    data-testid={`cross-sell-item-${product.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {product.menuItem?.image && (
                        <img
                          src={product.menuItem.image}
                          alt={product.menuItem?.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium">{product.menuItem?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {parseFloat(product.menuItem?.price || 0).toFixed(2)} TL
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeMutation.mutate(product.id)}
                      data-testid={`button-remove-cross-sell-${product.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NeighborhoodsTab() {
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [editingItem, setEditingItem] = useState<Neighborhood | null>(null);
  const [newItem, setNewItem] = useState({
    name: "",
    minimumOrderAmount: "",
    isActive: true,
    sortOrder: 0,
  });
  const { sortConfig, handleSort, sortData } = useSorting<Neighborhood>();
  const neighborhoodColumnDefs: ColumnDefs = {
    name: "string",
    minimumOrderAmount: "number",
    isActive: "boolean",
  };

  const { data: neighborhoods = [], isLoading } = useQuery<Neighborhood[]>({
    queryKey: ["/api/admin/neighborhoods"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/neighborhoods", { credentials: "include", headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/neighborhoods", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/neighborhoods"] });
      setNewItem({ name: "", minimumOrderAmount: "", isActive: true, sortOrder: 0 });
      setShowNew(false);
      toast({ title: "Mahalle eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Mahalle eklenemedi", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/neighborhoods/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/neighborhoods"] });
      setEditingItem(null);
      toast({ title: "Mahalle güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Mahalle güncellenemedi", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(`/api/admin/neighborhoods/${id}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/neighborhoods"] });
      toast({ title: "Mahalle silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Mahalle silinemedi", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Mahalle Yönetimi</h2>
        <Button onClick={() => setShowNew(true)} data-testid="button-add-neighborhood">
          <Plus className="h-4 w-4 mr-2" /> Yeni Mahalle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Mahalleler ve Minimum Sipariş Tutarları
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showNew && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/50 space-y-4">
              <h3 className="font-semibold">Yeni Mahalle Ekle</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Mahalle Adı</Label>
                  <Input
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Örn: Merkez Mahallesi"
                    data-testid="input-neighborhood-name"
                  />
                </div>
                <div>
                  <Label>Minimum Sipariş Tutarı (TL)</Label>
                  <Input
                    type="number"
                    value={newItem.minimumOrderAmount}
                    onChange={(e) => setNewItem({ ...newItem, minimumOrderAmount: e.target.value })}
                    placeholder="0"
                    data-testid="input-neighborhood-min-order"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newItem.isActive}
                      onCheckedChange={(v) => setNewItem({ ...newItem, isActive: v })}
                      data-testid="switch-neighborhood-active"
                    />
                    <Label>Aktif</Label>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => createMutation.mutate(newItem)}
                  disabled={!newItem.name || createMutation.isPending}
                  data-testid="button-save-neighborhood"
                >
                  <Save className="h-4 w-4 mr-2" /> Kaydet
                </Button>
                <Button variant="outline" onClick={() => setShowNew(false)}>
                  İptal
                </Button>
              </div>
            </div>
          )}

          {neighborhoods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Henüz mahalle eklenmedi. Yeni mahalle ekleyerek teslimat bölgelerini tanımlayabilirsiniz.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="name" label="Mahalle Adı" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHead column="minimumOrderAmount" label="Min. Sipariş Tutarı" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHead column="isActive" label="Durum" sortConfig={sortConfig} onSort={handleSort} />
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortData(neighborhoods, neighborhoodColumnDefs).map((neighborhood) => (
                  <TableRow key={neighborhood.id} data-testid={`row-neighborhood-${neighborhood.id}`}>
                    {editingItem?.id === neighborhood.id ? (
                      <>
                        <TableCell>
                          <Input
                            value={editingItem.name}
                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                            data-testid="input-edit-neighborhood-name"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editingItem.minimumOrderAmount || ""}
                            onChange={(e) => setEditingItem({ ...editingItem, minimumOrderAmount: e.target.value })}
                            data-testid="input-edit-neighborhood-min-order"
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={editingItem.isActive ?? true}
                            onCheckedChange={(v) => setEditingItem({ ...editingItem, isActive: v })}
                            data-testid="switch-edit-neighborhood-active"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateMutation.mutate({
                                id: editingItem.id,
                                data: {
                                  name: editingItem.name,
                                  minimumOrderAmount: editingItem.minimumOrderAmount,
                                  isActive: editingItem.isActive,
                                },
                              })}
                              disabled={updateMutation.isPending}
                              data-testid="button-update-neighborhood"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                              İptal
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{neighborhood.name}</TableCell>
                        <TableCell>
                          {neighborhood.minimumOrderAmount
                            ? `${parseFloat(neighborhood.minimumOrderAmount).toFixed(2)} TL`
                            : "Yok"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={neighborhood.isActive ? "default" : "secondary"}>
                            {neighborhood.isActive ? "Aktif" : "Pasif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingItem(neighborhood)}
                              data-testid={`button-edit-neighborhood-${neighborhood.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(neighborhood.id)}
                              data-testid={`button-delete-neighborhood-${neighborhood.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({
    whatsapp_number: "",
    hero_image: "",
    company_logo: "",
    facebook_url: "",
    instagram_url: "",
    hero_title: "",
    hero_subtitle: "",
    menu_section_title: "",
    how_it_works_title: "",
    reviews_section_title: "",
    footer_text: "",
    footer_logo_name: "",
    footer_address: "",
    footer_phone: "",
    footer_email: "",
    footer_hours_weekday: "",
    footer_hours_weekend: "",
    minimum_order_amount: "",
    brand_primary_color: "",
    brand_accent_color: "",
  });

  const { data: settingsData = [], isLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/admin/settings", { credentials: "include", headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  useEffect(() => {
    if (settingsData.length > 0) {
      const mapped: Record<string, string> = {};
      settingsData.forEach((s: any) => {
        mapped[s.key] = s.value || "";
      });
      setSettings((prev) => ({ ...prev, ...mapped }));
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Kaydetme hatası" }));
        throw new Error(error.error || "Kaydetme hatası");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Ayarlar kaydedildi" });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = (key: string) => {
    if ((key === "brand_primary_color" || key === "brand_accent_color") && settings[key]) {
      const hex = settings[key].trim();
      if (!/^#[a-fA-F0-9]{6}$/.test(hex)) {
        toast({ title: "Ongeldige kleurcode", description: "Gebruik een geldige hex kleurcode (bijv. #ff5500)", variant: "destructive" });
        return;
      }
    }
    saveMutation.mutate({ key, value: settings[key] });
  };

  const handleSaveAll = () => {
    Object.entries(settings).forEach(([key, value]) => {
      saveMutation.mutate({ key, value });
    });
  };

  // File upload handler for images
  const handleImageUpload = async (file: File, settingKey: string) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/local", { method: "POST", body: formData });
      
      if (!res.ok) {
        throw new Error("Dosya yüklenemedi");
      }
      
      const { path } = await res.json();
      
      setSettings(prev => ({ ...prev, [settingKey]: path }));
      saveMutation.mutate({ key: settingKey, value: path });
      
      toast({ title: "Resim başarıyla yüklendi" });
    } catch (error) {
      toast({ 
        title: "Hata", 
        description: error instanceof Error ? error.message : "Resim yüklenemedi", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Site Ayarları</h2>
        <Button onClick={handleSaveAll} className="gap-2">
          <Save className="h-4 w-4" /> Tüm Ayarları Kaydet
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" /> Genel Ayarlar
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-2">
            <Type className="h-4 w-4" /> Metin İçerikleri
          </TabsTrigger>
          <TabsTrigger value="brand" className="gap-2" data-testid="tab-brand-colors">
            <Palette className="h-4 w-4" /> Kurumsal Kimlik
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SiWhatsapp className="text-whatsapp" /> WhatsApp Ayarları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>WhatsApp Numarası (905xxxxxxxxx)</Label>
                  <Input
                    value={settings.whatsapp_number}
                    onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                    placeholder="905551234567"
                  />
                </div>
                <Button onClick={() => handleSave("whatsapp_number")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" /> Şirket Logosu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Logo Yükle</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "company_logo");
                      }}
                      data-testid="input-company-logo-file"
                    />
                  </div>
                </div>
                <div>
                  <Label>veya URL girin</Label>
                  <Input
                    value={settings.company_logo}
                    onChange={(e) => setSettings({ ...settings, company_logo: e.target.value })}
                    placeholder="https://..."
                    data-testid="input-company-logo"
                  />
                  <Button onClick={() => handleSave("company_logo")} size="sm" className="mt-2">URL Kaydet</Button>
                </div>
                {settings.company_logo && (
                  <img src={settings.company_logo} alt="Logo" className="w-24 h-24 object-contain rounded border p-2" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" /> Hero Resmi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Hero Resmi Yükle</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "hero_image");
                      }}
                      data-testid="input-hero-image-file"
                    />
                  </div>
                </div>
                <div>
                  <Label>veya URL girin</Label>
                  <Input
                    value={settings.hero_image}
                    onChange={(e) => setSettings({ ...settings, hero_image: e.target.value })}
                    placeholder="https://..."
                  />
                  <Button onClick={() => handleSave("hero_image")} size="sm" className="mt-2">URL Kaydet</Button>
                </div>
                {settings.hero_image && (
                  <img src={settings.hero_image} alt="Hero" className="w-full h-32 object-cover rounded" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SiFacebook className="text-blue-600" /> Facebook
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Facebook Sayfa URL</Label>
                  <Input
                    value={settings.facebook_url}
                    onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <Button onClick={() => handleSave("facebook_url")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SiInstagram className="text-pink-600" /> Instagram
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Instagram Sayfa URL</Label>
                  <Input
                    value={settings.instagram_url}
                    onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <Button onClick={() => handleSave("instagram_url")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" /> Minimum Sipariş Tutarı
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Minimum Sipariş (TL)</Label>
                  <Input
                    type="number"
                    value={settings.minimum_order_amount}
                    onChange={(e) => setSettings({ ...settings, minimum_order_amount: e.target.value })}
                    placeholder="100"
                    data-testid="input-minimum-order"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Müşteri bu tutarın altında sipariş veremez
                  </p>
                </div>
                <Button onClick={() => handleSave("minimum_order_amount")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="text" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" /> Hero Basligi (H1)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Ana Başlık</Label>
                  <Input
                    value={settings.hero_title}
                    onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                    placeholder="Sipariş Kolay"
                    data-testid="input-hero-title"
                  />
                </div>
                <Button onClick={() => handleSave("hero_title")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" /> Hero Alt Basligi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Alt Başlık</Label>
                  <Input
                    value={settings.hero_subtitle}
                    onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
                    placeholder="Çorlu'nun en lezzetli pideleri"
                    data-testid="input-hero-subtitle"
                  />
                </div>
                <Button onClick={() => handleSave("hero_subtitle")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" /> Menü Bölümü Başlığı (H2)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Menu Basligi</Label>
                  <Input
                    value={settings.menu_section_title}
                    onChange={(e) => setSettings({ ...settings, menu_section_title: e.target.value })}
                    placeholder="Lezzetli Seçenekler"
                    data-testid="input-menu-title"
                  />
                </div>
                <Button onClick={() => handleSave("menu_section_title")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" /> Nasıl Çalışır Başlığı (H2)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Adimlar Basligi</Label>
                  <Input
                    value={settings.how_it_works_title}
                    onChange={(e) => setSettings({ ...settings, how_it_works_title: e.target.value })}
                    placeholder="Sipariş Vermek Çok Kolay"
                    data-testid="input-how-it-works-title"
                  />
                </div>
                <Button onClick={() => handleSave("how_it_works_title")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" /> Yorumlar Başlığı (H2)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Yorumlar Bölümü Başlığı</Label>
                  <Input
                    value={settings.reviews_section_title}
                    onChange={(e) => setSettings({ ...settings, reviews_section_title: e.target.value })}
                    placeholder="Müşterilerimiz Ne Diyor?"
                    data-testid="input-reviews-title"
                  />
                </div>
                <Button onClick={() => handleSave("reviews_section_title")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" /> Footer Logo İsmi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Logo Yani Isim</Label>
                  <Input
                    value={settings.footer_logo_name}
                    onChange={(e) => setSettings({ ...settings, footer_logo_name: e.target.value })}
                    placeholder="Sipariş Kolay"
                    data-testid="input-footer-logo-name"
                  />
                </div>
                <Button onClick={() => handleSave("footer_logo_name")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" /> Footer Metni
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Footer Açıklama Metni</Label>
                  <Textarea
                    value={settings.footer_text}
                    onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
                    placeholder="Çorlu'nun en lezzetli pideleri, WhatsApp ile kolay sipariş. Taze, sıcak ve hızlı teslimat."
                    data-testid="input-footer-text"
                    rows={3}
                  />
                </div>
                <Button onClick={() => handleSave("footer_text")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" /> İletişim - Adres
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Adres</Label>
                  <Input
                    value={settings.footer_address}
                    onChange={(e) => setSettings({ ...settings, footer_address: e.target.value })}
                    placeholder="Kılıçoğlu Vizyon Konutları, Esentepe, Çorlu"
                    data-testid="input-footer-address"
                  />
                </div>
                <Button onClick={() => handleSave("footer_address")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" /> İletişim - Telefon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Telefon Numarası</Label>
                  <Input
                    value={settings.footer_phone}
                    onChange={(e) => setSettings({ ...settings, footer_phone: e.target.value })}
                    placeholder="0555 123 4567"
                    data-testid="input-footer-phone"
                  />
                </div>
                <Button onClick={() => handleSave("footer_phone")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" /> İletişim - E-posta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>E-posta Adresi</Label>
                  <Input
                    value={settings.footer_email}
                    onChange={(e) => setSettings({ ...settings, footer_email: e.target.value })}
                    placeholder="info@sipariskolay.com"
                    data-testid="input-footer-email"
                  />
                </div>
                <Button onClick={() => handleSave("footer_email")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" /> Çalışma Saatleri - Hafta İçi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Pazartesi - Cuma</Label>
                  <Input
                    value={settings.footer_hours_weekday}
                    onChange={(e) => setSettings({ ...settings, footer_hours_weekday: e.target.value })}
                    placeholder="10:00 - 22:00"
                    data-testid="input-footer-hours-weekday"
                  />
                </div>
                <Button onClick={() => handleSave("footer_hours_weekday")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" /> Çalışma Saatleri - Hafta Sonu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Cumartesi - Pazar</Label>
                  <Input
                    value={settings.footer_hours_weekend}
                    onChange={(e) => setSettings({ ...settings, footer_hours_weekend: e.target.value })}
                    placeholder="11:00 - 23:00"
                    data-testid="input-footer-hours-weekend"
                  />
                </div>
                <Button onClick={() => handleSave("footer_hours_weekend")} size="sm">Kaydet</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="brand" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" /> Ana Renk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Ana renk (butonlar, linkler, vurgular)</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      value={settings.brand_primary_color || "#d4500c"}
                      onChange={(e) => setSettings({ ...settings, brand_primary_color: e.target.value })}
                      className="h-10 w-16 cursor-pointer rounded border border-border"
                      data-testid="input-brand-primary-color"
                    />
                    <Input
                      value={settings.brand_primary_color || "#d4500c"}
                      onChange={(e) => setSettings({ ...settings, brand_primary_color: e.target.value })}
                      placeholder="#d4500c"
                      className="flex-1"
                      data-testid="input-brand-primary-hex"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Web sitesinin ana rengidir (butonlar, linkler vb.)
                  </p>
                </div>
                <div className="flex gap-2">
                  <div
                    className="h-10 flex-1 rounded-md flex items-center justify-center text-sm font-medium text-white"
                    style={{ backgroundColor: settings.brand_primary_color || "#d4500c" }}
                    data-testid="preview-primary-color"
                  >
                    Onizleme
                  </div>
                </div>
                <Button onClick={() => handleSave("brand_primary_color")} size="sm" data-testid="button-save-primary-color">Kaydet</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" /> Vurgu Rengi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Ikincil renk (vurgular, onemli alanlar)</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      value={settings.brand_accent_color || "#27a844"}
                      onChange={(e) => setSettings({ ...settings, brand_accent_color: e.target.value })}
                      className="h-10 w-16 cursor-pointer rounded border border-border"
                      data-testid="input-brand-accent-color"
                    />
                    <Input
                      value={settings.brand_accent_color || "#27a844"}
                      onChange={(e) => setSettings({ ...settings, brand_accent_color: e.target.value })}
                      placeholder="#27a844"
                      className="flex-1"
                      data-testid="input-brand-accent-hex"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Web sitesinin vurgu rengidir (onemli alanlar, rozetler vb.)
                  </p>
                </div>
                <div className="flex gap-2">
                  <div
                    className="h-10 flex-1 rounded-md flex items-center justify-center text-sm font-medium text-white"
                    style={{ backgroundColor: settings.brand_accent_color || "#27a844" }}
                    data-testid="preview-accent-color"
                  >
                    Onizleme
                  </div>
                </div>
                <Button onClick={() => handleSave("brand_accent_color")} size="sm" data-testid="button-save-accent-color">Kaydet</Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" /> Onizleme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Kaydettikten sonra renkler web sitesinde hemen gorunur olacaktir.
                </p>
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full" style={{ backgroundColor: settings.brand_primary_color || "#d4500c" }} data-testid="preview-primary-swatch" />
                    <span className="text-sm text-muted-foreground">Ana Renk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full" style={{ backgroundColor: settings.brand_accent_color || "#27a844" }} data-testid="preview-accent-swatch" />
                    <span className="text-sm text-muted-foreground">Vurgu</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface CustomerWithStats extends Customer {
  orderCount: number;
  lastOrderDate: Date | null;
}

interface OrderWithItems extends Order {
  items: OrderItem[];
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  ready: "Hazır",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  preparing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  ready: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function CustomerOrdersDialog({ customer, onClose }: { customer: CustomerWithStats | null; onClose: () => void }) {
  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/admin/customers", customer?.id, "orders"],
    enabled: !!customer,
  });

  const totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);

  return (
    <Dialog open={!!customer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {customer?.name} — Sipariş Geçmişi
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{customer?.phone}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Yükleniyor...</div>
        ) : orders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">Bu müşteriye ait sipariş bulunamadı.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4 p-3 bg-muted rounded-lg text-sm">
              <span><strong>{orders.length}</strong> sipariş</span>
              <span>•</span>
              <span>Toplam: <strong>₺{totalSpent.toFixed(2)}</strong></span>
              <span>•</span>
              <span>Ortalama: <strong>₺{(totalSpent / orders.length).toFixed(2)}</strong></span>
            </div>

            {orders.map((order) => (
              <div key={order.id} className="border rounded-lg overflow-hidden" data-testid={`order-card-${order.id}`}>
                <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(-6).toUpperCase()}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status || "pending"]}`}>
                      {ORDER_STATUS_LABELS[order.status || "pending"]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {order.deliveryType === "delivery" ? "Eve Teslim" : "Gel Al"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {order.paymentMethod === "cash" ? "Nakit" : "POS"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">₺{parseFloat(order.total || "0").toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                    </p>
                  </div>
                </div>
                <div className="divide-y">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground w-5 text-center">{item.quantity}×</span>
                        <span>{item.menuItemName}</span>
                      </span>
                      <span className="font-medium">₺{parseFloat(item.totalPrice || "0").toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                {order.notes && (
                  <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/20 italic">
                    Not: {order.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomersTab() {
  const { toast } = useToast();
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithStats | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<CustomerWithStats | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    mahalle: "",
    sokak: "",
    binaNo: "",
    daireNo: "",
    notes: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const { sortConfig, handleSort, sortData } = useSorting<CustomerWithStats>();
  const customerColumnDefs: ColumnDefs = {
    name: "string",
    phone: "string",
    orderCount: "number",
    lastOrderDate: "date",
  };

  const { data: customers = [], isLoading } = useQuery<CustomerWithStats[]>({
    queryKey: ["/api/admin/customers"],
  });

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const token = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/admin/customers/export/${format}`, {
        credentials: "include",
        headers,
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `musteriler.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Dışa aktarma başarılı" });
    } catch {
      toast({ title: "Hata", description: "Dışa aktarma başarısız", variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("file", file);

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/admin/customers/import", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers,
      });

      if (!res.ok) throw new Error("Import failed");
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({
        title: "İçe aktarma tamamlandı",
        description: `${result.imported} müşteri eklendi, ${result.skipped} atlandı`,
      });
    } catch {
      toast({ title: "Hata", description: "İçe aktarma başarısız", variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/admin/customers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Müşteri güncellendi" });
      setEditingCustomer(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Müşteri güncellenemedi", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Müşteri silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Müşteri silinemedi", variant: "destructive" });
    },
  });

  const handleEdit = (customer: CustomerWithStats) => {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name || "",
      phone: customer.phone || "",
      mahalle: customer.mahalle || "",
      sokak: customer.sokak || "",
      binaNo: customer.binaNo || "",
      daireNo: customer.daireNo || "",
      notes: customer.notes || "",
    });
  };

  const handleSave = () => {
    if (!editingCustomer) return;
    updateMutation.mutate({
      id: editingCustomer.id,
      data: editForm,
    });
  };

  const formatAddress = (customer: CustomerWithStats) => {
    const parts = [
      customer.mahalle,
      customer.sokak,
      customer.binaNo ? `No: ${customer.binaNo}` : null,
      customer.daireNo ? `D: ${customer.daireNo}` : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : customer.address || "-";
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle>Müşteriler ({customers.length})</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("xlsx")}
              data-testid="button-export-excel"
            >
              <Download className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              data-testid="button-import"
            >
              <Upload className="h-4 w-4 mr-1" /> {importing ? "Yükleniyor..." : "İçe Aktar"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImport}
              className="hidden"
              data-testid="input-import-file"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="name" label="Ad Soyad" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHead column="phone" label="Telefon" sortConfig={sortConfig} onSort={handleSort} />
                  <TableHead>Adres</TableHead>
                  <SortableTableHead column="orderCount" label="Sipariş Sayısı" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHead column="lastOrderDate" label="Son Sipariş" sortConfig={sortConfig} onSort={handleSort} />
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortData(customers, customerColumnDefs).map((customer) => (
                  <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={formatAddress(customer)}>
                      {formatAddress(customer)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{customer.orderCount}</Badge>
                    </TableCell>
                    <TableCell>
                      {customer.lastOrderDate
                        ? new Date(customer.lastOrderDate).toLocaleDateString("tr-TR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewingCustomer(customer)}
                          title="Siparişleri Gör"
                          data-testid={`button-orders-customer-${customer.id}`}
                        >
                          <ShoppingBag className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(customer)}
                          data-testid={`button-edit-customer-${customer.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(customer.id)}
                          data-testid={`button-delete-customer-${customer.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Henüz müşteri bulunmuyor
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CustomerOrdersDialog customer={viewingCustomer} onClose={() => setViewingCustomer(null)} />

      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Müşteri Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Ad Soyad</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  data-testid="input-customer-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Telefon</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  data-testid="input-customer-phone"
                />
              </div>
            </div>
            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Teslimat Adresi</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-mahalle">Mahalle</Label>
                <Input
                  id="edit-mahalle"
                  value={editForm.mahalle}
                  onChange={(e) => setEditForm({ ...editForm, mahalle: e.target.value })}
                  placeholder="Örn: Reşadiye Mah."
                  data-testid="input-customer-mahalle"
                />
              </div>
              <div>
                <Label htmlFor="edit-sokak">Sokak / Cadde</Label>
                <Input
                  id="edit-sokak"
                  value={editForm.sokak}
                  onChange={(e) => setEditForm({ ...editForm, sokak: e.target.value })}
                  placeholder="Örn: Atatürk Cad."
                  data-testid="input-customer-sokak"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-binaNo">Bina No</Label>
                <Input
                  id="edit-binaNo"
                  value={editForm.binaNo}
                  onChange={(e) => setEditForm({ ...editForm, binaNo: e.target.value })}
                  placeholder="Örn: 15"
                  data-testid="input-customer-binaNo"
                />
              </div>
              <div>
                <Label htmlFor="edit-daireNo">Daire No</Label>
                <Input
                  id="edit-daireNo"
                  value={editForm.daireNo}
                  onChange={(e) => setEditForm({ ...editForm, daireNo: e.target.value })}
                  placeholder="Örn: 3"
                  data-testid="input-customer-daireNo"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-notes">Notlar</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Müşteri hakkında notlar..."
                data-testid="input-customer-notes"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingCustomer(null)}>
                İptal
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface AdminUserDisplay {
  id: string;
  username: string;
  role: string | null;
  isActive: boolean | null;
  createdAt: string | null;
  lastLogin: string | null;
}

const ROLE_CONFIG = [
  {
    value: "admin",
    label: "Yönetici",
    description: "Tam yetki: kullanıcılar, menü, siparişler, ayarlar",
  },
  {
    value: "manager",
    label: "Müdür",
    description: "Menü yönetimi, sipariş işleme, müşteri görüntüleme",
  },
  {
    value: "operator",
    label: "Operatör",
    description: "Sadece siparişleri görüntüleme ve durum güncelleme",
  },
];

function getRoleBadgeStyle(role: string | null) {
  switch (role) {
    case "admin":
      return "bg-primary/15 text-primary border-primary/30 dark:bg-primary/25 dark:text-primary";
    case "manager":
      return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700";
    default:
      return "";
  }
}

function getRoleLabel(role: string | null) {
  const found = ROLE_CONFIG.find((r) => r.value === role);
  return found ? found.label : "Operatör";
}

function UserFormDialog({
  open,
  onOpenChange,
  editingUser,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingUser: AdminUserDisplay | null;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("operator");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open) {
      if (editingUser) {
        setUsername(editingUser.username);
        setPassword("");
        setRole(editingUser.role || "operator");
        setIsActive(editingUser.isActive !== false);
      } else {
        setUsername("");
        setPassword("");
        setRole("operator");
        setIsActive(true);
      }
    }
  }, [open, editingUser]);

  const createMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; role: string; isActive: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Kullanıcı oluşturuldu" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Kullanıcı güncellendi" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!username.trim()) {
      toast({ title: "Kullanıcı adı gerekli", variant: "destructive" });
      return;
    }
    if (!editingUser && !password) {
      toast({ title: "Şifre gerekli", variant: "destructive" });
      return;
    }
    if (editingUser) {
      const data: Record<string, any> = { username, role, isActive };
      if (password) data.password = password;
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate({ username, password, role, isActive });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingUser ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="user-username">Kullanıcı Adı</Label>
            <Input
              id="user-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adı"
              data-testid="input-user-username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">{editingUser ? "Şifre (boş bırakılırsa değişmez)" : "Şifre"}</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editingUser ? "Yeni şifre..." : "Şifre"}
              data-testid="input-user-password"
            />
          </div>
          <div className="space-y-3">
            <Label>Rol & Yetkilendirme</Label>
            <div className="space-y-2">
              {ROLE_CONFIG.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`w-full text-left rounded-md border-2 p-3 transition-colors ${
                    role === r.value
                      ? "border-primary bg-primary/5 dark:bg-primary/10"
                      : "border-border hover-elevate"
                  }`}
                  data-testid={`radio-role-${r.value}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      role === r.value ? "border-primary" : "border-muted-foreground/40"
                    }`}>
                      {role === r.value && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{r.label}</div>
                      <div className="text-sm text-muted-foreground">{r.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              data-testid="switch-user-active"
            />
            <Label>Aktif</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-user">
              İptal
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-user"
            >
              <Save className="h-4 w-4 mr-2" />
              Kaydet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UsersTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserDisplay | null>(null);

  const { data: users = [], isLoading } = useQuery<AdminUserDisplay[]>({
    queryKey: ["/api/admin/users"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Kullanıcı silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Kullanıcı Yönetimi</CardTitle>
        <Button
          onClick={() => { setEditingUser(null); setDialogOpen(true); }}
          data-testid="button-add-user"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kullanıcı
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Yükleniyor...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Kullanıcı yok</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı Adı</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Son Giriş</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getRoleBadgeStyle(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.isActive
                          ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700"
                          : "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700"
                      }
                    >
                      {user.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString("tr-TR") : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingUser(user);
                          setDialogOpen(true);
                        }}
                        data-testid={`button-edit-user-${user.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) {
                            deleteMutation.mutate(user.id);
                          }
                        }}
                        data-testid={`button-delete-user-${user.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingUser={editingUser}
      />
    </Card>
  );
}

function ChannelProfitTab() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ProfitChannel | null>(null);
  const [channelForm, setChannelForm] = useState({
    name: "",
    commissionRate: "0",
    courierType: "own" as "own" | "external",
    courierCostPerOrder: "0",
    vatRate: "0",
    isOwnPlatform: false,
    isActive: true,
  });

  const { data: channels = [], isLoading: channelsLoading } = useQuery<ProfitChannel[]>({
    queryKey: ["/api/admin/profit-channels"],
  });

  const { data: dailyRevenues = [], isLoading: revenuesLoading } = useQuery<DailyChannelRevenue[]>({
    queryKey: ["/api/admin/daily-revenues", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/admin/daily-revenues?date=${selectedDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: qollaoAuto } = useQuery<{ revenue: string; orderCount: number }>({
    queryKey: ["/api/admin/qollao-daily-revenue", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/admin/qollao-daily-revenue?date=${selectedDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: async (data: typeof channelForm) => {
      const res = await apiRequest("POST", "/api/admin/profit-channels", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profit-channels"] });
      setShowChannelForm(false);
      resetChannelForm();
      toast({ title: "Kanal eklendi" });
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof channelForm> }) => {
      const res = await apiRequest("PATCH", `/api/admin/profit-channels/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profit-channels"] });
      setShowChannelForm(false);
      setEditingChannel(null);
      resetChannelForm();
      toast({ title: "Kanal guncellendi" });
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/profit-channels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profit-channels"] });
      toast({ title: "Kanal silindi" });
    },
  });

  const saveRevenueMutation = useMutation({
    mutationFn: async (data: { channelId: string; date: string; revenue: string; orderCount: number }) => {
      const res = await apiRequest("POST", "/api/admin/daily-revenues", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/daily-revenues", selectedDate] });
      toast({ title: "Gelir kaydedildi" });
    },
  });

  function resetChannelForm() {
    setChannelForm({
      name: "",
      commissionRate: "0",
      courierType: "own",
      courierCostPerOrder: "0",
      vatRate: "0",
      isOwnPlatform: false,
      isActive: true,
    });
  }

  function openEditChannel(ch: ProfitChannel) {
    setEditingChannel(ch);
    setChannelForm({
      name: ch.name,
      commissionRate: ch.commissionRate || "0",
      courierType: (ch.courierType as "own" | "external") || "own",
      courierCostPerOrder: ch.courierCostPerOrder || "0",
      vatRate: ch.vatRate || "0",
      isOwnPlatform: ch.isOwnPlatform || false,
      isActive: ch.isActive !== false,
    });
    setShowChannelForm(true);
  }

  function handleSaveChannel() {
    if (!channelForm.name.trim()) {
      toast({ title: "Kanal adi gerekli", variant: "destructive" });
      return;
    }
    if (editingChannel) {
      updateChannelMutation.mutate({ id: editingChannel.id, data: channelForm });
    } else {
      createChannelMutation.mutate(channelForm);
    }
  }

  function getRevenueForChannel(channelId: string): { revenue: number; orderCount: number } {
    const ownChannel = channels.find(c => c.id === channelId);
    if (ownChannel?.isOwnPlatform && qollaoAuto) {
      return { revenue: parseFloat(qollaoAuto.revenue), orderCount: qollaoAuto.orderCount };
    }
    const entry = dailyRevenues.find(r => r.channelId === channelId);
    if (entry) {
      return { revenue: parseFloat(entry.revenue), orderCount: entry.orderCount || 0 };
    }
    return { revenue: 0, orderCount: 0 };
  }

  function calculateProfit(channel: ProfitChannel, revenue: number, orderCount: number) {
    const commissionRate = parseFloat(channel.commissionRate || "0") / 100;
    const courierCost = parseFloat(channel.courierCostPerOrder || "0") * orderCount;
    const vatRate = parseFloat(channel.vatRate || "0") / 100;

    const commission = revenue * commissionRate;
    const vat = revenue * vatRate;
    const profitBeforeVat = revenue - commission - courierCost;
    const profitAfterVat = profitBeforeVat - vat;

    return {
      commission,
      courierCost,
      vat,
      profitBeforeVat,
      profitAfterVat,
    };
  }

  const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [revenueInputs, setRevenueInputs] = useState<Record<string, { revenue: string; orderCount: string }>>({});

  useEffect(() => {
    const inputs: Record<string, { revenue: string; orderCount: string }> = {};
    channels.forEach(ch => {
      if (!ch.isOwnPlatform) {
        const entry = dailyRevenues.find(r => r.channelId === ch.id);
        inputs[ch.id] = {
          revenue: entry ? entry.revenue : "",
          orderCount: entry ? String(entry.orderCount || 0) : "",
        };
      }
    });
    setRevenueInputs(inputs);
  }, [channels, dailyRevenues]);

  const activeChannels = channels.filter(c => c.isActive !== false);
  const totalProfit = activeChannels.reduce((sum, ch) => {
    const { revenue, orderCount } = getRevenueForChannel(ch.id);
    const calc = calculateProfit(ch, revenue, orderCount);
    return sum + calc.profitAfterVat;
  }, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Kanal Kar Analizi
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44"
                data-testid="input-profit-date"
              />
            </div>
            <Button
              onClick={() => { resetChannelForm(); setEditingChannel(null); setShowChannelForm(true); }}
              data-testid="button-add-channel"
            >
              <Plus className="h-4 w-4 mr-1" />
              Kanal Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Channel Form Dialog */}
          <Dialog open={showChannelForm} onOpenChange={(open) => { if (!open) { setShowChannelForm(false); setEditingChannel(null); resetChannelForm(); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingChannel ? "Kanal Duzenle" : "Yeni Kanal Ekle"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Kanal Adi</Label>
                  <Input
                    value={channelForm.name}
                    onChange={(e) => setChannelForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="ornegin: Yemeksepeti, Getir Yemek"
                    data-testid="input-channel-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Komisyon Orani (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={channelForm.commissionRate}
                      onChange={(e) => setChannelForm(f => ({ ...f, commissionRate: e.target.value }))}
                      data-testid="input-commission-rate"
                    />
                  </div>
                  <div>
                    <Label>KDV Orani (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={channelForm.vatRate}
                      onChange={(e) => setChannelForm(f => ({ ...f, vatRate: e.target.value }))}
                      data-testid="input-vat-rate"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Kurye Tipi</Label>
                    <Select value={channelForm.courierType} onValueChange={(v) => setChannelForm(f => ({ ...f, courierType: v as "own" | "external" }))}>
                      <SelectTrigger data-testid="select-courier-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="own">Kendi Kurye</SelectItem>
                        <SelectItem value="external">Dis Kurye</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Kurye Maliyeti (siparis basi)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={channelForm.courierCostPerOrder}
                      onChange={(e) => setChannelForm(f => ({ ...f, courierCostPerOrder: e.target.value }))}
                      data-testid="input-courier-cost"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={channelForm.isOwnPlatform}
                    onCheckedChange={(v) => setChannelForm(f => ({ ...f, isOwnPlatform: v }))}
                    data-testid="switch-own-platform"
                  />
                  <Label>Kendi Platformumuz (Qollao) - Gelir otomatik hesaplanir</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={channelForm.isActive}
                    onCheckedChange={(v) => setChannelForm(f => ({ ...f, isActive: v }))}
                    data-testid="switch-channel-active"
                  />
                  <Label>Aktif</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setShowChannelForm(false); setEditingChannel(null); resetChannelForm(); }} data-testid="button-cancel-channel">
                    Iptal
                  </Button>
                  <Button
                    onClick={handleSaveChannel}
                    disabled={createChannelMutation.isPending || updateChannelMutation.isPending}
                    data-testid="button-save-channel"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Kaydet
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Channel Settings Overview */}
          {channels.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Kanal Ayarlari</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {channels.map(ch => (
                  <Card key={ch.id} className={`${ch.isActive === false ? "opacity-50" : ""}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium" data-testid={`text-channel-name-${ch.id}`}>{ch.name}</span>
                          {ch.isOwnPlatform && <Badge variant="secondary">Kendi</Badge>}
                          {ch.isActive === false && <Badge variant="outline">Pasif</Badge>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditChannel(ch)} data-testid={`button-edit-channel-${ch.id}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Bu kanali silmek istediginize emin misiniz?")) deleteChannelMutation.mutate(ch.id); }} data-testid={`button-delete-channel-${ch.id}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Komisyon:</span>
                          <span>%{ch.commissionRate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kurye:</span>
                          <span>{ch.courierType === "own" ? "Kendi" : "Dis"} - {fmt(parseFloat(ch.courierCostPerOrder || "0"))} TL</span>
                        </div>
                        <div className="flex justify-between">
                          <span>KDV:</span>
                          <span>%{ch.vatRate}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Revenue Entry for non-own-platform channels */}
          {activeChannels.filter(c => !c.isOwnPlatform).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Gunluk Gelir Girisi ({selectedDate})</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kanal</TableHead>
                    <TableHead>Gelir (TL)</TableHead>
                    <TableHead>Siparis Sayisi</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeChannels.filter(c => !c.isOwnPlatform).map(ch => (
                    <TableRow key={ch.id}>
                      <TableCell className="font-medium">{ch.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-32"
                          placeholder="0.00"
                          value={revenueInputs[ch.id]?.revenue || ""}
                          onChange={(e) => setRevenueInputs(prev => ({
                            ...prev,
                            [ch.id]: { ...prev[ch.id], revenue: e.target.value }
                          }))}
                          data-testid={`input-revenue-${ch.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-24"
                          placeholder="0"
                          value={revenueInputs[ch.id]?.orderCount || ""}
                          onChange={(e) => setRevenueInputs(prev => ({
                            ...prev,
                            [ch.id]: { ...prev[ch.id], orderCount: e.target.value }
                          }))}
                          data-testid={`input-order-count-${ch.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            const input = revenueInputs[ch.id];
                            if (!input?.revenue) return;
                            saveRevenueMutation.mutate({
                              channelId: ch.id,
                              date: selectedDate,
                              revenue: input.revenue,
                              orderCount: parseInt(input.orderCount || "0"),
                            });
                          }}
                          disabled={saveRevenueMutation.isPending}
                          data-testid={`button-save-revenue-${ch.id}`}
                        >
                          <Save className="h-3.5 w-3.5 mr-1" />
                          Kaydet
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Profit Comparison Table */}
          {activeChannels.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Kar Karsilastirmasi ({selectedDate})</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kanal</TableHead>
                      <TableHead className="text-right">Gelir (TL)</TableHead>
                      <TableHead className="text-right">Siparis</TableHead>
                      <TableHead className="text-right">Komisyon (TL)</TableHead>
                      <TableHead className="text-right">Kurye (TL)</TableHead>
                      <TableHead className="text-right">KDV (TL)</TableHead>
                      <TableHead className="text-right">Kar (KDV Oncesi)</TableHead>
                      <TableHead className="text-right">Kar (KDV Sonrasi)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeChannels.map(ch => {
                      const { revenue, orderCount } = getRevenueForChannel(ch.id);
                      const calc = calculateProfit(ch, revenue, orderCount);
                      return (
                        <TableRow key={ch.id} data-testid={`row-channel-profit-${ch.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {ch.name}
                              {ch.isOwnPlatform && <Badge variant="secondary">Kendi</Badge>}
                              {ch.courierType === "external" && <Badge variant="outline">Dis Kurye</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{fmt(revenue)}</TableCell>
                          <TableCell className="text-right">{orderCount}</TableCell>
                          <TableCell className="text-right text-muted-foreground">-{fmt(calc.commission)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">-{fmt(calc.courierCost)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">-{fmt(calc.vat)}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(calc.profitBeforeVat)}</TableCell>
                          <TableCell className={`text-right font-bold ${calc.profitAfterVat >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {fmt(calc.profitAfterVat)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="border-t-2">
                      <TableCell className="font-bold" colSpan={7}>Toplam</TableCell>
                      <TableCell className={`text-right font-bold ${totalProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-total-profit">
                        {fmt(totalProfit)} TL
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {channelsLoading && (
            <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
          )}

          {channels.length === 0 && !channelsLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Henuz kanal eklenmedi</p>
              <p className="text-sm mb-4">Kar analizine baslamak icin kanallarinizi ekleyin</p>
              <Button onClick={() => { resetChannelForm(); setShowChannelForm(true); }} data-testid="button-add-first-channel">
                <Plus className="h-4 w-4 mr-1" />
                Ilk Kanali Ekle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const { theme, toggleTheme } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const [newOrderAlert, setNewOrderAlert] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    fetch("/api/admin/me", { credentials: "include", headers })
      .then((res) => {
        if (res.ok) setIsLoggedIn(true);
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !notificationsEnabled) return;

    const checkNewOrders = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch("/api/orders", { credentials: "include", headers });
        if (!res.ok) return;
        const orders: Order[] = await res.json();
        const currentIds = new Set(orders.map((o: Order) => o.id));

        if (knownOrderIdsRef.current.size === 0) {
          knownOrderIdsRef.current = currentIds;
          return;
        }

        const newOrders = orders.filter((o: Order) => !knownOrderIdsRef.current.has(o.id));
        if (newOrders.length > 0) {
          playNotificationSound();
          setNewOrderAlert(true);
          setTimeout(() => setNewOrderAlert(false), 5000);
        }

        knownOrderIdsRef.current = currentIds;
      } catch (e) {
        // silently ignore
      }
    };

    checkNewOrders();
    const interval = setInterval(checkNewOrders, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, notificationsEnabled]);

  const handleLogout = async () => {
    localStorage.removeItem("adminToken");
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setIsLoggedIn(false);
  };

  if (checkingAuth) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  if (!isLoggedIn) {
    return <LoginForm onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-admin">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">DP</span>
              </div>
              <span className="font-bold text-lg">Yönetim Paneli</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/siparis">
              <Button size="icon" variant="ghost" data-testid="button-siparis-panel">
                <Phone className="h-5 w-5" />
              </Button>
            </Link>
            <Button size="icon" variant="ghost" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {newOrderAlert && (
          <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm font-medium animate-pulse" data-testid="alert-new-order">
            Yeni siparis geldi!
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-10">
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Siparişler</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Müşteriler</span>
            </TabsTrigger>
            <TabsTrigger value="menu" className="gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="hidden sm:inline">Menü</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Kategoriler</span>
            </TabsTrigger>
            <TabsTrigger value="neighborhoods" className="gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Mahalleler</span>
            </TabsTrigger>
            <TabsTrigger value="cross-sell" className="gap-2">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Upsell</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Yorumlar</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">Kullanıcılar</span>
            </TabsTrigger>
            <TabsTrigger value="channel-profit" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Kanal Karı</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Ayarlar</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersTab notificationsEnabled={notificationsEnabled} setNotificationsEnabled={setNotificationsEnabled} />
          </TabsContent>

          <TabsContent value="customers">
            <CustomersTab />
          </TabsContent>

          <TabsContent value="menu">
            <MenuItemsTab />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesTab />
          </TabsContent>

          <TabsContent value="neighborhoods">
            <NeighborhoodsTab />
          </TabsContent>

          <TabsContent value="cross-sell">
            <CrossSellTab />
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewsTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="channel-profit">
            <ChannelProfitTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
