'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import { IFile } from '@/interfaces/IFile';
import { IFileShare } from '@/interfaces/IFileShare';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Trash2Icon, UserPlusIcon, UsersIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Types ──────────────────────────────────────────────────────────── */

interface DirectoryUser {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  department: { id: number; name: string } | null;
}

interface DeptOption {
  id: number;
  name: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  );
}

function UserAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
      {getInitials(name)}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────── */

interface FileShareDialogProps {
  file: IFile;
  open: boolean;
  onClose: () => void;
}

export function FileShareDialog({ file, open, onClose }: FileShareDialogProps) {
  const [shares, setShares] = useState<IFileShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [depts, setDepts] = useState<DeptOption[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  const [actionLoading, setActionLoading] = useState<number | null>(null); // shareId being removed
  const [addingUserId, setAddingUserId] = useState<number | null>(null);
  const [addingDept, setAddingDept] = useState(false);

  /* Load shares + directory data when dialog opens */
  useEffect(() => {
    if (!open) return;

    setSearch('');
    setSelectedDeptId('');

    // Fetch shares for this file
    setSharesLoading(true);
    api
      .get<IFileShare[]>(`/files/${file.id}/shares`)
      .then((res) => setShares(res.data))
      .catch(() => setShares([]))
      .finally(() => setSharesLoading(false));

    // Fetch user directory
    api
      .get<DirectoryUser[]>('/users/directory')
      .then((res) => setUsers(res.data))
      .catch(() => setUsers([]));

    // Fetch department list (endpoint returns { items, total, page, limit })
    api
      .get<{ items: DeptOption[] }>('/department')
      .then((res) => setDepts(res.data.items ?? []))
      .catch(() => setDepts([]));
  }, [open, file.id]);

  /* Filtered user list for search */
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  /* IDs already shared with a user */
  const sharedUserIds = useMemo(
    () => new Set(shares.filter((s) => s.sharedWithUser).map((s) => s.sharedWithUser!.id)),
    [shares],
  );

  /* IDs already shared with a department */
  const sharedDeptIds = useMemo(
    () => new Set(shares.filter((s) => s.sharedWithDepartment).map((s) => s.sharedWithDepartment!.id)),
    [shares],
  );

  /* ── Handlers ─────────────────────────────────────────────────────── */

  const handleAddUser = async (userId: number) => {
    setAddingUserId(userId);
    try {
      const res = await api.post<IFileShare>(`/files/${file.id}/shares`, {
        sharedWithUserId: userId,
      });
      setShares((prev) => [res.data, ...prev]);
    } catch {
      // silently ignore duplicates / errors
    } finally {
      setAddingUserId(null);
    }
  };

  const handleAddDept = async () => {
    const id = Number(selectedDeptId);
    if (!id) return;
    setAddingDept(true);
    try {
      const res = await api.post<IFileShare>(`/files/${file.id}/shares`, {
        sharedWithDepartmentId: id,
      });
      setShares((prev) => [res.data, ...prev]);
      setSelectedDeptId('');
    } catch {
      // silently ignore
    } finally {
      setAddingDept(false);
    }
  };

  const handleRemove = async (shareId: number) => {
    setActionLoading(shareId);
    try {
      await api.delete(`/files/${file.id}/shares/${shareId}`);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    } catch {
      // silently ignore
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            Доступ к файлу:{' '}
            <span className="font-normal text-muted-foreground max-w-[220px] truncate">
              {file.originalName}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="users">
          <TabsList className="w-full">
            <TabsTrigger value="users" className="flex-1">
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex-1">
              Отделы
            </TabsTrigger>
          </TabsList>

          {/* ── Users tab ───────────────────────────────────────── */}
          <TabsContent value="users" className="space-y-3 mt-3">
            <Input
              placeholder="Поиск по имени или email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Search results */}
            {search.trim() && (
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border p-1">
                {filteredUsers.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    Пользователи не найдены
                  </p>
                ) : (
                  filteredUsers.map((u) => {
                    const alreadyShared = sharedUserIds.has(u.id);
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 hover:bg-muted"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar name={u.name} avatar={u.avatar} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {u.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={alreadyShared ? 'outline' : 'default'}
                          disabled={alreadyShared || addingUserId === u.id}
                          onClick={() => handleAddUser(u.id)}
                          className="shrink-0"
                        >
                          <UserPlusIcon className="mr-1 h-3 w-3" />
                          {alreadyShared ? 'Уже есть' : 'Открыть доступ'}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <Separator />

            {/* Current user shares */}
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Доступ открыт ({shares.filter((s) => s.sharedWithUser).length})
            </p>

            {sharesLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : shares.filter((s) => s.sharedWithUser).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Пользователи не добавлены
              </p>
            ) : (
              <div className="space-y-1">
                {shares
                  .filter((s) => s.sharedWithUser)
                  .map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar
                          name={share.sharedWithUser!.name}
                          avatar={null}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {share.sharedWithUser!.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {share.sharedWithUser!.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Убрать доступ"
                        disabled={actionLoading === share.id}
                        onClick={() => handleRemove(share.id)}
                      >
                        <Trash2Icon className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* ── Departments tab ──────────────────────────────────── */}
          <TabsContent value="departments" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Выберите отдел…" />
                </SelectTrigger>
                <SelectContent>
                  {depts.map((d) => (
                    <SelectItem
                      key={d.id}
                      value={String(d.id)}
                      disabled={sharedDeptIds.has(d.id)}
                    >
                      {d.name}
                      {sharedDeptIds.has(d.id) ? ' (уже добавлен)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!selectedDeptId || addingDept || sharedDeptIds.has(Number(selectedDeptId))}
                onClick={handleAddDept}
              >
                <UserPlusIcon className="mr-1 h-4 w-4" />
                Открыть доступ
              </Button>
            </div>

            <Separator />

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Доступ открыт ({shares.filter((s) => s.sharedWithDepartment).length})
            </p>

            {sharesLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : shares.filter((s) => s.sharedWithDepartment).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Отделы не добавлены
              </p>
            ) : (
              <div className="space-y-1">
                {shares
                  .filter((s) => s.sharedWithDepartment)
                  .map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                          {share.sharedWithDepartment!.name.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium">
                          {share.sharedWithDepartment!.name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Убрать доступ"
                        disabled={actionLoading === share.id}
                        onClick={() => handleRemove(share.id)}
                      >
                        <Trash2Icon className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
