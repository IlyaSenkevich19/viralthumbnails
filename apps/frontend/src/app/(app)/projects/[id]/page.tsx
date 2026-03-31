import { redirect } from 'next/navigation';
import { projectVariantsPath } from '@/config/routes';

export default function ProjectRedirectPage({ params }: { params: { id: string } }) {
  redirect(projectVariantsPath(params.id));
}
