import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Flame } from "lucide-react";
import { useCart } from "@/lib/cart";
import type { MenuItem, Category } from "@shared/schema";

interface MenuSectionProps {
  categories: Category[];
  menuItems: MenuItem[];
  isLoading?: boolean;
}

const defaultCategories: Category[] = [
  { id: "1", name: "Ana Yemekler", description: "Lezzetli ana yemekler", image: null, parentId: null, sortOrder: 1, isActive: true },
  { id: "2", name: "Corbalar", description: "Sicak corbalar", image: null, parentId: null, sortOrder: 2, isActive: true },
  { id: "3", name: "Salatalar", description: "Taze salatalar", image: null, parentId: null, sortOrder: 3, isActive: true },
  { id: "4", name: "Tatlilar", description: "Tatli cesitleri", image: null, parentId: null, sortOrder: 4, isActive: true },
  { id: "5", name: "Icecekler", description: "Soguk ve sicak icecekler", image: null, parentId: null, sortOrder: 5, isActive: true },
];

const defaultMenuItems: MenuItem[] = [
  { id: "1", name: "Izgara Kofte", description: "El yapimi kofte, yaninda pilav ve salata ile", price: "85.00", image: "https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=400&q=80", categoryId: "1", isAvailable: true, isPopular: true, isKampanya: false, kampanyaTag: null, sortOrder: 1 },
  { id: "2", name: "Tavuk Sote", description: "Sebzeli tavuk sote, pilav esliginde", price: "75.00", image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80", categoryId: "1", isAvailable: true, isPopular: true, isKampanya: false, kampanyaTag: null, sortOrder: 2 },
  { id: "3", name: "Et Doner", description: "Taze pide ekmegiyle et doner", price: "95.00", image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80", categoryId: "1", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 3 },
  { id: "4", name: "Lahmacun", description: "Ince hamur, bol malzemeli lahmacun", price: "35.00", image: "https://images.unsplash.com/photo-1601924287811-e34f8e11585c?auto=format&fit=crop&w=400&q=80", categoryId: "1", isAvailable: true, isPopular: true, isKampanya: false, kampanyaTag: null, sortOrder: 4 },
  { id: "5", name: "Pide Cesitleri", description: "Kiymali, kasarli veya karisik pide", price: "65.00", image: "https://images.unsplash.com/photo-1579888944880-d98341245702?auto=format&fit=crop&w=400&q=80", categoryId: "1", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 5 },
  { id: "6", name: "Mercimek Corbasi", description: "Geleneksel ev yapimi mercimek corbasi", price: "25.00", image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80", categoryId: "2", isAvailable: true, isPopular: true, isKampanya: false, kampanyaTag: null, sortOrder: 1 },
  { id: "7", name: "Ezogelin Corbasi", description: "Baharatli, lezzetli ezogelin", price: "25.00", image: "https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=400&q=80", categoryId: "2", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 2 },
  { id: "8", name: "Coban Salata", description: "Taze sebzelerle hazirlanan coban salata", price: "30.00", image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80", categoryId: "3", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 1 },
  { id: "9", name: "Sezar Salata", description: "Tavuklu sezar salata", price: "45.00", image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=400&q=80", categoryId: "3", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 2 },
  { id: "10", name: "Kunefe", description: "Sicak servis edilen kunefe, kaymakli", price: "55.00", image: "https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&w=400&q=80", categoryId: "4", isAvailable: true, isPopular: true, isKampanya: false, kampanyaTag: null, sortOrder: 1 },
  { id: "11", name: "Sutlac", description: "Firinlanmis sutlac", price: "35.00", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80", categoryId: "4", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 2 },
  { id: "12", name: "Ayran", description: "Ev yapimi taze ayran", price: "10.00", image: "https://images.unsplash.com/photo-1571950006470-10a5a0b0a9ef?auto=format&fit=crop&w=400&q=80", categoryId: "5", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 1 },
  { id: "13", name: "Turk Kahvesi", description: "Geleneksel Turk kahvesi", price: "20.00", image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80", categoryId: "5", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 2 },
];

export function MenuSection({ categories = defaultCategories, menuItems = defaultMenuItems, isLoading = false }: MenuSectionProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const { addItem } = useCart();

  const filteredItems = activeCategory === "all" 
    ? menuItems.filter((item) => item.isAvailable).slice(0, 9)
    : menuItems.filter((item) => item.categoryId === activeCategory && item.isAvailable);

  const handleAddToCart = (item: MenuItem) => {
    addItem(item, 1, []);
  };

  if (isLoading) {
    return (
      <section id="menu" className="py-16 md:py-24" data-testid="section-menu">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-none">Menümüz</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Lezzetli Seçenekler</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-[4/3] bg-muted" />
                <CardContent className="p-4">
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-full mb-4" />
                  <div className="h-6 bg-muted rounded w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="menu" className="py-16 md:py-24" data-testid="section-menu">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-none">Menümüz</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Lezzetli <span className="text-primary">Seçenekler</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Taze malzemelerle hazırlanan, özenle pişirilmiş yemeklerimizi keşfedin.
            Her gün yenilenen menümüzle damak tadınıza hitap ediyoruz.
          </p>
        </div>

        <div className="mb-8 -mx-4 px-4 overflow-x-auto">
          <div className="flex justify-start sm:justify-center gap-2 bg-muted/50 p-2 rounded-lg min-w-max sm:min-w-0 sm:flex-wrap">
            <Button
              variant={activeCategory === "all" ? "default" : "ghost"}
              onClick={() => setActiveCategory("all")}
              className="whitespace-nowrap text-sm"
              data-testid="tab-category-all"
            >
              En Fazla Satan
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "ghost"}
                onClick={() => setActiveCategory(category.id)}
                className="whitespace-nowrap text-sm"
                data-testid={`tab-category-${category.id}`}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden group hover-elevate transition-all duration-300"
              data-testid={`card-menu-item-${item.id}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80"}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {Boolean(item.isKampanya) && (
                  <span 
                    className="absolute top-3 left-3 z-50 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-lg border-2 border-white"
                    data-testid={`badge-kampanya-${item.id}`}
                  >
                    {item.kampanyaTag || "Kampanya"}
                  </span>
                )}
                {item.isPopular && !Boolean(item.isKampanya) && (
                  <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground gap-1">
                    <Flame className="h-3 w-3" />
                    Populer
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <span className="font-bold text-primary text-lg whitespace-nowrap">
                    {parseFloat(item.price).toFixed(2)} TL
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {item.description}
                </p>
                <Button
                  onClick={() => handleAddToCart(item)}
                  className="w-full gap-2"
                  data-testid={`button-add-to-cart-${item.id}`}
                >
                  <Plus className="h-4 w-4" />
                  Sepete Ekle
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Bu kategoride henuz urun bulunmamaktadir.
          </div>
        )}
      </div>
    </section>
  );
}
