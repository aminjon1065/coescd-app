'use client';

import { useEffect, useState } from 'react';
import { DocumentTable } from '../components/document-table';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { DocumentationLang } from '../i18n';

export default function SentDocumentsPage() {
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
          ? 'Бахши ҳуҷҷатҳо барои корбарони дорои ҳуқуқи хондан дастрас аст.'
          : 'Раздел документов доступен пользователям с правом чтения.'
      }
    >
      <DocumentTable
        title={lang === 'tj' ? 'Ҳуҷҷатҳои фиристодашуда' : 'Отправленные документы'}
        lang={lang}
        allowCreate
        lockCreateType
        source="mailbox"
        mailboxType="outgoing"
        defaultDocType="outgoing"
      />
    </ProtectedRouteGate>
  );
}
