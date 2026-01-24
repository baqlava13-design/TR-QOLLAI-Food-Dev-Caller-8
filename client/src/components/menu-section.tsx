import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Flame, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/lib/cart";
import type { MenuItem, Category } from "@shared/schema";

const ITEMS_PER_PAGE = 12;

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
  { id: "1", name: "Izgara Kofte", description: "El yapimi kofte, yaninda pilav ve salata ile", price: "85.00", originalPrice: null, image: "https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=400&q=80", categoryId: "1", isAvailable: true, isPopular: true, isKampanya: false, kampanyaTag: null, sortOrder: 1 },
  { id: "2", name: "Tavuk Sote", description: "Sebzeli tavuk sote, pilav esliginde", price: "75.00", originalPrice: null, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80", categoryId: "1", isAvailable: true, isPopular: true, isKampanya: false, kampanyaTag: null, sortOrder: 2 },
  { id: "3", name: "Et Doner", description: "Taze pide ekmegiyle et doner", price: "95.00", originalPrice: null, image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80", categoryId: "1", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 3 },
  { id: "4", name: "Lahmacun", description: "Ince hamur, bol malzemeli lahmacun", price: "35.00", originalPrice: null, image: "https://images.unsplash.com/photo-1601924287811-e34f8e11585c?auto=format&fit=crop&w=400&q=80", categoryId: "1", isAvailable: true, isPopular: true, isKampanya: false, kampanyaTag: null, sortOrder: 4 },
  { id: "5", name: "Pide Cesitleri", description: "Kiymali, kasarli veya karisik pide", price: "65.00", originalPrice: null, image: "https://images.unsplash.com/photo-1579888944880-d98341245702?auto=format&fit=crop&w=400&q=80", categoryId: "1", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 5 },
  { id: "6", name: "Mercimek Corbasi", description: "Geleneksel ev yapimi mercimek corbasi", price: "25.00", originalPrice: null, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80", categoryId: "2", isAvailable: true, isPopular: true, isKampanya: false, kampanyaTag: null, sortOrder: 1 },
  { id: "7", name: "Ezogelin Corbasi", description: "Baharatli, lezzetli ezogelin", price: "25.00", originalPrice: null, image: "https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=400&q=80", categoryId: "2", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 2 },
  { id: "8", name: "Coban Salata", description: "Taze sebzelerle hazirlanan coban salata", price: "30.00", originalPrice: "40.00", image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80", categoryId: "3", isAvailable: true, isPopular: false, isKampanya: true, kampanyaTag: "Kampanya", sortOrder: 1 },
  { id: "9", name: "Sezar Salata", description: "Tavuklu sezar salata", price: "45.00", originalPrice: null, image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=400&q=80", categoryId: "3", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 2 },
  { id: "10", name: "Kunefe", description: "Sicak servis edilen kunefe, kaymakli", price: "55.00", originalPrice: null, image: "https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&w=400&q=80", categoryId: "4", isAvailable: true, isPopular: true, isKampanya: false, kampanyaTag: null, sortOrder: 1 },
  { id: "11", name: "Sutlac", description: "Firinlanmis sutlac", price: "35.00", originalPrice: null, image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80", categoryId: "4", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 2 },
  { id: "12", name: "Ayran", description: "Ev yapimi taze ayran", price: "10.00", originalPrice: null, image: "https://images.unsplash.com/photo-1571950006470-10a5a0b0a9ef?auto=format&fit=crop&w=400&q=80", categoryId: "5", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 1 },
  { id: "13", name: "Turk Kahvesi", description: "Geleneksel Turk kahvesi", price: "20.00", originalPrice: null, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80", categoryId: "5", isAvailable: true, isPopular: false, isKampanya: false, kampanyaTag: null, sortOrder: 2 },
];

export function MenuSection({ categories = defaultCategories, menuItems = defaultMenuItems, isLoading = false }: MenuSectionProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { addItem } = useCart();
  
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const menuTitle = settings.menu_section_title || "Lezzetli Seçenekler";
  const titleParts = menuTitle.split(" ");
  const lastWord = titleParts.slice(-1).join(" ");
  const firstPart = titleParts.slice(0, -1).join(" ");

  const normalizeText = (text: string) => {
    return text.toLowerCase()
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");
  };

  // Reset to page 1 when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  const allFilteredItems = menuItems.filter((item) => {
    if (!item.isAvailable) return false;
    
    const matchesSearch = searchQuery.trim() === "" || 
      normalizeText(item.name).includes(normalizeText(searchQuery)) ||
      normalizeText(item.description || "").includes(normalizeText(searchQuery));
    
    if (!matchesSearch) return false;
    
    if (searchQuery.trim() !== "") return true;
    
    if (activeCategory === "all") return true;
    return item.categoryId === activeCategory;
  });

  const totalPages = Math.ceil(allFilteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const filteredItems = allFilteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
            {firstPart} <span className="text-primary">{lastWord}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Taze malzemelerle hazırlanan, özenle pişirilmiş yemeklerimizi keşfedin.
            Her gün yenilenen menümüzle damak tadınıza hitap ediyoruz.
          </p>
        </div>

        <div className="mb-6 max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Menüde ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
              data-testid="input-menu-search"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setSearchQuery("")}
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mb-8 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 bg-muted/50 p-2 rounded-lg min-w-max sm:flex-wrap sm:justify-center sm:min-w-0">
            <Button
              variant={activeCategory === "all" ? "default" : "ghost"}
              onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}
              className="whitespace-nowrap text-sm flex-shrink-0"
              data-testid="tab-category-all"
            >
              En Fazla Satan
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "ghost"}
                onClick={() => { setActiveCategory(category.id); setSearchQuery(""); }}
                className="whitespace-nowrap text-sm flex-shrink-0"
                data-testid={`tab-category-${category.id}`}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden group hover-elevate transition-all duration-300 flex flex-col h-full"
              data-testid={`card-menu-item-${item.id}`}
            >
              <div className="relative aspect-square md:aspect-[4/3] overflow-hidden">
                <img
                  src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80"}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {Boolean(item.isKampanya) && (
                  <span 
                    className="absolute top-1 left-1 md:top-3 md:left-3 z-50 bg-red-600 text-white text-[10px] md:text-xs font-bold px-1.5 py-0.5 md:px-3 md:py-1.5 rounded-md shadow-lg border md:border-2 border-white"
                    data-testid={`badge-kampanya-${item.id}`}
                  >
                    {item.kampanyaTag || "Kampanya"}
                  </span>
                )}
                {item.isPopular && !Boolean(item.isKampanya) && (
                  <Badge className="absolute top-1 left-1 md:top-3 md:left-3 bg-primary text-primary-foreground gap-0.5 md:gap-1 text-[10px] md:text-xs px-1.5 md:px-2.5">
                    <Flame className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    Populer
                  </Badge>
                )}
              </div>
              <CardContent className="p-2 md:p-4 flex flex-col h-full">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-1 md:gap-2 mb-1 md:mb-2">
                  <h3 className="font-semibold text-sm md:text-lg leading-tight">{item.name}</h3>
                  <div className="flex flex-col items-start md:items-end flex-shrink-0">
                    {item.originalPrice && parseFloat(item.originalPrice) > parseFloat(item.price) && (
                      <span className="text-[10px] md:text-xs text-muted-foreground line-through">
                        {parseFloat(item.originalPrice).toFixed(0)} TL
                      </span>
                    )}
                    <span className={`font-bold text-sm md:text-lg whitespace-nowrap ${item.originalPrice && parseFloat(item.originalPrice) > parseFloat(item.price) ? 'text-red-600' : 'text-primary'}`}>
                      {parseFloat(item.price).toFixed(0)} TL
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs md:text-sm mb-2 md:mb-4 line-clamp-2 hidden md:block flex-grow">
                  {item.description}
                </p>
                <Button
                  size="sm"
                  onClick={() => handleAddToCart(item)}
                  className="w-full gap-1 md:gap-2 text-xs md:text-sm mt-auto"
                  data-testid={`button-add-to-cart-${item.id}`}
                >
                  <Plus className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Sepete Ekle</span>
                  <span className="sm:hidden">Ekle</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery.trim() !== "" 
              ? `"${searchQuery}" için sonuç bulunamadı.`
              : "Bu kategoride henüz ürün bulunmamaktadır."}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8" data-testid="pagination">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Önceki</span>
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0"
                  data-testid={`button-page-${page}`}
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              <span className="hidden sm:inline mr-1">Sonraki</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
