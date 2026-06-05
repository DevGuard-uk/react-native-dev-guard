"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityToast = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const { width } = react_native_1.Dimensions.get('window');
const SecurityToast = ({ title = 'Security Alert', message }) => {
    const slideAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(-100)).current;
    const opacityAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    (0, react_1.useEffect)(() => {
        react_native_1.Animated.parallel([
            react_native_1.Animated.timing(slideAnim, {
                toValue: 20,
                duration: 500,
                useNativeDriver: true,
            }),
            react_native_1.Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);
    return ((0, jsx_runtime_1.jsx)(react_native_1.SafeAreaView, { style: styles.container, pointerEvents: "box-none", children: (0, jsx_runtime_1.jsxs)(react_native_1.Animated.View, { style: [
                styles.toast,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim
                }
            ], children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.blurBackground }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.content, children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.iconContainer, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.icon, children: "\u26A0\uFE0F" }) }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.textContainer, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.title, children: title.toUpperCase() }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.message, children: message || 'Please review your application status.' })] })] })] }) }));
};
exports.SecurityToast = SecurityToast;
const styles = react_native_1.StyleSheet.create({
    container: {
        position: 'absolute',
        top: react_native_1.Platform.OS === 'ios' ? 0 : 20,
        left: 0,
        right: 0,
        zIndex: 9999,
        alignItems: 'center',
    },
    toast: {
        width: width - 32,
        backgroundColor: 'rgba(25, 25, 25, 0.9)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 152, 0, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
        overflow: 'hidden',
    },
    blurBackground: {
        ...react_native_1.StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    icon: {
        fontSize: 20,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#FF9800',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 2,
    },
    message: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        lineHeight: 18,
    }
});
