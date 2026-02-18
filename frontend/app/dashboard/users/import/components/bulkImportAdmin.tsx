'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import Loading from '@/app/loading';
import { Role } from '@/enums/RoleEnum';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type BulkImportRowIssue = {
  rowNumber: number;
  field: string;
  code: string;
  message: string;
};

type BulkImportDryRunSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  toCreate: number;
  toUpdate: number;
  unchanged: number;
};

type BulkImportDryRunResponse = {
  sessionId: string;
  summary: BulkImportDryRunSummary;
  errors: BulkImportRowIssue[];
  warnings: BulkImportRowIssue[];
};

type BulkImportApplyResponse = {
  operationId: string;
  summary: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  failures: BulkImportRowIssue[];
};

type BulkImportOperation = {
  id: number;
  operationId: string;
  sessionId: string | null;
  type: 'dry-run' | 'apply';
  status: 'completed' | 'partial' | 'failed';
  mode: string | null;
  idempotencyKey: string | null;
  totalRows: number | null;
  validRows: number | null;
  invalidRows: number | null;
  createdCount: number | null;
  updatedCount: number | null;
  skippedCount: number | null;
  failedCount: number | null;
  warningsCount: number | null;
  errorsCount: number | null;
  createdAt: string;
  actor: { id: number; email: string; name: string } | null;
};

type BulkImportOperationsResponse = {
  total: number;
  page: number;
  limit: number;
  items: BulkImportOperation[];
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string') {
      return message;
    }
  }
  return fallback;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toCsvLine(values: string[]): string {
  return values
    .map((value) => `"${value.replace(/"/g, '""')}"`)
    .join(',');
}

