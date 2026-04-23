import { redirect } from 'next/navigation';
import { AppRoutes } from '@/config/routes';

export default function DashboardPage() {
  redirect(AppRoutes.create);
}
