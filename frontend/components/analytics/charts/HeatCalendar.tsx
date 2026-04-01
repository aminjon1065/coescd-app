'use client';

import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';

interface HeatCalendarProps {
  data: Array<[string, number]>; // [YYYY-MM-DD, value]
  year?: number;
  title?: string;
  height?: number;
}

export function HeatCalendar({ data, year = new Date().getFullYear(), title, height = 160 }: HeatCalendarProps) {
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
      title: title ? { text: title, textStyle: { fontSize: 12 } } : undefined,
      tooltip: {
        formatter: (p: any) => `${p.data[0]}: <b>${p.data[1]}</b> ЧС`,
      },
      visualMap: {
        min: 0, max: Math.max(...data.map(d => d[1]), 1),
        calculable: true, orient: 'horizontal', left: 'center', bottom: 0,
        inRange: { color: ['#e0f2fe', '#0284c7', '#1e3a5f'] },
      },
      calendar: {
        top: title ? 40 : 12, left: 30, right: 16,
        range: `${year}`,
        cellSize: ['auto', 14],
        dayLabel: { nameMap: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] },
        monthLabel: { nameMap: 'RU' },
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data }],
    }, true);
  }, [data, year, title]);

  useEffect(() => {
    const ro = new ResizeObserver(() => inst.current?.resize());
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
