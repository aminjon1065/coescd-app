'use client';

import { DocumentTable } from './components/document-table';

export default function IncomingDocumentsPage() {
  return <DocumentTable title="Входящие документы" type="incoming" defaultDocType="incoming" />;
}
