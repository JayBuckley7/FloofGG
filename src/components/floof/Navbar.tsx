import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-purple-800 text-white py-2">
      <ul className="flex gap-4 justify-center">
        <li>
          <Link to="/" className="hover:underline">
            Home
          </Link>
        </li>
        <li>
          <Link to="/top-floof" className="hover:underline">
            Top Floof
          </Link>
        </li>
        <li>
          <Link to="/duel" className="hover:underline">
            Duel
          </Link>
        </li>
        <li>
          <Link to="/kanban" className="hover:underline">
                            Kanban
          </Link>
        </li>
      </ul>
    </nav>
  );
}
