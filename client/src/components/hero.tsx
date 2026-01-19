import { SiWhatsapp } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import defaultHeroImage from "@assets/20260114_132921_1768406108369.jpg";

export function Hero() {
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  // Use hero_image from settings if available, otherwise use default
  const heroImage = settings.hero_image || defaultHeroImage;

  return (
    <section
      id="hero"
      className="relative min-h-[80vh] flex items-center"
      data-testid="section-hero"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
          Destan Pide
        </h1>
        
        <p className="text-base sm:text-lg text-white/90 mb-5 sm:mb-6 max-w-xl mx-auto px-2">
          Çorlu'nun en lezzetli pideleri
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <a
            href="#menu"
            className="inline-flex items-center gap-2 bg-primary text-white rounded-lg px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto justify-center"
            data-testid="link-hero-menu"
          >
            Menüyü Gör
          </a>
          
          <div className="inline-flex items-center gap-2 sm:gap-3 bg-whatsapp/20 border border-whatsapp/50 rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 w-full sm:w-auto justify-center" data-testid="text-hero-whatsapp">
            <SiWhatsapp className="h-5 w-5 sm:h-6 sm:w-6 text-whatsapp flex-shrink-0" />
            <span className="text-white text-base sm:text-lg">WhatsApp ile Sipariş</span>
          </div>
        </div>
      </div>
    </section>
  );
}
