'use client';

import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import { useTheme } from 'next-themes';
import type { KpiThresholdStatus } from '@/interfaces/IAnalytics';

interface GaugeChartProps {
  value: number;
  max?: number;
  unit?: string;
  label?: string;
  status?: KpiThresholdStatus;
  height?: number;
}

const STATUS_COLOR: Record<KpiThresholdStatus, string> = {
  normal: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
};

export function GaugeChart({ value, max = 100, unit = '', label, status = 'normal', height = 180 }: GaugeChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current, resolvedTheme === 'dark' ? 'dark' : undefined);
    return () => inst.current?.dispose();
  }, [resolvedTheme]);

  useEffect(() => {
    if (!inst.current) return;
    inst.current.setOption({
      backgroundColor: 'transparent',
      series: [{
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max,
        splitNumber: 5,
        radius: '90%',
        axisLine: {
          lineStyle: {
            width: 10,
            color: [[0.5, '#22c55e'], [0.8, '#f59e0b'], [1, '#ef4444']],
          },
        },
        pointer: { length: '60%', width: 6 },
        axisTick: { distance: -8, length: 5 },
        splitLine: { distance: -12, length: 10 },
        axisLabel: { distance: 16, fontSize: 10 },
        detail: {
          valueAnimation: true,
          formatter: `{value}${unit}`,
          fontSize: 20,
          fontWeight: 700,
          color: STATUS_COLOR[status],
          offsetCenter: [0, '60%'],
        },
        title: { offsetCenter: [0, '85%'], fontSize: 11, color: '#888' },
        data: [{ value, name: label ?? '' }],
      }],
    }, true);
  }, [value, max, unit, label, status]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
