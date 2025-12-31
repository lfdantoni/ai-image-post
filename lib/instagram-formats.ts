export const INSTAGRAM_ASPECTS = {
  portrait: {
    value: 4 / 5,
    label: "Portrait",
    description: "Feed (4:5)",
    dimensions: { width: 1080, height: 1350 },
    recommended: true,
  },
  square: {
    value: 1 / 1,
    label: "Cuadrado",
    description: "Clásico (1:1)",
    dimensions: { width: 1080, height: 1080 },
    recommended: false,
  },
  landscape: {
    value: 1.91 / 1,
    label: "Horizontal",
    description: "Paisaje (1.91:1)",
    dimensions: { width: 1080, height: 566 },
    recommended: false,
  },
  story: {
    value: 9 / 16,
    label: "Story",
    description: "Stories/Reels (9:16)",
    dimensions: { width: 1080, height: 1920 },
    recommended: false,
  },
} as const;

export type AspectRatioKey = keyof typeof INSTAGRAM_ASPECTS;
