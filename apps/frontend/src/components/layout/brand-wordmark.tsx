import Link from 'next/link';
import { brandWordmarkPrefix, brandWordmarkSuffix } from '@/config/site';
import { AppRoutes } from '@/config/routes';
import { cn } from '@/lib/utils';

type BrandWordmarkProps = {
  className?: string;
  /** When true (default), wraps wordmark in `<Link href={href}>`. Set false if an ancestor is already a link. */
  linked?: boolean;
  href?: string;
};

export function BrandWordmark({
  className,
  linked = true,
  href = AppRoutes.home,
}: BrandWordmarkProps) {
  const text = (
    <span className={cn('font-semibold tracking-tight', className)}>
      <span className="text-foreground">{brandWordmarkPrefix}</span>
      <span className="text-primary">{brandWordmarkSuffix}</span>
    </span>
  );
  if (linked && href) {
    return (
      <Link
        href={href}
        className="inline-flex min-w-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {text}
      </Link>
    );
  }
  return text;
}
