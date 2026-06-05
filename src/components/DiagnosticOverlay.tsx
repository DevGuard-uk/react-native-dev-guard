import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import CryptoJS from 'crypto-js';
import { DevGuardLogger } from '../services/DevGuardLogger';

interface DiagnosticOverlayProps {
  visible: boolean;
  onClose: () => void;
  response: any;
  projectId: string;
}

export const DiagnosticOverlay: React.FC<DiagnosticOverlayProps> = ({ visible, onClose, response, projectId }) => {
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'usage' | 'vault'>('usage');

  const handleUnlock = () => {
    if (!response?.diagnosticPasscodeHash) {
      Alert.alert('Configuration Missing', 'No Diagnostic Passcode is configured in the Control Center. Please set one to enable diagnostics.');
      return;
    }

    const hashedInput = CryptoJS.SHA256(passcode).toString();
    if (hashedInput === response.diagnosticPasscodeHash) {
      setIsAuthorized(true);
      DevGuardLogger.enableConsoleLogs();
    } else {
      Alert.alert('Access Denied', 'Invalid passcode.');
      setPasscode('');
    }
  };

  const clearLogs = async () => {
    await DevGuardLogger.clearAll();
    Alert.alert('Logs Cleared', 'All info and error logs have been cleared.');
  };

  const exportLogs = async () => {
    const data = await DevGuardLogger.exportErrors();
    // In a real app, we would share this string or write it to a file.
    // For now, we will print it to console (since they are in dev mode if they unlock).
    console.log('Encrypted Error Vault Data:', data);
    Alert.alert('Exported', 'Encrypted logs have been printed to the console.');
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DevGuard Diagnostics</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        {!isAuthorized ? (
          <View style={styles.lockContainer}>
            <Text style={styles.lockTitle}>Diagnostic Vault</Text>
            {(!response?.diagnosticPasscodeHash || response?.diagnosticPasscodeHash === '') ? (
              <Text style={styles.warningText}>No Diagnostic Passcode is configured. Please configure it in the admin portal.</Text>
            ) : (
              <>
                <Text style={styles.lockSubtitle}>Enter passcode to view telemetry and logs</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  maxLength={6}
                  keyboardType="numeric"
                  value={passcode}
                  onChangeText={setPasscode}
                  placeholder="------"
                  placeholderTextColor="#666"
                />
                <TouchableOpacity style={styles.unlockButton} onPress={handleUnlock}>
                  <Text style={styles.unlockText}>Unlock</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'usage' && styles.activeTab]}
                onPress={() => setActiveTab('usage')}
              >
                <Text style={styles.tabText}>Usage</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'vault' && styles.activeTab]}
                onPress={() => setActiveTab('vault')}
              >
                <Text style={styles.tabText}>Vault ({DevGuardLogger.getErrorCount()})</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContent}>
              {activeTab === 'usage' ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Project Info</Text>
                  <Text style={styles.infoText}>Project ID: {projectId}</Text>
                  <Text style={styles.infoText}>Status: {response?.status}</Text>
                  <Text style={styles.infoText}>Remote Command: {response?.remoteCommand || 'None'}</Text>
                </View>
              ) : (
                <View style={styles.section}>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={clearLogs}>
                      <Text style={styles.actionText}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.exportButton]} onPress={exportLogs}>
                      <Text style={styles.actionText}>Export</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.sectionTitle}>Error Vault ({DevGuardLogger.getErrorCount()})</Text>
                  {DevGuardLogger.getErrorLogs().map((log, i) => (
                    <View key={i} style={styles.logCard}>
                      <Text style={styles.logTime}>{log.timestamp}</Text>
                      <Text style={styles.logError}>{log.error}</Text>
                      <Text style={styles.logContext}>Context: {log.context}</Text>
                    </View>
                  ))}

                  <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Info Logs</Text>
                  {DevGuardLogger.getInfoLogs().map((log, i) => (
                    <View key={i} style={styles.logCard}>
                      <Text style={styles.logTime}>{log.timestamp}</Text>
                      <Text style={styles.logError}>{log.error}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#2d2d2d' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  closeButton: { padding: 8 },
  closeText: { color: '#ffb300', fontWeight: '600' },
  lockContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  lockTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  lockSubtitle: { color: '#aaa', fontSize: 14, marginBottom: 20 },
  warningText: { color: '#ff4444', fontSize: 14, textAlign: 'center', marginTop: 10 },
  input: { backgroundColor: '#333', color: '#fff', fontSize: 24, letterSpacing: 10, padding: 15, borderRadius: 10, width: 200, textAlign: 'center', marginBottom: 20 },
  unlockButton: { backgroundColor: '#ffb300', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8 },
  unlockText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  content: { flex: 1 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#2d2d2d' },
  tab: { flex: 1, padding: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#ffb300' },
  tabText: { color: '#fff', fontWeight: 'bold' },
  scrollContent: { flex: 1, padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#ffb300', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  infoText: { color: '#ccc', marginBottom: 5 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15 },
  actionButton: { backgroundColor: '#444', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, marginLeft: 10 },
  exportButton: { backgroundColor: '#1976d2' },
  actionText: { color: '#fff', fontWeight: 'bold' },
  logCard: { backgroundColor: '#2d2d2d', padding: 12, borderRadius: 8, marginBottom: 10 },
  logTime: { color: '#888', fontSize: 12, marginBottom: 4 },
  logError: { color: '#ff4444', fontSize: 14, fontWeight: '500' },
  logContext: { color: '#aaa', fontSize: 12, marginTop: 4 }
});
