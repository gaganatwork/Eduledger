import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/colors';

export default function Index() {
  const { user, isLoggedIn, isVerified, hasProfile, loading, profileReady } = useAuth();

  // Wait for both auth AND profile check to complete before redirecting
  if (loading || !profileReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!user)        return <Redirect href="/login" />;
  if (!isVerified)  return <Redirect href="/verify-email" />;
  if (!hasProfile)  return <Redirect href="/setup-profile" />;
  return <Redirect href="/(tabs)/dashboard" />;
}
