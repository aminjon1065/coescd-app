'use client';

import { useEffect, useState } from 'react';
import { DocumentTable } from '../components/document-table';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { DocumentationLang } from '../i18n';

export default function ApprovalsQueuePage() {
  const [lang, setLang] = useState<DocumentationLang>('ru');

  useEffect(() => {
    const stored = window.localStorage.getItem('documentation_lang');
    if (stored === 'ru' || stored === 'tj') {
      setLang(stored);
    }
  }, []);

  return (
    <ProtectedRouteGate
      policyKey="dashboard.documents"
      deniedDescription={
        lang === 'tj'
          ? 'Бахши назорат барои корбарони дорои ҳуқуқи хондани ҳуҷҷатҳо дастрас аст.'
          : 'Раздел контроля доступен пользователям с правом чтения документов.'
      }
    >
      <DocumentTable
        title={lang === 'tj' ? 'Ҳуҷҷатҳо дар назорат' : 'Документы на контроле'}
        lang={lang}
        source="queue"
        queueType="my-approvals"
      />
    </ProtectedRouteGate>
  );
}
