import { createContext, useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export type ConnectionStatus = 'Connecting' | 'Live' | 'Reconnecting';

export type ConnectionStatusContextValue = {
  connectionStatus: ConnectionStatus;
  setConnectionStatus: Dispatch<SetStateAction<ConnectionStatus>>;
};

export const ConnectionStatusContext = createContext<ConnectionStatusContextValue | undefined>(
  undefined,
);

export function useConnectionStatus(): ConnectionStatusContextValue {
  const context = useContext(ConnectionStatusContext);
  if (context === undefined) {
    throw new Error('useConnectionStatus must be used within ConnectionStatusProvider');
  }
  return context;
}
