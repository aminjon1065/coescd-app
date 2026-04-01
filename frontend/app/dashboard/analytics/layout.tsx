import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.analytics"
      deniedDescription="Модуль аналитики доступен только пользователям с ролью аналитика или администратора."
    >
      <div className="-m-4 overflow-hidden">{children}</div>
    </ProtectedRouteGate>
  );
}
