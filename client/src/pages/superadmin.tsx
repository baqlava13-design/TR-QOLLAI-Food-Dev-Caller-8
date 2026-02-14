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
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant } from "@shared/schema";
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
    onSuccess: () => onLogin(),
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
    status: tenant.status || "lead",
    source: tenant.source || "other",
    notes: tenant.notes || "",
    monthlyFee: tenant.monthlyFee || "",
    demoReady: tenant.demoReady || false,
    menuSeeded: tenant.menuSeeded || false,
    nextFollowupAt: tenant.nextFollowupAt ? new Date(tenant.nextFollowupAt).toISOString().split("T")[0] : "",
  });

  const checklist = (tenant.pitchChecklist || DEFAULT_PITCH_CHECKLIST) as Record<string, boolean>;

  const { data: stats } = useQuery<{ todayOrders: number; todayRevenue: number; totalCustomers: number }>({
    queryKey: ["/api/superadmin/tenants", tenant.id, "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/superadmin/tenants/${tenant.id}`, data);
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
      const res = await apiRequest("PATCH", `/api/superadmin/tenants/${tenant.id}/checklist`, data);
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
    </div>
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
    fetch("/api/superadmin/me", { credentials: "include" })
      .then(r => { if (r.ok) setIsLoggedIn(true); setCheckingAuth(false); })
      .catch(() => setCheckingAuth(false));
  }, []);

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/superadmin/tenants"],
    enabled: isLoggedIn,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newTenant) => {
      const res = await apiRequest("POST", "/api/superadmin/tenants", data);
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
      await apiRequest("DELETE", `/api/superadmin/tenants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      setSelectedTenant(null);
      toast({ title: "Tenant deleted" });
    },
  });

  const handleLogout = async () => {
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
      const res = await apiRequest("POST", "/api/superadmin/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.error || "Failed to change password", variant: "destructive" });
        return;
      }
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
