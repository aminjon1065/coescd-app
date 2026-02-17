'use client';

import { DocumentTable } from '../components/document-table';

export default function SentDocumentsPage() {
  return <DocumentTable title="Исходящие документы" type="outgoing" defaultDocType="outgoing" />;
}
