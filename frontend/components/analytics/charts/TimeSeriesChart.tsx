'use client';

import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TimeSeriesChartProps {
  data: Array<{ bucket: string; [key: string]: number | string }>;
  xField?: string;
  series: Array<{ key: string; name: string; color?: string; type?: 'line' | 'bar' }>;
  height?: number | string;
  title?: string;
  thresholds?: Array<{ value: number; label: string; color: string }>;
}

export function TimeSeriesChart({
  data,
  xField = 'bucket',
  series,
  height = 280,
  title,
  thresholds = [],
}: TimeSeriesChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!chartRef.current) return;
    instanceRef.current = echarts.init(chartRef.current, resolvedTheme === 'dark' ? 'dark' : undefined);
    return () => instanceRef.current?.dispose();
  }, [resolvedTheme]);

  useEffect(() => {
    if (!instanceRef.current) return;

    const xData = data.map(d => {
      try { return format(new Date(String(d[xField])), 'd MMM', { locale: ru }); }
      catch { return String(d[xField]); }
    });

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      title: title ? { text: title, textStyle: { fontSize: 13, fontWeight: 600 } } : undefined,
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { bottom: 0, data: series.map(s => s.name) },
      grid: { left: 40, right: 16, top: title ? 40 : 12, bottom: 40 },
      dataZoom: [{ type: 'inside' }],
      xAxis: { type: 'category', data: xData, axisLabel: { rotate: data.length > 30 ? 45 : 0 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
      markLine: thresholds.length > 0 ? {
        data: thresholds.map(t => ({ yAxis: t.value, name: t.label, lineStyle: { color: t.color, type: 'dashed' } })),
      } : undefined,
      series: series.map(s => ({
        name: s.name,
        type: s.type ?? 'line',
        data: data.map(d => d[s.key] ?? 0),
        smooth: s.type !== 'bar',
        lineStyle: s.color ? { color: s.color } : undefined,
        itemStyle: s.color ? { color: s.color } : undefined,
        areaStyle: s.type !== 'bar' ? { opacity: 0.08 } : undefined,
      })),
    };

    instanceRef.current.setOption(option, true);
  }, [data, series, xField, title, thresholds]);

  useEffect(() => {
    const ro = new ResizeObserver(() => instanceRef.current?.resize());
    if (chartRef.current) ro.observe(chartRef.current);
    return () => ro.disconnect();
  }, []);

  return <div ref={chartRef} style={{ width: '100%', height }} />;
}
