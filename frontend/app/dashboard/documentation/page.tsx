'use client';

import { DocumentTable } from './components/document-table';

export default function IncomingDocumentsPage() {
  return (
    <DocumentTable
      title="Канцелярский журнал: входящие"
      presetType="incoming"
      defaultDocType="incoming"
    />
  );
}
