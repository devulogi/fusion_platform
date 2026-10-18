import { useState } from 'react';
import type { ReactNode } from 'react';
import { ConnectionStatusContext } from './connection-status-context';
import type { ConnectionStatus } from './connection-status-context';

export function ConnectionStatusProvider({ children }: { children: ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Connecting');

  return (
    <ConnectionStatusContext.Provider value={{ connectionStatus, setConnectionStatus }}>
      {children}
    </ConnectionStatusContext.Provider>
  );
}
