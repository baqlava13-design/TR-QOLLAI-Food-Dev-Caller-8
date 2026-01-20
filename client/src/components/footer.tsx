import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Phone, Clock, Mail, CreditCard, Banknote } from "lucide-react";
import { SiWhatsapp, SiInstagram, SiFacebook } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";

const quickLinks = [
  { label: "Menü", href: "#menu" },
  { label: "Hakkımızda", href: "#about" },
  { label: "Yorumlar", href: "#reviews" },
  { label: "Sipariş Ver", href: "#order" },
];


export function Footer() {
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const logoName = settings.footer_logo_name || "Kolay Siparis";
  const address = settings.footer_address || "Kılıçoğlu Vizyon Konutları, Esentepe, Çorlu";
  const phone = settings.footer_phone || "0555 123 4567";
  const email = settings.footer_email || "info@kolaysiparis.com";
  const hoursWeekday = settings.footer_hours_weekday || "10:00 - 22:00";
  const hoursWeekend = settings.footer_hours_weekend || "11:00 - 23:00";

  const contactInfo = [
    { icon: MapPin, text: address, href: "#" },
    { icon: Phone, text: phone, href: `tel:${phone.replace(/\s/g, "")}` },
    { icon: Mail, text: email, href: `mailto:${email}` },
  ];

  const hours = [
    { day: "Pazartesi - Cuma", time: hoursWeekday },
    { day: "Cumartesi - Pazar", time: hoursWeekend },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const getWhatsAppUrl = () => {
    const phone = settings.whatsapp_number || "905551234567";
    return `https://wa.me/${phone}`;
  };

  const getInstagramUrl = () => settings.instagram_url || "https://instagram.com";
  const getFacebookUrl = () => settings.facebook_url || "https://facebook.com";

  return (
    <footer id="contact" className="bg-foreground text-background py-16" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-12">
          <div className="col-span-2 sm:col-span-2 md:col-span-1 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground font-bold text-sm sm:text-lg">
                  {logoName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="font-bold text-lg sm:text-xl">{logoName}</span>
            </div>
            <p className="text-background/70 mb-4 text-sm sm:text-base">
              {settings.footer_text || "Çorlu'nun en lezzetli pideleri, WhatsApp ile kolay sipariş. Taze, sıcak ve hızlı teslimat."}
            </p>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                className="border-background/20 text-background bg-transparent h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => window.open(getInstagramUrl(), "_blank")}
                data-testid="button-instagram"
              >
                <SiInstagram className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="border-background/20 text-background bg-transparent h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => window.open(getFacebookUrl(), "_blank")}
                data-testid="button-facebook"
              >
                <SiFacebook className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                size="icon"
                className="bg-whatsapp text-white h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => window.open(getWhatsAppUrl(), "_blank")}
                data-testid="button-whatsapp"
              >
                <SiWhatsapp className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm sm:text-base md:text-lg mb-3 sm:mb-4">Hızlı Linkler</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className="text-background/70 hover:text-background transition-colors text-sm sm:text-base"
                    data-testid={`link-footer-${link.label.toLowerCase()}`}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <h4 className="font-semibold text-sm sm:text-base md:text-lg mb-3 sm:mb-4">İletişim</h4>
            <ul className="space-y-2 sm:space-y-3">
              {contactInfo.map((info, index) => (
                <li key={index}>
                  <a
                    href={info.href}
                    className="flex items-start gap-2 text-background/70 hover:text-background transition-colors text-sm sm:text-base"
                    data-testid={`text-contact-${index}`}
                  >
                    <info.icon className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="break-words">{info.text}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <h4 className="font-semibold text-sm sm:text-base md:text-lg mb-3 sm:mb-4">Çalışma Saatleri</h4>
            <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
              {hours.map((item, index) => (
                <li key={index} className="flex items-start gap-2" data-testid={`text-hours-${index}`}>
                  <Clock className="h-4 w-4 shrink-0 mt-0.5 text-background/50" />
                  <div>
                    <div className="text-background/70 text-sm sm:text-base">{item.day}</div>
                    <div className="font-medium text-sm sm:text-base">{item.time}</div>
                  </div>
                </li>
              ))}
            </ul>

            <h4 className="font-semibold text-sm sm:text-base md:text-lg mb-2 sm:mb-3">Ödeme Yöntemleri</h4>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2 text-background/70 text-sm sm:text-base">
                <Banknote className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Nakit</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-background/70 text-sm sm:text-base">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>POS</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-background/10 mb-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-background/50">
          <p>© 2024 Lezzet Express. Tüm hakları saklıdır.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-background transition-colors">
              Gizlilik Politikası
            </a>
            <a href="#" className="hover:text-background transition-colors">
              Kullanım Şartları
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
