import Link from 'next/link';
import { ShieldAlert, RadioTower, MapPinned, FileStack } from 'lucide-react';
import { Button } from '@/components/ui/button';

const highlights = [
  {
    title: 'Оперативное управление',
    description: 'Задачи, роли и маршруты согласования для координации инцидентов.',
    icon: ShieldAlert,
  },
  {
    title: 'Связь и координация',
    description: 'Чаты, звонки и единое рабочее пространство для команд.',
    icon: RadioTower,
  },
  {
    title: 'GIS и аналитика',
    description: 'Карта, отчёты и обзор ситуации в одном интерфейсе.',
    icon: MapPinned,
  },
  {
    title: 'Документооборот',
    description: 'EDM-процессы, регистрация и контроль исполнения документов.',
    icon: FileStack,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.18),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] text-slate-950">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-16 sm:px-10">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-sky-700 shadow-sm">
            <ShieldAlert className="h-3.5 w-3.5" />
            COESCD
          </div>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Платформа координации и управления чрезвычайными ситуациями
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              Единое рабочее пространство для КЧС: пользователи, задачи, связь, аналитика,
              GIS и электронный документооборот.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link href="/sign-in">Войти в систему</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-slate-300 bg-white/70 px-6 text-base"
            >
              <Link href="/dashboard">Открыть dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
