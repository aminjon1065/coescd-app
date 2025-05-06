'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth';
import { parseJwt } from '@/utils/jwt';
import { useAuth } from '@/context/auth-context';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  const router = useRouter();
  const { setAccessToken } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { token, user } = await signIn(email, password);
      console.log(user);
      setAccessToken(token);
      router.push('/dashboard');
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