import Home from './components/Home';
import Auth from './features/Auth';
import RoomView from './features/Room';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotFound from './components/NotFound';
import About from './components/About';
import { Toaster } from 'react-hot-toast';
import { Routes, Route } from 'react-router-dom';


function App() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Toaster position="top-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} containerStyle={{ zIndex: 99999 }} />
      <Navbar />
      <div className="flex-grow-1 d-flex flex-column">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="/room/:roomId" element={<RoomView />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

export default App;
