import React from 'react';
import { DataTableDemoUser } from '@/app/dashboard/users/components/dataTableUser';


export const metadata = {
  title: 'Users',
};

const Page = () => {
  return (
    <>
      <DataTableDemoUser />
    </>
  );
};

export default Page;