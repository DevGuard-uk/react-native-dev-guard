import React, { useEffect, useRef } from 'react';
import { 
  Animated, 
  Text, 
  StyleSheet, 
  View, 
  Dimensions, 
  TouchableOpacity,
  SafeAreaView,
  Platform
} from 'react-native';

const { width } = Dimensions.get('window');

interface SecurityToastProps {
  title?: string;
  message?: string;
}

export const SecurityToast: React.FC<SecurityToastProps> = ({ 
  title = 'Security Alert', 
  message 
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container} pointerEvents="box-none">
      <Animated.View 
        style={[
          styles.toast, 
          { 
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim
          }
        ]}
      >
        <View style={styles.blurBackground} />
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⚠️</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title.toUpperCase()}</Text>
            <Text style={styles.message}>{message || 'Please review your application status.'}</Text>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 0 : 20,
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
    ...StyleSheet.absoluteFill,
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
