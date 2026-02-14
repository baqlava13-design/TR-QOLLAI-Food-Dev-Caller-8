import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  MapPin,
  ShoppingBag,
  Utensils,
  X,
  Plus,
  Minus,
  ExternalLink,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { PilotMenuItem } from "@shared/schema";

interface PilotData {
  name: string;
  slug: string;
  logoUrl: string | null;
  heroImages: string[];
  pilotMenuItems: PilotMenuItem[];
  contactPhone: string | null;
  city: string | null;
  address: string | null;
}

interface CartItem {
  item: PilotMenuItem;
  quantity: number;
}

function formatPrice(price: string) {
  return Number(price).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL";
}

export default function PilotPage() {
  const [, params] = useRoute("/p/:slug");
  const slug = params?.slug || "";
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const { data, isLoading, error } = useQuery<PilotData>({
    queryKey: ["/api/pilot", slug],
    queryFn: async () => {
      const res = await fetch(`/api/pilot/${slug}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Utensils className="h-10 w-10 mx-auto text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Utensils className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">Sayfa bulunamadi</p>
          <p className="text-sm text-muted-foreground">Bu pilot sayfa henuz hazir degil veya mevcut degil.</p>
        </div>
      </div>
    );
  }

  const heroImage = data.heroImages?.[0];

  const addToCart = (item: PilotMenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.name === item.name);
      if (existing) {
        return prev.map(c => c.item.name === item.name ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemName: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.name === itemName);
      if (existing && existing.quantity > 1) {
        return prev.map(c => c.item.name === itemName ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => c.item.name !== itemName);
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + Number(c.item.price) * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const sendWhatsApp = () => {
    if (!data.contactPhone) return;
    let msg = `Merhaba, ${data.name} - siparis vermek istiyorum:\n\n`;
    cart.forEach(c => {
      msg += `${c.quantity}x ${c.item.name} - ${formatPrice(String(Number(c.item.price) * c.quantity))}\n`;
    });
    msg += `\nToplam: ${formatPrice(String(cartTotal))}`;
    const phone = data.contactPhone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative">
        {heroImage ? (
          <div className="relative h-56 sm:h-72 md:h-80 overflow-hidden">
            <img src={heroImage} alt={data.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>
        ) : (
          <div className="h-56 sm:h-72 md:h-80 bg-gradient-to-br from-orange-600 to-red-700" />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-4xl mx-auto flex items-end gap-4">
            {data.logoUrl && (
              <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden bg-white shadow-lg">
                <img src={data.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              </div>
            )}
            <div className="text-white">
              <h1 className="text-2xl sm:text-3xl font-bold drop-shadow-lg" data-testid="text-pilot-name">{data.name}</h1>
              {data.city && (
                <p className="flex items-center gap-1 text-sm text-white/80 mt-1">
                  <MapPin className="h-3.5 w-3.5" /> {data.city}
                  {data.address && ` - ${data.address}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact bar */}
      {data.contactPhone && (
        <div className="bg-card border-b">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{data.contactPhone}</span>
            </div>
            <Button
              variant="default"
              onClick={() => {
                const phone = data.contactPhone!.replace(/\D/g, "");
                window.open(`https://wa.me/${phone}`, "_blank");
              }}
              data-testid="button-whatsapp-contact"
            >
              <SiWhatsapp className="h-4 w-4 mr-1" />
              WhatsApp ile Iletisim
            </Button>
          </div>
        </div>
      )}

      {/* Menu Grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Utensils className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold">Menu</h2>
        </div>

        {data.pilotMenuItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Menu henuz eklenmedi.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.pilotMenuItems.map((item, i) => {
              const inCart = cart.find(c => c.item.name === item.name);
              return (
                <Card key={i} data-testid={`card-pilot-item-${i}`}>
                  {item.image && (
                    <div className="h-40 overflow-hidden rounded-t-md">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className={`p-4 space-y-2 ${!item.image ? "pt-4" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm" data-testid={`text-item-name-${i}`}>{item.name}</h3>
                      <Badge variant="secondary" className="flex-shrink-0 font-bold">
                        {formatPrice(item.price)}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    )}
                    <div className="pt-1">
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" onClick={() => removeFromCart(item.name)} data-testid={`button-remove-${i}`}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="font-semibold text-sm min-w-[20px] text-center">{inCart.quantity}</span>
                          <Button size="icon" variant="outline" onClick={() => addToCart(item)} data-testid={`button-add-more-${i}`}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full" onClick={() => addToCart(item)} data-testid={`button-add-${i}`}>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Sepete Ekle
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <Button
            className="shadow-lg px-6"
            size="lg"
            onClick={() => setShowCart(true)}
            data-testid="button-view-cart"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Sepet ({cartCount}) - {formatPrice(String(cartTotal))}
          </Button>
        </div>
      )}

      {/* Cart overlay */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="relative bg-card w-full sm:max-w-md sm:rounded-md rounded-t-lg border shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between gap-4 p-4 border-b">
              <h3 className="font-bold text-lg">Sepet</h3>
              <Button size="icon" variant="ghost" onClick={() => setShowCart(false)} data-testid="button-close-cart">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {cart.map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(c.item.price)} x {c.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" onClick={() => removeFromCart(c.item.name)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-semibold min-w-[20px] text-center">{c.quantity}</span>
                    <Button size="icon" variant="outline" onClick={() => addToCart(c.item)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm font-bold flex-shrink-0">{formatPrice(String(Number(c.item.price) * c.quantity))}</p>
                </div>
              ))}
            </div>
            <div className="border-t p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold">Toplam</span>
                <span className="font-bold text-lg">{formatPrice(String(cartTotal))}</span>
              </div>
              {data.contactPhone ? (
                <Button className="w-full" size="lg" onClick={sendWhatsApp} data-testid="button-order-whatsapp">
                  <SiWhatsapp className="h-4 w-4 mr-2" />
                  WhatsApp ile Siparis Ver
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Siparis icin telefon numarasi henuz eklenmedi.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold">Qollai</span> - Restoran Siparis Sistemi
          </p>
        </div>
      </footer>
    </div>
  );
}
