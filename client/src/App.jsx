/**
 * Root application component.
 *
 * Defines the top-level layout (background decorations, navbar, toast
 * container, footer) and the client-side route table, and listens for the
 * global `rate-limit-exceeded` event dispatched by the API client so the
 * whole app can be swapped out for a rate-limit notice.
 *
 * It also surfaces the two states an installed app has to be honest
 * about: a newer version waiting to take over, and a session that is
 * still valid but temporarily out of touch with the server.
 */

import Home from './components/Home';
import Auth from './features/Auth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotFound from './components/NotFound';
import About from './components/About';
import AdminRoute from './components/AdminRoute';
import RequireAuth from './components/RequireAuth';
import AdminDashboard from './features/Admin/AdminDashboard';
import Dashboard from './features/dashboard/Dashboard';
import { Toaster } from 'react-hot-toast';
import { Routes, Route } from 'react-router-dom';


import RateLimitError from './components/RateLimitError';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import BackgroundDecorations from './components/common/BackgroundDecorations';
import { applyUpdate } from './utils/pwa';
import { useAuth } from './context/AuthContext';

/**
 * Renders the app shell and route outlet, or a full-screen rate-limit
 * notice when the client has been throttled by the server.
 *
 * @returns {JSX.Element} The application root element.
 */
function App() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { isOffline, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleRateLimit = () => setIsRateLimited(true);
    window.addEventListener('rate-limit-exceeded', handleRateLimit);
    return () => window.removeEventListener('rate-limit-exceeded', handleRateLimit);
  }, []);

  useEffect(() => {
    /**
     * A new build has been downloaded by the service worker. Offer the
     * reload rather than forcing it: an unprompted refresh in the middle
     * of a file transfer would cancel it.
     */
    const handleUpdateAvailable = (event) => {
      const registration = event.detail?.registration;

      toast((t) => (
        <span className="d-flex align-items-center gap-2">
          A new version is ready.
          <button
            type="button"
            className="btn btn-sm btn-light"
            onClick={() => {
              toast.dismiss(t.id);
              applyUpdate(registration);
            }}
          >
            Reload
          </button>
        </span>
      ), { duration: 15000, id: 'pwa-update' });
    };

    window.addEventListener('pwa:update-available', handleUpdateAvailable);
    return () => window.removeEventListener('pwa:update-available', handleUpdateAvailable);
  }, []);

  if (isRateLimited) {
    return <RateLimitError />;
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <BackgroundDecorations />
      {isAuthenticated && isOffline && (
        <div className="connection-banner" role="status">
          <i className="bi bi-wifi-off" aria-hidden="true"></i>
          <span>Offline - reconnecting</span>
        </div>
      )}
      <Toaster position="top-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} containerStyle={{ zIndex: 99999 }} />
      <Navbar />
      <div className="flex-grow-1 d-flex flex-column">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="/about" element={<About />} />
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

export default App;
