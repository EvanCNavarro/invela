import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
}

export function PageContainer({ children, title }: PageContainerProps) {
  return (
    <div className="space-y-4">
      <BreadcrumbNav />
      {title && (
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      )}
      {children}
    </div>
  );
}
