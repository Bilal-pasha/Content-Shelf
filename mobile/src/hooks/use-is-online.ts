import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/** True when the device has network connectivity; null until the first check resolves. */
export function useIsOnline(): boolean | null {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return unsubscribe;
  }, []);

  return isOnline;
}
