import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  useWindowDimensions,
  SafeAreaView,
} from 'react-native';
import { ContactButton } from './ContactButton';
import { LockScreenBranding, resolveBrandingFooter } from '../types/branding';
import { buildMailtoUrl, buildTelUrl, buildWhatsAppUrl } from '../utils/contactUrls';
import { Obf } from '../internal/obf';

const UNLOCK_TOGGLE_COLOR = '#fcd34d';

interface LockScreenProps {
  status: string;
  title?: string;
  message?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  allowUnlock?: boolean;
  branding?: LockScreenBranding | null;
  onUnlock: (key: string) => Promise<boolean>;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  status,
  title,
  message,
  contactEmail = '',
  contactPhone = '',
  contactWhatsapp = '',
  allowUnlock = false,
  branding,
  onUnlock,
}: LockScreenProps) => {
  const { width, height } = useWindowDimensions();
  const [unlockKey, setUnlockKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnlock, setShowUnlock] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const footer = useMemo(() => resolveBrandingFooter(branding), [branding]);

  const blobStyles = useMemo(
    () => ({
      blob1: {
        top: -width * 0.2,
        right: -width * 0.2,
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        backgroundColor: footer.primaryColor,
      },
      blob2: {
        bottom: -width * 0.1,
        left: -width * 0.3,
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        backgroundColor: footer.accentColor,
      },
      blob3: {
        top: height * 0.3,
        right: -width * 0.4,
        width: width * 0.6,
        height: width * 0.6,
        borderRadius: width * 0.3,
        backgroundColor: footer.primaryColor,
      },
    }),
    [footer.accentColor, footer.primaryColor, height, width],
  );

  const themedStyles = useMemo(
    () =>
      StyleSheet.create({
        iconContainer: {
          backgroundColor: `${footer.primaryColor}22`,
          borderColor: `${footer.primaryColor}44`,
        },
        divider: { backgroundColor: footer.primaryColor },
      }),
    [footer.primaryColor],
  );

  const handleUnlock = async () => {
    if (!unlockKey.trim() || loading) return;
    setLoading(true);
    setError(null);
    const success = await onUnlock(unlockKey.trim());
    if (!success) {
      setError(Obf.invalidUnlockKey);
      setLoading(false);
    }
  };

  const closeUnlock = () => {
    if (loading) return;
    setShowUnlock(false);
    setError(null);
    setUnlockKey('');
  };

  const openUrl = (url: string) => {
    if (!url) return;
    Linking.openURL(url).catch((err) => {
      console.error('DevGuard: Failed to open URL:', url, err);
      Alert.alert('Error', Obf.contactOpenError);
    });
  };

  const defaultTitle =
    status === 'LOCKED'
      ? 'Access Restricted'
      : status === 'WARNING'
        ? 'Security Warning'
        : 'License Expired';

  const whatsappUrl = buildWhatsAppUrl(contactWhatsapp);
  const mailtoUrl = buildMailtoUrl(contactEmail);
  const telUrl = buildTelUrl(contactPhone);

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={[styles.blob, blobStyles.blob1]} />
      <View pointerEvents="none" style={[styles.blob, blobStyles.blob2]} />
      <View pointerEvents="none" style={[styles.blob, blobStyles.blob3]} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.glassCard}>
              <View style={[styles.iconContainer, themedStyles.iconContainer]}>
                {branding?.logoUrl && !logoFailed ? (
                  <Image
                    source={{ uri: branding.logoUrl }}
                    style={styles.logoImage}
                    resizeMode="contain"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <Text style={styles.lockIcon}>🛡️</Text>
                )}
              </View>

              <Text style={styles.title}>{(title || defaultTitle).toUpperCase()}</Text>
              <View style={[styles.divider, themedStyles.divider]} />
              <Text style={styles.message}>
                {message || Obf.defaultLockMessage}
              </Text>

              {!showUnlock && (
                <View style={styles.actions}>
                  {whatsappUrl ? (
                    <ContactButton
                      label={Obf.whatsappSupport}
                      color="#25D366"
                      icon="💬"
                      onPress={() => openUrl(whatsappUrl)}
                    />
                  ) : null}

                  {mailtoUrl ? (
                    <ContactButton
                      label={Obf.emailSupport}
                      color={footer.primaryColor}
                      icon="📧"
                      onPress={() => openUrl(mailtoUrl)}
                    />
                  ) : null}

                  {telUrl ? (
                    <ContactButton
                      label={Obf.callSupport}
                      color="rgba(255, 255, 255, 0.1)"
                      icon="📞"
                      onPress={() => openUrl(telUrl)}
                    />
                  ) : null}

                  {allowUnlock ? (
                    <TouchableOpacity
                      style={styles.unlockToggle}
                      onPress={() => setShowUnlock(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Enter unlock key"
                    >
                      <Text style={styles.unlockToggleText}>{Obf.enterUnlockKey}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              {showUnlock && allowUnlock && (
                <View style={styles.unlockSection}>
                  <View style={styles.inputContainer}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    <TextInput
                      style={styles.input}
                      placeholder={Obf.licenseKeyHint}
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={unlockKey}
                      onChangeText={setUnlockKey}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleUnlock}
                      editable={!loading}
                    />

                    <View style={styles.inputActions}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={closeUnlock}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel unlock"
                      >
                        <Text
                          style={[
                            styles.cancelButtonText,
                            loading && styles.cancelButtonTextDisabled,
                          ]}
                        >
                          {Obf.cancelLabel}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.unlockButton, loading && styles.unlockButtonDisabled]}
                        onPress={handleUnlock}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel="Unlock application"
                      >
                        {loading ? (
                          <ActivityIndicator color="#000" size="small" />
                        ) : (
                          <Text style={styles.unlockButtonText}>{Obf.unlockLabel}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {!footer.hidePoweredBy && (
              <TouchableOpacity
                style={styles.footer}
                onPress={() => openUrl(footer.url)}
                accessibilityRole="link"
                accessibilityLabel={`${footer.label} ${footer.brand}`}
              >
                <Text style={styles.footerLabel}>{footer.label}</Text>
                <Text style={styles.footerBrand}>{footer.brand.toUpperCase()}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
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
    opacity: 0.15,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  logoImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
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
  },
  unlockToggle: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  unlockToggleText: {
    color: UNLOCK_TOGGLE_COLOR,
    fontSize: 13,
    fontWeight: '600',
  },
  unlockSection: {
    width: '100%',
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
    fontSize: 13,
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
  cancelButtonTextDisabled: {
    opacity: 0.4,
  },
  unlockButton: {
    flex: 2,
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockButtonDisabled: {
    opacity: 0.85,
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
