export function isIPCReady(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      resolve(true);
    } else {
      const checkInterval = setInterval(() => {
        if ((window as any).electron) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 5000);
    }
  });
}
