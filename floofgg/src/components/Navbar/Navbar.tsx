import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
    return (
        <nav>
            <ul>
                <li><Link to="/">Top Floofs</Link></li>
                <li><Link to="/home">Home</Link></li>
                <li><Link to="/deck-viewer">Deck Viewer</Link></li>
                <li><Link to="/organizer">Organizer</Link></li>
            </ul>
        </nav>
    );
};

export default Navbar;
