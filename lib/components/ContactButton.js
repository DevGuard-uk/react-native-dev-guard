"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactButton = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const ContactButton = ({ label, onPress, color, icon }) => {
    return ((0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { style: [styles.button, { backgroundColor: color }], onPress: onPress, activeOpacity: 0.8, children: (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: styles.text, children: [icon ? `${icon} ` : '', label] }) }));
};
exports.ContactButton = ContactButton;
const styles = react_native_1.StyleSheet.create({
    button: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
