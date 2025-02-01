import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVerticalIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WidgetProps {
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
  className?: string;
}

export function Widget({ title, children, onEdit, className }: WidgetProps) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg">{title}</h3>
        {onEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                Edit Widget
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </Card>
  );
}
