import { useRoute } from "wouter";
import { TenantSiteBySlug } from "./tenant-site";
import { Utensils } from "lucide-react";
import NotFound from "@/pages/not-found";

export default function PilotPage() {
  const [, params] = useRoute("/p/:slug");
  const slug = params?.slug || "";

  if (!slug) {
    return <NotFound />;
  }

  return <TenantSiteBySlug slug={slug} />;
}
