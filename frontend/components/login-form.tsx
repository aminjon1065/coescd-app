'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModeToggle } from '@/components/toggle-theme';
import Link from 'next/link';
import {
  LogIn,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export function LoginForm({
  className,
  email,
  password,
  setEmail,
  setPassword,
  handleSubmit,
  error,
  loading,
  ...props
}: {
  className?: string;
  email?: string;
  password?: string;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  error?: React.ReactNode;
  loading?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={cn('fixed inset-0 z-50 flex', className)} {...props}>

      {/* ─── LEFT COLUMN: Branding Panel ─── */}
      <div
        className="hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden flex-col items-center justify-center"
        style={{
          background:
            'linear-gradient(135deg, oklch(0.546 0.245 262.881) 0%, oklch(0.38 0.22 262.881) 60%, oklch(0.22 0.13 262.881) 100%)',
        }}
      >
        {/* Decorative blurred circles */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'oklch(0.85 0.1 262.881)' }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-15 blur-3xl"
          style={{ background: 'oklch(0.9 0.05 262.881)' }}
        />
        <div
          className="absolute top-1/3 right-10 w-28 h-28 rotate-45 opacity-10 rounded-2xl"
          style={{ background: 'oklch(0.95 0.05 262.881)' }}
        />

        {/* Branding content */}
        <div className="relative z-10 flex flex-col items-center gap-6 text-white text-center max-w-xs px-8">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-2xl">
            <ShieldCheck className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>

          <div>
            <h1 className="text-5xl font-bold tracking-tight text-white">
              COESCD
            </h1>
            <p className="mt-2 text-xs font-semibold text-white/60 uppercase tracking-[0.2em]">
              Enterprise Platform
            </p>
          </div>

          <p className="text-white/75 text-sm leading-relaxed">
            Координация, связь, аналитика и документооборот для КЧС
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {['Координация', 'Аналитика', 'Документооборот'].map((label) => (
              <span
                key={label}
                className="px-3 py-1 rounded-full text-xs font-medium bg-white/15 border border-white/20 text-white/90"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RIGHT COLUMN: Form Panel ─── */}
      <div className="flex w-full md:w-1/2 lg:w-2/5 flex-col items-center justify-center bg-background relative p-8 md:p-12">

        {/* ModeToggle — absolute top-right */}
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>

        {/* Form content */}
        <div className="w-full max-w-sm flex flex-col gap-8">

          {/* Header */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Добро пожаловать
            </h2>
            <p className="text-sm text-muted-foreground">
              Войдите в систему, чтобы продолжить
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@organization.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Пароль
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                >
                  Забыли пароль?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* Error badge */}
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 font-semibold bg-[oklch(0.546_0.245_262.881)] hover:bg-[oklch(0.48_0.24_262.881)] text-white dark:bg-[oklch(0.546_0.245_262.881)] dark:hover:bg-[oklch(0.48_0.24_262.881)] dark:text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Вход...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Войти
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

    </div>
  );
}
