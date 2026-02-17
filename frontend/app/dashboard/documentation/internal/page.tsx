'use client';

import { DocumentTable } from '../components/document-table';

export default function InternalDocumentsPage() {
  return <DocumentTable title="Внутренние документы" type="internal" defaultDocType="internal" />;
}
