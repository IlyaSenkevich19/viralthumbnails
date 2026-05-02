/**
 * Spring presets: snappy settle (still springy — not tween-snaps).
 * Heavier damping avoids long “tail” motion that reads as sluggish on lists/modals.
 */
export const vtSpring = {
  layout: { type: 'spring' as const, stiffness: 320, damping: 28 },
  enter: { type: 'spring' as const, stiffness: 300, damping: 30 },
  tap: { type: 'spring' as const, stiffness: 480, damping: 32 },
  /** Card / section entrance — same family, slightly softer than enter. */
  reveal: { type: 'spring' as const, stiffness: 260, damping: 30 },
};

export const vtStagger = {
  /** Delay between staggered children (seconds). */
  card: 0.032,
  pill: 0.024,
} as const;
