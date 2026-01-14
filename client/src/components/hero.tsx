import { SiWhatsapp } from "react-icons/si";
import heroImage from "@assets/destan_pide_1768375586706.jpeg";

export function Hero() {
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

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
          Destan Pide
        </h1>
        
        <p className="text-lg text-white/90 mb-6 max-w-xl mx-auto">
          Corlu'nun en lezzetli pideleri
        </p>

        <div className="inline-flex items-center gap-3 bg-whatsapp/20 border border-whatsapp/50 rounded-lg px-6 py-3" data-testid="text-hero-whatsapp">
          <SiWhatsapp className="h-6 w-6 text-whatsapp" />
          <span className="text-white text-lg">WhatsApp ile Siparis</span>
        </div>
      </div>
    </section>
  );
}
