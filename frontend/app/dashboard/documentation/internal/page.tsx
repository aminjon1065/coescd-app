'use client';

import { DocumentTable } from '../components/document-table';

export default function InternalDocumentsPage() {
  return (
    <DocumentTable
      title="Внутренний контур СЭД"
      presetType="internal"
      defaultDocType="internal"
    />
  );
}
