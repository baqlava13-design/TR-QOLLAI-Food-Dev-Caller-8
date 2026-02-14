import { useMemo } from "react";
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
import type { MenuItem, Category, Review } from "@shared/schema";

interface PilotTenantInfo {
  name: string;
  slug: string;
  logoUrl: string | null;
  heroImages: string[];
  contactPhone: string | null;
  city: string | null;
  address: string | null;
}

function PilotInnerApp({ slug }: { slug: string }) {
  const apiBase = `/api/t/${slug}`;

  const { data: categories = [], isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/categories`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: menuItems = [], isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/menu-items`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/reviews`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const isLoading = catLoading || menuLoading;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" data-testid="page-pilot">
      <Header />
      <main>
        <Hero />
        <MenuSection
          categories={categories}
          menuItems={menuItems}
          isLoading={isLoading}
        />
        <HowItWorks />
        <Reviews reviews={reviews} isLoading={reviewsLoading} />
        <OrderForm />
      </main>
      <Footer />
    </div>
  );
}

function PilotAppContent({ slug }: { slug: string }) {
  const apiBase = `/api/t/${slug}`;

  const pilotQueryClient = useMemo(() => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30000,
          refetchOnWindowFocus: false,
          retry: 1,
          queryFn: async ({ queryKey }) => {
            const key = queryKey[0] as string;
            let url = key;
            if (key === "/api/settings") url = `${apiBase}/settings`;
            else if (key === "/api/categories") url = `${apiBase}/categories`;
            else if (key === "/api/menu-items") url = `${apiBase}/menu-items`;
            else if (key === "/api/reviews") url = `${apiBase}/reviews`;
            else if (key === "/api/cross-sell") return [];
            else if (key === "/api/neighborhoods") return [];
            else return [];

            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to fetch ${key}`);
            return res.json();
          },
        },
      },
    });
  }, [slug, apiBase]);

  return (
    <QueryClientProvider client={pilotQueryClient}>
      <CartProvider>
        <PilotInnerApp slug={slug} />
      </CartProvider>
    </QueryClientProvider>
  );
}

export default function PilotPage() {
  const [, params] = useRoute("/p/:slug");
  const slug = params?.slug || "";

  const { data, isLoading, error } = useQuery<PilotTenantInfo>({
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

  return <PilotAppContent slug={slug} />;
}
