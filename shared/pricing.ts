// Course/product pricing definitions used by checkout and billing
export const COURSES = {
  phase12: {
    id: "phase12",
    name: "Self-Reflection & Structure",
    description: "Phase 1 & 2: Discover who you are, who you want to be, and build the structure to get there",
    price: 39900, // $399
    stripePriceEnvVar: "STRIPE_PRICE_PHASE12",
    features: [
      "Phase 1: Video lessons + AI-guided self-discovery",
      "Lesson 1: Who Am I? - Deep self-reflection",
      "Lesson 2: Who Do I Want To Be? - Vision building",
      "Phase 2: Structure & daily tools",
      "Lesson 3: How To Get There - Implementation guide",
      "Journaling, Meditation, Eisenhower Matrix & more",
      "Weekly habits & daily task management",
    ],
  },
  phase3: {
    id: "phase3",
    name: "Transformation",
    description: "Phase 3: Understand your patterns and transform them with AI-powered analysis",
    price: 29900, // $299
    stripePriceEnvVar: "STRIPE_PRICE_PHASE3",
    features: [
      "Lesson: You Are Your Patterns - Video lesson",
      "AI-powered pattern analysis agent",
      "Upload your self-discovery documents",
      "Receive personalized transformation insights",
      "Downloadable transformation report",
    ],
  },
  allinone: {
    id: "allinone",
    name: "Complete Leaf Program",
    description: "All 3 phases: the complete self-discovery and transformation experience",
    price: 49900, // $499 (save $199)
    stripePriceEnvVar: "STRIPE_PRICE_ALLINONE",
    features: [
      "Everything in Phase 1 & 2",
      "Everything in Phase 3",
      "Save $199 with the complete package",
      "Full lifetime access to all content",
      "All future updates included",
    ],
  },
} as const;

export type CourseType = keyof typeof COURSES;
