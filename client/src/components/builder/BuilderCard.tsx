import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BuilderCardProps {
  title: string;
  description: string;
  imagePath?: string;
  route: string;
  ctaText: string;
  icon: LucideIcon;
}

export function BuilderCard({ title, description, imagePath, icon: Icon, route, ctaText }: BuilderCardProps) {
  return (
    <Link href={route}>
      <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg cursor-pointer">
        <div className="aspect-[16/7] relative bg-muted">
          {imagePath ? (
            <img
              src={imagePath}
              alt={title}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-[#F5F8FA] flex items-center justify-center">
              <Icon className="w-10 h-10 text-[#0F52BA]" />
            </div>
          )}
        </div>
        <div className="p-6 flex flex-col flex-1">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground text-sm flex-1">{description}</p>
          <div className="mt-4 flex justify-end">
            <Button className="group">
              {ctaText}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}