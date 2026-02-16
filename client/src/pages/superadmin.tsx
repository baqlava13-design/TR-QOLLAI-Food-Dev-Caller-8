import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BarChart3,
  Users,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Save,
  LogOut,
  Sun,
  Moon,
  Search,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ChevronRight,
  Building2,
  TrendingUp,
  ShoppingBag,
  KeyRound,
  Upload,
  Image,
  ExternalLink,
  Rocket,
  Utensils,
  X,
  Copy,
  MonitorSmartphone,
  Settings,
  PhoneCall,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant, PilotMenuItem } from "@shared/schema";
import { PITCH_CHECKLIST_LABELS, DEFAULT_PITCH_CHECKLIST } from "@shared/schema";

const PIPELINE_STAGES = [
  { value: "lead", label: "Lead", color: "bg-gray-500" },
  { value: "pitched", label: "Pitched", color: "bg-blue-500" },
  { value: "trial", label: "Trial", color: "bg-yellow-500" },
  { value: "customer", label: "Customer", color: "bg-green-500" },
  { value: "churned", label: "Churned", color: "bg-red-500" },
];

const SOURCE_OPTIONS = [
  { value: "walk-in", label: "Walk-in" },
  { value: "instagram", label: "Instagram" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "cold-call", label: "Cold Call" },
  { value: "other", label: "Other" },
];

function getSuperadminHeaders(): Record<string, string> {
  const token = localStorage.getItem("superadminToken");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function superadminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = { ...getSuperadminHeaders(), ...(options.headers as Record<string, string> || {}) };
  return fetch(url, { ...options, headers, credentials: "include" });
}

