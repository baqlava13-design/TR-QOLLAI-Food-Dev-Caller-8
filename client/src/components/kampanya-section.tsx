import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Tag, Flame } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem } from "@shared/schema";

interface KampanyaSectionProps {
  menuItems: MenuItem[];
  isLoading?: boolean;
}

export function KampanyaSection({ menuItems, isLoading }: KampanyaSectionProps) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const kampanyaItems = menuItems.filter(item => item.isKampanya && item.isAvailable);

  if (isLoading) {
    return (
      <section className="py-12 md:py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48 mx-auto" />
            <div className="h-4 bg-muted rounded w-64 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (kampanyaItems.length === 0) {
    return null;
  }

  const handleAddToCart = (item: MenuItem) => {
    addItem(item, 1, []);
    toast({ title: `${item.name} sepete eklendi` });
  };

  return (
    <section id="kampanya" className="py-12 md:py-16 bg-gradient-to-b from-red-50 to-background dark:from-red-950/20 dark:to-background" data-testid="section-kampanya">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <Badge className="mb-4 bg-red-600 text-white border-none gap-1">
            <Sparkles className="h-3 w-3" />
            Kampanyalar
          </Badge>
          <h2 className="text-2xl md:text-4xl font-bold mb-3">
            Özel <span className="text-red-600">Fırsatlar</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
            Kaçırılmayacak kampanya ve combo fırsatlarını keşfedin!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {kampanyaItems.map((item) => (
            <Card 
              key={item.id} 
              className="overflow-hidden group hover-elevate transition-all duration-300 border-2 border-red-200 dark:border-red-900/50 bg-gradient-to-br from-white to-red-50/50 dark:from-card dark:to-red-950/20"
              data-testid={`card-kampanya-${item.id}`}
            >
              <div className="relative">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img
                    src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-red-600 text-white border-none gap-1 shadow-lg">
                      <Tag className="h-3 w-3" />
                      {item.kampanyaTag || "Kampanya"}
                    </Badge>
                    {item.isPopular && (
                      <Badge className="bg-orange-500 text-white border-none gap-1 shadow-lg">
                        <Flame className="h-3 w-3" />
                        Populer
                      </Badge>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">
                      {item.name}
                    </h3>
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-red-600">
                      {parseFloat(item.price).toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">TL</span>
                  </div>
                  <Button 
                    onClick={() => handleAddToCart(item)}
                    variant="destructive"
                    className="gap-1"
                    data-testid={`button-add-kampanya-${item.id}`}
                  >
                    <Plus className="h-4 w-4" />
                    Sepete Ekle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
