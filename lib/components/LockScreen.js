"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockScreen = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const ContactButton_1 = require("./ContactButton");
const { width, height } = react_native_1.Dimensions.get('window');
const LockScreen = ({ status, title, message, contactEmail = '', contactPhone = '', contactWhatsapp = '', allowUnlock = true, onUnlock }) => {
    const [unlockKey, setUnlockKey] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [showUnlock, setShowUnlock] = (0, react_1.useState)(false);
    const handleUnlock = async () => {
        if (!unlockKey.trim())
            return;
        setLoading(true);
        setError(null);
        const success = await onUnlock(unlockKey.trim());
        if (!success) {
            setError('Invalid unlock key. Please try again.');
            setLoading(false);
        }
    };
    const openUrl = (url) => {
        console.log("DevGuard: Attempting to open URL:", url);
        react_native_1.Linking.openURL(url).catch(err => {
            console.error("DevGuard: Failed to open URL:", url, err);
            react_native_1.Alert.alert("Error", "Could not open the contact application. Please make sure it is installed and configured.");
        });
    };
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.container, children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { pointerEvents: "none", style: [styles.blob, styles.blob1] }), (0, jsx_runtime_1.jsx)(react_native_1.View, { pointerEvents: "none", style: [styles.blob, styles.blob2] }), (0, jsx_runtime_1.jsx)(react_native_1.View, { pointerEvents: "none", style: [styles.blob, styles.blob3] }), (0, jsx_runtime_1.jsx)(react_native_1.SafeAreaView, { style: styles.safeArea, children: (0, jsx_runtime_1.jsxs)(react_native_1.KeyboardAvoidingView, { behavior: react_native_1.Platform.OS === 'ios' ? 'padding' : 'height', style: styles.keyboardView, children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.glassCard, children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.iconContainer, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.lockIcon, children: "\uD83D\uDEE1\uFE0F" }) }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.title, children: (title || (status === 'LOCKED' ? 'Access Restricted' :
                                        status === 'WARNING' ? 'Security Warning' :
                                            'License Expired')).toUpperCase() }), (0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.divider }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.message, children: message || 'This application has been remotely locked by the developer.' }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.actions, children: [contactWhatsapp ? ((0, jsx_runtime_1.jsx)(ContactButton_1.ContactButton, { label: "WhatsApp Support", color: "#25D366", icon: "\uD83D\uDCAC", onPress: () => openUrl(`https://wa.me/${contactWhatsapp.replace(/[^0-9]/g, '')}`) })) : null, contactEmail ? ((0, jsx_runtime_1.jsx)(ContactButton_1.ContactButton, { label: "Email Support", color: "#D32F2F", icon: "\uD83D\uDCE7", onPress: () => openUrl(`mailto:${contactEmail.trim()}`) })) : null, contactPhone ? ((0, jsx_runtime_1.jsx)(ContactButton_1.ContactButton, { label: "Call Support", color: "rgba(255, 255, 255, 0.1)", icon: "\uD83D\uDCDE", onPress: () => openUrl(`tel:${contactPhone.replace(/[^\d+]/g, '')}`) })) : null] }), allowUnlock && ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.unlockSection, children: !showUnlock ? ((0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: () => setShowUnlock(true), children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.unlockToggleText, children: "\uD83D\uDD11 Enter Unlock Key" }) })) : ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.inputContainer, children: [(0, jsx_runtime_1.jsx)(react_native_1.TextInput, { style: styles.input, placeholder: "License Key", placeholderTextColor: "rgba(255, 255, 255, 0.4)", value: unlockKey, onChangeText: setUnlockKey, autoCapitalize: "none", secureTextEntry: true }), error && (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.errorText, children: error }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.inputActions, children: [(0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { style: styles.cancelButton, onPress: () => {
                                                            setShowUnlock(false);
                                                            setError(null);
                                                        }, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.cancelButtonText, children: "Cancel" }) }), (0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { style: styles.unlockButton, onPress: handleUnlock, disabled: loading, children: loading ? ((0, jsx_runtime_1.jsx)(react_native_1.ActivityIndicator, { color: "#000", size: "small" })) : ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.unlockButtonText, children: "Unlock Now" })) })] })] })) }))] }), (0, jsx_runtime_1.jsxs)(react_native_1.TouchableOpacity, { style: styles.footer, onPress: () => openUrl('https://antssolution.com/'), children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.footerLabel, children: "Powered by" }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.footerBrand, children: "ANTS SOLUTION" })] })] }) })] }));
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
