interface CompanyCellProps {
  company: Company;
  isHovered: boolean;
}

function CompanyCell({ company, isHovered }: CompanyCellProps) {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
        <img
          src={logoError ? defaultCompanyLogo : `/api/companies/${company.id}/logo`}
          alt={`${company.name} logo`}
          className="w-full h-full object-contain"
          onError={() => setLogoError(true)}
        />
      </div>
      <span className={cn(
        "font-normal text-foreground",
        isHovered && "underline"
      )}>
        {company.name}
      </span>
    </div>
  );
}
