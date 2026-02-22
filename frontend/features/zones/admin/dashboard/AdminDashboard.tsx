'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Protected } from '@/components/Protected';
import { Permission } from '@/lib/permissions';
import api from '@/lib/axios';
import { DashboardResponse } from '@/features/dashboard/types';
import { AccessDeniedCard } from '@/features/authz/AccessDeniedCard';
import { UserOverviewSection } from '@/features/zones/admin/dashboard/components/UserOverviewSection';
import { OrgHealthSection } from '@/features/zones/admin/dashboard/components/OrgHealthSection';
import { AccessHealthSection } from '@/features/zones/admin/dashboard/components/AccessHealthSection';
import { SystemHealthSection } from '@/features/zones/admin/dashboard/components/SystemHealthSection';

export function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<DashboardResponse>('/reports/my-dashboard');
        setDashboard(response.data);
      } catch (err) {
        console.error('Failed to load admin dashboard', err);
        setError('Failed to load admin dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <Protected
      permission={Permission.USERS_READ}
      fallback={(
        <AccessDeniedCard
          title="Access denied"
          description="Permission users.read is required to view the admin dashboard."
        />
      )}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Admin Control Center</CardTitle>
            <Badge variant="outline">System zone</Badge>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {loading
              ? 'Loading...'
              : error
                ? error
                : `Updated: ${dashboard ? new Date(dashboard.generatedAt).toLocaleString() : 'N/A'}`}
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <UserOverviewSection dashboard={dashboard} />
            <OrgHealthSection dashboard={dashboard} />
            <AccessHealthSection />
            <SystemHealthSection />
          </>
        )}
      </div>
    </Protected>
  );
}

