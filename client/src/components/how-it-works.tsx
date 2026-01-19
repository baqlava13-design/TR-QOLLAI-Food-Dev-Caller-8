import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, MessageCircle, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const steps = [
  {
    icon: Search,
    title: "Menüyü İnceleyin",
    description: "Lezzetli yemeklerimiz arasında seçim yapın",
    step: "01",
  },
  {
    icon: ShoppingCart,
    title: "Sepete Ekleyin",
    description: "Beğendiğiniz ürünleri sepetinize ekleyin",
    step: "02",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp ile Gönderin",
    description: "Siparişinizi tek tıkla WhatsApp'tan gönderin",
    step: "03",
  },
  {
    icon: Truck,
    title: "Teslim Alın",
    description: "30 dakika içinde kapınızda olsun",
    step: "04",
  },
];

export function HowItWorks() {
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const title = settings.how_it_works_title || "Sipariş Vermek Çok Kolay";
  const titleParts = title.split(" ");
  const lastTwo = titleParts.slice(-2).join(" ");
  const firstPart = titleParts.slice(0, -2).join(" ");

  return (
    <section
      id="how-it-works"
      className="py-16 md:py-24 bg-muted/30"
      data-testid="section-how-it-works"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-none">
            Nasıl Çalışır?
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {firstPart} <span className="text-primary">{lastTwo}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            4 basit adımda lezzetli yemeğinizi sipariş edin. WhatsApp
            entegrasyonu ile hızlı ve güvenli alışveriş deneyimi yaşayın.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative text-center group"
              data-testid={`text-step-${index}`}
            >
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 sm:top-12 left-[60%] w-[80%] h-0.5 bg-border">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
                </div>
              )}

              <div className="relative mb-4 sm:mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto rounded-full bg-background border-2 border-primary/20 flex items-center justify-center group-hover:border-primary transition-colors">
                  <step.icon className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary" />
                </div>
                <span className="absolute -top-1 right-1/4 sm:right-auto sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-bold flex items-center justify-center">
                  {step.step}
                </span>
              </div>

              <h3 className="font-semibold text-sm sm:text-base md:text-lg mb-1 sm:mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
