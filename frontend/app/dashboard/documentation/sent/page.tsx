'use client';

import { DocumentTable } from '../components/document-table';

export default function SentDocumentsPage() {
  return (
    <DocumentTable
      title="Канцелярский журнал: исходящие"
      presetType="outgoing"
      defaultDocType="outgoing"
    />
  );
}
