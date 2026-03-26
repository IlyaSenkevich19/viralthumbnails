import { redirect } from 'next/navigation';

export default function ProjectRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/projects/${params.id}/variants`);
}
