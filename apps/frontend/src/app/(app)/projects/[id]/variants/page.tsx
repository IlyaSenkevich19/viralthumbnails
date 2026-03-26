import { VariantsGallery } from './variants-gallery';

export default function ProjectVariantsPage({ params }: { params: { id: string } }) {
  return <VariantsGallery projectId={params.id} />;
}
