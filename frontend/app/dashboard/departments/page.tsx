'use client';

import Head from 'next/head';
import ProtectedContent from '@/ProtectedContent';
import DepartmentsAdmin from './components/departmentsAdmin';

export default function Page() {
  return (
    <>
      <Head>
        <title>Departments</title>
      </Head>
      <ProtectedContent>
        <DepartmentsAdmin />
      </ProtectedContent>
    </>
  );
}
