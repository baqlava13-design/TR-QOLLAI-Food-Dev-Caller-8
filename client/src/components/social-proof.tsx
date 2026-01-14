import { ShoppingBag, Users, Star, Clock } from "lucide-react";

const stats = [
  { icon: ShoppingBag, value: "5000+", label: "Siparis" },
  { icon: Users, value: "2000+", label: "Musteri" },
  { icon: Star, value: "4.9", label: "Puan" },
  { icon: Clock, value: "15", label: "Yil Tecrube" },
];

export function SocialProof() {
  return (
    <section className="py-12 bg-muted/30" data-testid="section-social-proof">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center"
              data-testid={`text-stat-${index}`}
            >
              <stat.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl md:text-3xl font-bold text-foreground">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
