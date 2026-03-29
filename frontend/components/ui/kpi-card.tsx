import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type KpiVariant = 'default' | 'warning' | 'danger' | 'success';

interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Signed percent change vs. previous period */
  trend?: { value: number; label?: string };
  variant?: KpiVariant;
  /** Wrap the card in a link */
  href?: string;
  className?: string;
}

const BORDER: Record<KpiVariant, string> = {
  default: '',
  warning: 'border-amber-300 dark:border-amber-800',
  danger:  'border-red-300 dark:border-red-800',
  success: 'border-green-300 dark:border-green-800',
};

const ICON_COLOR: Record<KpiVariant, string> = {
  default: 'text-muted-foreground',
  warning: 'text-amber-500',
  danger:  'text-red-500',
  success: 'text-green-500',
};

const VALUE_COLOR: Record<KpiVariant, string> = {
  default: '',
  warning: 'text-amber-700 dark:text-amber-400',
  danger:  'text-red-700 dark:text-red-400',
  success: 'text-green-700 dark:text-green-400',
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  href,
  className,
}: KpiCardProps) {
  const isUp = trend && trend.value >= 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  const card = (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md',
        BORDER[variant],
        href && 'cursor-pointer',
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className={cn('h-4 w-4 shrink-0', ICON_COLOR[variant])} />}
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold tracking-tight', VALUE_COLOR[variant])}>
          {value}
        </div>
        <div className="mt-1 flex items-center gap-2">
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                isUp ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400',
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {Math.abs(trend.value)}%
              {trend.label ? ` ${trend.label}` : ''}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }
  return card;
}
