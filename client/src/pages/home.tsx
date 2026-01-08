import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { BrandStory } from "@/components/brand-story";
import { FeaturedItems } from "@/components/featured-items";
import { MenuSection } from "@/components/menu-section";
import { HowItWorks } from "@/components/how-it-works";
import { Reviews } from "@/components/reviews";
import { OrderForm } from "@/components/order-form";
import { SocialProof } from "@/components/social-proof";
import { Footer } from "@/components/footer";
import type { Category, MenuItem, Review, SiteProfile } from "@shared/schema";

export default function Home() {
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: siteProfile } = useQuery<SiteProfile>({
    queryKey: ["/api/site-profile"],
  });

  return (
    <div className="min-h-screen bg-background" data-testid="page-home">
      <Header />
      <main>
        <Hero />
        <BrandStory />
        <FeaturedItems 
          menuItems={menuItems}
          isLoading={menuItemsLoading}
        />
        <MenuSection
          categories={categories}
          menuItems={menuItems}
          isLoading={categoriesLoading || menuItemsLoading}
        />
        <HowItWorks />
        <Reviews 
          reviews={reviews} 
          isLoading={reviewsLoading} 
          googleWidgetCode={siteProfile?.googleReviewsWidgetCode}
        />
        <SocialProof />
        <OrderForm />
      </main>
      <Footer />
    </div>
  );
}
