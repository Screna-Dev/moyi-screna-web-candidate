import { Link } from "react-router";
import { ArrowRight, FileText, TrendingUp } from "lucide-react";

export type CompanyData = {
  id: string;
  name: string;
  description: string;
  totalNotes: number;
  last30Days: number;
  updatedAgo: string;
  category?: string;
};

const LOGO_TONES = [
  "bg-category-faang text-category-faang-foreground",
  "bg-category-ai text-category-ai-foreground",
  "bg-category-growth text-category-growth-foreground",
  "bg-category-finance text-category-finance-foreground",
  "bg-category-enterprise text-category-enterprise-foreground",
  "bg-category-startups text-category-startups-foreground",
];

function toneFor(name: string) {
  const index = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % LOGO_TONES.length;
  return LOGO_TONES[index];
}

export function CompanyLogo({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeClass = size === "lg" ? "size-12 text-base" : size === "sm" ? "size-9 text-xs" : "size-10 text-sm";

  return (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-xl font-semibold tracking-tight ${toneFor(name)}`}>
      {initials}
    </div>
  );
}

export function CompanyCard({ company, featured = false }: { company: CompanyData; featured?: boolean }) {
  return (
    <Link
      to={`/interview-insights/${company.id}`}
      className="group block rounded-2xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
    >
      <article className="h-full rounded-2xl border border-border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <CompanyLogo name={company.name} size={featured ? "lg" : "md"} />
            <div className="min-w-0">
              <h3 className="font-sans text-base font-semibold leading-tight tracking-tight text-foreground">
                {company.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {company.category ?? "Company"}
                </span>
                <span className="text-xs text-muted-foreground">Updated {company.updatedAgo}</span>
              </div>
            </div>
          </div>
          <ArrowRight
            className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground"
            strokeWidth={1.8}
          />
        </div>

        {/* Description (featured only) */}
        {featured ? (
          <p className="line-clamp-2 px-5 pt-3 text-sm leading-6 text-muted-foreground">
            {company.description}
          </p>
        ) : null}

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border px-5 pb-5 pt-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="size-3.5 shrink-0" strokeWidth={1.8} />
              <span>Total notes</span>
            </div>
            <p className="mt-1 font-sans text-xl font-semibold tracking-tight text-foreground">
              {company.totalNotes.toLocaleString()}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="size-3.5 shrink-0" strokeWidth={1.8} />
              <span className="whitespace-nowrap">Last 30 days</span>
            </div>
            <p className="mt-1 font-sans text-xl font-semibold tracking-tight text-foreground">
              +{company.last30Days}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function FeaturedCompanyCard({ company }: { company: CompanyData }) {
  return <CompanyCard company={company} featured />;
}

export function SmallCompanyCard({ company }: { company: CompanyData }) {
  return <CompanyCard company={company} />;
}
