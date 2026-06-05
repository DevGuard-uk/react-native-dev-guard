import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { SafeAreaView, StyleSheet, Text, View, StatusBar, Button, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DevGuardProvider, useDevGuard } from 'react-native-dev-guard';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DevGuardExample render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <ScrollView contentContainerStyle={styles.errorScroll}>
            <Text style={styles.errorTitle}>App failed to render</Text>
            <Text style={styles.errorText}>{this.state.error.message}</Text>
          </ScrollView>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const AppContent = () => {
  const { status, setDeviceUser } = useDevGuard();

  const handleSetUser = async () => {
    try {
      await setDeviceUser('example_user', 'rn@example.com', '+1987654321', { framework: 'react-native' });
      Alert.alert('Success', 'Device user associated successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to set device user.');
    }
  };

  if (status === 'PENDING') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.welcome}>Connecting to DevGuard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>DevGuard Secure</Text>
        <View style={[styles.badge, { backgroundColor: status === 'ACTIVE' ? '#4caf50' : '#ff9800' }]}>
          <Text style={styles.badgeText}>{status}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.welcome}>Welcome to the Protected App</Text>
        <Text style={styles.description}>
          This application is currently protected by DevGuard's Black Box security protocol.
          The lock screen is now automatically managed by the library.
        </Text>
        <View style={{ marginTop: 30 }}>
          <Button title="Set Device User" onPress={handleSetUser} />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {/* Portal integrations must also pass secret (Settings → Master Secret):
            secret="YOUR_UNIQUE_SECRET" */}
        <DevGuardProvider projectId="dev_guard_839714" failSafe="open">
          <AppContent />
        </DevGuardProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  welcome: { fontSize: 20, fontWeight: '600', marginBottom: 10, marginTop: 16 },
  description: { textAlign: 'center', color: '#666', lineHeight: 22 },
  errorContainer: { flex: 1, backgroundColor: '#1a1a2e' },
  errorScroll: { padding: 24 },
  errorTitle: { color: '#f87171', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  errorText: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 }
});
