import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingCart, CreditCard, Banknote, ArrowRight } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useCart } from "@/lib/cart";
import { generateWhatsAppOrderLink } from "@/lib/whatsapp";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function OrderForm() {
  const { items, updateQuantity, removeItem, getSubtotal, getTotal, clearCart } = useCart();
  const { toast } = useToast();
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
      const whatsappLink = generateWhatsAppOrderLink(
        items,
        getFullName(),
        formData.customerPhone,
        getFullAddress(),
        formData.paymentMethod,
        formData.notes
      );
      window.open(whatsappLink, "_blank");
      clearCart();
      setFormData({
        firstName: "",
        lastName: "",
        customerPhone: "",
        mahalle: "",
        sokak: "",
        binaNo: "",
        daireNo: "",
        paymentMethod: "cash",
        notes: "",
      });
      toast({
        title: "Sipariş oluşturuldu!",
        description: "WhatsApp'a yönlendiriliyorsunuz...",
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

    if (!formData.firstName || !formData.lastName || !formData.customerPhone || !formData.mahalle || !formData.sokak || !formData.binaNo) {
      toast({
        title: "Eksik bilgi",
        description: "Lütfen tüm zorunlu alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

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
      formData.notes
    );
    window.open(whatsappLink, "_blank");
  };

  return (
    <section id="order" className="py-16 md:py-24 bg-muted/30" data-testid="section-order">
      <div className="max-w-7xl mx-auto px-4">
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

        <div className="grid lg:grid-cols-2 gap-8">
          <Card data-testid="card-cart">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Sepetiniz
                {items.length > 0 && (
                  <Badge variant="secondary">{items.length} ürün</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                      className="flex items-center gap-4 p-3 rounded-lg bg-background"
                      data-testid={`cart-item-${item.menuItem.id}`}
                    >
                      <img
                        src={item.menuItem.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=80&q=80"}
                        alt={item.menuItem.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.menuItem.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {parseFloat(item.menuItem.price).toFixed(2)} TL
                        </p>
                        {item.selectedUpsells.length > 0 && (
                          <p className="text-xs text-primary">
                            + {item.selectedUpsells.map(u => u.name).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                          data-testid={`button-decrease-${item.menuItem.id}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                          data-testid={`button-increase-${item.menuItem.id}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(item.menuItem.id)}
                          className="text-destructive"
                          data-testid={`button-remove-${item.menuItem.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

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
                      <span className="text-primary">{getTotal().toFixed(2)} TL</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-customer-info">
            <CardHeader>
              <CardTitle>Teslimat Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
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
                    <div className="grid grid-cols-2 gap-3">
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
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem
                        value="cash"
                        id="cash"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="cash"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer hover-elevate"
                        data-testid="radio-payment-cash"
                      >
                        <Banknote className="mb-3 h-6 w-6" />
                        <span className="font-medium">Nakit</span>
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
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer hover-elevate"
                        data-testid="radio-payment-pos"
                      >
                        <CreditCard className="mb-3 h-6 w-6" />
                        <span className="font-medium">POS (Kart)</span>
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
                    disabled={createOrderMutation.isPending}
                    data-testid="button-submit-order"
                  >
                    <SiWhatsapp className="h-5 w-5" />
                    {createOrderMutation.isPending ? "Gönderiliyor..." : "WhatsApp ile Sipariş Ver"}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Siparişi göndermek için WhatsApp uygulamanız açılacaktır
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
