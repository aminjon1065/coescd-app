'use client';

import React from 'react';
import UsersTable from './components/usersTable';
import Head from 'next/head';
import ProtectedContent from '@/ProtectedContent';

export default function Page() {
  return (
    <>
      <Head>
        <title>Users</title>
      </Head>
      <ProtectedContent>
        <UsersTable />
      </ProtectedContent>
    </>
  );
}