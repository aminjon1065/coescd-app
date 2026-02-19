import { Role } from '@/enums/RoleEnum';
import { RoleDashboardPage } from '@/features/dashboard/RoleDashboardPage';

export default function RegularDashboardPage() {
  return <RoleDashboardPage forcedRole={Role.Regular} />;
}

