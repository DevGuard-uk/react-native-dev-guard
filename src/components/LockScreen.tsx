import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  Linking, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import { ContactButton } from './ContactButton';

const { width, height } = Dimensions.get('window');

interface LockScreenProps {
  status: string;
  title?: string;
  message?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  allowUnlock?: boolean;
  onUnlock: (key: string) => Promise<boolean>;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  status,
  title,
  message,
  contactEmail = '',
  contactPhone = '',
  contactWhatsapp = '',
  allowUnlock = true,
  onUnlock
}: LockScreenProps) => {
  const [unlockKey, setUnlockKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnlock, setShowUnlock] = useState(false);


  const handleUnlock = async () => {
    if (!unlockKey.trim()) return;
    setLoading(true);
    setError(null);
    const success = await onUnlock(unlockKey.trim());
    if (!success) {
      setError('Invalid unlock key. Please try again.');
      setLoading(false);
    }
  };

  const openUrl = (url: string) => {
    console.log("DevGuard: Attempting to open URL:", url);
    Linking.openURL(url).catch(err => {
      console.error("DevGuard: Failed to open URL:", url, err);
      Alert.alert("Error", "Could not open the contact application. Please make sure it is installed and configured.");
    });
  };

  return (
    <View style={styles.container}>
      {/* Background Mesh Elements */}
      <View pointerEvents="none" style={[styles.blob, styles.blob1]} />
      <View pointerEvents="none" style={[styles.blob, styles.blob2]} />
      <View pointerEvents="none" style={[styles.blob, styles.blob3]} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.glassCard}>
            <View style={styles.iconContainer}>
              <Text style={styles.lockIcon}>🛡️</Text>
            </View>

            <Text style={styles.title}>
              {(title || (
                status === 'LOCKED' ? 'Access Restricted' : 
                status === 'WARNING' ? 'Security Warning' :
                'License Expired'
              )).toUpperCase()}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.message}>
              {message || 'This application has been remotely locked by the developer.'}
            </Text>

            <View style={styles.actions}>
              {contactWhatsapp ? (
                <ContactButton 
                  label="WhatsApp Support" 
                  color="#25D366" 
                  icon="💬"
                  onPress={() => openUrl(`https://wa.me/${contactWhatsapp.replace(/[^0-9]/g, '')}`)}
                />
              ) : null}
              
              {contactEmail ? (
                <ContactButton 
                  label="Email Support" 
                  color="#D32F2F" 
                  icon="📧"
                  onPress={() => openUrl(`mailto:${contactEmail.trim()}`)}
                />
              ) : null}

              {contactPhone ? (
                <ContactButton 
                  label="Call Support" 
                  color="rgba(255, 255, 255, 0.1)" 
                  icon="📞"
                  onPress={() => openUrl(`tel:${contactPhone.replace(/[^\d+]/g, '')}`)}
                />
              ) : null}
            </View>

            {allowUnlock && (
              <View style={styles.unlockSection}>
                {!showUnlock ? (
                  <TouchableOpacity onPress={() => setShowUnlock(true)}>
                    <Text style={styles.unlockToggleText}>🔑 Enter Unlock Key</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="License Key"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={unlockKey}
                      onChangeText={setUnlockKey}
                      autoCapitalize="none"
                      secureTextEntry
                    />
                    {error && <Text style={styles.errorText}>{error}</Text>}
                    
                    <View style={styles.inputActions}>
                      <TouchableOpacity 
                        style={styles.cancelButton} 
                        onPress={() => {
                          setShowUnlock(false);
                          setError(null);
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.unlockButton} 
                        onPress={handleUnlock}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color="#000" size="small" />
                        ) : (
                          <Text style={styles.unlockButtonText}>Unlock Now</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={styles.footer} 
            onPress={() => openUrl('https://antssolution.com/')}
          >
            <Text style={styles.footerLabel}>Powered by</Text>
            <Text style={styles.footerBrand}>ANTS SOLUTION</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    opacity: 0.15,
  },
  blob1: {
    top: -width * 0.2,
    right: -width * 0.2,
    backgroundColor: '#D32F2F',
  },
  blob2: {
    bottom: -width * 0.1,
    left: -width * 0.3,
    backgroundColor: '#B71C1C',
  },
  blob3: {
    top: height * 0.3,
    right: -width * 0.4,
    backgroundColor: '#FF5252',
    width: width * 0.6,
    height: width * 0.6,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  glassCard: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 32,
    padding: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.2)',
  },
  lockIcon: {
    fontSize: 48,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 12,
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: '#D32F2F',
    borderRadius: 2,
    marginBottom: 16,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actions: {
    width: '100%',
    marginBottom: 24,
  },
  unlockSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  unlockToggleText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    width: '100%',
    gap: 12,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 12,
    textAlign: 'center',
  },
  inputActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600',
  },
  unlockButton: {
    flex: 2,
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerLabel: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 4,
  },
  footerBrand: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
