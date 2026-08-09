import React, { createContext, useContext, useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const AuthContext = createContext(null);

const formatAuthError = (err) => {
  const code = err?.code || '';
  const messages = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'auth/operation-not-allowed': 'Email/password sign-in is not enabled in Firebase.',
  };
  return messages[code] || err?.message || 'Something went wrong. Please try again.';
};

const loadProfile = async (uid) => {
  const doc = await firestore().collection('users').doc(uid).get();
  return doc.exists ? doc.data() : null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // profileReady: true once we've finished checking Firestore for the profile
  // Prevents flash to setup-profile while profile is still loading
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      setProfileReady(false); // reset on every auth state change
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const p = await loadProfile(firebaseUser.uid);
          setProfile(p);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setProfileReady(true);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUp = async (email, password) => {
    try {
      const cred = await auth().createUserWithEmailAndPassword(email, password);
      await cred.user.sendEmailVerification();
      return cred.user;
    } catch (err) {
      throw new Error(formatAuthError(err));
    }
  };

  const signIn = async (email, password) => {
    try {
      const cred = await auth().signInWithEmailAndPassword(email, password);
      if (!cred.user.emailVerified) {
        await auth().signOut();
        throw new Error('Please verify your email before signing in. Check your inbox.');
      }
      // Load profile eagerly so it's ready before navigation happens
      const userProfile = await loadProfile(cred.user.uid);
      setProfile(userProfile);
      setProfileReady(true);
      setUser(cred.user);
      return cred.user;
    } catch (err) {
      if (err.message?.includes('verify your email')) throw err;
      throw new Error(formatAuthError(err));
    }
  };

  const logout = async () => {
    await auth().signOut();
    setProfile(null);
    setProfileReady(false);
  };

  const saveProfile = async (data) => {
    const currentUser = auth().currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    const profileData = {
      ...data,
      uid: currentUser.uid,
      email: currentUser.email,
      createdAt: new Date().toISOString(),
    };
    await firestore().collection('users').doc(currentUser.uid).set(profileData);
    setProfile(profileData);
    setProfileReady(true);
  };

  const forgotPassword = async (email) => {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (err) {
      throw new Error(formatAuthError(err));
    }
  };

  const reloadUser = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return null;
    await currentUser.reload();
    const refreshed = auth().currentUser;
    setUser(refreshed);
    return refreshed;
  };

  const currentUser = auth().currentUser;
  const emailVerified = currentUser?.emailVerified ?? user?.emailVerified ?? false;

  // Only derive these after profile check is complete — prevents flash
  const isLoggedIn  = profileReady && !!currentUser && emailVerified && !!profile;
  const isVerified  = !!currentUser && emailVerified;
  const hasProfile  = profileReady && !!profile;

  return (
    <AuthContext.Provider value={{
      user: currentUser ?? user,
      profile,
      loading,
      profileReady,
      isLoggedIn,
      isVerified,
      hasProfile,
      signUp,
      signIn,
      logout,
      saveProfile,
      forgotPassword,
      reloadUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
