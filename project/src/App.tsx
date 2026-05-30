import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Subscription from './pages/Subscription';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import Landing from './pages/Landing';
import WhaleActivity from './pages/WhaleActivity';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import Sidebar from './components/Sidebar';
import AccessibilityWidget from './components/AccessibilityWidget';
import SupportBot from './components/SupportBot';
import OnboardingModal, { shouldShowOnboarding } from './components/OnboardingModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { readImpersonation, clearImpersonation, ImpersonationData } from './lib/impersonation';
import { Eye, X, AlertTriangle } from 'lucide-react';

type AuthScreen = 'login' | 'register';
type AppPage = 'dashboard' | 'subscription' | 'profile' | 'whales';
type RootView = 'landing' | 'app';

function ImpersonationBanner({ imp, onExit }: { imp: ImpersonationData; onExit: () => void }) {
  const [minutesLeft, setMinutesLeft] = useState(
    Math.max(0, Math.floor((30 * 60 * 1000 - (Date.now() - imp.timestamp)) / 60000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, Math.floor((30 * 60 * 1000 - (Date.now() - imp.timestamp)) / 60000));
      setMinutesLeft(left);
      if (left === 0) onExit();
    }, 30000);
    return () => clearInterval(interval);
  }, [imp.timestamp, onExit]);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-black flex items-center justify-between px-4 py-2.5 shadow-lg" dir="rtl">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Eye className="w-4 h-4" />
        <span>מצב צפייה אדמין: <strong>{imp.fullName}</strong> ({imp.email})</span>
        <span className="bg-black/20 rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {minutesLeft} דק' נותרו
        </span>
      </div>
      <button
        onClick={onExit}
        className="flex items-center gap-1.5 bg-black/20 hover:bg-black/30 rounded-lg px-3 py-1 text-sm font-bold transition"
      >
        <X className="w-3.5 h-3.5" />
        יציאה
      </button>
    </div>
  );
}

function AppInner() {
  const { user, profile, loading, sendVerificationCode } = useAuth();
  const [rootView, setRootView] = useState<RootView>('landing');
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [page, setPage] = useState<AppPage>('dashboard');
  const [adminAuthed, setAdminAuthed] = useState(
    () => sessionStorage.getItem('wr_admin_auth') === 'true'
  );
  const [verificationSent, setVerificationSent] = useState(false);
  const [impersonation, setImpersonation] = useState<ImpersonationData | null>(null);
  const [impersonationLoaded, setImpersonationLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Send verification code once when user is logged in but not verified
  useEffect(() => {
    if (user && profile && !profile.is_email_verified && !verificationSent) {
      setVerificationSent(true);
      sendVerificationCode(user.email!).catch(() => {});
    }
    if (user && profile?.is_email_verified && shouldShowOnboarding()) {
      setShowOnboarding(true);
    }
  }, [user?.id, profile?.is_email_verified, verificationSent, sendVerificationCode]);

  const isAdminRoute = window.location.hash === '#admin';
  const isImpersonateRoute = window.location.hash === '#app-impersonate';
  const isResetPasswordRoute = window.location.hash === '#reset-password';

  // Load signed impersonation data asynchronously
  useEffect(() => {
    if (isImpersonateRoute) {
      readImpersonation().then(data => {
        setImpersonation(data);
        setImpersonationLoaded(true);
      });
    } else {
      setImpersonationLoaded(true);
    }
  }, [isImpersonateRoute]);

  const exitImpersonation = () => {
    clearImpersonation();
    try {
      window.close();
      setTimeout(() => {
        window.location.hash = '';
        window.location.reload();
      }, 300);
    } catch {
      window.location.hash = '';
      window.location.reload();
    }
  };

  if (loading || !impersonationLoaded) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">טוען...</p>
        </div>
      </div>
    );
  }

  if (isResetPasswordRoute) {
    return <ResetPassword onDone={() => { window.location.hash = ''; window.location.reload(); }} />;
  }

  if (isImpersonateRoute) {
    if (impersonation) {
      return (
        <>
          <ImpersonationBanner imp={impersonation} onExit={exitImpersonation} />
          <div className="pt-10 flex h-screen bg-[#0b0f1a] overflow-hidden" dir="rtl">
            <Sidebar currentPage={page} onNavigate={setPage} />
            <main className="flex-1 overflow-hidden flex flex-col md:pt-0 pb-[57px] md:pb-0">
              <ErrorBoundary fallbackLabel="שגיאה בטעינת הדשבורד">
                {page === 'dashboard' && <Dashboard onNavigateSubscription={() => setPage('subscription')} />}
                {page === 'whales' && <WhaleActivity onNavigateSubscription={() => setPage('subscription')} />}
                {page === 'subscription' && <Subscription />}
                {page === 'profile' && <Profile />}
              </ErrorBoundary>
            </main>
          </div>
        </>
      );
    }
  }

  if (isAdminRoute) {
    if (!adminAuthed) {
      return (
        <>
          <AdminLogin onAuthenticated={() => setAdminAuthed(true)} />
          <AccessibilityWidget />
        </>
      );
    }
    return (
      <>
        <Admin />
        <AccessibilityWidget />
      </>
    );
  }

  if (!user && rootView === 'landing') {
    return (
      <>
        <Landing onEnterApp={() => setRootView('app')} />
        <SupportBot />
        <AccessibilityWidget />
      </>
    );
  }

  if (!user) {
    if (authScreen === 'register') {
      return <Register onSwitch={() => setAuthScreen('login')} onSuccess={() => setAuthScreen('login')} />;
    }
    return <Login onSwitch={() => setAuthScreen('register')} />;
  }

  // Main app — verify email first if not verified
  if (user && profile && !profile.is_email_verified) {
    return (
      <>
        <VerifyEmail email={user.email!} onVerified={() => { /* profile refreshes via AuthContext */ }} />
        <AccessibilityWidget />
      </>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-[#0b0f1a] overflow-hidden" dir="rtl">
        <Sidebar currentPage={page} onNavigate={setPage} />
        <main className="flex-1 overflow-hidden flex flex-col md:pt-0 pt-[57px] pb-[57px] md:pb-0">
          <ErrorBoundary fallbackLabel="שגיאה בטעינת הדשבורד">
            {page === 'dashboard' && <Dashboard onNavigateSubscription={() => setPage('subscription')} />}
            {page === 'whales' && <WhaleActivity onNavigateSubscription={() => setPage('subscription')} />}
            {page === 'subscription' && <Subscription />}
            {page === 'profile' && <Profile />}
          </ErrorBoundary>
        </main>
      </div>
      {showOnboarding && <OnboardingModal onDone={() => setShowOnboarding(false)} />}
      <SupportBot />
      <AccessibilityWidget />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackLabel="שגיאה בטעינת האפליקציה">
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ErrorBoundary>
  );
}
