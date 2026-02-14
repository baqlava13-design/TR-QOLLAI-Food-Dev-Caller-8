import { useState, useEffect, useMemo } from "react";
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
import NotFound from "@/pages/not-found";
import type { MenuItem, Category, Review } from "@shared/schema";

function TenantInnerApp({ slug }: { slug: string }) {
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
    <div className="min-h-screen bg-background overflow-x-hidden" data-testid="page-tenant-site">
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

function TenantAppContent({ slug }: { slug: string }) {
  const apiBase = `/api/t/${slug}`;

  const tenantQueryClient = useMemo(() => {
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
    <QueryClientProvider client={tenantQueryClient}>
      <CartProvider>
        <TenantInnerApp slug={slug} />
      </CartProvider>
    </QueryClientProvider>
  );
}

export function TenantSiteBySlug({ slug }: { slug: string }) {
  const { data: settings, isLoading, error } = useQuery<Record<string, string>>({
    queryKey: ["/api/t", slug, "settings"],
    queryFn: async () => {
      const res = await fetch(`/api/t/${slug}/settings`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!slug,
    retry: false,
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

  if (error || !settings) {
    return <NotFound />;
  }

  return <TenantAppContent slug={slug} />;
}

const RESERVED_PATHS = new Set(["admin", "siparis", "superadmin", "p"]);

export default function TenantSitePage() {
  const [, params] = useRoute("/:slug");
  const slug = params?.slug || "";

  if (!slug || RESERVED_PATHS.has(slug.toLowerCase())) {
    return <NotFound />;
  }

  return <TenantSiteBySlug slug={slug} />;
}

export function CustomDomainResolver() {
  const [slug, setSlug] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname.toLowerCase().replace(/^www\./, "");
    fetch(`/api/resolve-domain?hostname=${encodeURIComponent(hostname)}`)
      .then(res => res.json())
      .then(data => {
        if (data.tenant?.slug) {
          setSlug(data.tenant.slug);
        }
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Utensils className="h-10 w-10 mx-auto text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Yukleniyor...</p>
        </div>
      </div>
    );
  }

  if (slug) {
    return <TenantAppContent slug={slug} />;
  }

  return <NotFound />;
}
