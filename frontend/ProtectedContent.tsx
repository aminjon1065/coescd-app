'use client'

import React from 'react'
import { useAuth } from '@/context/auth-context'
import Loading from '@/app/loading'

interface ProtectedContentProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function ProtectedContent({ children, fallback }: ProtectedContentProps) {
  const { loading, user } = useAuth()

  // Пока идёт загрузка — показываем индикатор
  if (loading) return <Loading />

  // Если пользователь не авторизован — можно вернуть fallback или null
  if (!user) return fallback || null

  return <>{children}</>
}
