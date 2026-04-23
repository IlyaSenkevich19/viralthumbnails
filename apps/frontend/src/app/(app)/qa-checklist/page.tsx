import { notFound } from 'next/navigation';
import { QAChecklistClient } from './qa-checklist-client';

/**
 * Manual QA checklist with persisted checkboxes. Not available in production builds.
 * Safe to delete this folder when you no longer need it.
 */
export default function QAChecklistPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <QAChecklistClient />;
}
