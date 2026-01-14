import { useState, useEffect } from "react";
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
} from "lucide-react";
import { SiWhatsapp, SiFacebook, SiInstagram } from "react-icons/si";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Order, OrderItem, Category, MenuItem, Review, Customer } from "@shared/schema";

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

function OrdersTab() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
  });

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

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === "all") return true;
    return order.status === filterStatus;
  });

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
      printWindow.document.write(`<pre style="font-family: monospace;">${printContent}</pre>`);
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
                <p className="text-sm text-muted-foreground">Bugun</p>
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
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle>Siparişler</CardTitle>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="pending">Beklemede</SelectItem>
              <SelectItem value="confirmed">Onaylandı</SelectItem>
              <SelectItem value="preparing">Hazırlanıyor</SelectItem>
              <SelectItem value="delivered">Teslim Edildi</SelectItem>
            </SelectContent>
          </Select>
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
                    <TableHead>No</TableHead>
                    <TableHead>Tarih / Saat</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Toplam</TableHead>
                    <TableHead>Durum</TableHead>
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
              <DialogTitle>Siparis #{selectedOrder.id.slice(0, 8)}</DialogTitle>
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

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Kategoriler</h2>
        <Button onClick={() => setShowNew(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Yeni Kategori
        </Button>
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
                <Label>Resim URL</Label>
                <Input value={newCategory.image} onChange={(e) => setNewCategory({ ...newCategory, image: e.target.value })} />
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
                  <TableHead>Ad</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Resim</TableHead>
                  <TableHead>Islem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
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
              <DialogTitle>Kategori Duzenle</DialogTitle>
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
                <Label>Resim URL</Label>
                <Input value={editingCategory.image || ""} onChange={(e) => setEditingCategory({ ...editingCategory, image: e.target.value })} />
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
    name: "", description: "", price: "", image: "", categoryId: "", isAvailable: true, isKampanya: false, kampanyaTag: ""
  });

  const { data: items = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/menu-items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setNewItem({ name: "", description: "", price: "", image: "", categoryId: "", isAvailable: true, isKampanya: false, kampanyaTag: "" });
      setShowNew(false);
      toast({ title: "Ürün eklendi" });
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Menü Ürünleri</h2>
        <Button onClick={() => setShowNew(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Yeni Ürün
        </Button>
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
                <Label>Açıklama</Label>
                <Textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
              </div>
              <div>
                <Label>Resim URL</Label>
                <Input value={newItem.image} onChange={(e) => setNewItem({ ...newItem, image: e.target.value })} />
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
                    <TableHead>Ad</TableHead>
                    <TableHead>Fiyat</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Kampanya</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.image ? <img src={item.image} alt="" className="w-12 h-12 object-cover rounded" /> : "-"}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{parseFloat(item.price).toFixed(2)} TL</TableCell>
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
              <DialogTitle>Urun Duzenle</DialogTitle>
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
              <div className="md:col-span-2">
                <Label>Açıklama</Label>
                <Textarea value={editingItem.description || ""} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} />
              </div>
              <div>
                <Label>Resim URL</Label>
                <Input value={editingItem.image || ""} onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })} />
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

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["/api/admin/reviews"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reviews", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

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
      toast({ title: "Yorum guncellendi" });
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
      <h2 className="text-xl font-bold">Musteri Yorumlari</h2>

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
                  <TableHead>Musteri</TableHead>
                  <TableHead>Yorum</TableHead>
                  <TableHead>Puan</TableHead>
                  <TableHead>Onayli</TableHead>
                  <TableHead>Islem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
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
              <DialogTitle>Yorum Duzenle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Musteri Adi</Label>
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

function SettingsTab() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({
    whatsapp_number: "",
    hero_image: "",
    company_logo: "",
    facebook_url: "",
    instagram_url: "",
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
      return fetch("/api/admin/settings", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Ayarlar kaydedildi" });
    },
  });

  const handleSave = (key: string) => {
    saveMutation.mutate({ key, value: settings[key] });
  };

  const handleSaveAll = () => {
    Object.entries(settings).forEach(([key, value]) => {
      saveMutation.mutate({ key, value });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Site Ayarlari</h2>
        <Button onClick={handleSaveAll} className="gap-2">
          <Save className="h-4 w-4" /> Tum Ayarlari Kaydet
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SiWhatsapp className="text-whatsapp" /> WhatsApp Ayarlari
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>WhatsApp Numarasi (905xxxxxxxxx)</Label>
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
              <Label>Logo URL</Label>
              <Input
                value={settings.company_logo}
                onChange={(e) => setSettings({ ...settings, company_logo: e.target.value })}
                placeholder="https://..."
                data-testid="input-company-logo"
              />
            </div>
            {settings.company_logo && (
              <img src={settings.company_logo} alt="Logo" className="w-24 h-24 object-contain rounded border p-2" />
            )}
            <Button onClick={() => handleSave("company_logo")} size="sm">Kaydet</Button>
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
              <Label>Hero Resim URL</Label>
              <Input
                value={settings.hero_image}
                onChange={(e) => setSettings({ ...settings, hero_image: e.target.value })}
                placeholder="https://..."
              />
            </div>
            {settings.hero_image && (
              <img src={settings.hero_image} alt="Hero" className="w-full h-32 object-cover rounded" />
            )}
            <Button onClick={() => handleSave("hero_image")} size="sm">Kaydet</Button>
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
      </div>
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

  const { data: customers = [], isLoading } = useQuery<CustomerWithStats[]>({
    queryKey: ["/api/admin/customers"],
  });

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
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Adres</TableHead>
                  <TableHead>Sipariş Sayısı</TableHead>
                  <TableHead>Son Sipariş</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
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
              <span className="font-bold text-lg">Yonetim Paneli</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Siparisler</span>
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
            <OrdersTab />
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
