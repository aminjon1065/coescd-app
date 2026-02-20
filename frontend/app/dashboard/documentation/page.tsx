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

export default function DocumentationPage() {
  const [lang, setLang] = useState<DocumentationLang>('ru');

  useEffect(() => {
    const stored = window.localStorage.getItem('documentation_lang');
    if (stored === 'ru' || stored === 'tg') {
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
            <SelectItem value="tg">Тоҷикӣ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="incoming" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-2">
          <TabsTrigger value="incoming">{t.tabs.incoming}</TabsTrigger>
          <TabsTrigger value="outgoing">{t.tabs.outgoing}</TabsTrigger>
          <TabsTrigger value="internal">{t.tabs.internal}</TabsTrigger>
          <TabsTrigger value="approvals">{t.tabs.approvals}</TabsTrigger>
          <TabsTrigger value="registry">{t.tabs.registry}</TabsTrigger>
          <TabsTrigger value="kinds">{t.tabs.kinds}</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming">
          <DocumentTable
            title={t.titles.incoming}
            source="mailbox"
            mailboxType="incoming"
            defaultDocType="incoming"
            emptyText={t.common.noDocuments}
          />
        </TabsContent>
        <TabsContent value="outgoing">
          <DocumentTable
            title={t.titles.outgoing}
            source="mailbox"
            mailboxType="outgoing"
            defaultDocType="outgoing"
            emptyText={t.common.noDocuments}
          />
        </TabsContent>
        <TabsContent value="internal">
          <DocumentTable
            title={t.titles.internal}
            presetType="internal"
            defaultDocType="internal"
            emptyText={t.common.noDocuments}
          />
        </TabsContent>
        <TabsContent value="approvals">
          <DocumentTable
            title={t.titles.approvals}
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
      </Tabs>
    </ProtectedRouteGate>
  );
}
