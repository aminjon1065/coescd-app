import { redirect } from 'next/navigation';

export default function TaskManagementRootPage() {
  redirect('/dashboard/task-management/board');
}
