import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import TopFloofs from './pages/TopFloofs/TopFloofs';
import DeckViewer from './pages/DeckViewer/DeckViewer';
import Organizer from './pages/Organizer/Organizer';

function App() {
  const location = useLocation();
  const isDeckViewer = location.pathname === '/deck-viewer';

  return (
    <div>
      {!isDeckViewer && <Header />}
      {!isDeckViewer && <Navbar />}
      <Routes>
        <Route path="/" element={<TopFloofs />} />
        <Route path="/home" element={<Home />} />
        <Route path="/top-floofs" element={<TopFloofs />} />
        <Route path="/deck-viewer" element={<DeckViewer />} />
        <Route path="/organizer" element={<Organizer />} />
      </Routes>
      {!isDeckViewer && <Footer />}
    </div>
  );
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;
