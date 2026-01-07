import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Separator } from "@/components/ui/separator";
import {
  ShoppingBag,
  CheckCircle,
  Truck,
  DollarSign,
  Users,
  TrendingUp,
  Printer,
  Eye,
  ArrowLeft,
  Sun,
  Moon,
  Settings,
  MessageCircle,
  Star,
  Share2,
  Save,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { SiWhatsapp, SiInstagram, SiFacebook, SiYoutube, SiX } from "react-icons/si";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Order, OrderItem, SiteProfile, SocialLink, WhatsappSettings, Review, MenuItem, Category, MediaAsset } from "@shared/schema";
import { useUpload } from "@/hooks/use-upload";
import { Image, Plus, Edit, UtensilsCrossed, Upload, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  confirmed: "Onaylandi",
  preparing: "Hazirlaniyor",
  delivered: "Teslim Edildi",
  cancelled: "Iptal",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  preparing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const platformIcons: Record<string, JSX.Element> = {
  instagram: <SiInstagram className="h-4 w-4" />,
  facebook: <SiFacebook className="h-4 w-4" />,
  twitter: <SiX className="h-4 w-4" />,
  youtube: <SiYoutube className="h-4 w-4" />,
};

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter",
  youtube: "YouTube",
};

export default function Admin() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("orders");

  // Orders queries
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
  });

  // CMS queries
  const { data: siteProfile } = useQuery<SiteProfile>({
    queryKey: ["/api/admin/site-profile"],
  });

  const { data: socialLinks = [] } = useQuery<SocialLink[]>({
    queryKey: ["/api/admin/social-links"],
  });

  const { data: whatsappSettings } = useQuery<WhatsappSettings>({
    queryKey: ["/api/admin/whatsapp-settings"],
  });

  const { data: allReviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/admin/reviews"],
  });

  // Menu & Media queries
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: mediaAssets = [] } = useQuery<MediaAsset[]>({
    queryKey: ["/api/admin/media"],
  });

  // Form states
  const [profileForm, setProfileForm] = useState<Partial<SiteProfile>>({});
  const [whatsappForm, setWhatsappForm] = useState<Partial<WhatsappSettings>>({});
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuItemForm, setMenuItemForm] = useState<Partial<MenuItem>>({});
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<string>("all");

  // Upload hook
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      toast({ title: "Yuklendi", description: "Dosya basariyla yuklendi." });
    },
    onError: (error) => {
      toast({ title: "Hata", description: "Dosya yuklenirken bir hata olustu.", variant: "destructive" });
    },
  });

  // Initialize forms when data loads
  useState(() => {
    if (siteProfile) setProfileForm(siteProfile);
    if (whatsappSettings) setWhatsappForm(whatsappSettings);
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Siparis guncellendi", description: "Siparis durumu basariyla guncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Siparis guncellenirken bir hata olustu.", variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<SiteProfile>) => {
      return apiRequest("PUT", "/api/admin/site-profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-profile"] });
      toast({ title: "Kaydedildi", description: "Site ayarlari basariyla guncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Site ayarlari kaydedilemedi.", variant: "destructive" });
    },
  });

  const updateSocialLinkMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SocialLink> & { id: string }) => {
      return apiRequest("PATCH", `/api/admin/social-links/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-links"] });
      toast({ title: "Kaydedildi", description: "Sosyal medya baglantisi guncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Sosyal medya ayarlari kaydedilemedi.", variant: "destructive" });
    },
  });

  const updateWhatsappMutation = useMutation({
    mutationFn: async (data: Partial<WhatsappSettings>) => {
      return apiRequest("PUT", "/api/admin/whatsapp-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp-settings"] });
      toast({ title: "Kaydedildi", description: "WhatsApp ayarlari basariyla guncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "WhatsApp ayarlari kaydedilemedi.", variant: "destructive" });
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, isApproved }: { id: string; isApproved: boolean }) => {
      return apiRequest("PATCH", `/api/admin/reviews/${id}`, { isApproved });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: "Kaydedildi", description: "Yorum durumu guncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Yorum guncellenemedi.", variant: "destructive" });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: "Silindi", description: "Yorum basariyla silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Yorum silinemedi.", variant: "destructive" });
    },
  });

  // Helper to normalize menu item form data before submission
  const normalizeMenuItemData = (form: Partial<MenuItem>) => {
    return {
      ...form,
      price: form.price ? String(parseFloat(String(form.price))) : undefined,
      salePrice: form.salePrice ? String(parseFloat(String(form.salePrice))) : null,
      isAvailable: form.isAvailable !== false,
      isPopular: form.isPopular === true,
      isFeatured: form.isFeatured === true,
    };
  };

  // Menu Item mutations
  const createMenuItemMutation = useMutation({
    mutationFn: async (data: Partial<MenuItem>) => {
      const normalized = normalizeMenuItemData(data);
      return apiRequest("POST", "/api/menu-items", normalized);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setShowMenuDialog(false);
      setMenuItemForm({});
      toast({ title: "Kaydedildi", description: "Menu urunu eklendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Menu urunu eklenemedi.", variant: "destructive" });
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<MenuItem> & { id: string }) => {
      const normalized = normalizeMenuItemData(data);
      return apiRequest("PATCH", `/api/menu-items/${id}`, normalized);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setShowMenuDialog(false);
      setEditingMenuItem(null);
      setMenuItemForm({});
      toast({ title: "Kaydedildi", description: "Menu urunu guncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Menu urunu guncellenemedi.", variant: "destructive" });
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/menu-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({ title: "Silindi", description: "Menu urunu silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Menu urunu silinemedi.", variant: "destructive" });
    },
  });

  // Media mutations
  const createMediaMutation = useMutation({
    mutationFn: async (data: { objectPath: string; fileName: string; mimeType?: string; size?: number; type?: string; altText?: string }) => {
      return apiRequest("POST", "/api/admin/media", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({ title: "Kaydedildi", description: "Medya dosyasi kaydedildi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Medya dosyasi kaydedilemedi.", variant: "destructive" });
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/media/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({ title: "Silindi", description: "Medya dosyasi silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Medya dosyasi silinemedi.", variant: "destructive" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const result = await uploadFile(file);
    if (result) {
      await createMediaMutation.mutateAsync({
        objectPath: result.objectPath,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        type: type,
      });
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === "all") return true;
    return order.status === filterStatus;
  });

  const handlePrint = (order: OrderWithItems) => {
    const itemsText = order.items?.map(item => 
      `  ${item.quantity}x ${item.menuItemName} - ${parseFloat(item.totalPrice).toFixed(2)} TL${item.upsells ? ` (${item.upsells})` : ''}`
    ).join('\n') || '  (Urun bilgisi yok)';
    
    const printContent = `
      SIPARIS DETAYI
      ===============
      Siparis No: ${order.id.slice(0, 8).toUpperCase()}
      Tarih: ${new Date(order.createdAt!).toLocaleString("tr-TR")}
      
      MUSTERI BILGILERI
      -----------------
      Ad: ${order.customerName}
      Telefon: ${order.customerPhone}
      Adres: ${order.customerAddress}
      
      URUNLER
      -------
${itemsText}
      
      ODEME
      -----
      Yontem: ${order.paymentMethod === "cash" ? "Nakit" : "POS"}
      Toplam: ${parseFloat(order.total).toFixed(2)} TL
      
      ${order.notes ? `NOT: ${order.notes}` : ""}
    `;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`<pre style="font-family: monospace; font-size: 14px;">${printContent}</pre>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const defaultStats: DashboardStats = {
    todayOrders: 0,
    confirmedOrders: 0,
    deliveredOrders: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalCustomers: 0,
  };

  const displayStats = stats || defaultStats;

  return (
    <div className="min-h-screen bg-background" data-testid="page-admin">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">LE</span>
              </div>
              <span className="font-bold text-lg">Yonetim Paneli</span>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-admin-theme-toggle">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid" data-testid="tabs-admin">
            <TabsTrigger value="orders" className="gap-2" data-testid="tab-orders">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Siparisler</span>
            </TabsTrigger>
            <TabsTrigger value="menu" className="gap-2" data-testid="tab-menu">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="hidden sm:inline">Menu</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-2" data-testid="tab-media">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Medya</span>
            </TabsTrigger>
            <TabsTrigger value="site" className="gap-2" data-testid="tab-site">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Site Ayarlari</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2" data-testid="tab-social">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Sosyal Medya</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2" data-testid="tab-whatsapp">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2" data-testid="tab-reviews">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Yorumlar</span>
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card data-testid="card-stat-today-orders">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Bugun</p>
                      <p className="text-2xl font-bold">{displayStats.todayOrders}</p>
                      <p className="text-xs text-muted-foreground">siparis</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShoppingBag className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-stat-confirmed">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Onaylanan</p>
                      <p className="text-2xl font-bold">{displayStats.confirmedOrders}</p>
                      <p className="text-xs text-muted-foreground">siparis</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-stat-delivered">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Teslim</p>
                      <p className="text-2xl font-bold">{displayStats.deliveredOrders}</p>
                      <p className="text-xs text-muted-foreground">siparis</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-stat-revenue">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Bugun Ciro</p>
                      <p className="text-2xl font-bold">{displayStats.todayRevenue.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">TL</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card data-testid="card-weekly-revenue">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Haftalik Ciro</p>
                    <p className="text-xl font-bold">{displayStats.weekRevenue.toFixed(2)} TL</p>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-monthly-revenue">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aylik Ciro</p>
                    <p className="text-xl font-bold">{displayStats.monthRevenue.toFixed(2)} TL</p>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-total-customers">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <Users className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam Musteri</p>
                    <p className="text-xl font-bold">{displayStats.totalCustomers}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-orders-table">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <CardTitle>Siparisler</CardTitle>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                    <SelectValue placeholder="Filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tum Siparisler</SelectItem>
                    <SelectItem value="pending">Beklemede</SelectItem>
                    <SelectItem value="confirmed">Onaylandi</SelectItem>
                    <SelectItem value="preparing">Hazirlaniyor</SelectItem>
                    <SelectItem value="delivered">Teslim Edildi</SelectItem>
                    <SelectItem value="cancelled">Iptal</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Henuz siparis bulunmamaktadir.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Siparis No</TableHead>
                          <TableHead>Musteri</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead>Toplam</TableHead>
                          <TableHead>Odeme</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead>Tarih</TableHead>
                          <TableHead>Islemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => (
                          <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                            <TableCell className="font-mono text-sm">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </TableCell>
                            <TableCell className="font-medium">{order.customerName}</TableCell>
                            <TableCell>{order.customerPhone}</TableCell>
                            <TableCell className="font-bold">
                              {parseFloat(order.total).toFixed(2)} TL
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {order.paymentMethod === "cash" ? "Nakit" : "POS"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={order.status || "pending"}
                                onValueChange={(value) =>
                                  updateStatusMutation.mutate({ orderId: order.id, status: value })
                                }
                              >
                                <SelectTrigger
                                  className={`w-[130px] ${statusColors[order.status || "pending"]}`}
                                  data-testid={`select-status-${order.id}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Beklemede</SelectItem>
                                  <SelectItem value="confirmed">Onaylandi</SelectItem>
                                  <SelectItem value="preparing">Hazirlaniyor</SelectItem>
                                  <SelectItem value="delivered">Teslim Edildi</SelectItem>
                                  <SelectItem value="cancelled">Iptal</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {order.createdAt && new Date(order.createdAt).toLocaleString("tr-TR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setSelectedOrder(order)}
                                  data-testid={`button-view-${order.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handlePrint(order)}
                                  data-testid={`button-print-${order.id}`}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-whatsapp"
                                  onClick={() =>
                                    window.open(
                                      `https://wa.me/${order.customerPhone.replace(/\D/g, "")}`,
                                      "_blank"
                                    )
                                  }
                                  data-testid={`button-whatsapp-${order.id}`}
                                >
                                  <SiWhatsapp className="h-4 w-4" />
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
          </TabsContent>

          {/* Menu Management Tab */}
          <TabsContent value="menu" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5" />
                    Menu Yonetimi
                  </div>
                  <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="gap-2"
                        onClick={() => {
                          setEditingMenuItem(null);
                          setMenuItemForm({});
                        }}
                        data-testid="button-add-menu-item"
                      >
                        <Plus className="h-4 w-4" />
                        Yeni Urun
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingMenuItem ? "Urunu Duzenle" : "Yeni Urun Ekle"}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="menuItemName">Urun Adi</Label>
                            <Input
                              id="menuItemName"
                              value={menuItemForm.name || ""}
                              onChange={(e) => setMenuItemForm({ ...menuItemForm, name: e.target.value })}
                              placeholder="Urun adi"
                              data-testid="input-menu-item-name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="menuItemCategory">Kategori</Label>
                            <Select
                              value={menuItemForm.categoryId || ""}
                              onValueChange={(value) => setMenuItemForm({ ...menuItemForm, categoryId: value })}
                            >
                              <SelectTrigger data-testid="select-menu-category">
                                <SelectValue placeholder="Kategori secin" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="menuItemDesc">Aciklama</Label>
                          <Textarea
                            id="menuItemDesc"
                            value={menuItemForm.description || ""}
                            onChange={(e) => setMenuItemForm({ ...menuItemForm, description: e.target.value })}
                            placeholder="Urun aciklamasi"
                            data-testid="input-menu-item-description"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="menuItemIngredients">Malzemeler</Label>
                          <Input
                            id="menuItemIngredients"
                            value={menuItemForm.ingredients || ""}
                            onChange={(e) => setMenuItemForm({ ...menuItemForm, ingredients: e.target.value })}
                            placeholder="Malzeme listesi (virgul ile ayirin)"
                            data-testid="input-menu-item-ingredients"
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="menuItemPrice">Fiyat (TL)</Label>
                            <Input
                              id="menuItemPrice"
                              type="number"
                              step="0.01"
                              value={menuItemForm.price || ""}
                              onChange={(e) => setMenuItemForm({ ...menuItemForm, price: e.target.value })}
                              placeholder="0.00"
                              data-testid="input-menu-item-price"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="menuItemSalePrice">Indirimli Fiyat (TL)</Label>
                            <Input
                              id="menuItemSalePrice"
                              type="number"
                              step="0.01"
                              value={menuItemForm.salePrice || ""}
                              onChange={(e) => setMenuItemForm({ ...menuItemForm, salePrice: e.target.value || null })}
                              placeholder="Bos birakin indirim yoksa"
                              data-testid="input-menu-item-sale-price"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="menuItemImage">Gorsel URL</Label>
                          <Input
                            id="menuItemImage"
                            value={menuItemForm.image || ""}
                            onChange={(e) => setMenuItemForm({ ...menuItemForm, image: e.target.value })}
                            placeholder="Gorsel URL veya medyadan secin"
                            data-testid="input-menu-item-image"
                          />
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Switch
                              id="menuItemAvailable"
                              checked={menuItemForm.isAvailable !== false}
                              onCheckedChange={(checked) => setMenuItemForm({ ...menuItemForm, isAvailable: checked })}
                            />
                            <Label htmlFor="menuItemAvailable">Mevcut</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="menuItemPopular"
                              checked={menuItemForm.isPopular === true}
                              onCheckedChange={(checked) => setMenuItemForm({ ...menuItemForm, isPopular: checked })}
                            />
                            <Label htmlFor="menuItemPopular">Populer</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="menuItemFeatured"
                              checked={menuItemForm.isFeatured === true}
                              onCheckedChange={(checked) => setMenuItemForm({ ...menuItemForm, isFeatured: checked })}
                            />
                            <Label htmlFor="menuItemFeatured">One Cikan</Label>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button
                            className="flex-1"
                            onClick={() => {
                              if (editingMenuItem) {
                                updateMenuItemMutation.mutate({ id: editingMenuItem.id, ...menuItemForm });
                              } else {
                                createMenuItemMutation.mutate(menuItemForm);
                              }
                            }}
                            disabled={createMenuItemMutation.isPending || updateMenuItemMutation.isPending}
                            data-testid="button-save-menu-item"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {editingMenuItem ? "Guncelle" : "Kaydet"}
                          </Button>
                          <Button variant="outline" onClick={() => setShowMenuDialog(false)}>
                            Iptal
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gorsel</TableHead>
                        <TableHead>Urun</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Fiyat</TableHead>
                        <TableHead>Indirim</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">Islemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {menuItems.map((item) => (
                        <TableRow key={item.id} data-testid={`row-menu-item-${item.id}`}>
                          <TableCell>
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="w-12 h-12 object-cover rounded-md"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {categories.find(c => c.id === item.categoryId)?.name || "-"}
                          </TableCell>
                          <TableCell>{parseFloat(item.price).toFixed(2)} TL</TableCell>
                          <TableCell>
                            {item.salePrice ? (
                              <Badge variant="secondary" className="text-green-600">
                                {parseFloat(item.salePrice).toFixed(2)} TL
                              </Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.isAvailable ? "default" : "secondary"}>
                              {item.isAvailable ? "Mevcut" : "Yok"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingMenuItem(item);
                                  setMenuItemForm(item);
                                  setShowMenuDialog(true);
                                }}
                                data-testid={`button-edit-menu-${item.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => deleteMenuItemMutation.mutate(item.id)}
                                data-testid={`button-delete-menu-${item.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Management Tab */}
          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Medya Yonetimi
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={mediaFilter} onValueChange={setMediaFilter}>
                      <SelectTrigger className="w-40" data-testid="select-media-filter">
                        <SelectValue placeholder="Tur filtrele" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tumu</SelectItem>
                        <SelectItem value="logo">Logo</SelectItem>
                        <SelectItem value="hero">Hero</SelectItem>
                        <SelectItem value="menu_item">Menu Gorseli</SelectItem>
                        <SelectItem value="gallery">Galeri</SelectItem>
                      </SelectContent>
                    </Select>
                    <Label htmlFor="uploadMedia" className="cursor-pointer">
                      <Button size="sm" className="gap-2" asChild disabled={isUploading}>
                        <span>
                          <Upload className="h-4 w-4" />
                          {isUploading ? "Yukleniyor..." : "Gorsel Yukle"}
                        </span>
                      </Button>
                    </Label>
                    <input
                      type="file"
                      id="uploadMedia"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "gallery")}
                      data-testid="input-upload-media"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Quick Upload Sections */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ImageIcon className="h-4 w-4" />
                          <span className="font-medium">Logo</span>
                        </div>
                        <Label htmlFor="uploadLogo" className="cursor-pointer">
                          <div className="border-2 border-dashed rounded-md p-4 text-center hover-elevate">
                            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Logo yukle</p>
                          </div>
                        </Label>
                        <input
                          type="file"
                          id="uploadLogo"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "logo")}
                        />
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ImageIcon className="h-4 w-4" />
                          <span className="font-medium">Hero Gorseli</span>
                        </div>
                        <Label htmlFor="uploadHero" className="cursor-pointer">
                          <div className="border-2 border-dashed rounded-md p-4 text-center hover-elevate">
                            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Hero gorseli yukle</p>
                          </div>
                        </Label>
                        <input
                          type="file"
                          id="uploadHero"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "hero")}
                        />
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ImageIcon className="h-4 w-4" />
                          <span className="font-medium">Menu Gorseli</span>
                        </div>
                        <Label htmlFor="uploadMenuItem" className="cursor-pointer">
                          <div className="border-2 border-dashed rounded-md p-4 text-center hover-elevate">
                            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Menu gorseli yukle</p>
                          </div>
                        </Label>
                        <input
                          type="file"
                          id="uploadMenuItem"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "menu_item")}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  {/* Media Gallery */}
                  <div>
                    <h3 className="font-semibold mb-4">Yuklenen Gorseller</h3>
                    {mediaAssets.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Henuz gorsel yuklenmemis</p>
                        <p className="text-sm">Yukaridaki butonlari kullanarak gorsel yukleyebilirsiniz</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {mediaAssets
                          .filter(a => mediaFilter === "all" || a.type === mediaFilter)
                          .map((asset) => (
                          <div 
                            key={asset.id} 
                            className="relative group rounded-md overflow-hidden border"
                            data-testid={`media-item-${asset.id}`}
                          >
                            <img
                              src={asset.objectPath}
                              alt={asset.altText || asset.fileName}
                              className="w-full aspect-square object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={() => deleteMediaMutation.mutate(asset.id)}
                                data-testid={`button-delete-media-${asset.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-xs text-white truncate">
                              {asset.fileName}
                            </div>
                            <Badge 
                              variant="secondary" 
                              className="absolute top-1 left-1 text-xs"
                            >
                              {asset.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Site Settings Tab */}
          <TabsContent value="site" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Site Ayarlari
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="restaurantName">Restoran Adi</Label>
                    <Input
                      id="restaurantName"
                      value={profileForm.restaurantName || siteProfile?.restaurantName || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, restaurantName: e.target.value })}
                      placeholder="Lezzet Express"
                      data-testid="input-restaurant-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tagline">Slogan</Label>
                    <Input
                      id="tagline"
                      value={profileForm.tagline || siteProfile?.tagline || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                      placeholder="Corlu'nun En Lezzetli Adresi"
                      data-testid="input-tagline"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aboutText">Hakkimizda</Label>
                  <Textarea
                    id="aboutText"
                    value={profileForm.aboutText || siteProfile?.aboutText || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, aboutText: e.target.value })}
                    placeholder="Restoran hakkinda kisa bilgi..."
                    rows={3}
                    data-testid="input-about"
                  />
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="heroTitle">Hero Baslik</Label>
                    <Input
                      id="heroTitle"
                      value={profileForm.heroTitle || siteProfile?.heroTitle || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, heroTitle: e.target.value })}
                      placeholder="Ev Yapimi Lezzetler Kapiinizda"
                      data-testid="input-hero-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroSubtitle">Hero Alt Baslik</Label>
                    <Input
                      id="heroSubtitle"
                      value={profileForm.heroSubtitle || siteProfile?.heroSubtitle || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, heroSubtitle: e.target.value })}
                      placeholder="Taze malzemeler, ozenle hazirlanan yemekler"
                      data-testid="input-hero-subtitle"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="address">Adres</Label>
                    <Input
                      id="address"
                      value={profileForm.address || siteProfile?.address || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      placeholder="Adres bilgisi"
                      data-testid="input-address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone || siteProfile?.phone || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="0282 123 45 67"
                      data-testid="input-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email || siteProfile?.email || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="info@lezzetexpress.com"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="googleReviewsWidgetCode">Google Yorumlari Widget Kodu</Label>
                  <p className="text-sm text-muted-foreground">
                    Elfsight, Tagembed veya benzeri servislerden aldiginiz embed kodunu buraya yapistirin.
                  </p>
                  <Textarea
                    id="googleReviewsWidgetCode"
                    value={profileForm.googleReviewsWidgetCode || siteProfile?.googleReviewsWidgetCode || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, googleReviewsWidgetCode: e.target.value })}
                    placeholder='<script src="..." ></script> veya <div class="..." ></div>'
                    rows={4}
                    data-testid="input-google-widget"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => updateProfileMutation.mutate(profileForm)}
                    disabled={updateProfileMutation.isPending}
                    className="gap-2"
                    data-testid="button-save-site"
                  >
                    <Save className="h-4 w-4" />
                    {updateProfileMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Sosyal Medya Baglantilari
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {socialLinks.map((link) => (
                  <div key={link.id} className="flex items-center gap-4 p-4 rounded-md border" data-testid={`social-link-${link.platform}`}>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {platformIcons[link.platform] || <Share2 className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>{platformLabels[link.platform] || link.platform}</Label>
                      <Input
                        value={link.url || ""}
                        onChange={(e) => updateSocialLinkMutation.mutate({ id: link.id, url: e.target.value })}
                        placeholder={`https://${link.platform}.com/yourpage`}
                        data-testid={`input-social-${link.platform}`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`visible-${link.id}`} className="text-sm text-muted-foreground">
                        Goster
                      </Label>
                      <Switch
                        id={`visible-${link.id}`}
                        checked={link.isVisible || false}
                        onCheckedChange={(checked) => updateSocialLinkMutation.mutate({ id: link.id, isVisible: checked })}
                        data-testid={`switch-social-${link.platform}`}
                      />
                    </div>
                  </div>
                ))}

                {socialLinks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Share2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Henuz sosyal medya baglantisi eklenmemis.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SiWhatsapp className="h-5 w-5 text-whatsapp" />
                  WhatsApp Ayarlari
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Isletme Telefon Numarasi</Label>
                  <Input
                    id="businessPhone"
                    value={whatsappForm.businessPhone || whatsappSettings?.businessPhone || ""}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, businessPhone: e.target.value })}
                    placeholder="905551234567"
                    data-testid="input-whatsapp-phone"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ulke kodu ile birlikte girin (ornek: 905551234567)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultMessage">Varsayilan Mesaj</Label>
                  <Textarea
                    id="defaultMessage"
                    value={whatsappForm.defaultMessage || whatsappSettings?.defaultMessage || ""}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, defaultMessage: e.target.value })}
                    placeholder="Merhaba, Lezzet Express'ten siparis vermek istiyorum."
                    rows={2}
                    data-testid="input-default-message"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmationTemplate">Siparis Onay Mesaji Sablonu</Label>
                  <Textarea
                    id="confirmationTemplate"
                    value={whatsappForm.orderConfirmationTemplate || whatsappSettings?.orderConfirmationTemplate || ""}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, orderConfirmationTemplate: e.target.value })}
                    placeholder="Sayin {customerName}, siparisini aldik! Siparis No: {orderId}..."
                    rows={3}
                    data-testid="input-confirmation-template"
                  />
                  <p className="text-xs text-muted-foreground">
                    Kullanilabilir degiskenler: {"{customerName}"}, {"{orderId}"}, {"{total}"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="whatsappEnabled"
                    checked={whatsappForm.isEnabled ?? whatsappSettings?.isEnabled ?? true}
                    onCheckedChange={(checked) => setWhatsappForm({ ...whatsappForm, isEnabled: checked })}
                    data-testid="switch-whatsapp-enabled"
                  />
                  <Label htmlFor="whatsappEnabled">WhatsApp Entegrasyonunu Etkinlestir</Label>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => updateWhatsappMutation.mutate(whatsappForm)}
                    disabled={updateWhatsappMutation.isPending}
                    className="gap-2"
                    data-testid="button-save-whatsapp"
                  >
                    <Save className="h-4 w-4" />
                    {updateWhatsappMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Musteri Yorumlari
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allReviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Henuz yorum bulunmamaktadir.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allReviews.map((review) => (
                      <div
                        key={review.id}
                        className={`p-4 rounded-md border ${!review.isApproved ? "opacity-60" : ""}`}
                        data-testid={`review-${review.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">{review.customerName}</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-muted"}`}
                                  />
                                ))}
                              </div>
                              {!review.isApproved && (
                                <Badge variant="secondary">Onay Bekliyor</Badge>
                              )}
                            </div>
                            {review.menuItemName && (
                              <p className="text-sm text-muted-foreground mb-1">{review.menuItemName}</p>
                            )}
                            <p className="text-sm">{review.comment}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {review.createdAt && new Date(review.createdAt).toLocaleDateString("tr-TR")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant={review.isApproved ? "secondary" : "default"}
                              onClick={() => updateReviewMutation.mutate({ id: review.id, isApproved: !review.isApproved })}
                              data-testid={`button-toggle-review-${review.id}`}
                            >
                              {review.isApproved ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => deleteReviewMutation.mutate(review.id)}
                              data-testid={`button-delete-review-${review.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <Card
              className="w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              data-testid="modal-order-detail"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                  <span>Siparis #{selectedOrder.id.slice(0, 8).toUpperCase()}</span>
                  <Badge className={statusColors[selectedOrder.status || "pending"]}>
                    {statusLabels[selectedOrder.status || "pending"]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Musteri Bilgileri</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Ad:</span> {selectedOrder.customerName}</p>
                    <p><span className="text-muted-foreground">Telefon:</span> {selectedOrder.customerPhone}</p>
                    <p><span className="text-muted-foreground">Adres:</span> {selectedOrder.customerAddress}</p>
                  </div>
                </div>

                <Separator />

                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <>
                    <div>
                      <h4 className="font-semibold mb-2">Siparis Icerigi</h4>
                      <div className="space-y-2">
                        {selectedOrder.items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>{item.quantity}x {item.menuItemName}</span>
                            <span className="font-medium">{parseFloat(item.totalPrice).toFixed(2)} TL</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />
                  </>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Odeme</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {selectedOrder.paymentMethod === "cash" ? "Nakit" : "POS ile Kart"}
                    </span>
                    <span className="text-xl font-bold text-primary">
                      {parseFloat(selectedOrder.total).toFixed(2)} TL
                    </span>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Siparis Notu</h4>
                      <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => handlePrint(selectedOrder)}
                    data-testid="button-modal-print"
                  >
                    <Printer className="h-4 w-4" />
                    Yazdir
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => setSelectedOrder(null)}
                    data-testid="button-modal-close"
                  >
                    Kapat
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
