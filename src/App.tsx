import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import Header from "./components/floof/Header";
import Navbar from "./components/floof/Navbar";
import Footer from "./components/floof/Footer";
import Home from "./pages/Home";
import TopFloof from "./pages/TopFloof";
import Duel from "./pages/Duel";
import { DataInspector } from "./pages/DataInspector";
import Kanban from "./pages/Kanban";
import PublicBoard from "./pages/PublicBoard";
import Solitaire from "./pages/Solitaire";
import Minesweeper from "./pages/Minesweeper";

function AppRoutes() {
  const location = useLocation();
  const showFloofLayout = !location.pathname.startsWith("/kanban") && !location.pathname.startsWith("/board") && !location.pathname.startsWith("/duel") && !location.pathname.startsWith("/solitaire") && !location.pathname.startsWith("/minesweeper");
  const isOrganizer = location.pathname.startsWith('/organizer');

  return (
    <div className={`min-h-screen flex flex-col ${location.pathname.startsWith("/board") || location.pathname.startsWith("/kanban") || location.pathname.startsWith("/duel") || location.pathname.startsWith("/solitaire") || location.pathname.startsWith("/minesweeper") ? "no-flash" : "bg-gray-50"}`}>
      {!isOrganizer && showFloofLayout && (
        <>
          <Header />
          <Navbar />
        </>
      )}
      <main
        className={`flex-1 ${
          location.pathname.startsWith("/board") ||
          location.pathname.startsWith("/kanban") ||
          location.pathname.startsWith("/duel") ||
          location.pathname.startsWith("/solitaire") ||
          location.pathname.startsWith("/minesweeper")
            ? ""
            : "p-4"
        }`}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/top-floof" element={<TopFloof />} />
          <Route path="/duel" element={<Duel />} />
          <Route path="/board/:boardId" element={<PublicBoard />} />
          <Route path="/kanban/*" element={<Kanban />} />
          <Route path="/inspect" element={<DataInspector />} />
          <Route path="/solitaire" element={<Solitaire />} />
          <Route path="/minesweeper" element={<Minesweeper />} />
        </Routes>
      </main>
      {showFloofLayout && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
      <Toaster position="top-center" richColors />
    </Router>
  );
}
