import { Role } from '@/enums/RoleEnum';
import { RoleDashboardPage } from '@/features/dashboard/RoleDashboardPage';

export default function AdminDashboardPage() {
  return <RoleDashboardPage forcedRole={Role.Admin} />;
}

