'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

export default function NProgressProvider() {
  const pathname = usePathname();
  useEffect(() => {
    NProgress.start();
    // плавно завершаем после 500мс
    const timeout = setTimeout(() => {
      NProgress.done();
    }, 500);
    return () => {
      clearTimeout(timeout);
    };
  }, [pathname]);
  return null;
}