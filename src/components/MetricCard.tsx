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
      className={`glass-card hover-lift rounded-2xl ${className}`}
      style={style}
    >
      <CardContent className="p-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-bold text-gradient">{value}</p>
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
