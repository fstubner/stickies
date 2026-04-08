export function parseMarkdownLinks(text: string): string[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: string[] = [];
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    links.push(match[2]);
  }
  return links;
}

export function parseMarkdownCheckboxes(text: string): boolean[] {
  const checkboxRegex = /^\s*[-*]\s+\[([ xX])\]/gm;
  const checkboxes: boolean[] = [];
  let match;
  while ((match = checkboxRegex.exec(text)) !== null) {
    checkboxes.push(match[1].toLowerCase() === 'x');
  }
  return checkboxes;
}
