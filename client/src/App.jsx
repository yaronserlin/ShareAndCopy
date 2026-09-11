/**
 * Root application component.
 *
 * Defines the top-level layout (background decorations, navbar, toast
 * container, footer) and the client-side route table, and listens for the
 * global `rate-limit-exceeded` event dispatched by the API client so the
 * whole app can be swapped out for a rate-limit notice.
 */

import Home from './components/Home';
import Auth from './features/Auth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotFound from './components/NotFound';
import About from './components/About';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './features/Admin/AdminDashboard';
import Dashboard from './features/dashboard/Dashboard';
import { Toaster } from 'react-hot-toast';
import { Routes, Route } from 'react-router-dom';


import RateLimitError from './components/RateLimitError';
import { useState, useEffect } from 'react';
import BackgroundDecorations from './components/common/BackgroundDecorations';

/**
 * Renders the app shell and route outlet, or a full-screen rate-limit
 * notice when the client has been throttled by the server.
 *
 * @returns {JSX.Element} The application root element.
 */
function App() {
  const [isRateLimited, setIsRateLimited] = useState(false);

  useEffect(() => {
    const handleRateLimit = () => setIsRateLimited(true);
    window.addEventListener('rate-limit-exceeded', handleRateLimit);
    return () => window.removeEventListener('rate-limit-exceeded', handleRateLimit);
  }, []);

  if (isRateLimited) {
    return <RateLimitError />;
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <BackgroundDecorations />
      <Toaster position="top-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} containerStyle={{ zIndex: 99999 }} />
      <Navbar />
      <div className="flex-grow-1 d-flex flex-column">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/about" element={<About />} />
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
