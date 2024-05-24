import React, { useState } from 'react';
import './TopFloofs.css';

const TopFloofs = () => {
  const initialFloofs = [
    {
      id: 'floof-pfp1',
      name: 'Lucky Foxy',
      image: '/images/floof-pfp1.png',
      rating: '95%',
      description: 'Bringing good luck to those who find him.',
      votes: 0
    },
    {
      id: 'floof-pfp2',
      name: 'Fiery Trio',
      image: '/images/floof-pfp2.jpg',
      rating: '93%',
      description: 'Heating things up with their sizzling style.',
      votes: 0
    },
    {
      id: 'floof-pfp3',
      name: 'Cyberfox',
      image: '/images/floof-pfp3.jpg',
      rating: '92%',
      description: 'Navigating the digital realm with ease.',
      votes: 0
    },
    {
      id: 'floof-pfp4',
      name: 'Angel Paws',
      image: '/images/floof-pfp4.jpg',
      rating: '90%',
      description: 'Watching over the floof kingdom from the skies.',
      votes: 0
    },
  ];

  const [floofs, setFloofs] = useState(initialFloofs);

  const handleUpvote = (id) => {
    setFloofs(prevFloofs => 
      prevFloofs.map(floof => 
        floof.id === id ? { ...floof, votes: floof.votes + 1 } : floof
      )
    );
  };

  return (
    <div className="top-floofs">
      <header>
        <h1>Top Floofs of All Time</h1>
        <p>Meet the cream of the floofy crop!</p>
      </header>

      <main>
        {floofs.map((floof, index) => (
          <section key={floof.id} className="floof-card">
            <h2>#{index + 1}: {floof.name}</h2>
            <img src={floof.image} alt={floof.name} />
            <h3>{floof.name}</h3>
            <p>Floof Rating: {floof.rating}</p>
            <p>Known for: {floof.description}</p>
            <div className="upvote-container">
              <button className="upvote-button" onClick={() => handleUpvote(floof.id)}>
                <i className="fas fa-arrow-up"></i> Upvote
              </button>
              <span className="vote-count">{floof.votes}</span>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default TopFloofs;
