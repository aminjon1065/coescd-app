'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { useAuth } from '@/context/auth-context';
import { useCalls } from '@/context/calls-context';
import api from '@/lib/axios';
import { hasAnyPermission, Permission } from '@/lib/permissions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Phone, Video, Search } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface DirectoryUser {
  id: number;
  name: string;
  email: string;
  position: string | null;
  avatar: string | null;
  department: { id: number; name: string } | null;
}

/* ------------------------------------------------------------------ */
/* Avatar helper                                                        */
/* ------------------------------------------------------------------ */

function UserAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="h-11 w-11 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
      {initials}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page shell — protected                                               */
/* ------------------------------------------------------------------ */

export default function ContactsPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.contacts"
      deniedDescription="Доступ к контактам требует прав chat.read или calls.read."
    >
      <ContactsContent />
    </ProtectedRouteGate>
  );
}

/* ------------------------------------------------------------------ */
/* Content                                                              */
/* ------------------------------------------------------------------ */

function ContactsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { initiateCall } = useCalls();

  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get<DirectoryUser[]>('/users/directory')
      .then((res) => setUsers(res.data))
      .catch(() => setError('Не удалось загрузить список контактов'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.position?.toLowerCase().includes(q) ||
        u.department?.name.toLowerCase().includes(q),
    );
  }, [users, search]);

  const handleMessage = (contact: DirectoryUser) => {
    router.push(
      `/dashboard/chat?with=${contact.id}&name=${encodeURIComponent(contact.name)}`,
    );
  };

  const handleAudioCall = (contact: DirectoryUser) => {
    initiateCall(contact.id, false);
  };

  const handleVideoCall = (contact: DirectoryUser) => {
    initiateCall(contact.id, true);
  };

  return (
    <div className="space-y-4">
      {/* Header + search */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Контакты</h1>
          <p className="text-sm text-muted-foreground">
            Отправьте сообщение или позвоните коллеге
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Поиск по имени, должности…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="h-11 w-11 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded bg-muted" />
                  <div className="h-2 w-24 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {search ? 'Никого не найдено по запросу.' : 'Список контактов пуст.'}
        </p>
      )}

      {/* User cards grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((contact) => (
            <Card key={contact.id} className="transition-shadow hover:shadow-md">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <UserAvatar name={contact.name} avatar={contact.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{contact.name}</p>
                    {contact.position && (
                      <p className="truncate text-xs text-muted-foreground">
                        {contact.position}
                      </p>
                    )}
                    {contact.department && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {contact.department.name}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-3 flex gap-2">
                  {contact.id !== user?.id && (
                    <>
                      {hasAnyPermission(user, [Permission.CHAT_READ]) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5 text-xs"
                          onClick={() => handleMessage(contact)}
                          title="Написать сообщение"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Чат
                        </Button>
                      )}
                      {hasAnyPermission(user, [Permission.CALLS_READ]) && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={() => handleAudioCall(contact)}
                            title="Аудио звонок"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={() => handleVideoCall(contact)}
                            title="Видео звонок"
                          >
                            <Video className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
