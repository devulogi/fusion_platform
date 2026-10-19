import type { Server } from 'node:http';

export function createShutdownHandler(
  server: Server,
  closeActiveStreams: () => void,
  disconnect: () => Promise<void>,
): () => Promise<void> {
  let shutdownPromise: Promise<void> | undefined;

  return (): Promise<void> => {
    if (shutdownPromise !== undefined) return shutdownPromise;

    shutdownPromise = new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }
        resolve();
      });
      closeActiveStreams();
    }).then(disconnect);

    return shutdownPromise;
  };
}
