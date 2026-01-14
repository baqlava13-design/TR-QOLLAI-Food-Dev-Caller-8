import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, MessageCircle, Truck } from "lucide-react";

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
            Sipariş Vermek <span className="text-primary">Çok Kolay</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            4 basit adımda lezzetli yemeğinizi sipariş edin. WhatsApp
            entegrasyonu ile hızlı ve güvenli alışveriş deneyimi yaşayın.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative text-center group"
              data-testid={`text-step-${index}`}
            >
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-border">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
                </div>
              )}

              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-background border-2 border-primary/20 flex items-center justify-center group-hover:border-primary transition-colors">
                  <step.icon className="h-10 w-10 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  {step.step}
                </span>
              </div>

              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
