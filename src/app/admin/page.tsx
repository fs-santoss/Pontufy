import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboard() {
  const session = await auth();
  if (!session || session.user.role !== 'admin_rh') redirect('/dashboard');

  return <AdminDashboardClient />;
}
