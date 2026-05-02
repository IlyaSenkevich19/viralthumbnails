export type PricingPlan = {
  id: string;
  name: string;
  price: string;
  description: string;
  credits: number;
  features: string[];
  cta: string;
  /** outline = ghost border, primary = coral CTA, featured = border + badge + gold CTA */
  ctaStyle: 'outline' | 'primary' | 'gold';
  featured?: boolean;
  badge?: string;
};

export const pricingPlans: PricingPlan[] = [
  {
    id: 'trial',
    name: 'Free starter',
    price: '$0',
    credits: 3,
    description: 'Onboarding balance to run real generations—no checkout.',
    features: [
      '3 free starter credits',
      'Core generation flow',
      'Templates and face references',
      'No recurring charge',
    ],
    cta: 'Included with signup',
    ctaStyle: 'outline',
  },
  {
    id: 'pack_100',
    name: 'Pack 100',
    price: '$19',
    credits: 100,
    description: 'One-time credits for regular creators.',
    features: [
      '100 one-time credits',
      'Prompt, YouTube URL, and video inputs',
      'All templates',
      'No subscription',
    ],
    cta: 'Buy 100 credits',
    ctaStyle: 'primary',
  },
  {
    id: 'pack_300',
    name: 'Pack 300',
    price: '$49',
    credits: 300,
    description: 'Best value for frequent generation sessions.',
    features: [
      '300 one-time credits',
      'Lower effective cost per thumbnail',
      'Video-to-thumbnail pipeline',
      'Priority queue (when enabled)',
    ],
    cta: 'Buy 300 credits',
    ctaStyle: 'gold',
    featured: true,
    badge: 'Best Value',
  },
  {
    id: 'pack_700',
    name: 'Pack 700',
    price: '$99',
    credits: 700,
    description: 'High-volume package for power users and teams.',
    features: [
      '700 one-time credits',
      'Bulk ideation in multiple styles',
      'Team workflows (when enabled)',
      'Dedicated support channel',
    ],
    cta: 'Buy 700 credits',
    ctaStyle: 'primary',
  },
];

