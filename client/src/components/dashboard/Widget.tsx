import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MoreVertical, 
  Eye, 
  EyeOff,
  Maximize2,
  Minimize2,
  GripVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface WidgetProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onVisibilityToggle?: () => void;
  isVisible?: boolean;
  onEdit?: () => void;
  className?: string;
  size?: 'single' | 'double' | 'triple' | 'oneAndHalf';
  actions?: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }>;
}

export function Widget({ 
  title, 
  icon, 
  children, 
  onVisibilityToggle,
  isVisible = true,
  onEdit,
  className,
  size = 'single',
  actions = []
}: WidgetProps) {
  return (
    <Card className={cn(
      "transition-all duration-200 bg-background/40 backdrop-blur-sm hover:bg-background/60",
      size === 'single' ? 'col-span-3 md:col-span-1' : 
      size === 'oneAndHalf' ? 'col-span-3 md:col-span-1.5' :
      size === 'double' ? 'col-span-3 md:col-span-2' : 
      'col-span-3',
      !isVisible && 'opacity-50',
      className
    )}>
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="text-muted-foreground">
              {icon}
            </div>
          )}
          <h3 className="font-medium text-base">{title}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 rounded-md hover:bg-background"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onVisibilityToggle && (
              <>
                <DropdownMenuItem onClick={onVisibilityToggle}>
                  {isVisible ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Widget
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Widget
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {actions.map((action, index) => (
              <DropdownMenuItem key={index} onClick={action.onClick}>
                {action.icon && (
                  <span className="mr-2">{action.icon}</span>
                )}
                {action.label}
              </DropdownMenuItem>
            ))}
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <GripVertical className="h-4 w-4 mr-2" />
                Edit Widget
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="p-4">
        {children}
      </div>
    </Card>
  );
}