export default function BulkImportAdmin() {
  const { loading, accessToken, user } = useAuth();
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [allowRoleUpdate, setAllowRoleUpdate] = useState(true);
  const [allowPermissionUpdate, setAllowPermissionUpdate] = useState(true);
  const [bulkPreview, setBulkPreview] = useState<BulkImportDryRunResponse | null>(
    null,
  );
  const [bulkApplyResult, setBulkApplyResult] =
    useState<BulkImportApplyResponse | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isDryRunLoading, setIsDryRunLoading] = useState(false);
  const [isApplyLoading, setIsApplyLoading] = useState(false);
  const [operations, setOperations] = useState<BulkImportOperation[]>([]);
  const [operationsTotal, setOperationsTotal] = useState(0);
  const [operationsPage, setOperationsPage] = useState(1);
  const [operationsLimit] = useState(20);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationsError, setOperationsError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterActorId, setFilterActorId] = useState('');
  const [filterQ, setFilterQ] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const isAdmin = useMemo(() => user?.role === Role.Admin, [user?.role]);
  const operationsHasNextPage =
    operationsPage * operationsLimit < operationsTotal;

  const loadOperations = async (
    page = operationsPage,
    overrides?: {
      type?: string;
      status?: string;
      actorId?: string;
      q?: string;
      from?: string;
      to?: string;
    },
  ) => {
    setOperationsLoading(true);
    setOperationsError(null);
    try {
      const effectiveType = overrides?.type ?? filterType;
      const effectiveStatus = overrides?.status ?? filterStatus;
      const effectiveActorId = overrides?.actorId ?? filterActorId;
      const effectiveQ = overrides?.q ?? filterQ;
      const effectiveFrom = overrides?.from ?? filterFrom;
      const effectiveTo = overrides?.to ?? filterTo;
      const params: Record<string, string | number> = {
        page,
        limit: operationsLimit,
      };
      if (effectiveType) params.type = effectiveType;
      if (effectiveStatus) params.status = effectiveStatus;
      if (effectiveActorId) params.actorId = Number(effectiveActorId);
      if (effectiveQ.trim()) params.q = effectiveQ.trim();
      if (effectiveFrom) params.from = new Date(effectiveFrom).toISOString();
      if (effectiveTo) params.to = new Date(effectiveTo).toISOString();
      const res = await api.get<BulkImportOperationsResponse>(
        '/users/bulk-import/operations',
        { params },
      );
      setOperations(res.data.items);
      setOperationsTotal(res.data.total);
      setOperationsPage(res.data.page);
    } catch (error: unknown) {
      console.error(error);
      setOperationsError(getApiErrorMessage(error, 'Failed to load operations'));
    } finally {
      setOperationsLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken || !isAdmin) {
      return;
    }
    void loadOperations(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, isAdmin]);

  const onDryRunBulkImport = async () => {
    if (!bulkFile) {
      setBulkError('Please choose CSV file first');
      return;
    }

    setIsDryRunLoading(true);
    setBulkError(null);
    setBulkApplyResult(null);
    try {
      const form = new FormData();
      form.append('file', bulkFile);
      form.append('mode', 'upsert');
      form.append('allowRoleUpdate', String(allowRoleUpdate));
      form.append('allowPermissionUpdate', String(allowPermissionUpdate));
      const res = await api.post<BulkImportDryRunResponse>('/users/bulk-import/dry-run', form);
      setBulkPreview(res.data);
      await loadOperations(1);
    } catch (error: unknown) {
      console.error(error);
      setBulkPreview(null);
      setBulkError(getApiErrorMessage(error, 'Failed to run dry-run import'));
    } finally {
      setIsDryRunLoading(false);
    }
  };

  const onApplyBulkImport = async () => {
    if (!bulkPreview?.sessionId) {
      setBulkError('Dry-run session is missing');
      return;
    }

    setIsApplyLoading(true);
    setBulkError(null);
    try {
      const res = await api.post<BulkImportApplyResponse>('/users/bulk-import/apply', {
        sessionId: bulkPreview.sessionId,
        idempotencyKey: createIdempotencyKey(),
        confirm: true,
      });
      setBulkApplyResult(res.data);
      await loadOperations(1);
    } catch (error: unknown) {
      console.error(error);
      setBulkError(getApiErrorMessage(error, 'Failed to apply bulk import'));
    } finally {
      setIsApplyLoading(false);
    }
  };

  const exportIssuesCsv = () => {
    if (!bulkPreview) {
      return;
    }
    const rows = [
      ['type', 'rowNumber', 'field', 'code', 'message'],
      ...bulkPreview.errors.map((item) => [
        'error',
        String(item.rowNumber),
        item.field,
        item.code,
        item.message,
      ]),
      ...bulkPreview.warnings.map((item) => [
        'warning',
        String(item.rowNumber),
        item.field,
        item.code,
        item.message,
      ]),
    ];
    const csv = rows.map((row) => toCsvLine(row)).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `bulk-import-issues-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(href);
  };

  if (loading || !accessToken) {
    return <Loading />;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Users</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Access denied. Admin role is required.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard/users">Back to Users</Link>
        </Button>
        <Button asChild variant="secondary">
          <a href="/templates/users-bulk-import-template.csv" download>
            Download CSV Template
          </a>
        </Button>
        <Button
          variant="outline"
          onClick={exportIssuesCsv}
          disabled={
            !bulkPreview ||
            bulkPreview.errors.length + bulkPreview.warnings.length === 0
          }
        >
          Export Dry-Run Issues
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Users (CSV)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="bulk-import-file">CSV file</Label>
              <Input
                id="bulk-import-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setBulkFile(nextFile);
                  setBulkPreview(null);
                  setBulkApplyResult(null);
                }}
              />
              <div className="text-xs text-muted-foreground">
                Required columns: email, name, role. Optional: password, position,
                department_id, department_name, is_active, permissions.
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowRoleUpdate}
                onChange={(event) => setAllowRoleUpdate(event.target.checked)}
              />
              Allow role updates for existing users
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowPermissionUpdate}
                onChange={(event) => setAllowPermissionUpdate(event.target.checked)}
              />
              Allow permission updates for existing users
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={onDryRunBulkImport}
              disabled={isDryRunLoading || isApplyLoading || !bulkFile}
            >
              {isDryRunLoading ? 'Running dry-run...' : 'Run Dry-Run'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onApplyBulkImport}
              disabled={
                isApplyLoading ||
                isDryRunLoading ||
                !bulkPreview ||
                bulkPreview.summary.invalidRows > 0
              }
            >
              {isApplyLoading ? 'Applying...' : 'Apply Import'}
            </Button>
          </div>

          {bulkError ? <div className="text-sm text-red-600">{bulkError}</div> : null}

          {bulkPreview ? (
            <div className="rounded-lg border p-3 text-sm">
              <div className="font-medium">Dry-Run Summary</div>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                <div>Total rows: {bulkPreview.summary.totalRows}</div>
                <div>Valid rows: {bulkPreview.summary.validRows}</div>
                <div>Invalid rows: {bulkPreview.summary.invalidRows}</div>
                <div>To create: {bulkPreview.summary.toCreate}</div>
                <div>To update: {bulkPreview.summary.toUpdate}</div>
                <div>Unchanged: {bulkPreview.summary.unchanged}</div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Session: {bulkPreview.sessionId}
              </div>

              {bulkPreview.errors.length > 0 ? (
                <div className="mt-3">
                  <div className="font-medium text-red-600">Errors ({bulkPreview.errors.length})</div>
                  <div className="mt-1 max-h-40 space-y-1 overflow-auto text-xs">
                    {bulkPreview.errors.slice(0, 50).map((issue, index) => (
                      <div key={`${issue.rowNumber}-${issue.field}-${index}`}>
                        Row {issue.rowNumber}, {issue.field}: {issue.message}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {bulkPreview.warnings.length > 0 ? (
                <div className="mt-3">
                  <div className="font-medium text-amber-600">
                    Warnings ({bulkPreview.warnings.length})
                  </div>
                  <div className="mt-1 max-h-32 space-y-1 overflow-auto text-xs">
                    {bulkPreview.warnings.slice(0, 30).map((issue, index) => (
                      <div key={`${issue.rowNumber}-${issue.field}-${index}`}>
                        Row {issue.rowNumber}, {issue.field}: {issue.message}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {bulkApplyResult ? (
            <div className="rounded-lg border border-green-300 p-3 text-sm">
              <div className="font-medium text-green-700">Import Applied</div>
              <div className="mt-1 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div>Created: {bulkApplyResult.summary.created}</div>
                <div>Updated: {bulkApplyResult.summary.updated}</div>
                <div>Skipped: {bulkApplyResult.summary.skipped}</div>
                <div>Failed: {bulkApplyResult.summary.failed}</div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Operation: {bulkApplyResult.operationId}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Input
              placeholder="Search (operation/session/actor)"
              value={filterQ}
              onChange={(event) => setFilterQ(event.target.value)}
            />
            <Input
              placeholder="Actor ID"
              value={filterActorId}
              onChange={(event) => setFilterActorId(event.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
              >
                <option value="">All Types</option>
                <option value="dry-run">dry-run</option>
                <option value="apply">apply</option>
              </select>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="completed">completed</option>
                <option value="partial">partial</option>
                <option value="failed">failed</option>
              </select>
            </div>
            <Input
              type="date"
              value={filterFrom}
              onChange={(event) => setFilterFrom(event.target.value)}
            />
            <Input
              type="date"
              value={filterTo}
              onChange={(event) => setFilterTo(event.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadOperations(1)}
                disabled={operationsLoading}
              >
                Apply Filters
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setFilterQ('');
                  setFilterActorId('');
                  setFilterType('');
                  setFilterStatus('');
                  setFilterFrom('');
                  setFilterTo('');
                  void loadOperations(1, {
                    q: '',
                    actorId: '',
                    type: '',
                    status: '',
                    from: '',
                    to: '',
                  });
                }}
                disabled={operationsLoading}
              >
                Reset
              </Button>
            </div>
          </div>

          {operationsError ? (
            <div className="text-sm text-red-600">{operationsError}</div>
          ) : null}

          <div className="space-y-2">
            {operationsLoading ? (
              <div className="text-sm text-muted-foreground">Loading operations...</div>
            ) : operations.length === 0 ? (
              <div className="text-sm text-muted-foreground">No operations found.</div>
            ) : (
              operations.map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">
                    {item.type} / {item.status}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs">
                    operation: {item.operationId}
                    {item.sessionId ? ` | session: ${item.sessionId}` : ''}
                  </div>
                  <div className="mt-1 text-xs">
                    actor: {item.actor ? `${item.actor.name} (${item.actor.email})` : 'n/a'}
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-xs md:grid-cols-4">
                    <div>total: {item.totalRows ?? '-'}</div>
                    <div>valid: {item.validRows ?? '-'}</div>
                    <div>invalid: {item.invalidRows ?? '-'}</div>
                    <div>created: {item.createdCount ?? '-'}</div>
                    <div>updated: {item.updatedCount ?? '-'}</div>
                    <div>skipped: {item.skippedCount ?? '-'}</div>
                    <div>failed: {item.failedCount ?? '-'}</div>
                    <div>warnings: {item.warningsCount ?? '-'}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={operationsLoading || operationsPage <= 1}
              onClick={() => void loadOperations(operationsPage - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={operationsLoading || !operationsHasNextPage}
              onClick={() => void loadOperations(operationsPage + 1)}
            >
              Next
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {operationsPage}, total {operationsTotal}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
