import { Role } from '@/enums/RoleEnum';
import { RoleDashboardPage } from '@/features/dashboard/RoleDashboardPage';

export default function ManagerDashboardPage() {
  return <RoleDashboardPage forcedRole={Role.Manager} />;
}

