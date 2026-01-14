import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";
import type { Review } from "@shared/schema";

interface ReviewsProps {
  reviews?: Review[];
  isLoading?: boolean;
}

const defaultReviews: Review[] = [
  {
    id: "1",
    customerName: "Ahmet Y.",
    rating: 5,
    comment: "Harika lezzetler! Ozellikle izgara kofte muhteseḿdi. Teslimat da cok hizliydi, 25 dakikada geldi.",
    menuItemName: "Izgara Kofte",
    isApproved: true,
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    customerName: "Fatma K.",
    rating: 5,
    comment: "Her hafta siparis veriyoruz. Hem lezzetli hem de fiyatlar uygun. WhatsApp'tan siparis vermek cok pratik.",
    menuItemName: "Lahmacun",
    isApproved: true,
    createdAt: new Date("2024-01-10"),
  },
  {
    id: "3",
    customerName: "Mehmet A.",
    rating: 4,
    comment: "Kunefe gercekten ev yapimi lezzette. Ailece cok begendik, tekrar siparis verecegiz.",
    menuItemName: "Kunefe",
    isApproved: true,
    createdAt: new Date("2024-01-08"),
  },
  {
    id: "4",
    customerName: "Zeynep D.",
    rating: 5,
    comment: "Is yerinde ogle yemegi icin ideal. Hizli teslimat ve lezzetli yemekler. Tesekkurler Lezzet Express!",
    menuItemName: "Tavuk Sote",
    isApproved: true,
    createdAt: new Date("2024-01-05"),
  },
  {
    id: "5",
    customerName: "Ali R.",
    rating: 5,
    comment: "Corbalari muthis taze ve sicak geliyor. Mercimek corbasi favori yemegim oldu. Kesinlikle tavsiye ederim.",
    menuItemName: "Mercimek Corbasi",
    isApproved: true,
    createdAt: new Date("2024-01-03"),
  },
  {
    id: "6",
    customerName: "Ayse B.",
    rating: 5,
    comment: "Misafirlerime ikram ettim, herkes bayildi. Sunum da cok guzeldi. En iyi tercihimiz!",
    menuItemName: "Et Doner",
    isApproved: true,
    createdAt: new Date("2024-01-01"),
  },
];

export function Reviews({ reviews = defaultReviews, isLoading = false }: ReviewsProps) {
  const displayReviews = reviews.length > 0 ? reviews : defaultReviews;

  if (isLoading) {
    return (
      <section id="reviews" className="py-16 md:py-24" data-testid="section-reviews">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-none">Yorumlar</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Musterilerimiz Ne Diyor?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="reviews" className="py-16 md:py-24" data-testid="section-reviews">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-none">
            Yorumlar
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Musterilerimiz <span className="text-primary">Ne Diyor?</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Binlerce mutlu musterimizden bazi yorumlar. Siz de deneyiminizi paylasabilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayReviews.slice(0, 6).map((review, index) => (
            <Card
              key={review.id}
              className="relative overflow-hidden hover-elevate transition-all duration-300"
              data-testid={`card-review-${review.id}`}
            >
              <CardContent className="p-6">
                <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />
                
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-foreground mb-4 leading-relaxed">
                  "{review.comment}"
                </p>

                {review.menuItemName && (
                  <Badge variant="secondary" className="mb-4">
                    {review.menuItemName}
                  </Badge>
                )}

                <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {review.customerName.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-sm">{review.customerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {review.createdAt && new Date(review.createdAt).toLocaleDateString("tr-TR", {
                        year: "numeric",
                        month: "long",
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
