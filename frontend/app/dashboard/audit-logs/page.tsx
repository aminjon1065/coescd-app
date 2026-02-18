'use client';

import Head from 'next/head';
import ProtectedContent from '@/ProtectedContent';
import AuditLogsAdmin from './components/auditLogsAdmin';

export default function Page() {
  return (
    <>
      <Head>
        <title>Audit Logs</title>
      </Head>
      <ProtectedContent>
        <AuditLogsAdmin />
      </ProtectedContent>
    </>
  );
}
