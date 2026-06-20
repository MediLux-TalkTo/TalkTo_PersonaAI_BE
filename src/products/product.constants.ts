export const ProductFeature = {
  MEMORIES: 'memories',
  VOICE_PERSONA: 'voice_persona',
} as const;

export type ProductFeature =
  (typeof ProductFeature)[keyof typeof ProductFeature];

export const ProductFeatureValues = [
  ProductFeature.MEMORIES,
  ProductFeature.VOICE_PERSONA,
] as const;

export const CatalogProductId = {
  MEMORIES_ACCESS: 'memories_access',
  VOICE_PERSONA_BUILD: 'voice_persona_build',
} as const;

export type CatalogProductId =
  (typeof CatalogProductId)[keyof typeof CatalogProductId];
