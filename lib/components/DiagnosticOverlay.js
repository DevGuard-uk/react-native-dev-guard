"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticOverlay = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const crypto_js_1 = __importDefault(require("crypto-js"));
const DevGuardLogger_1 = require("../services/DevGuardLogger");
const DiagnosticOverlay = ({ visible, onClose, response, projectId }) => {
    const [passcode, setPasscode] = (0, react_1.useState)('');
    const [isAuthorized, setIsAuthorized] = (0, react_1.useState)(false);
    const [activeTab, setActiveTab] = (0, react_1.useState)('usage');
    const handleUnlock = () => {
        if (!response?.diagnosticPasscodeHash) {
            react_native_1.Alert.alert('Configuration Missing', 'No Diagnostic Passcode is configured in the Control Center. Please set one to enable diagnostics.');
            return;
        }
        const hashedInput = crypto_js_1.default.SHA256(passcode).toString();
        if (hashedInput === response.diagnosticPasscodeHash) {
            setIsAuthorized(true);
            DevGuardLogger_1.DevGuardLogger.enableConsoleLogs();
        }
        else {
            react_native_1.Alert.alert('Access Denied', 'Invalid passcode.');
            setPasscode('');
        }
    };
    const clearLogs = async () => {
        await DevGuardLogger_1.DevGuardLogger.clearAll();
        react_native_1.Alert.alert('Logs Cleared', 'All info and error logs have been cleared.');
    };
    const exportLogs = async () => {
        const data = await DevGuardLogger_1.DevGuardLogger.exportErrors();
        // In a real app, we would share this string or write it to a file.
        // For now, we will print it to console (since they are in dev mode if they unlock).
        console.log('Encrypted Error Vault Data:', data);
        react_native_1.Alert.alert('Exported', 'Encrypted logs have been printed to the console.');
    };
    if (!visible)
        return null;
    return ((0, jsx_runtime_1.jsx)(react_native_1.Modal, { visible: visible, animationType: "slide", transparent: false, children: (0, jsx_runtime_1.jsxs)(react_native_1.SafeAreaView, { style: styles.container, children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.header, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.headerTitle, children: "DevGuard Diagnostics" }), (0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: onClose, style: styles.closeButton, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.closeText, children: "Close" }) })] }), !isAuthorized ? ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.lockContainer, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.lockTitle, children: "Diagnostic Vault" }), (!response?.diagnosticPasscodeHash || response?.diagnosticPasscodeHash === '') ? ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.warningText, children: "No Diagnostic Passcode is configured. Please configure it in the admin portal." })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.lockSubtitle, children: "Enter passcode to view telemetry and logs" }), (0, jsx_runtime_1.jsx)(react_native_1.TextInput, { style: styles.input, secureTextEntry: true, maxLength: 6, keyboardType: "numeric", value: passcode, onChangeText: setPasscode, placeholder: "------", placeholderTextColor: "#666" }), (0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { style: styles.unlockButton, onPress: handleUnlock, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.unlockText, children: "Unlock" }) })] }))] })) : ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.content, children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.tabContainer, children: [(0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { style: [styles.tab, activeTab === 'usage' && styles.activeTab], onPress: () => setActiveTab('usage'), children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.tabText, children: "Usage" }) }), (0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { style: [styles.tab, activeTab === 'vault' && styles.activeTab], onPress: () => setActiveTab('vault'), children: (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: styles.tabText, children: ["Vault (", DevGuardLogger_1.DevGuardLogger.getErrorCount(), ")"] }) })] }), (0, jsx_runtime_1.jsx)(react_native_1.ScrollView, { style: styles.scrollContent, children: activeTab === 'usage' ? ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.section, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.sectionTitle, children: "Project Info" }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: styles.infoText, children: ["Project ID: ", projectId] }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: styles.infoText, children: ["Status: ", response?.status] }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: styles.infoText, children: ["Remote Command: ", response?.remoteCommand || 'None'] })] })) : ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.section, children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.actionRow, children: [(0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { style: styles.actionButton, onPress: clearLogs, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.actionText, children: "Clear" }) }), (0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { style: [styles.actionButton, styles.exportButton], onPress: exportLogs, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.actionText, children: "Export" }) })] }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: styles.sectionTitle, children: ["Error Vault (", DevGuardLogger_1.DevGuardLogger.getErrorCount(), ")"] }), DevGuardLogger_1.DevGuardLogger.getErrorLogs().map((log, i) => ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.logCard, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.logTime, children: log.timestamp }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.logError, children: log.error }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: styles.logContext, children: ["Context: ", log.context] })] }, i))), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.sectionTitle, { marginTop: 20 }], children: "Info Logs" }), DevGuardLogger_1.DevGuardLogger.getInfoLogs().map((log, i) => ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.logCard, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.logTime, children: log.timestamp }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.logError, children: log.error })] }, i)))] })) })] }))] }) }));
};
exports.DiagnosticOverlay = DiagnosticOverlay;
const styles = react_native_1.StyleSheet.create({
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
