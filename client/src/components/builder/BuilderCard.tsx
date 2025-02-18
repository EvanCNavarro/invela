import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BuilderCardProps {
  title: string;
  description: string;
  imagePath: string;
  route: string;
  ctaText: string;
}

export function BuilderCard({ title, description, imagePath, route, ctaText }: BuilderCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
      <div className="aspect-[16/9] relative bg-muted">
        <img
          src={imagePath}
          alt={title}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm flex-1">{description}</p>
        <div className="mt-4 flex justify-end">
          <Link href={route}>
            <Button>{ctaText}</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
