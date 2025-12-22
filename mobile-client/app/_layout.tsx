import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUploadStore } from '@/store/uploadStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const initialize = useUploadStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Media Upload' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
