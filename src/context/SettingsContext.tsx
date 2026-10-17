import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type PictureStyle = 'ancient' | 'photo' | 'emoji';

type Settings = { pictureStyle: PictureStyle };

const KEY = 'learnchinese.settings.v2';
const defaults: Settings = { pictureStyle: 'ancient' };

type SettingsContextValue = Settings & { setPictureStyle: (style: PictureStyle) => void };

const SettingsContext = createContext<SettingsContextValue>({ ...defaults, setPictureStyle: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setSettings({ ...defaults, ...JSON.parse(raw) }))
      .catch(() => {});
  }, []);

  const setPictureStyle = useCallback((pictureStyle: PictureStyle) => {
    setSettings((s) => {
      const next = { ...s, pictureStyle };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return <SettingsContext.Provider value={{ ...settings, setPictureStyle }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
