'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Users,
  Building2,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { taskManagementApi } from '@/lib/api/task-management';
import type {
  WorkloadItem,
  DepartmentOverview,
  SlaComplianceReport,
  CompletionMetrics,
} from '@/interfaces/ITaskManagement';
import { cn } from '@/lib/utils';

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'text-slate-700',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function ReportsPage() {
  const [departmentId, setDepartmentId] = useState<string>('all');

  const deptParam = departmentId !== 'all' ? { departmentId: parseInt(departmentId) } : {};

  const workloadQ = useQuery<WorkloadItem[]>({
    queryKey: ['tm-workload', departmentId],
    queryFn: () => taskManagementApi.getWorkload(deptParam),
  });

  const deptQ = useQuery<DepartmentOverview[]>({
    queryKey: ['tm-dept-overview'],
    queryFn: () => taskManagementApi.getDepartmentOverview(),
  });

  const slaQ = useQuery<SlaComplianceReport>({
    queryKey: ['tm-sla'],
    queryFn: () => taskManagementApi.getSlaCompliance(),
  });

  const metricsQ = useQuery<CompletionMetrics[]>({
    queryKey: ['tm-completion-metrics'],
    queryFn: () => taskManagementApi.getCompletionMetrics(),
  });

  const isLoading =
    workloadQ.isLoading || deptQ.isLoading || slaQ.isLoading || metricsQ.isLoading;

  const sla = slaQ.data;
  const workload = workloadQ.data ?? [];
  const departments = deptQ.data ?? [];
  const metrics = metricsQ.data ?? [];

  const totalTasks = departments.reduce((acc, d) => acc + d.total, 0);
  const totalCompleted = departments.reduce((acc, d) => acc + d.completed, 0);
  const totalOverdue = departments.reduce((acc, d) => acc + d.overdue, 0);

  const refetchAll = () => {
    workloadQ.refetch();
    deptQ.refetch();
    slaQ.refetch();
    metricsQ.refetch();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-500" />
          <h1 className="text-xl font-semibold text-slate-800">Reports & Analytics</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={refetchAll}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Tasks"
          value={totalTasks}
          icon={CheckCircle2}
          color="text-slate-700"
        />
        <StatCard
          label="Completed"
          value={totalCompleted}
          sub={totalTasks > 0 ? `${Math.round((totalCompleted / totalTasks) * 100)}% completion rate` : undefined}
          icon={TrendingUp}
          color="text-green-600"
        />
        <StatCard
          label="Overdue"
          value={totalOverdue}
          icon={AlertTriangle}
          color={totalOverdue > 0 ? 'text-red-600' : 'text-slate-400'}
        />
        <StatCard
          label="SLA Compliance"
          value={sla ? `${sla.complianceRate}%` : '—'}
          sub={sla ? `${sla.breached} breached / ${sla.total} total` : undefined}
          icon={Clock}
          color={
            sla
              ? sla.complianceRate >= 90
                ? 'text-green-600'
                : sla.complianceRate >= 70
                ? 'text-amber-600'
                : 'text-red-600'
              : 'text-slate-400'
          }
        />
      </div>

      {/* SLA by priority */}
      {sla && sla.byPriority.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">SLA Compliance by Priority</h2>
          <div className="space-y-3">
            {sla.byPriority.map((row) => {
              const compliant = row.total - row.breached;
              const rate = row.total > 0 ? Math.round((compliant / row.total) * 100) : 100;
              return (
                <div key={row.priority} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          row.priority === 'critical' && 'bg-red-500',
                          row.priority === 'high' && 'bg-orange-500',
                          row.priority === 'medium' && 'bg-blue-500',
                          row.priority === 'low' && 'bg-slate-400',
                        )}
                      />
                      <span className="capitalize font-medium text-slate-700">{row.priority}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>{compliant}/{row.total} compliant</span>
                      {row.breached > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">
                          {row.breached} breached
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ProgressBar
                    value={compliant}
                    max={row.total}
                    color={
                      rate >= 90 ? 'bg-green-500' : rate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload per user */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              User Workload
            </h2>
          </div>

          {workloadQ.isLoading ? (
            <div className="flex justify-center py-8 text-slate-300">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : workload.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-6">No data available.</p>
          ) : (
            <div className="space-y-3">
              {workload
                .sort((a, b) => b.taskCount - a.taskCount)
                .slice(0, 10)
                .map((item) => (
                  <div key={item.userId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-[150px]">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {item.criticalCount > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">
                            {item.criticalCount} critical
                          </Badge>
                        )}
                        <span className="text-slate-500">{item.taskCount} tasks</span>
                      </div>
                    </div>
                    <ProgressBar
                      value={item.taskCount}
                      max={Math.max(...workload.map((w) => w.taskCount))}
                      color={item.criticalCount > 0 ? 'bg-orange-500' : 'bg-blue-500'}
                    />
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Department overview */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-4">
            <Building2 className="w-4 h-4 text-slate-400" />
            Department Overview
          </h2>

          {deptQ.isLoading ? (
            <div className="flex justify-center py-8 text-slate-300">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : departments.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-6">No data available.</p>
          ) : (
            <div className="space-y-3 overflow-auto max-h-72">
              <div className="grid grid-cols-5 text-[10px] text-slate-400 uppercase tracking-wide pb-1 border-b border-slate-100">
                <span className="col-span-2">Department</span>
                <span className="text-center">Total</span>
                <span className="text-center">Done</span>
                <span className="text-center">Overdue</span>
              </div>
              {departments
                .sort((a, b) => b.total - a.total)
                .map((dept) => (
                  <div
                    key={dept.departmentId}
                    className="grid grid-cols-5 text-xs items-center gap-1"
                  >
                    <span className="col-span-2 text-slate-700 truncate" title={dept.departmentName}>
                      {dept.departmentName}
                    </span>
                    <span className="text-center text-slate-600 font-medium">{dept.total}</span>
                    <span className="text-center">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1 py-0 bg-green-100 text-green-700"
                      >
                        {dept.completed}
                      </Badge>
                    </span>
                    <span className="text-center">
                      {dept.overdue > 0 ? (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">
                          {dept.overdue}
                        </Badge>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Completion metrics over time */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Monthly Completion Trends</h2>

        {metricsQ.isLoading ? (
          <div className="flex justify-center py-8 text-slate-300">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : metrics.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-6">No data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="text-left py-2 pr-4">Period</th>
                  <th className="text-center py-2 px-3">Created</th>
                  <th className="text-center py-2 px-3">Completed</th>
                  <th className="text-center py-2 px-3">Closed</th>
                  <th className="text-center py-2 px-3">Avg Hours</th>
                  <th className="py-2 pl-3">Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((row) => (
                  <tr key={row.period} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-2 pr-4 font-medium text-slate-700">{row.period}</td>
                    <td className="text-center py-2 px-3 text-slate-600">{row.created}</td>
                    <td className="text-center py-2 px-3">
                      <span className="text-green-700 font-medium">{row.completed}</span>
                    </td>
                    <td className="text-center py-2 px-3 text-slate-400">{row.closed}</td>
                    <td className="text-center py-2 px-3 text-slate-500">
                      {row.avgCompletionHours ? `${row.avgCompletionHours.toFixed(1)}h` : '—'}
                    </td>
                    <td className="py-2 pl-3 w-32">
                      <ProgressBar
                        value={row.completed}
                        max={row.created}
                        color="bg-green-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
