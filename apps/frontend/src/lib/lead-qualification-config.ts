import { Clock, DollarSign, FlaskConical, MousePointerClick, Paintbrush, type LucideIcon } from 'lucide-react';

export type LeadProblemOption = {
  value: string;
  label: string;
  icon: LucideIcon;
};

export const LEAD_PROBLEM_OPTIONS: LeadProblemOption[] = [
  { value: 'time', label: 'Takes too long', icon: Clock },
  { value: 'cost', label: 'Designers cost too much', icon: DollarSign },
  { value: 'ctr', label: 'My CTR is low', icon: MousePointerClick },
  { value: 'design', label: "I can't design", icon: Paintbrush },
  { value: 'testing', label: "Can't A/B test", icon: FlaskConical },
];

export const LEAD_SUBSCRIBER_OPTIONS = [
  'Under 1,000',
  '1,000 – 5,000',
  '5,000 – 15,000',
  '15,000 – 30,000',
  '30,000+',
] as const;

export const LEAD_VIDEOS_PER_WEEK_OPTIONS = ['1–2 videos', '3–4 videos', '5+ videos'] as const;