async function superadminRequest(method: string, url: string, data?: unknown): Promise<Response> {
  const headers: Record<string, string> = { ...getSuperadminHeaders() };
  if (data) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { theme, toggleTheme } = useTheme();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/superadmin/login", { username, password });
      return res.json();
    },
    onSuccess: (data: { token: string }) => {
      localStorage.setItem("superadminToken", data.token);
      onLogin();
    },
    onError: () => setError("Invalid credentials"),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-end mb-2">
            <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          <CardTitle className="text-2xl">Qollai Superadmin</CardTitle>
          <p className="text-sm text-muted-foreground">Platform Management</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <div>
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="superadmin"
              data-testid="input-superadmin-username"
              onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate()}
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              data-testid="input-superadmin-password"
              onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate()}
            />
          </div>
          <Button className="w-full" onClick={() => loginMutation.mutate()} disabled={loginMutation.isPending} data-testid="button-superadmin-login">
            {loginMutation.isPending ? "Logging in..." : "Login"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PipelineBoard({ tenants, onSelectTenant }: { tenants: Tenant[]; onSelectTenant: (t: Tenant) => void }) {
  return (
    <div className="grid grid-cols-5 gap-4">
      {PIPELINE_STAGES.map(stage => {
        const stageTenants = tenants.filter(t => t.status === stage.value);
        return (
          <div key={stage.value} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${stage.color}`} />
              <h3 className="font-medium text-sm">{stage.label}</h3>
              <Badge variant="secondary">{stageTenants.length}</Badge>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {stageTenants.map(t => (
                <Card
                  key={t.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => onSelectTenant(t)}
                  data-testid={`card-tenant-${t.id}`}
                >
                  <CardContent className="p-3 space-y-1">
                    <p className="font-medium text-sm" data-testid={`text-tenant-name-${t.id}`}>{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.contactName}</p>
                    {t.contactPhone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {t.contactPhone}
                      </p>
                    )}
                    {t.nextFollowupAt && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(t.nextFollowupAt).toLocaleDateString("tr-TR")}
                      </p>
                    )}
                    {t.source && (
                      <Badge variant="outline" className="text-xs">{t.source}</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TenantDetail({ tenant, onBack, onUpdate }: { tenant: Tenant; onBack: () => void; onUpdate: () => void }) {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: tenant.name,
    slug: tenant.slug,
    contactName: tenant.contactName || "",
    contactPhone: tenant.contactPhone || "",
    contactEmail: tenant.contactEmail || "",
    city: tenant.city || "",
    address: tenant.address || "",
    customDomain: tenant.customDomain || "",
    status: tenant.status || "lead",
    source: tenant.source || "other",
    notes: tenant.notes || "",
    monthlyFee: tenant.monthlyFee || "",
    demoReady: tenant.demoReady || false,
    menuSeeded: tenant.menuSeeded || false,
    nextFollowupAt: tenant.nextFollowupAt ? new Date(tenant.nextFollowupAt).toISOString().split("T")[0] : "",
  });

  useEffect(() => {
    setForm({
      name: tenant.name,
      slug: tenant.slug,
      contactName: tenant.contactName || "",
      contactPhone: tenant.contactPhone || "",
      contactEmail: tenant.contactEmail || "",
      city: tenant.city || "",
      address: tenant.address || "",
      customDomain: tenant.customDomain || "",
      status: tenant.status || "lead",
      source: tenant.source || "other",
      notes: tenant.notes || "",
      monthlyFee: tenant.monthlyFee || "",
      demoReady: tenant.demoReady || false,
      menuSeeded: tenant.menuSeeded || false,
      nextFollowupAt: tenant.nextFollowupAt ? new Date(tenant.nextFollowupAt).toISOString().split("T")[0] : "",
    });
  }, [tenant]);

  const checklist = (tenant.pitchChecklist || DEFAULT_PITCH_CHECKLIST) as Record<string, boolean>;

  const { data: stats } = useQuery<{ todayOrders: number; todayRevenue: number; totalCustomers: number }>({
    queryKey: ["/api/superadmin/tenants", tenant.id, "stats"],
    queryFn: async () => {
      const res = await superadminFetch(`/api/superadmin/tenants/${tenant.id}/stats`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await superadminRequest("PATCH", `/api/superadmin/tenants/${tenant.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      onUpdate();
      toast({ title: "Tenant updated" });
      setEditMode(false);
    },
  });

  const checklistMutation = useMutation({
    mutationFn: async (data: Record<string, boolean>) => {
      const res = await superadminRequest("PATCH", `/api/superadmin/tenants/${tenant.id}/checklist`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      onUpdate();
    },
  });

  const completedItems = Object.values(checklist).filter(Boolean).length;
  const totalItems = Object.keys(PITCH_CHECKLIST_LABELS).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} data-testid="button-back-to-pipeline">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold" data-testid="text-tenant-detail-name">{tenant.name}</h2>
          <p className="text-sm text-muted-foreground">{tenant.slug}</p>
        </div>
        <Badge className={PIPELINE_STAGES.find(s => s.value === tenant.status)?.color || ""}>{tenant.status}</Badge>
        <Button variant={editMode ? "default" : "outline"} onClick={() => { if (editMode) { updateMutation.mutate(form); } else { setEditMode(true); } }} data-testid="button-edit-tenant">
          {editMode ? <><Save className="h-4 w-4 mr-1" /> Save</> : <><Pencil className="h-4 w-4 mr-1" /> Edit</>}
        </Button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-today-orders">{stats.todayOrders}</p>
                <p className="text-xs text-muted-foreground">Today's Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-today-revenue">{Number(stats.todayRevenue).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</p>
                <p className="text-xs text-muted-foreground">Today's Revenue</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-customers">{stats.totalCustomers}</p>
                <p className="text-xs text-muted-foreground">Customers</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Tenant Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Tenant Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-tenant-name" />
                  </div>
                  <div>
                    <Label>Slug</Label>
                    <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} data-testid="input-tenant-slug" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Contact Name</Label>
                    <Input value={form.contactName} onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))} data-testid="input-contact-name" />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input value={form.contactPhone} onChange={(e) => setForm(f => ({ ...f, contactPhone: e.target.value }))} data-testid="input-contact-phone" />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={form.contactEmail} onChange={(e) => setForm(f => ({ ...f, contactEmail: e.target.value }))} data-testid="input-contact-email" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>City</Label>
                    <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} data-testid="input-city" />
                  </div>
                  <div>
                    <Label>Monthly Fee (TL)</Label>
                    <Input type="number" value={form.monthlyFee} onChange={(e) => setForm(f => ({ ...f, monthlyFee: e.target.value }))} data-testid="input-monthly-fee" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Pipeline Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger data-testid="select-pipeline-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PIPELINE_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Source</Label>
                    <Select value={form.source} onValueChange={(v) => setForm(f => ({ ...f, source: v }))}>
                      <SelectTrigger data-testid="select-source"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Next Follow-up</Label>
                  <Input type="date" value={form.nextFollowupAt} onChange={(e) => setForm(f => ({ ...f, nextFollowupAt: e.target.value }))} data-testid="input-followup-date" />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} data-testid="input-address" />
                </div>
                <div>
                  <Label>Custom Domain</Label>
                  <Input placeholder="siparis.kebapci.com" value={form.customDomain} onChange={(e) => setForm(f => ({ ...f, customDomain: e.target.value.toLowerCase().replace(/^www\./, "") }))} data-testid="input-custom-domain" />
                  <p className="text-xs text-muted-foreground mt-1">Customer's own domain (without www). CNAME must point to your app.</p>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} data-testid="input-notes" />
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.demoReady} onCheckedChange={(v) => setForm(f => ({ ...f, demoReady: v }))} data-testid="switch-demo-ready" />
                    <Label>Demo Ready</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.menuSeeded} onCheckedChange={(v) => setForm(f => ({ ...f, menuSeeded: v }))} data-testid="switch-menu-seeded" />
                    <Label>Menu Seeded</Label>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setEditMode(false)} data-testid="button-cancel-edit">Cancel</Button>
              </>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact</span>
                  <span>{tenant.contactName || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{tenant.contactPhone || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{tenant.contactEmail || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">City</span>
                  <span>{tenant.city || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <Badge variant="outline">{tenant.source || "-"}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Fee</span>
                  <span>{tenant.monthlyFee ? `${tenant.monthlyFee} TL` : "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Follow-up</span>
                  <span>{tenant.nextFollowupAt ? new Date(tenant.nextFollowupAt).toLocaleDateString("tr-TR") : "-"}</span>
                </div>
                <Separator />
                <div className="flex justify-between flex-wrap gap-1">
                  <span className="text-muted-foreground">Public URL</span>
                  <span className="text-xs font-mono">/{tenant.slug}</span>
                </div>
                {tenant.customDomain && (
                  <div className="flex justify-between flex-wrap gap-1">
                    <span className="text-muted-foreground">Custom Domain</span>
                    <span className="text-xs font-mono">{tenant.customDomain}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Demo Ready</span>
                  <Badge variant={tenant.demoReady ? "default" : "secondary"}>{tenant.demoReady ? "Yes" : "No"}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Menu Seeded</span>
                  <Badge variant={tenant.menuSeeded ? "default" : "secondary"}>{tenant.menuSeeded ? "Yes" : "No"}</Badge>
                </div>
                {tenant.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground mb-1">Notes</p>
                      <p className="whitespace-pre-wrap">{tenant.notes}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pitch Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Pitch Checklist
              </span>
              <Badge variant="secondary">{completedItems}/{totalItems}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(PITCH_CHECKLIST_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-3">
                  <Checkbox
                    checked={checklist[key] || false}
                    onCheckedChange={(checked) => {
                      checklistMutation.mutate({ [key]: !!checked });
                    }}
                    data-testid={`checkbox-${key}`}
                  />
                  <Label className={`text-sm ${checklist[key] ? "line-through text-muted-foreground" : ""}`}>
                    {label}
                  </Label>
                </div>
              ))}
            </div>
            {completedItems === totalItems && (
              <div className="mt-4 p-3 rounded-md bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm text-center">
                All pitch steps completed!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pilot Website Configuration */}
      <PilotConfig tenant={tenant} onUpdate={onUpdate} />
    </div>
  );
}

function PilotConfig({ tenant, onUpdate }: { tenant: Tenant; onUpdate: () => void }) {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl || "");
  const [heroUrl, setHeroUrl] = useState((tenant.heroImages as string[])?.[0] || "");
  const [items, setItems] = useState<PilotMenuItem[]>(
    (tenant.pilotMenuItems as PilotMenuItem[]) || []
  );
  const [uploading, setUploading] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await superadminRequest("PATCH", `/api/superadmin/tenants/${tenant.id}/pilot`, {
        logoUrl: logoUrl || null,
        heroImages: heroUrl ? [heroUrl] : [],
        pilotMenuItems: items,
        demoReady: items.length > 0 && !!logoUrl,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      onUpdate();
      toast({ title: "Pilot configuration saved" });
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      const validItems = items.filter(it => it.name.trim() && it.price.trim());
      if (validItems.length === 0) throw new Error("At least one item with name and price is required");
      await superadminRequest("PATCH", `/api/superadmin/tenants/${tenant.id}/pilot`, {
        logoUrl: logoUrl || null,
        heroImages: heroUrl ? [heroUrl] : [],
        pilotMenuItems: validItems,
        demoReady: true,
      });
      const res = await superadminRequest("POST", `/api/superadmin/tenants/${tenant.id}/activate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      onUpdate();
      toast({ title: "Tenant activated as Customer!" });
    },
    onError: (e: any) => {
      toast({ title: e.message || "Failed to activate", variant: "destructive" });
    },
  });

  const uploadFile = async (file: File, target: string) => {
    setUploading(target);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("superadminToken");
      const res = await fetch("/api/uploads/local", {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const url = data.url || data.path;
      return url;
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
      return null;
    } finally {
      setUploading(null);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "logo");
    if (url) setLogoUrl(url);
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "hero");
    if (url) setHeroUrl(url);
  };

  const handleItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, `item-${index}`);
    if (url) {
      setItems(prev => prev.map((item, i) => i === index ? { ...item, image: url } : item));
    }
  };

  const addItem = () => {
    if (items.length >= 6) {
      toast({ title: "Maximum 6 items allowed", variant: "destructive" });
      return;
    }
    setItems(prev => [...prev, { name: "", description: "", price: "0", image: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PilotMenuItem, value: string) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const pilotUrl = `/p/${tenant.slug}`;
  const canActivate = items.length > 0 && tenant.status !== "customer";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Pilot Website
          </span>
          <div className="flex items-center gap-2">
            {tenant.demoReady && (
              <Button variant="outline" asChild>
                <a href={pilotUrl} target="_blank" rel="noopener noreferrer" data-testid="link-preview-pilot">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Preview
                </a>
              </Button>
            )}
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-pilot">
              <Save className="h-3.5 w-3.5 mr-1" />
              {saveMutation.isPending ? "Saving..." : "Save Pilot"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo & Hero */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Image className="h-3.5 w-3.5" /> Logo URL</Label>
            <div className="flex gap-2">
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://... or upload"
                data-testid="input-pilot-logo"
              />
              <label>
                <Button variant="outline" asChild className="cursor-pointer">
                  <span>
                    <Upload className="h-3.5 w-3.5" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </span>
                </Button>
              </label>
            </div>
            {logoUrl && (
              <div className="h-16 w-16 rounded-md border overflow-hidden">
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Image className="h-3.5 w-3.5" /> Hero Image</Label>
            <div className="flex gap-2">
              <Input
                value={heroUrl}
                onChange={(e) => setHeroUrl(e.target.value)}
                placeholder="https://... or upload"
                data-testid="input-pilot-hero"
              />
              <label>
                <Button variant="outline" asChild className="cursor-pointer">
                  <span>
                    <Upload className="h-3.5 w-3.5" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
                  </span>
                </Button>
              </label>
            </div>
            {heroUrl && (
              <div className="h-20 w-full rounded-md border overflow-hidden">
                <img src={heroUrl} alt="Hero" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Menu Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm font-semibold">Pilot Menu Items ({items.length}/6)</Label>
            <Button variant="outline" onClick={addItem} disabled={items.length >= 6} data-testid="button-add-pilot-item">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Item
            </Button>
          </div>

          {items.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm border rounded-md">
              No menu items yet. Add up to 6 items for the pilot page.
            </div>
          )}

          {items.map((item, i) => (
            <Card key={i}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(i, "name", e.target.value)}
                        placeholder="Item name"
                        data-testid={`input-pilot-item-name-${i}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Price (TL)</Label>
                      <Input
                        value={item.price}
                        onChange={(e) => updateItem(i, "price", e.target.value)}
                        placeholder="0.00"
                        data-testid={`input-pilot-item-price-${i}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Image</Label>
                      <div className="flex gap-1">
                        <Input
                          value={item.image}
                          onChange={(e) => updateItem(i, "image", e.target.value)}
                          placeholder="URL"
                          data-testid={`input-pilot-item-image-${i}`}
                        />
                        <label>
                          <Button variant="outline" size="icon" asChild className="cursor-pointer flex-shrink-0">
                            <span>
                              <Upload className="h-3 w-3" />
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleItemImageUpload(e, i)} />
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeItem(i)} data-testid={`button-remove-pilot-item-${i}`}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                    placeholder="Brief description"
                    data-testid={`input-pilot-item-desc-${i}`}
                  />
                </div>
                {item.image && (
                  <div className="h-16 w-24 rounded-md border overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Demo Access Links */}
        {tenant.demoReady && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-1">
                <MonitorSmartphone className="h-3.5 w-3.5" />
                Demo Access
              </Label>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-2 p-2 rounded-md border">
                  <div className="flex items-center gap-2 min-w-0">
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">Customer Website:</span>
                    <code className="text-xs truncate">/{tenant.slug}</code>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${tenant.slug}`); }} data-testid="button-copy-pilot-url">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/${tenant.slug}`} target="_blank" rel="noopener noreferrer" data-testid="link-open-pilot">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
                {tenant.customDomain && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-md border">
                    <div className="flex items-center gap-2 min-w-0">
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">Custom Domain:</span>
                      <code className="text-xs truncate">{tenant.customDomain}</code>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`https://${tenant.customDomain}`); }} data-testid="button-copy-custom-domain">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 p-2 rounded-md border">
                  <div className="flex items-center gap-2 min-w-0">
                    <Settings className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">Admin Panel:</span>
                    <code className="text-xs">/admin</code>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/admin" target="_blank" rel="noopener noreferrer" data-testid="link-open-admin">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-md border">
                  <div className="flex items-center gap-2 min-w-0">
                    <PhoneCall className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone Orders:</span>
                    <code className="text-xs">/siparis</code>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/siparis" target="_blank" rel="noopener noreferrer" data-testid="link-open-siparis">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
                <div className="p-2 rounded-md border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">Admin Login Credentials</span>
                  </div>
                  <div className="flex items-center gap-4 pl-5">
                    <span className="text-xs">Username: <code className="font-bold">admin_{tenant.slug}</code></span>
                    <span className="text-xs">Password: <code className="font-bold">admin123</code></span>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`admin_${tenant.slug}`); }} data-testid="button-copy-username">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Activate Tenant */}
        {canActivate && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-4 p-3 rounded-md border">
              <div>
                <p className="font-medium text-sm">Activate as Customer</p>
                <p className="text-xs text-muted-foreground">Convert this lead to a full customer. Menu items will be seeded from pilot data.</p>
              </div>
              <Button
                variant="default"
                onClick={() => {
                  if (confirm("Activate this tenant as a customer? This will seed the menu and change status to 'customer'.")) {
                    activateMutation.mutate();
                  }
                }}
                disabled={activateMutation.isPending}
                data-testid="button-activate-tenant"
              >
                <Rocket className="h-4 w-4 mr-1" />
                {activateMutation.isPending ? "Activating..." : "Activate"}
              </Button>
            </div>
          </>
        )}

        {uploading && (
          <p className="text-xs text-muted-foreground text-center">Uploading {uploading}...</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function SuperAdmin() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [newTenant, setNewTenant] = useState({ name: "", slug: "", contactName: "", contactPhone: "", contactEmail: "", city: "", source: "other", status: "lead" });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    const token = localStorage.getItem("superadminToken");
    if (!token) { setCheckingAuth(false); return; }
    superadminFetch("/api/superadmin/me")
      .then(r => { if (r.ok) setIsLoggedIn(true); setCheckingAuth(false); })
      .catch(() => setCheckingAuth(false));
  }, []);

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/superadmin/tenants"],
    enabled: isLoggedIn,
    queryFn: async () => {
      const res = await superadminFetch("/api/superadmin/tenants");
      if (!res.ok) throw new Error("Failed to fetch tenants");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newTenant) => {
      const res = await superadminRequest("POST", "/api/superadmin/tenants", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      setShowAddDialog(false);
      setNewTenant({ name: "", slug: "", contactName: "", contactPhone: "", contactEmail: "", city: "", source: "other", status: "lead" });
      toast({ title: "Tenant created" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to create tenant", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await superadminRequest("DELETE", `/api/superadmin/tenants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      setSelectedTenant(null);
      toast({ title: "Tenant deleted" });
    },
  });

  const handleLogout = async () => {
    localStorage.removeItem("superadminToken");
    await fetch("/api/superadmin/logout", { method: "POST", credentials: "include" });
    setIsLoggedIn(false);
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    try {
      const res = await superadminRequest("POST", "/api/superadmin/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      const data = await res.json();
      toast({ title: "Password changed successfully" });
      setShowPasswordDialog(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      toast({ title: "Failed to change password", variant: "destructive" });
    }
  };

  if (checkingAuth) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!isLoggedIn) return <LoginForm onLogin={() => setIsLoggedIn(true)} />;

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.contactName && t.contactName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.city && t.city.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const refreshSelectedTenant = () => {
    if (selectedTenant) {
      const updated = tenants.find(t => t.id === selectedTenant.id);
      if (updated) setSelectedTenant(updated);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">Qollai</h1>
            <Badge variant="secondary">Superadmin</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" onClick={() => setShowPasswordDialog(true)} data-testid="button-change-password">
              <KeyRound className="h-4 w-4 mr-1" />
              Sifre
            </Button>
            <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {selectedTenant ? (
          <TenantDetail
            tenant={selectedTenant}
            onBack={() => setSelectedTenant(null)}
            onUpdate={refreshSelectedTenant}
          />
        ) : (
          <div className="space-y-6">
            {/* Stats bar */}
            <div className="grid grid-cols-5 gap-4">
              {PIPELINE_STAGES.map(stage => {
                const count = tenants.filter(t => t.status === stage.value).length;
                return (
                  <Card key={stage.value}>
                    <CardContent className="p-4 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-2xl font-bold" data-testid={`text-count-${stage.value}`}>{count}</p>
                        <p className="text-xs text-muted-foreground">{stage.label}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search tenants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-tenants"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40" data-testid="select-filter-status">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {PIPELINE_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-tenant">
                <Plus className="h-4 w-4 mr-1" />
                Add Lead / Tenant
              </Button>
            </div>

            {/* Pipeline Board */}
            <PipelineBoard tenants={filteredTenants} onSelectTenant={setSelectedTenant} />

            {/* Table view below */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Tenants ({filteredTenants.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Follow-up</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTenants.map(t => (
                      <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelectedTenant(t)} data-testid={`row-tenant-${t.id}`}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {t.contactName && <p>{t.contactName}</p>}
                            {t.contactPhone && <p className="text-muted-foreground">{t.contactPhone}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{t.city || "-"}</TableCell>
                        <TableCell>
                          <Badge className={PIPELINE_STAGES.find(s => s.value === t.status)?.color || ""}>{t.status}</Badge>
                        </TableCell>
                        <TableCell><Badge variant="outline">{t.source || "-"}</Badge></TableCell>
                        <TableCell>
                          {t.nextFollowupAt ? new Date(t.nextFollowupAt).toLocaleDateString("tr-TR") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedTenant(t); }} data-testid={`button-view-tenant-${t.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); if (confirm("Delete this tenant?")) deleteMutation.mutate(t.id); }} data-testid={`button-delete-tenant-${t.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTenants.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {isLoading ? "Loading..." : "No tenants found"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Add Tenant Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Lead / Tenant</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Business Name *</Label>
                      <Input value={newTenant.name} onChange={(e) => setNewTenant(f => ({ ...f, name: e.target.value }))} placeholder="Restaurant name" data-testid="input-new-tenant-name" />
                    </div>
                    <div>
                      <Label>Slug *</Label>
                      <Input value={newTenant.slug} onChange={(e) => setNewTenant(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} placeholder="restaurant-name" data-testid="input-new-tenant-slug" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Contact Name</Label>
                      <Input value={newTenant.contactName} onChange={(e) => setNewTenant(f => ({ ...f, contactName: e.target.value }))} data-testid="input-new-contact-name" />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={newTenant.contactPhone} onChange={(e) => setNewTenant(f => ({ ...f, contactPhone: e.target.value }))} data-testid="input-new-contact-phone" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Email</Label>
                      <Input value={newTenant.contactEmail} onChange={(e) => setNewTenant(f => ({ ...f, contactEmail: e.target.value }))} data-testid="input-new-contact-email" />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input value={newTenant.city} onChange={(e) => setNewTenant(f => ({ ...f, city: e.target.value }))} data-testid="input-new-city" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Pipeline Stage</Label>
                      <Select value={newTenant.status} onValueChange={(v) => setNewTenant(f => ({ ...f, status: v }))}>
                        <SelectTrigger data-testid="select-new-status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PIPELINE_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Source</Label>
                      <Select value={newTenant.source} onValueChange={(v) => setNewTenant(f => ({ ...f, source: v }))}>
                        <SelectTrigger data-testid="select-new-source"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SOURCE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-cancel-add">Cancel</Button>
                    <Button
                      onClick={() => {
                        if (!newTenant.name || !newTenant.slug) {
                          toast({ title: "Name and slug are required", variant: "destructive" });
                          return;
                        }
                        createMutation.mutate(newTenant);
                      }}
                      disabled={createMutation.isPending}
                      data-testid="button-save-tenant"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sifre Degistir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mevcut Sifre</Label>
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                data-testid="input-current-password"
              />
            </div>
            <div>
              <Label>Yeni Sifre</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                data-testid="input-new-password"
              />
            </div>
            <div>
              <Label>Yeni Sifre (Tekrar)</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                data-testid="input-confirm-password"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowPasswordDialog(false); setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }} data-testid="button-cancel-password">
                Iptal
              </Button>
              <Button onClick={handleChangePassword} data-testid="button-save-password">
                <Save className="h-4 w-4 mr-1" />
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
