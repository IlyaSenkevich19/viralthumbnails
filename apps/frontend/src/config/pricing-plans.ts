export type PricingPlan = {
  id: string;
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  /** outline = ghost border, primary = coral CTA, featured = border + badge + gold CTA */
  ctaStyle: 'outline' | 'primary' | 'gold';
  featured?: boolean;
  badge?: string;
};

export const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Try it out — zero commitment.',
    features: [
      '10 thumbnails total',
      '5 basic templates',
      'Watermarked exports',
      'Community support',
    ],
    cta: 'Start Free',
    ctaStyle: 'outline',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$19',
    period: '/mo',
    description: 'For creators uploading 1–2 videos/week.',
    features: [
      '50 thumbnails / month',
      'All templates',
      'Canva import',
      'No watermark',
      'Email support',
    ],
    cta: 'Get Starter',
    ctaStyle: 'primary',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/mo',
    description: 'For serious creators who want max CTR.',
    features: [
      '200 thumbnails / month',
      'A/B testing',
      'Custom branding',
      'Priority support',
      'Advanced analytics',
      'No watermark',
    ],
    cta: 'Get Pro',
    ctaStyle: 'gold',
    featured: true,
    badge: 'Most Popular',
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '$99',
    period: '/mo',
    description: 'For teams managing multiple channels.',
    features: [
      'Unlimited thumbnails',
      'Team access (5 seats)',
      'API access',
      'White-label exports',
      'Dedicated support',
      'All Pro features',
    ],
    cta: 'Get Agency',
    ctaStyle: 'primary',
  },
];
