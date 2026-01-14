import { Button } from "@/components/ui/button";
import { SiWhatsapp } from "react-icons/si";
import pizzaImage from "@assets/Pizza-3007395_1768374714340.jpg";

export function Hero() {
  const scrollToMenu = () => {
    const element = document.querySelector("#menu");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const whatsappNumber = import.meta.env.VITE_WHATSAPP_PHONE || "905551234567";

  const openWhatsApp = () => {
    const message = encodeURIComponent("Merhaba, siparis vermek istiyorum.");
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
  };

  return (
    <section
      id="hero"
      className="relative min-h-[80vh] flex items-center"
      data-testid="section-hero"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${pizzaImage})` }}
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
          Lezzet Express
        </h1>
        
        <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
          Corlu'nun en lezzetli pizzalari, WhatsApp ile kolay siparis
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={openWhatsApp}
            className="bg-whatsapp text-white px-8 py-6 text-lg flex items-center gap-3"
            data-testid="button-hero-whatsapp"
          >
            <SiWhatsapp className="h-6 w-6" />
            WhatsApp ile Siparis Ver
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            onClick={scrollToMenu}
            className="text-white border-white/50 bg-white/10 backdrop-blur-sm px-8 py-6 text-lg"
            data-testid="button-hero-menu"
          >
            Menuyu Gor
          </Button>
        </div>
      </div>
    </section>
  );
}
