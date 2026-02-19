'use client';

import Head from 'next/head';
import { getRouteTitle, RouteMetadataKey } from '@/features/navigation/route-metadata';

interface RouteTitleHeadProps {
  routeKey: RouteMetadataKey;
}

export function RouteTitleHead({ routeKey }: RouteTitleHeadProps) {
  return (
    <Head>
      <title>{getRouteTitle(routeKey)}</title>
    </Head>
  );
}

