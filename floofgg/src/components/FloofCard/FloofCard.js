import React from 'react';
import './FloofCard.css';

const FloofCard = ({ name, fluffinessScore, specialSkills, imageUrl, discordInvite, onlyFansLink }) => {
  return (
    <div className="floof-card">
      <img src={imageUrl} alt={name} className="floof-image" />
      <h3>{name}</h3>
      <p>Fluffiness score: {fluffinessScore}</p>
      <p>Special skills: {specialSkills}</p>
      <a href={discordInvite} className="discord-invite-btn">
        <i className="fab fa-discord"></i> Invite this floof to your discord!
      </a>
      <a href={onlyFansLink} className="social-invite-btn">
        <img src={'https://logowik.com/content/uploads/images/onlyfans-of-icon3771.logowik.com.webp'} alt="OnlyFans Icon" className="social-icon" /> Visit Floof on OnlyFans!
      </a>
    </div>
  );
}

export default FloofCard;
