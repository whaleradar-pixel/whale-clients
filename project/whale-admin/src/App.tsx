import { useState, useEffect } from 'react';
import AdminLogin from './pages/AdminLogin';
import Admin from './pages/Admin';
import { supabase } from './lib/supabase';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('wr_admin_auth');
    if (stored === 'true') {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setAuthed(true);
        } else {
          sessionStorage.removeItem('wr_admin_auth');
        }
        setChecking(false);
      });
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return <AdminLogin onAuthenticated={() => setAuthed(true)} />;
  }

  return <Admin />;
}
