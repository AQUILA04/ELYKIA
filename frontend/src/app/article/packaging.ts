export function halfPackageUnits(article: {
  unitsPerPackage?: number | null;
  unitsPerHalfPackage?: number | null;
} | null | undefined): number | null {
  const units = Number(article?.unitsPerPackage ?? 0);
  if (!units || units < 2) {
    return null;
  }
  if (units % 2 === 0) {
    return units / 2;
  }
  const half = Number(article?.unitsPerHalfPackage ?? 0);
  return half >= 1 && half < units ? half : null;
}

export function hasHalfPackage(article: {
  packagingType?: string | null;
  unitsPerPackage?: number | null;
  unitsPerHalfPackage?: number | null;
} | null | undefined): boolean {
  if (!article?.packagingType || article.packagingType === 'NONE') {
    return false;
  }
  return halfPackageUnits(article) != null;
}
