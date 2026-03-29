import { LucideIcon } from 'lucide-react';
import { KpiCard, KpiVariant } from '@/components/ui/kpi-card';

interface MetricWidgetCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: KpiVariant;
  href?: string;
}

export function MetricWidgetCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  href,
}: MetricWidgetCardProps) {
  return (
    <KpiCard
      title={title}
      value={value}
      subtitle={subtitle}
      icon={icon}
      variant={variant}
      href={href}
    />
  );
}
