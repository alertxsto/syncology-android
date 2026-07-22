import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Animated,
  useAnimatedValue,
} from 'react-native';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, Radius} from '../theme/spacing';
import {useAuthContext} from '../store/auth';
import {statusCodes} from '@react-native-google-signin/google-signin';

// Syncology logo — tiga ellipse berputar, mengikuti versi desktop
function SyncologyLogo() {
  return (
    <View style={styles.logoContainer}>
      <View style={styles.logoOuter}>
        <View style={styles.logoRing1} />
        <View style={styles.logoRing2} />
        <View style={styles.logoDot} />
      </View>
    </View>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIconWrapper}>
      <Text style={styles.googleIconG}>G</Text>
    </View>
  );
}

export default function LoginScreen() {
  const {login} = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login();
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
        setError('Login dibatalkan');
      } else if (e?.code === statusCodes.IN_PROGRESS) {
        // abaikan
      } else if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services tidak tersedia di perangkat ini');
      } else {
        setError(e?.message ?? 'Login gagal. Coba lagi.');
      }
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg0} />

      {/* Background orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      {/* Grid dots */}
      <View style={styles.gridOverlay} />

      <View style={styles.card}>
        <SyncologyLogo />

        <Text style={styles.title}>Syncology</Text>

        <View style={styles.divider} />

        <Text style={styles.subtitle}>
          Platform manajemen tugas tim{'\n'}berbasis akuntabilitas
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.btnGoogle, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.75}>
          {loading ? (
            <ActivityIndicator color={Colors.text1} size="small" />
          ) : (
            <GoogleIcon />
          )}
          <Text style={styles.btnLabel}>
            {loading ? 'Membuka akun Google...' : 'Sign in with Google'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Dengan masuk, kamu menyetujui penggunaan data{'\n'}
          akun Google untuk autentikasi di aplikasi ini.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb1: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  orb2: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(99,102,241,0.10)',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
  },
  card: {
    width: 320,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius['2xl'],
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  logoContainer: {
    width: 64,
    height: 64,
    marginBottom: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOuter: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing1: {
    position: 'absolute',
    width: 44,
    height: 20,
    borderRadius: 22,
    borderWidth: 1.8,
    borderColor: Colors.blueLight,
  },
  logoRing2: {
    position: 'absolute',
    width: 44,
    height: 20,
    borderRadius: 22,
    borderWidth: 1.8,
    borderColor: Colors.sky,
    transform: [{rotate: '60deg'}],
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.blueLight,
  },
  title: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.extrabold,
    color: Colors.text1,
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: Colors.blue,
    borderRadius: 2,
    marginBottom: Spacing.xl,
  },
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.text2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing['2xl'],
  },
  errorBox: {
    backgroundColor: Colors.redDim,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.base,
    width: '100%',
  },
  errorText: {
    color: Colors.red,
    fontSize: Typography.sm,
    textAlign: 'center',
  },
  btnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnLabel: {
    color: Colors.text1,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    letterSpacing: -0.2,
  },
  googleIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconG: {
    fontSize: 12,
    fontWeight: Typography.bold,
    color: '#4285F4',
    lineHeight: 16,
  },
  note: {
    fontSize: 11,
    color: Colors.text3,
    textAlign: 'center',
    lineHeight: 18,
  },
});
