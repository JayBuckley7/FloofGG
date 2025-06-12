import React from 'react';
import './Home.css';
import FloofCard from '../../components/FloofCard/FloofCard';

const featuredFloofs = [
  {
    id: 1,
    name: 'Foxy Adventurer',
    fluffinessScore: 95.0,
    specialSkills: 'Master of exploration with a trusty deck and side',
    imageUrl: 'https://cdn.discordapp.com/avatars/797987126900817960/0da5e59f75e5f477574a930bbf1fef53?size=1024',
    discordInvite: '#',
    onlyFansLink: '#'
  },
  {
    id: 2,
    name: 'Elfy',
    fluffinessScore: 90.0,
    specialSkills: 'Crafty snacky goodness',
    imageUrl: process.env.PUBLIC_URL + '/images/elfy300300.png',
    discordInvite: '#',
    onlyFansLink: '#'
  },
  {
    id: 3,
    name: 'Salsa',
    fluffinessScore: 100.0,
    specialSkills: 'The smalley fluffiest hungriest baby, 100% floofy',
    imageUrl: process.env.PUBLIC_URL + '/images/salsa42.png',
    discordInvite: '#',
    onlyFansLink: '#'
  },
  // Add more floofs as needed
];

const Home = () => {
  return (
    <div className="home">
      <h2>Featured Floofs of the Month</h2>
      <div className="floof-cards-container">
        {featuredFloofs.map(floof => (
          <FloofCard
            key={floof.id}
            name={floof.name}
            fluffinessScore={floof.fluffinessScore}
            specialSkills={floof.specialSkills}
            imageUrl={floof.imageUrl}
            discordInvite={floof.discordInvite}
            onlyFansLink={floof.onlyFansLink}
          />
        ))}
      </div>
    </div>
  );
}

export default Home;
