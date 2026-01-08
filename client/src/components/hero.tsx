import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Users, Truck } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { SiteProfile } from "@shared/schema";

const trustIndicators = [
  { icon: Clock, label: "30 dk Teslimat", value: "" },
  { icon: Users, label: "Mutlu Musteri", value: "500+" },
  { icon: Star, label: "Puan", value: "4.9" },
  { icon: Truck, label: "Ucretsiz Teslimat", value: "" },
];

interface HeroProps {
  siteProfile?: SiteProfile;
}

export function Hero({ siteProfile }: HeroProps) {
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      data-testid="section-hero"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('${siteProfile?.heroImageUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1920&q=80'}')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-32 text-center">
        <Badge className="mb-6 bg-primary/90 text-primary-foreground border-none px-4 py-1.5">
          {siteProfile?.tagline || "Corlu'nun En Lezzetli Yemekleri"}
        </Badge>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          {siteProfile?.heroTitle || "Taze Lezzetler, Kapiniza Gelsin"}
        </h1>

        <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          {siteProfile?.heroSubtitle || "Ev yapimi lezzetler, ozenle hazirlanan menuler. WhatsApp ile kolay siparis verin, sicak sicak kapiniza getirelim!"}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Button
            size="lg"
            onClick={() => scrollToSection("#order")}
            className="bg-whatsapp text-white text-lg px-8 py-6 rounded-lg shadow-lg flex items-center gap-3"
            data-testid="button-hero-order"
          >
            <SiWhatsapp className="h-6 w-6" />
            WhatsApp ile Siparis Ver
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => scrollToSection("#menu")}
            className="text-white border-white/50 bg-white/10 backdrop-blur-sm text-lg px-8 py-6 rounded-lg"
            data-testid="button-hero-menu"
          >
            Menuyu Incele
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {trustIndicators.map((item, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-white"
              data-testid={`text-trust-${index}`}
            >
              <item.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="font-bold text-lg">{item.value}</div>
              <div className="text-sm text-white/80">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <button
          onClick={() => scrollToSection("#about")}
          className="text-white/70 hover:text-white transition-colors"
          aria-label="Scroll down"
          data-testid="button-scroll-down"
        >
          <svg
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}
