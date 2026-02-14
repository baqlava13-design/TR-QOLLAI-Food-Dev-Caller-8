import { useEffect, useMemo } from "react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Utensils } from "lucide-react";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { MenuSection } from "@/components/menu-section";
import { HowItWorks } from "@/components/how-it-works";
import { Reviews } from "@/components/reviews";
import { OrderForm } from "@/components/order-form";
import { Footer } from "@/components/footer";
import type { PilotMenuItem, MenuItem, Category } from "@shared/schema";

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

function pilotToMenuItems(pilotItems: PilotMenuItem[]): MenuItem[] {
  return pilotItems.map((item, i) => ({
    id: `pilot-${i}`,
    name: item.name,
    tenantId: null,
    description: item.description || "",
    price: item.price || "0",
    originalPrice: null,
    image: item.image || null,
    categoryId: "pilot-cat-1",
    isAvailable: true,
    isPopular: i < 2,
    isKampanya: false,
    kampanyaTag: null,
    sortOrder: i,
  }));
}

function pilotToCategories(): Category[] {
  return [
    { id: "pilot-cat-1", name: "Menu", tenantId: null, description: "Restaurant menu", image: null, parentId: null, sortOrder: 0, isActive: true },
  ];
}

function pilotToSettings(data: PilotData): Record<string, string> {
  return {
    footer_logo_name: data.name,
    company_logo: data.logoUrl || "",
    hero_image: data.heroImages?.[0] || "",
    hero_title: data.name,
    hero_subtitle: data.city ? `${data.city} - Online Siparis Sistemi` : "Online Siparis Sistemi",
    whatsapp_number: data.contactPhone?.replace(/\D/g, "") || "",
    footer_address: data.address || data.city || "",
    footer_phone: data.contactPhone || "",
    footer_email: "",
    footer_text: `${data.name} - Qollai ile siparis sistemi`,
    menu_section_title: "Lezzetli Secenekler",
    how_it_works_title: "Siparis Vermek Cok Kolay",
    reviews_section_title: "Musterilerimiz Ne Diyor?",
    minimum_order_amount: "0",
  };
}

function PilotAppContent({ data }: { data: PilotData }) {
  const menuItems = useMemo(() => pilotToMenuItems(data.pilotMenuItems), [data.pilotMenuItems]);
  const categories = useMemo(() => pilotToCategories(), []);

  const pilotQueryClient = useMemo(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: Infinity,
          refetchOnWindowFocus: false,
          retry: false,
          queryFn: async ({ queryKey }) => {
            const key = queryKey[0] as string;
            if (key === "/api/settings") return pilotToSettings(data);
            if (key === "/api/categories") return categories;
            if (key === "/api/menu-items") return menuItems;
            if (key === "/api/reviews") return [];
            if (key === "/api/cross-sell") return [];
            if (key === "/api/neighborhoods") return [];
            return [];
          },
        },
      },
    });

    client.setQueryData(["/api/settings"], pilotToSettings(data));
    client.setQueryData(["/api/categories"], categories);
    client.setQueryData(["/api/menu-items"], menuItems);
    client.setQueryData(["/api/reviews"], []);
    client.setQueryData(["/api/cross-sell"], []);
    client.setQueryData(["/api/neighborhoods"], []);

    return client;
  }, [data, menuItems, categories]);

  return (
    <QueryClientProvider client={pilotQueryClient}>
      <CartProvider>
        <div className="min-h-screen bg-background overflow-x-hidden" data-testid="page-pilot">
          <Header />
          <main>
            <Hero />
            <MenuSection
              categories={categories}
              menuItems={menuItems}
              isLoading={false}
            />
            <HowItWorks />
            <Reviews reviews={[]} isLoading={false} />
            <OrderForm />
          </main>
          <Footer />
        </div>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default function PilotPage() {
  const [, params] = useRoute("/p/:slug");
  const slug = params?.slug || "";

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
          <p className="text-muted-foreground">Yukleniyor...</p>
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

  return <PilotAppContent data={data} />;
}
