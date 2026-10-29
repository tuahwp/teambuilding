/**
 * Natural sort helper for items with a name property.
 * Correctly sorts alphanumeric strings like "Bilik 1", "Bilik 2", ..., "Bilik 10".
 */
export function naturalSortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );
}
