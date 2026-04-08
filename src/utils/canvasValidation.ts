export function isValidCanvasElement(element: any): boolean {
  return element instanceof HTMLCanvasElement;
}

export function validateCanvasContext(context: any): boolean {
  return context && typeof context === 'object' && 'fillStyle' in context;
}
