import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

const TEST_PATH = '/rest/v1/profiles?select=id&limit=1';

function createLogLine(label: string, payload: unknown) {
  if (payload === undefined) {
    return label;
  }
  try {
    return `${label} ${JSON.stringify(payload, null, 2)}`;
  } catch {
    return `${label} ${String(payload)}`;
  }
}

export default function SupabaseDebugScreen() {
  const insets = useSafeAreaInsets();
  const [logLines, setLogLines] = useState<string[]>([]);
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const endpoint = useMemo(() => {
    if (!supabaseUrl) return 'MISSING SUPABASE URL ENV';
    return `${supabaseUrl.replace(/\/$/, '')}${TEST_PATH}`;
  }, [supabaseUrl]);

  const appendLog = useCallback((line: string) => {
    setLogLines((prev) => [line, ...prev].slice(0, 50));
  }, []);

  const runTest = useCallback(async () => {
    if (!supabaseUrl || !anonKey) {
      appendLog('[DEBUG] Missing Supabase env (URL or anon key)');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    appendLog(createLogLine('[DEBUG] ▶ fetch start', { endpoint }));
    const startedAt = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(endpoint, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      const duration = Date.now() - startedAt;
      appendLog(createLogLine('[DEBUG] ◀ fetch completed', { status: response.status, duration }));

      const text = await response.text();
      appendLog(createLogLine('[DEBUG] response headers', Object.fromEntries(response.headers.entries())));
      appendLog(createLogLine('[DEBUG] response body', text));

      if (!response.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      const duration = Date.now() - startedAt;
      appendLog(createLogLine('[DEBUG] ✗ fetch error', { message: (error as Error)?.message, duration }));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [anonKey, appendLog, endpoint, supabaseUrl]);

  const handleCopyLogs = useCallback(async () => {
    if (logLines.length === 0) {
      appendLog('[DEBUG] nothing to copy (log empty)');
      await Haptics.selectionAsync();
      return;
    }
    try {
      const joined = logLines.slice().reverse().join('\n');
      await Clipboard.setStringAsync(joined);
      appendLog('[DEBUG] copied logs to clipboard');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      appendLog(createLogLine('[DEBUG] copy failed', { message: (error as Error)?.message }));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [appendLog, logLines]);

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.title}>Supabase Connectivity Debug</Text>
      <Text style={styles.subtitle}>Endpoint</Text>
      <Text style={styles.mono}>{endpoint}</Text>
      <TouchableOpacity style={styles.button} onPress={runTest} activeOpacity={0.75}>
        <Text style={styles.buttonText}>Run fetch test</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.copyButton, logLines.length === 0 && styles.copyButtonDisabled]}
        onPress={handleCopyLogs}
        activeOpacity={0.75}
      >
        <Text style={styles.buttonText}>Copy logs</Text>
      </TouchableOpacity>
      <ScrollView style={styles.logContainer} contentContainerStyle={styles.logContent}>
        {logLines.length === 0 ? (
          <Text style={styles.empty}>Press the button to run the test.</Text>
        ) : (
          logLines.map((line, index) => (
            <Text key={index} style={styles.logLine}>
              {line}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0E1116',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 4,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 4,
  },
  button: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  copyButton: {
    marginTop: 12,
    backgroundColor: '#1F2937',
  },
  copyButtonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  logContainer: {
    marginTop: 20,
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  logContent: {
    paddingVertical: 12,
    gap: 8,
  },
  logLine: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    color: '#F9FAFB',
  },
  empty: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 13,
  },
});
