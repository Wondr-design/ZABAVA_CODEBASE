import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function MetricCard({
  title,
  value,
  subtitle,
  className = "",
  style,
}: MetricCardProps) {
  return (
    <Card
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
      style={style}
    >
      <CardContent className="p-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
