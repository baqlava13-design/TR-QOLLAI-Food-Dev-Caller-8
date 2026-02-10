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
} from "lucide-react";
import { SiWhatsapp, SiFacebook, SiInstagram } from "react-icons/si";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Order, OrderItem, Category, MenuItem, Review, Customer, Neighborhood } from "@shared/schema";

function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = audioCtx.currentTime;
    playTone(880, now, 0.15);
    playTone(1100, now + 0.15, 0.15);
    playTone(1320, now + 0.3, 0.3);
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

  const handlePrint = (order: OrderWithItems) => {
    const itemsText = order.items?.map(item => 
      `  ${item.quantity}x ${item.menuItemName} - ${parseFloat(item.totalPrice).toFixed(2)} TL`
    ).join('\n') || '';
    
    const printContent = `
SIPARIS: #${order.id.slice(0, 8).toUpperCase()}
Tarih: ${new Date(order.createdAt!).toLocaleString("tr-TR")}

MÜŞTERİ
${order.customerName}
${order.customerPhone}
${order.customerAddress}

ÜRÜNLER
${itemsText}

TOPLAM: ${parseFloat(order.total).toFixed(2)} TL
Ödeme: ${order.paymentMethod === "cash" ? "Nakit" : "POS"}
${order.notes ? `Not: ${order.notes}` : ""}
    `;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`<pre style="font-family: monospace; font-size: 13px;">${printContent}</pre>`);
      printWindow.document.close();
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
              variant="ghost"
              className={`toggle-elevate ${notificationsEnabled ? "toggle-elevated" : ""}`}
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
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

function CustomersTab() {
  const { toast } = useToast();
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithStats | null>(null);
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
          <TabsList className="grid w-full grid-cols-8">
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

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
