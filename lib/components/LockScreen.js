"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockScreen = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const ContactButton_1 = require("./ContactButton");
const branding_1 = require("../types/branding");
const contactUrls_1 = require("../utils/contactUrls");
const obf_1 = require("../internal/obf");
const UNLOCK_TOGGLE_COLOR = '#fcd34d';
const LockScreen = ({ status, title, message, contactEmail = '', contactPhone = '', contactWhatsapp = '', allowUnlock = false, branding, onUnlock, }) => {
    const { width, height } = (0, react_native_1.useWindowDimensions)();
    const [unlockKey, setUnlockKey] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [showUnlock, setShowUnlock] = (0, react_1.useState)(false);
    const [logoFailed, setLogoFailed] = (0, react_1.useState)(false);
    const footer = (0, react_1.useMemo)(() => (0, branding_1.resolveBrandingFooter)(branding), [branding]);
    const blobStyles = (0, react_1.useMemo)(() => ({
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
    }), [footer.accentColor, footer.primaryColor, height, width]);
    const themedStyles = (0, react_1.useMemo)(() => react_native_1.StyleSheet.create({
        iconContainer: {
            backgroundColor: `${footer.primaryColor}22`,
            borderColor: `${footer.primaryColor}44`,
        },
        divider: { backgroundColor: footer.primaryColor },
    }), [footer.primaryColor]);
    const handleUnlock = async () => {
        if (!unlockKey.trim() || loading)
            return;
        setLoading(true);
        setError(null);
        const success = await onUnlock(unlockKey.trim());
        if (!success) {
            setError(obf_1.Obf.invalidUnlockKey);
            setLoading(false);
        }
    };
    const closeUnlock = () => {
        if (loading)
            return;
        setShowUnlock(false);
        setError(null);
        setUnlockKey('');
    };
    const openUrl = (url) => {
        if (!url)
            return;
        react_native_1.Linking.openURL(url).catch((err) => {
            console.error('DevGuard: Failed to open URL:', url, err);
            react_native_1.Alert.alert('Error', obf_1.Obf.contactOpenError);
        });
    };
    const defaultTitle = status === 'LOCKED'
        ? 'Access Restricted'
        : status === 'WARNING'
            ? 'Security Warning'
            : 'License Expired';
    const whatsappUrl = (0, contactUrls_1.buildWhatsAppUrl)(contactWhatsapp);
    const mailtoUrl = (0, contactUrls_1.buildMailtoUrl)(contactEmail);
    const telUrl = (0, contactUrls_1.buildTelUrl)(contactPhone);
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.container, children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { pointerEvents: "none", style: [styles.blob, blobStyles.blob1] }), (0, jsx_runtime_1.jsx)(react_native_1.View, { pointerEvents: "none", style: [styles.blob, blobStyles.blob2] }), (0, jsx_runtime_1.jsx)(react_native_1.View, { pointerEvents: "none", style: [styles.blob, blobStyles.blob3] }), (0, jsx_runtime_1.jsx)(react_native_1.SafeAreaView, { style: styles.safeArea, children: (0, jsx_runtime_1.jsxs)(react_native_1.KeyboardAvoidingView, { behavior: react_native_1.Platform.OS === 'ios' ? 'padding' : 'height', style: styles.keyboardView, children: [(0, jsx_runtime_1.jsx)(react_native_1.ScrollView, { contentContainerStyle: styles.scrollContent, keyboardShouldPersistTaps: "handled", showsVerticalScrollIndicator: false, children: (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.glassCard, children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: [styles.iconContainer, themedStyles.iconContainer], children: branding?.logoUrl && !logoFailed ? ((0, jsx_runtime_1.jsx)(react_native_1.Image, { source: { uri: branding.logoUrl }, style: styles.logoImage, resizeMode: "contain", onError: () => setLogoFailed(true) })) : ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.lockIcon, children: "\uD83D\uDEE1\uFE0F" })) }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.title, children: (title || defaultTitle).toUpperCase() }), (0, jsx_runtime_1.jsx)(react_native_1.View, { style: [styles.divider, themedStyles.divider] }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.message, children: message || obf_1.Obf.defaultLockMessage }), !showUnlock && ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.actions, children: [whatsappUrl ? ((0, jsx_runtime_1.jsx)(ContactButton_1.ContactButton, { label: obf_1.Obf.whatsappSupport, color: "#25D366", icon: "\uD83D\uDCAC", onPress: () => openUrl(whatsappUrl) })) : null, mailtoUrl ? ((0, jsx_runtime_1.jsx)(ContactButton_1.ContactButton, { label: obf_1.Obf.emailSupport, color: footer.primaryColor, icon: "\uD83D\uDCE7", onPress: () => openUrl(mailtoUrl) })) : null, telUrl ? ((0, jsx_runtime_1.jsx)(ContactButton_1.ContactButton, { label: obf_1.Obf.callSupport, color: "rgba(255, 255, 255, 0.1)", icon: "\uD83D\uDCDE", onPress: () => openUrl(telUrl) })) : null, allowUnlock ? ((0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { style: styles.unlockToggle, onPress: () => setShowUnlock(true), accessibilityRole: "button", accessibilityLabel: "Enter unlock key", children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.unlockToggleText, children: obf_1.Obf.enterUnlockKey }) })) : null] })), showUnlock && allowUnlock && ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.unlockSection, children: (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.inputContainer, children: [error ? (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.errorText, children: error }) : null, (0, jsx_runtime_1.jsx)(react_native_1.TextInput, { style: styles.input, placeholder: obf_1.Obf.licenseKeyHint, placeholderTextColor: "rgba(255, 255, 255, 0.4)", value: unlockKey, onChangeText: setUnlockKey, autoCapitalize: "none", autoCorrect: false, autoFocus: true, secureTextEntry: true, returnKeyType: "done", onSubmitEditing: handleUnlock, editable: !loading }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.inputActions, children: [(0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { style: styles.cancelButton, onPress: closeUnlock, disabled: loading, accessibilityRole: "button", accessibilityLabel: "Cancel unlock", children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [
                                                                    styles.cancelButtonText,
                                                                    loading && styles.cancelButtonTextDisabled,
                                                                ], children: obf_1.Obf.cancelLabel }) }), (0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { style: [styles.unlockButton, loading && styles.unlockButtonDisabled], onPress: handleUnlock, disabled: loading, accessibilityRole: "button", accessibilityLabel: "Unlock application", children: loading ? ((0, jsx_runtime_1.jsx)(react_native_1.ActivityIndicator, { color: "#000", size: "small" })) : ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.unlockButtonText, children: obf_1.Obf.unlockLabel })) })] })] }) }))] }) }), !footer.hidePoweredBy && ((0, jsx_runtime_1.jsxs)(react_native_1.TouchableOpacity, { style: styles.footer, onPress: () => openUrl(footer.url), accessibilityRole: "link", accessibilityLabel: `${footer.label} ${footer.brand}`, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.footerLabel, children: footer.label }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.footerBrand, children: footer.brand.toUpperCase() })] }))] }) })] }));
};
exports.LockScreen = LockScreen;
const styles = react_native_1.StyleSheet.create({
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
        paddingTop: 8,
        paddingBottom: 16,
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
