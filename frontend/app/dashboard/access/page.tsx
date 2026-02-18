'use client';

import Head from 'next/head';
import ProtectedContent from '@/ProtectedContent';
import AccessControlAdmin from './components/accessControlAdmin';

export default function Page() {
  return (
    <>
      <Head>
        <title>Access Control</title>
      </Head>
      <ProtectedContent>
        <AccessControlAdmin />
      </ProtectedContent>
    </>
  );
}
