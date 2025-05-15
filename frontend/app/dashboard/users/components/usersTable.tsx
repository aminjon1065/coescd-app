'use client'

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { IUser } from '@/interfaces/IUser';
import { useAuth } from '@/context/auth-context';
import Loading from '@/app/loading';

export default function UsersTable() {
  const [users, setUsers] = useState<IUser[]>([]);
  const { loading, accessToken } = useAuth(); // 👈 ждём пока инициализируется

  useEffect(() => {
    if (!accessToken) return;

    api.get('/users')
      .then(res => setUsers(res.data))
      .catch(console.error);
  }, [accessToken]); // 👈 важно!

  if (loading || !accessToken) {
    return <Loading />; // пока инициализация
  }

  return (
    <table className="w-full border border-gray-200 text-sm">
      <thead>
      <tr>
        <th className="border px-4 py-2 text-left">Имя</th>
        <th className="border px-4 py-2 text-left">Email</th>
        <th className="border px-4 py-2 text-left">Должность</th>
        <th className="border px-4 py-2 text-left">Департамент</th>
        <th className="border px-4 py-2 text-left">Роль</th>
      </tr>
      </thead>
      <tbody>
      {users.map(user => (
        <tr key={user.id}>
          <td className="border px-4 py-2">{user.name}</td>
          <td className="border px-4 py-2">{user.email}</td>
          <td className="border px-4 py-2">{user.position || '-'}</td>
          <td className="border px-4 py-2">
            {user.department?.name ?? '—'}
          </td>
          <td className="border px-4 py-2">{user.role}</td>
        </tr>
      ))}
      </tbody>
    </table>
  );
}