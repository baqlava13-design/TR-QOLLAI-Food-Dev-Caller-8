import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Heart, Leaf, Award } from "lucide-react";
import type { SiteProfile } from "@shared/schema";

const features = [
  {
    icon: ChefHat,
    title: "Uzman Sefler",
    description: "20 yillik tecrubeli seflerimiz",
  },
  {
    icon: Heart,
    title: "Sevgiyle Hazirlanan",
    description: "Her yemek ozenle pisirilir",
  },
  {
    icon: Leaf,
    title: "Taze Malzemeler",
    description: "Gunluk taze urunler",
  },
  {
    icon: Award,
    title: "Kalite Garantisi",
    description: "Memnuniyet garantili",
  },
];

interface BrandStoryProps {
  siteProfile?: SiteProfile;
}

export function BrandStory({ siteProfile }: BrandStoryProps) {
  return (
    <section
      id="about"
      className="py-16 md:py-24 bg-muted/30"
      data-testid="section-about"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="aspect-[4/3] rounded-xl overflow-hidden">
              <img
                src={siteProfile?.brandImageUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"}
                alt={siteProfile?.restaurantName || "Restoran"}
                className="w-full h-full object-cover"
              />
            </div>
            <Card className="absolute -bottom-6 -right-6 p-4 shadow-lg hidden md:block">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-foreground">15</span>
                </div>
                <div>
                  <div className="font-bold">Yil</div>
                  <div className="text-sm text-muted-foreground">Tecrube</div>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <Badge className="mb-4 bg-primary/10 text-primary border-none">
              Hikayemiz
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Corlu'nun Kalbinde,
              <br />
              <span className="text-primary">Lezzet Tutkunlari</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              {siteProfile?.aboutText || "2010 yilindan beri Corlu'da hizmet veren restoranmiz olarak, geleneksel Turk mutfagini modern dokunuslarla harmanliyoruz. Taze malzemeler, ozenli hazirlama ve sicak servis anlayisimizla her gun yuzlerce aileye lezzet ulastiriyoruz. Ister evde, ister is yerinde veya restoranmizda... Her yemekte ayni kalite ve lezzeti sunuyoruz. WhatsApp ile kolayca siparis verin, biz kapiniza getirelim!"}
            </p>

            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background hover-elevate"
                  data-testid={`text-feature-${index}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{feature.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {feature.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
