export function fuzzyMatch(query: string, text: string): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  let queryIndex = 0;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
}

export function fuzzyRank(query: string, items: string[]): string[] {
  return items
    .filter(item => fuzzyMatch(query, item))
    .sort((a, b) => {
      const aIndex = a.toLowerCase().indexOf(query.toLowerCase());
      const bIndex = b.toLowerCase().indexOf(query.toLowerCase());
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
}
