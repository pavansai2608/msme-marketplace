import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { getMe } from '../api/authApi'

const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try {
      const cached = localStorage.getItem('user');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  })
  const [loading, setLoading] = useState(!user)
  const [retries, setRetries] = useState(0)
  const isMounted             = useRef(true)
  const retryTimeoutRef       = useRef(null)

  const fetchUser = async () => {
    // Safety timeout to ensure we don't hang forever
    const safetyTimer = setTimeout(() => {
      if (isMounted.current) {
        console.warn('⚠️ Auth fetch taking too long, forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    try {
      const data = await getMe();
      clearTimeout(safetyTimer);
      if (!isMounted.current) return;
      
      if (data && data.user) {
        updateSetUser(data.user);
      } else {
        updateSetUser(null);
      }
      setLoading(false);
    } catch (err) {
      clearTimeout(safetyTimer);
      if (!isMounted.current) return;
      
      const status = err.response?.status;
      if (status === 503 && retries < 5) {
        setRetries(prev => prev + 1);
        retryTimeoutRef.current = setTimeout(fetchUser, 2000);
      } else {
        if (status === 401 || status === 403 || status === 404) {
          updateSetUser(null);
          localStorage.removeItem('token');
        }
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchUser();
    return () => {
      isMounted.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [])

  const updateSetUser = (userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('onboarding_skipped');
    setUser(null);
    window.location.href = '/login';
  };

  const isPublicRoute = ['/login', '/register', '/forgot-password', '/reset-password', '/'].some(path => 
    path === '/' ? window.location.pathname === '/' : window.location.pathname.startsWith(path)
  );

  return (
    <AuthContext.Provider value={{ user, setUser: updateSetUser, loading, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

const useAuth = () => useContext(AuthContext)
export { AuthProvider, useAuth }
