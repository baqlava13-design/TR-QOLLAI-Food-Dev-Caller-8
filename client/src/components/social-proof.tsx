import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, Users, ShoppingBag, Star, Clock } from "lucide-react";
import { SiWhatsapp, SiFacebook, SiX } from "react-icons/si";
import { generateShareLink } from "@/lib/whatsapp";

const stats = [
  { icon: ShoppingBag, value: "5000+", label: "Siparis" },
  { icon: Users, value: "2000+", label: "Musteri" },
  { icon: Star, value: "4.9", label: "Puan" },
  { icon: Clock, value: "15", label: "Yil Tecrube" },
];

export function SocialProof() {
  const handleShare = (platform: "whatsapp" | "facebook" | "twitter") => {
    const shareText = "Lezzet Express'ten harika yemekler siparis ettim! Sen de dene.";
    
    let url = "";
    switch (platform) {
      case "whatsapp":
        url = generateShareLink(shareText);
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        break;
    }
    
    window.open(url, "_blank");
  };

  return (
    <section className="py-16 md:py-24" data-testid="section-social-proof">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-primary rounded-2xl p-8 md:p-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <Badge className="mb-4 bg-white/20 text-white border-none">
                Sosyal Kanit
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Binlerce Mutlu Musteri
              </h2>
              <p className="text-white/90 mb-6">
                Corlu'nun en sevilen yemek teslimat servisi olarak her gun
                yuzlerce aileye lezzet ulastiriyoruz. Siz de ailemize katilin!
              </p>
              
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleShare("whatsapp")}
                  className="bg-white text-primary gap-2"
                  data-testid="button-share-whatsapp"
                >
                  <SiWhatsapp className="h-4 w-4" />
                  WhatsApp'ta Paylas
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare("facebook")}
                  className="border-white/50 text-white bg-white/10 gap-2"
                  data-testid="button-share-facebook"
                >
                  <SiFacebook className="h-4 w-4" />
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare("twitter")}
                  className="border-white/50 text-white bg-white/10 gap-2"
                  data-testid="button-share-twitter"
                >
                  <SiX className="h-4 w-4" />
                  X
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center"
                  data-testid={`text-stat-${index}`}
                >
                  <stat.icon className="h-8 w-8 mx-auto mb-3 text-white" />
                  <div className="text-3xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/80">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
