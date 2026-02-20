'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentTable } from './components/document-table';
import { RegistrationJournalTable } from './components/registration-journal-table';
import { DocumentKindsManager } from './components/document-kinds-manager';
import { DocumentationLang, documentationI18n } from './i18n';
import { useAuth } from '@/context/auth-context';

export default function DocumentationPage() {
  const { user } = useAuth();
  const [lang, setLang] = useState<DocumentationLang>('ru');
  const role = String(user?.role ?? '');
  const isPrivilegedEdmUser = role === 'admin' || role === 'chancellery';
  const staffLabels = lang === 'tj'
    ? {
        received: 'Воридшуда',
        outgoing: 'Фиристодашуда',
        control: 'Дар назорат',
        receivedTitle: 'Ҳуҷҷатҳои воридшуда',
        outgoingTitle: 'Ҳуҷҷатҳои фиристодашуда',
        controlTitle: 'Ҳуҷҷатҳо дар назорат',
      }
    : {
        received: 'Полученные',
        outgoing: 'Отправленные',
        control: 'На контроле',
        receivedTitle: 'Полученные документы',
        outgoingTitle: 'Отправленные документы',
        controlTitle: 'Документы на контроле',
      };

  useEffect(() => {
    const stored = window.localStorage.getItem('documentation_lang');
    if (stored === 'ru' || stored === 'tj') {
      setLang(stored);
    }
  }, []);

  const t = documentationI18n[lang];

  return (
    <ProtectedRouteGate
      policyKey="dashboard.documents"
      deniedDescription={t.denied}
    >
      <div className="mb-3 flex items-center justify-end gap-2">
        <Label>{t.language}</Label>
        <Select
          value={lang}
          onValueChange={(value: DocumentationLang) => {
            setLang(value);
            window.localStorage.setItem('documentation_lang', value);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ru">Русский</SelectItem>
            <SelectItem value="tj">Тоҷикӣ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue={isPrivilegedEdmUser ? 'incoming' : 'received'} className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-2">
          {isPrivilegedEdmUser ? (
            <>
              <TabsTrigger value="incoming">{t.tabs.incoming}</TabsTrigger>
              <TabsTrigger value="outgoing">{t.tabs.outgoing}</TabsTrigger>
              <TabsTrigger value="internal">{t.tabs.internal}</TabsTrigger>
              <TabsTrigger value="approvals">{t.tabs.approvals}</TabsTrigger>
              <TabsTrigger value="registry">{t.tabs.registry}</TabsTrigger>
              <TabsTrigger value="kinds">{t.tabs.kinds}</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="received">{staffLabels.received}</TabsTrigger>
              <TabsTrigger value="control">{staffLabels.control}</TabsTrigger>
              <TabsTrigger value="outgoingStaff">{staffLabels.outgoing}</TabsTrigger>
            </>
          )}
        </TabsList>

        {isPrivilegedEdmUser ? (
          <>
            <TabsContent value="incoming">
              <DocumentTable
                title={t.titles.incoming}
                lang={lang}
                source="mailbox"
                mailboxType="incoming"
                defaultDocType="incoming"
                emptyText={t.common.noDocuments}
              />
            </TabsContent>
            <TabsContent value="outgoing">
              <DocumentTable
                title={t.titles.outgoing}
                lang={lang}
                source="mailbox"
                mailboxType="outgoing"
                defaultDocType="outgoing"
                emptyText={t.common.noDocuments}
              />
            </TabsContent>
            <TabsContent value="internal">
              <DocumentTable
                title={t.titles.internal}
                lang={lang}
                presetType="internal"
                defaultDocType="internal"
                emptyText={t.common.noDocuments}
              />
            </TabsContent>
            <TabsContent value="approvals">
              <DocumentTable
                title={t.titles.approvals}
                lang={lang}
                source="queue"
                queueType="my-approvals"
                emptyText={t.common.noStages}
              />
            </TabsContent>
            <TabsContent value="registry">
              <RegistrationJournalTable lang={lang} />
            </TabsContent>
            <TabsContent value="kinds">
              <DocumentKindsManager lang={lang} />
            </TabsContent>
          </>
        ) : (
          <>
            <TabsContent value="received">
              <DocumentTable
                title={staffLabels.receivedTitle}
                lang={lang}
                source="mailbox"
                mailboxType="incoming"
                defaultDocType="incoming"
                emptyText={t.common.noDocuments}
              />
            </TabsContent>
            <TabsContent value="control">
              <DocumentTable
                title={staffLabels.controlTitle}
                lang={lang}
                source="queue"
                queueType="my-approvals"
                emptyText={t.common.noStages}
              />
            </TabsContent>
            <TabsContent value="outgoingStaff">
              <DocumentTable
                title={staffLabels.outgoingTitle}
                lang={lang}
                allowCreate
                lockCreateType
                source="mailbox"
                mailboxType="outgoing"
                defaultDocType="outgoing"
                emptyText={t.common.noDocuments}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </ProtectedRouteGate>
  );
}


