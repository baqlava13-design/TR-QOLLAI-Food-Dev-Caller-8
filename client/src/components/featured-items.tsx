import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Star } from "lucide-react";
import { useCart } from "@/lib/cart";
import type { MenuItem } from "@shared/schema";

interface FeaturedItemsProps {
  menuItems: MenuItem[];
  isLoading?: boolean;
}

export function FeaturedItems({ menuItems, isLoading = false }: FeaturedItemsProps) {
  const { addItem } = useCart();
  
  const popularItems = menuItems
    .filter((item) => item.isPopular && item.isAvailable)
    .slice(0, 4);

  const handleAddToCart = (item: MenuItem) => {
    addItem(item, 1, []);
  };

  if (isLoading) {
    return (
      <section className="py-12 bg-muted/30" data-testid="section-featured">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary border-none">One Cikanlar</Badge>
            <h2 className="text-2xl md:text-3xl font-bold">En Cok Tercih Edilenler</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-muted" />
                <CardContent className="p-3">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-5 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (popularItems.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-muted/30" data-testid="section-featured">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <Badge className="mb-4 bg-primary/10 text-primary border-none">
            <Star className="h-3 w-3 mr-1" />
            One Cikanlar
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold">
            En Cok <span className="text-primary">Tercih Edilenler</span>
          </h2>
          <p className="text-muted-foreground mt-2">
            Musterilerimizin favori lezzetleri
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {popularItems.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden group hover-elevate transition-all duration-300"
              data-testid={`card-featured-item-${item.id}`}
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80"}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <h3 className="font-semibold text-sm md:text-base line-clamp-1">{item.name}</h3>
                  <span className="font-bold text-primary-foreground">
                    {parseFloat(item.price).toFixed(2)} TL
                  </span>
                </div>
              </div>
              <CardContent className="p-2">
                <Button
                  onClick={() => handleAddToCart(item)}
                  size="sm"
                  className="w-full gap-1"
                  data-testid={`button-add-featured-${item.id}`}
                >
                  <Plus className="h-3 w-3" />
                  Ekle
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
