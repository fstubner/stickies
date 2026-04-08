export interface CaptureOptions {
  includeSelection?: boolean;
  format?: 'image' | 'markdown';
}

class CaptureService {
  async captureScreen(options: CaptureOptions = {}): Promise<string> {
    // Implementation would go here
    return '';
  }

  async captureSelection(): Promise<string> {
    // Implementation would go here
    return '';
  }
}

export const captureService = new CaptureService();
