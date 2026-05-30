import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  sessionToken: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  sendVerificationCode: (email: string) => Promise<{ error: string | null }>;
  verifyCode: (email: string, code: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function generateSessionToken(): string {
  return crypto.randomUUID() + '-' + Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  };

  const createOrUpdateSession = async (userId: string) => {
    const token = generateSessionToken();
    const userAgent = navigator.userAgent;

    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    await supabase.from('user_sessions').insert({
      user_id: userId,
      session_token: token,
      user_agent: userAgent,
      device_fingerprint: userAgent,
      is_active: true,
    });

    localStorage.setItem('wr_session_token', token);
    setSessionToken(token);
    return token;
  };

  const checkSessionValid = async (userId: string): Promise<boolean> => {
    const storedToken = localStorage.getItem('wr_session_token');
    if (!storedToken) return false;

    const { data } = await supabase
      .from('user_sessions')
      .select('is_active')
      .eq('user_id', userId)
      .eq('session_token', storedToken)
      .maybeSingle();

    if (data?.is_active) {
      await supabase
        .from('user_sessions')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('session_token', storedToken);
      setSessionToken(storedToken);
      return true;
    }

    return false;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkSessionValid(session.user.id).then((valid) => {
          if (!valid && session) {
            supabase.auth.signOut();
          }
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setSessionToken(null);
      }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('wr_session_token');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };

    // Send welcome email (fire-and-forget)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey && data.user) {
      fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ type: 'welcome', to: email, data: { name: fullName.split(' ')[0] } }),
      }).catch(() => {});
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    if (data.user) {
      // Check if user is blocked before creating session
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_blocked')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileData?.is_blocked) {
        await supabase.auth.signOut();
        return { error: 'חשבון זה חסום. לפרטים פנה לתמיכה.' };
      }

      await createOrUpdateSession(data.user.id);
    }

    return { error: null };
  };

  const sendVerificationCode = async (email: string): Promise<{ error: string | null }> => {
    // Rate limit: max 5 OTP requests per email per hour
    const { data: allowed } = await supabase.rpc('check_otp_rate_limit', { p_email: email });
    if (!allowed) {
      return { error: 'שלחת יותר מדי קודות לאחרונה. נסה שוב עוד שעה.' };
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    if (user) {
      await supabase.from('verification_codes').insert({
        user_id: user.id,
        email,
        code,
        purpose: 'email_verification',
        expires_at: expiresAt,
      });
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey) {
      fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ type: 'otp', to: email, data: { code } }),
      }).catch(() => {});
    }

    return { error: null };
  };

  const verifyCode = async (email: string, code: string): Promise<{ error: string | null }> => {
    if (!user) return { error: 'לא מחובר' };

    const { data } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('email', email)
      .eq('code', code)
      .eq('purpose', 'email_verification')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      return { error: 'קוד שגוי או פג תוקף. נסה שוב.' };
    }

    await supabase.from('verification_codes').update({ used_at: new Date().toISOString() }).eq('id', data.id);
    await supabase.from('profiles').update({ is_email_verified: true }).eq('id', user.id);
    await fetchProfile(user.id);
    return { error: null };
  };

  const signOut = async () => {
    if (user) {
      const token = localStorage.getItem('wr_session_token');
      if (token) {
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('session_token', token);
      }
    }
    localStorage.removeItem('wr_session_token');
    await supabase.auth.signOut();
  };

  const updatePassword = async (newPassword: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    // Invalidate all sessions on password change
    if (user) {
      await supabase.from('user_sessions').update({ is_active: false }).eq('user_id', user.id);
      localStorage.removeItem('wr_session_token');
      setSessionToken(null);
    }
    return { error: null };
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'לא מחובר' };
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) return { error: error.message };
    await fetchProfile(user.id);
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, sessionToken,
      signUp, signIn, signOut,
      refreshProfile, updateProfile, updatePassword,
      sendVerificationCode, verifyCode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
