'use client';

import React from 'react';
import Head from 'next/head';
import ProtectedContent from '@/ProtectedContent';
import BulkImportAdmin from './components/bulkImportAdmin';

export default function Page() {
  return (
    <>
      <Head>
        <title>Users Bulk Import</title>
      </Head>
      <ProtectedContent>
        <BulkImportAdmin />
      </ProtectedContent>
    </>
  );
}
