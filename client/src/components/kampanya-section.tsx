import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles } from "lucide-react";
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {kampanyaItems.map((item) => (
            <Card 
              key={item.id} 
              className="overflow-hidden group hover-elevate transition-all duration-300 border border-red-200 dark:border-red-900/50"
              data-testid={`card-kampanya-${item.id}`}
            >
              <div className="relative aspect-square md:aspect-[4/3] overflow-hidden">
                <img
                  src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80"}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <span 
                  className="absolute top-1 left-1 md:top-3 md:left-3 z-50 bg-red-600 text-white text-[10px] md:text-xs font-bold px-1.5 py-0.5 md:px-3 md:py-1.5 rounded-md shadow-lg border md:border-2 border-white"
                  data-testid={`badge-kampanya-${item.id}`}
                >
                  {item.kampanyaTag || "Kampanya"}
                </span>
              </div>
              <CardContent className="p-2 md:p-3">
                <h3 className="font-semibold text-xs md:text-sm line-clamp-1 mb-1">{item.name}</h3>
                <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1 mb-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex flex-col">
                    {item.originalPrice && parseFloat(item.originalPrice) > parseFloat(item.price) && (
                      <span className="text-[10px] md:text-xs text-muted-foreground line-through">
                        {parseFloat(item.originalPrice).toFixed(2)} TL
                      </span>
                    )}
                    <span className="text-sm md:text-base font-bold text-red-600">
                      {parseFloat(item.price).toFixed(2)} TL
                    </span>
                  </div>
                  <Button 
                    onClick={() => handleAddToCart(item)}
                    size="sm"
                    variant="destructive"
                    className="h-7 md:h-8 px-2 md:px-3 text-xs"
                    data-testid={`button-add-kampanya-${item.id}`}
                  >
                    <Plus className="h-3 w-3 md:h-4 md:w-4" />
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
