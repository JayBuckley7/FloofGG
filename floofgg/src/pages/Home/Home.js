import React from 'react';
import './Home.css';
import FloofCard from '../../components/FloofCard/FloofCard';

const featuredFloofs = [
  {
    id: 1,
    name: 'Foxy Adventurer',
    fluffinessScore: 97.5,
    specialSkills: 'Master of exploration with a trusty deck and side',
    imageUrl: 'https://cdn.discordapp.com/avatars/797987126900817960/0da5e59f75e5f477574a930bbf1fef53?size=1024',
    discordInvite: '#',
    onlyFansLink: '#'
  },
  {
    id: 2,
    name: 'Fluffington the First',
    fluffinessScore: 98.7,
    specialSkills: 'Can levitate when it\'s too fluffy',
    imageUrl: process.env.PUBLIC_URL + '/images/fluffy_creature1.jpg',
    discordInvite: '#',
    onlyFansLink: '#'
  },
  {
    id: 3,
    name: 'Cloudella',
    fluffinessScore: 99.2,
    specialSkills: 'Can create mini rainstorms when sneezing',
    imageUrl: process.env.PUBLIC_URL + '/images/fluffy_creature2.jpg',
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
