import React, { useEffect, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { MonthProvider } from '../context/MonthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDB, initAttendanceTable, getDB } from '../database/db';
import {
  restoreFromCloud,
  cloudHasData,
  flushSyncQueue,
  clearLocalData,
} from '../services/firebase';
import LoadingScreen from '../components/LoadingScreen';

// ─── Inner loader: handles DB init + cloud restore + sync flush ───────────────
function DBLoader({ children }) {
  const { isLoggedIn, user } = useAuth();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Starting...');

  const appState = useRef(AppState.currentState);
  const wasOffline = useRef(false);
  const lastUid = useRef(null);

  // Initialise DB, restore from cloud if needed, flush pending sync queue
  useEffect(() => {
    const setup = async () => {
      try {
        setReady(false);
        setStatus('Initializing database...');
        await initDB();
        await initAttendanceTable();

        if (isLoggedIn && user) {
          const currentUid = user.uid;

          // Different user logged in — clear old local data first
          if (lastUid.current && lastUid.current !== currentUid) {
            setStatus('Switching account...');
            await clearLocalData();
          }
          lastUid.current = currentUid;

          const database = await getDB();
          const existing = await database.getFirstAsync(`SELECT id FROM students LIMIT 1`);

          if (!existing) {
            setStatus('Checking cloud backup...');
            const hasCloud = await cloudHasData();
            if (hasCloud) {
              setStatus('Restoring your data...');
              await restoreFromCloud();
              setStatus('Data restored!');
            } else {
              setStatus('Ready!');
            }
          }

          await flushSyncQueue();
        }

        setReady(true);
      } catch (err) {
        console.log('Setup error:', err.message);
        setReady(true); // Don't block the app on error
      }
    };

    setup();
  }, [isLoggedIn, user?.uid]);

  // Flush sync queue when internet connectivity returns
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected && state.isInternetReachable;
      if (isOnline && wasOffline.current) {
        console.log('🌐 Back online — flushing sync queue...');
        flushSyncQueue();
      }
      wasOffline.current = !isOnline;
    });
    return () => unsubscribe();
  }, []);

  // Flush sync queue when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        flushSyncQueue();
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  if (!ready) return <LoadingScreen message={status} />;
  return children;
}

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <MonthProvider>
            <DBLoader>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false }} />
            </DBLoader>
          </MonthProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
