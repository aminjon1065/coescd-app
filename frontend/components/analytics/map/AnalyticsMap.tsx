'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { LayerPanel } from './LayerPanel';
import { MapLegend } from './MapLegend';
import { TimeSlider } from './TimeSlider';
import { useMapStore } from '@/lib/stores/map-store';
import { getActiveIncidents, getRiskZones, getInfrastructure, getIncidentDensity } from '@/lib/api/analytics-platform';
import { subDays } from 'date-fns';

// Dynamically import Leaflet to avoid SSR issues
const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-muted/30">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface AnalyticsMapProps {
  showLayerPanel?: boolean;
  showLegend?: boolean;
  showTimeSlider?: boolean;
  className?: string;
}

export function AnalyticsMap({
  showLayerPanel = true,
  showLegend = true,
  showTimeSlider = false,
  className,
}: AnalyticsMapProps) {
  const { layers } = useMapStore();

  const incidentLayer = layers.find(l => l.id === 'active-incidents');
  const riskLayer = layers.find(l => l.id === 'risk-zones');
  const infraLayer = layers.find(l => l.id === 'infrastructure');
  const heatmapLayer = layers.find(l => l.id === 'heatmap');

  const { data: incidents } = useQuery({
    queryKey: ['map-active-incidents'],
    queryFn: getActiveIncidents,
    enabled: incidentLayer?.visible,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: riskZones } = useQuery({
    queryKey: ['map-risk-zones'],
    queryFn: () => getRiskZones(),
    enabled: riskLayer?.visible,
    staleTime: 10 * 60 * 1000,
  });

  const { data: infra } = useQuery({
    queryKey: ['map-infrastructure'],
    queryFn: () => getInfrastructure(),
    enabled: infraLayer?.visible,
    staleTime: 30 * 60 * 1000,
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['map-heatmap'],
    queryFn: () => getIncidentDensity(),
    enabled: heatmapLayer?.visible,
    staleTime: 10 * 60 * 1000,
  });

  const timeSliderFrom = subDays(new Date(), 90);
  const timeSliderTo = new Date();

  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      <MapInner
        incidents={incidents}
        riskZones={riskZones}
        infrastructure={infra}
        heatmapData={heatmapData ?? []}
        layers={layers}
      />

      {showLayerPanel && (
        <div className="absolute top-4 right-4 z-20">
          <LayerPanel />
        </div>
      )}

      {showLegend && (
        <div className="absolute bottom-8 left-4 z-20">
          <MapLegend />
        </div>
      )}

      {showTimeSlider && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[600px] max-w-[calc(100%-2rem)]">
          <TimeSlider from={timeSliderFrom} to={timeSliderTo} />
        </div>
      )}
    </div>
  );
}
