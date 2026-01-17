import { useEffect, useMemo, useState } from 'react';
import { ScreenDescriptor, useExternalDisplay } from 'react-native-external-display';

export type SecondaryDisplayInfo = {
  isConnected: boolean;
  screenId?: string;
  screenName?: string;
  availableScreens: ScreenDescriptor[];
};

export function useSecondaryDisplay(): SecondaryDisplayInfo {
  const { screens = [] } = useExternalDisplay();
  const [activeScreen, setActiveScreen] = useState<ScreenDescriptor | null>(null);

  const secondaryCandidate = useMemo<ScreenDescriptor | null>(() => {
    return screens.find(screen => !screen.isMainScreen) ?? null;
  }, [screens]);

  useEffect(() => {
    if (secondaryCandidate) {
      setActiveScreen(prev => {
        if (prev?.id === secondaryCandidate.id) {
          return prev;
        }
        return secondaryCandidate;
      });
    } else if (activeScreen) {
      setActiveScreen(null);
    }
  }, [secondaryCandidate, activeScreen]);

  return {
    isConnected: Boolean(activeScreen),
    screenId: activeScreen?.id,
    screenName: activeScreen?.name,
    availableScreens: screens
  };
}

export default useSecondaryDisplay;
