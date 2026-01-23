import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingCart, CreditCard, Banknote, ArrowRight, AlertTriangle, History, ChevronDown, ChevronUp, Gift, RotateCcw, Copy, Check } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useCart } from "@/lib/cart";
import { generateWhatsAppOrderLink, generateOrderMessage } from "@/lib/whatsapp";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { loadCustomerInfo, saveCustomerInfo, saveOrder, loadOrderHistory, type SavedOrder } from "@/lib/customer-storage";

export function OrderForm() {
  const { items, updateQuantity, removeItem, getSubtotal, getTotal, clearCart, addItem } = useCart();
  const { toast } = useToast();
  
  const { data: settingsData = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const { data: crossSellProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/cross-sell"],
  });

  const { data: menuItems = [] } = useQuery<any[]>({
    queryKey: ["/api/menu-items"],
  });
  
  const getWhatsAppNumber = () => {
    return settingsData.whatsapp_number || "";
  };

  const minimumOrderAmount = parseFloat(settingsData.minimum_order_amount || "0");
  const currentTotal = getTotal();
  const isBelowMinimum = minimumOrderAmount > 0 && currentTotal < minimumOrderAmount;
  const remainingAmount = minimumOrderAmount - currentTotal;
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    customerPhone: "",
    mahalle: "",
    sokak: "",
    binaNo: "",
    daireNo: "",
    paymentMethod: "cash" as "cash" | "pos",
    notes: "",
  });

  const [orderHistory, setOrderHistory] = useState<SavedOrder[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [orderMessage, setOrderMessage] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedInfo = loadCustomerInfo();
    if (savedInfo) {
      const [firstName = "", lastName = ""] = savedInfo.name.split(" ");
      setFormData(prev => ({
        ...prev,
        firstName,
        lastName: savedInfo.name.split(" ").slice(1).join(" ") || lastName,
        customerPhone: savedInfo.phone,
        mahalle: savedInfo.neighborhood,
        sokak: savedInfo.street,
        binaNo: savedInfo.buildingNo,
        daireNo: savedInfo.apartmentNo,
        notes: savedInfo.notes,
      }));
    }
    setOrderHistory(loadOrderHistory());
  }, []);

  const getFullName = () => `${formData.firstName} ${formData.lastName}`.trim();
  const getFullAddress = () => {
    const parts = [
      formData.mahalle,
      formData.sokak,
      formData.binaNo ? `Bina No: ${formData.binaNo}` : "",
      formData.daireNo ? `Daire No: ${formData.daireNo}` : "",
    ].filter(Boolean);
    return parts.join(", ");
  };

  const createOrderMutation = useMutation({
    mutationFn: async (data: typeof formData & { items: typeof items }) => {
      const orderItems = data.items.map((item) => ({
        menuItemId: item.menuItem.id,
        menuItemName: item.menuItem.name,
        quantity: item.quantity,
        unitPrice: item.menuItem.price,
        totalPrice: (parseFloat(item.menuItem.price) * item.quantity).toFixed(2),
        upsells: item.selectedUpsells.map(u => u.name).join(", ") || null,
      }));

      const order = {
        customerName: getFullName(),
        customerPhone: data.customerPhone,
        customerAddress: getFullAddress(),
        paymentMethod: data.paymentMethod,
        notes: data.notes || null,
        subtotal: getSubtotal().toFixed(2),
        total: getTotal().toFixed(2),
        items: orderItems,
      };

      return apiRequest("POST", "/api/orders", order);
    },
    onSuccess: () => {
      clearCart();
      toast({
        title: "Sipariş oluşturuldu!",
        description: "WhatsApp açılıyor, siparişinizi gönderin.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast({
        title: "Sepetiniz boş",
        description: "Lütfen sipariş vermek için menüden ürün seçin.",
        variant: "destructive",
      });
      return;
    }

    if (isBelowMinimum) {
      toast({
        title: "Minimum sipariş tutarına ulaşılmadı",
        description: `Sipariş verebilmek için sepetinize ${remainingAmount.toFixed(2)} TL daha eklemeniz gerekmektedir.`,
        variant: "destructive",
      });
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.customerPhone || !formData.mahalle || !formData.sokak || !formData.binaNo) {
      toast({
        title: "Eksik bilgi",
        description: "Lütfen tüm zorunlu alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    // Save customer info immediately (before API call) so it persists even if API fails
    saveCustomerInfo({
      name: getFullName(),
      phone: formData.customerPhone,
      neighborhood: formData.mahalle,
      street: formData.sokak,
      buildingNo: formData.binaNo,
      apartmentNo: formData.daireNo,
      notes: formData.notes,
    });
    
    // Save order to local history immediately
    saveOrder({
      items: items.map(item => ({
        menuItemId: item.menuItem.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.menuItem.price,
      })),
      total: getTotal().toFixed(2),
    });
    setOrderHistory(loadOrderHistory());

    // Generate WhatsApp link and message
    const whatsappNumber = getWhatsAppNumber();
    const link = generateWhatsAppOrderLink(
      items,
      getFullName(),
      formData.customerPhone,
      getFullAddress(),
      formData.paymentMethod,
      formData.notes,
      whatsappNumber
    );
    
    const message = generateOrderMessage(
      items,
      getFullName(),
      formData.customerPhone,
      getFullAddress(),
      formData.paymentMethod,
      formData.notes
    );
    
    // Set the link and message for display
    setWhatsappLink(link);
    setOrderMessage(message);
    setCopied(false);
    
    // Then save order to database in background
    createOrderMutation.mutate({ ...formData, items });
  };

  const handleDirectWhatsApp = () => {
    if (items.length === 0) {
      toast({
        title: "Sepetiniz boş",
        description: "Lütfen sipariş vermek için menüden ürün seçin.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.customerPhone || !formData.mahalle || !formData.sokak || !formData.binaNo) {
      toast({
        title: "Eksik bilgi",
        description: "Lütfen tüm zorunlu alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    const whatsappLink = generateWhatsAppOrderLink(
      items,
      getFullName(),
      formData.customerPhone,
      getFullAddress(),
      formData.paymentMethod,
      formData.notes,
      getWhatsAppNumber()
    );
    window.location.href = whatsappLink;
  };

  const handleReorder = (order: SavedOrder) => {
    let addedCount = 0;
    order.items.forEach((item) => {
      const menuItem = menuItems.find((m: any) => m.id === item.menuItemId || m.name === item.name);
      if (menuItem && menuItem.isAvailable) {
        addItem(menuItem, item.quantity, []);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      toast({
        title: "Sepete eklendi",
        description: `${addedCount} ürün sepetinize eklendi.`,
      });
    } else {
      toast({
        title: "Ürünler bulunamadı",
        description: "Bu siparişin ürünleri artık mevcut değil.",
        variant: "destructive",
      });
    }
  };

  return (
    <section id="order" className="py-12 sm:py-16 md:py-24 bg-muted/30 overflow-x-hidden" data-testid="section-order">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-none">
            Sipariş
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Siparişini <span className="text-primary">Tamamla</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Bilgilerinizi girin ve WhatsApp ile kolayca sipariş verin.
          </p>
        </div>

        {orderHistory.length > 0 && (
          <Card className="mb-8" data-testid="card-order-history">
            <CardHeader className="p-3 sm:p-4 cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Önceki Siparişlerim
                  <Badge variant="secondary">{Math.min(orderHistory.length, 3)}</Badge>
                </div>
                {showHistory ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
            {showHistory && (
              <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                <div className="space-y-3">
                  {orderHistory.slice(0, 3).map((order) => (
                    <div 
                      key={order.id} 
                      className="p-3 rounded-lg bg-muted/50 border cursor-pointer hover-elevate transition-all"
                      onClick={() => handleReorder(order)}
                      data-testid={`order-history-${order.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {new Date(order.date).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <Badge variant="outline" className="text-xs gap-1">
                          <RotateCcw className="h-3 w-3" />
                          Tekrar Sipariş
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <span key={idx}>
                            {item.quantity}x {item.name}{idx < Math.min(order.items.length, 3) - 1 ? ", " : ""}
                          </span>
                        ))}
                        {order.items.length > 3 && <span className="text-primary"> +{order.items.length - 3} daha</span>}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-medium text-primary">{order.total} TL</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          <Card data-testid="card-cart" className="overflow-hidden">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
                <ShoppingCart className="h-5 w-5" />
                Sepetiniz
                {items.length > 0 && (
                  <Badge variant="secondary">{items.length} ürün</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0">
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Sepetiniz boş</p>
                  <p className="text-sm mt-2">Menüden ürün ekleyerek başlayın</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.menuItem.id}
                      className="p-2 sm:p-3 rounded-lg bg-background"
                      data-testid={`cart-item-${item.menuItem.id}`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <img
                          src={item.menuItem.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=80&q=80"}
                          alt={item.menuItem.name}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate text-sm">{item.menuItem.name}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {parseFloat(item.menuItem.price).toFixed(2)} TL
                          </p>
                          {item.selectedUpsells.length > 0 && (
                            <p className="text-xs text-primary truncate">
                              + {item.selectedUpsells.map(u => u.name).join(", ")}
                            </p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive flex-shrink-0"
                          onClick={() => removeItem(item.menuItem.id)}
                          data-testid={`button-remove-${item.menuItem.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 min-w-0 flex-shrink-0"
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                          data-testid={`button-decrease-${item.menuItem.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 min-w-0 flex-shrink-0"
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                          data-testid={`button-increase-${item.menuItem.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Cross-sell / Upsell Section */}
                  {crossSellProducts.length > 0 && crossSellProducts.filter((product: any) => !items.some(item => item.menuItem.id === product.menuItem?.id)).length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Gift className="h-4 w-4" />
                          <span>Bunları da eklemek ister misiniz?</span>
                        </div>
                        <div className="grid gap-2">
                          {crossSellProducts
                            .filter((product: any) => !items.some(item => item.menuItem.id === product.menuItem?.id))
                            .slice(0, 3)
                            .map((product: any) => (
                              <div
                                key={product.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-dashed"
                                data-testid={`cross-sell-suggestion-${product.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  {product.menuItem?.image && (
                                    <img
                                      src={product.menuItem.image}
                                      alt={product.menuItem?.name}
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                  )}
                                  <div>
                                    <p className="text-sm font-medium">{product.menuItem?.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      +{parseFloat(product.menuItem?.price || 0).toFixed(2)} TL
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (product.menuItem) {
                                      addItem(product.menuItem, 1, []);
                                      toast({ title: `${product.menuItem.name} sepete eklendi` });
                                    }
                                  }}
                                  data-testid={`button-add-cross-sell-${product.id}`}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Ekle
                                </Button>
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ara Toplam</span>
                      <span>{getSubtotal().toFixed(2)} TL</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Teslimat</span>
                      <span className="text-whatsapp">Ücretsiz</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Toplam</span>
                      <span className="text-primary">{currentTotal.toFixed(2)} TL</span>
                    </div>
                    
                    {minimumOrderAmount > 0 && (
                      <div className="pt-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Minimum Sipariş</span>
                          <span>{minimumOrderAmount.toFixed(2)} TL</span>
                        </div>
                      </div>
                    )}
                    
                    {isBelowMinimum && items.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20" data-testid="minimum-order-warning">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-destructive">Minimum sipariş tutarına ulaşılmadı</p>
                            <p className="text-muted-foreground mt-1">
                              Sipariş verebilmek için sepetinize <span className="font-semibold text-foreground">{remainingAmount.toFixed(2)} TL</span> daha eklemeniz gerekmektedir.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-customer-info" className="overflow-hidden">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-lg sm:text-2xl">Teslimat Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Ad *</Label>
                    <Input
                      id="firstName"
                      placeholder="Adınız"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Soyad *</Label>
                    <Input
                      id="lastName"
                      placeholder="Soyadınız"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Telefon *</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder="05XX XXX XXXX"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    required
                    data-testid="input-customer-phone"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Teslimat Adresi *</Label>
                  <div className="space-y-3">
                    <Input
                      placeholder="Mahalle"
                      value={formData.mahalle}
                      onChange={(e) => setFormData({ ...formData, mahalle: e.target.value })}
                      required
                      data-testid="input-mahalle"
                    />
                    <Input
                      placeholder="Sokak / Cadde"
                      value={formData.sokak}
                      onChange={(e) => setFormData({ ...formData, sokak: e.target.value })}
                      required
                      data-testid="input-sokak"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Bina No"
                        value={formData.binaNo}
                        onChange={(e) => setFormData({ ...formData, binaNo: e.target.value })}
                        required
                        data-testid="input-bina-no"
                      />
                      <Input
                        placeholder="Daire No"
                        value={formData.daireNo}
                        onChange={(e) => setFormData({ ...formData, daireNo: e.target.value })}
                        data-testid="input-daire-no"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Ödeme Yöntemi *</Label>
                  <RadioGroup
                    value={formData.paymentMethod}
                    onValueChange={(value: "cash" | "pos") => setFormData({ ...formData, paymentMethod: value })}
                    className="grid grid-cols-2 gap-2"
                  >
                    <div>
                      <RadioGroupItem
                        value="cash"
                        id="cash"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="cash"
                        className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-transparent p-2 sm:p-4 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer hover-elevate"
                        data-testid="radio-payment-cash"
                      >
                        <Banknote className="mb-1 sm:mb-2 h-5 w-5" />
                        <span className="font-medium text-xs sm:text-sm">Nakit</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem
                        value="pos"
                        id="pos"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="pos"
                        className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-transparent p-2 sm:p-4 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer hover-elevate"
                        data-testid="radio-payment-pos"
                      >
                        <CreditCard className="mb-1 sm:mb-2 h-5 w-5" />
                        <span className="font-medium text-xs sm:text-sm">Kart</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Sipariş Notu (İsteğe bağlı)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Özel isteklerinizi yazın (acı olmasın, ekstra sos, vb.)"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="min-h-[60px]"
                    data-testid="input-notes"
                  />
                </div>

                <div className="pt-4 space-y-3">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-whatsapp text-white gap-2 text-lg py-6"
                    disabled={createOrderMutation.isPending || isBelowMinimum}
                    data-testid="button-submit-order"
                  >
                    <SiWhatsapp className="h-5 w-5" />
                    {createOrderMutation.isPending ? "Gönderiliyor..." : "WhatsApp ile Sipariş Ver"}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  {isBelowMinimum && items.length > 0 ? (
                    <p className="text-xs text-center text-destructive font-medium">
                      Minimum sipariş tutarı: {minimumOrderAmount.toFixed(2)} TL
                    </p>
                  ) : (
                    <p className="text-xs text-center text-muted-foreground">
                      Siparişi göndermek için WhatsApp uygulamanız açılacaktır
                    </p>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!whatsappLink} onOpenChange={(open) => !open && setWhatsappLink(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SiWhatsapp className="h-6 w-6 text-whatsapp" />
              Siparişiniz Hazır
            </DialogTitle>
            <DialogDescription>
              WhatsApp ile siparişinizi gönderin veya mesajı kopyalayın.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <a
              href={whatsappLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-whatsapp hover:bg-whatsapp/90 text-white font-bold rounded-lg text-lg transition-colors"
              data-testid="link-whatsapp-order"
              onClick={() => {
                setTimeout(() => {
                  setWhatsappLink(null);
                  clearCart();
                }, 1000);
              }}
            >
              <SiWhatsapp className="h-6 w-6" />
              WhatsApp ile Gönder
            </a>
            
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                veya
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Mesaj iPhone'da görünmüyorsa:</p>
              <div className="p-3 rounded-lg bg-muted text-sm break-words max-h-24 overflow-y-auto">
                {orderMessage}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(orderMessage);
                  setCopied(true);
                  toast({ title: "Mesaj kopyalandı!" });
                  setTimeout(() => setCopied(false), 2000);
                }}
                data-testid="button-copy-message"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Kopyalandı
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Mesajı Kopyala
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Kopyaladıktan sonra WhatsApp'ı açın ve mesajı yapıştırın.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
