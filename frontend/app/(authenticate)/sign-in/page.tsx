'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from '@/lib/auth';
import { useAuth } from '@/context/auth-context';
import { LoginForm } from '@/components/login-form';
import { getRoleDashboardPath } from '@/features/authz/roles';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAccessToken, setUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { accessToken, user } = await signIn(email, password);
      setAccessToken(accessToken);
      setUser(user);
      const nextPath = searchParams.get('next');
      const isSafeNext = Boolean(nextPath && nextPath.startsWith('/'));
      router.replace(isSafeNext ? nextPath! : getRoleDashboardPath(user.role));
    } catch {
      setError('Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          handleSubmit={handleSubmit}
          email={email}
          password={password}
          setPassword={setPassword}
          setEmail={setEmail}
          error={error}
          loading={loading}
        />
      </div>
    </div>
  );
}
