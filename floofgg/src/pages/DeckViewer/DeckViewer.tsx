// src/pages/DeckViewer.js
import React, { useState, useEffect } from 'react';
import {handleFile, generateTestHand, test100Hands, cardValues} from '../../utils/deck';
import {loadValuesFromStorage, saveValues} from '../../utils/storage';
import styles from './DeckViewer.module.css';

const DeckViewer = () => {
  const [mainDeck, setMainDeck] = useState([]);
  const [extraDeck, setExtraDeck] = useState([]);
  const [sideDeck, setSideDeck] = useState([]);
  const [testHand, setTestHand] = useState([]);
  const [handValue, setHandValue] = useState(0);
  const [averageHandValue, setAverageHandValue] = useState(0);

  useEffect(() => {
    // Load initial values from storage
    loadValuesFromStorage();
  }, []);

  return (
    <div className={styles.deckViewer}>
      <h1>Yu-Gi-Oh! Deck Viewer</h1>
      <input type="file" id="deckFile" accept=".ydk" onChange={(e) => handleFile(e, setMainDeck, setExtraDeck, setSideDeck)} />
      <h2>Main Deck</h2>
      <div className={styles.deck} id="mainDeck">
        {mainDeck.map(cardId => (
          <div key={cardId} className={styles.card}>
            <img src={`https://images.ygoprodeck.com/images/cards/${cardId}.jpg`} alt={`Card ${cardId}`} />
            <div className={styles.tooltip}>Card ID: {cardId}<br />Value: {cardValues[cardId]}</div>
          </div>
        ))}
      </div>
      <h2>Extra Deck</h2>
      <div className={styles.deck} id="extraDeck">
        {extraDeck.map(cardId => (
          <div key={cardId} className={styles.card}>
            <img src={`https://images.ygoprodeck.com/images/cards/${cardId}.jpg`} alt={`Card ${cardId}`} />
            <div className={styles.tooltip}>Card ID: {cardId}<br />Value: {cardValues[cardId]}</div>
          </div>
        ))}
      </div>
      <h2>Side Deck</h2>
      <div className={styles.deck} id="sideDeck">
        {sideDeck.map(cardId => (
          <div key={cardId} className={styles.card}>
            <img src={`https://images.ygoprodeck.com/images/cards/${cardId}.jpg`} alt={`Card ${cardId}`} />
            <div className={styles.tooltip}>Card ID: {cardId}<br />Value: {cardValues[cardId]}</div>
          </div>
        ))}
      </div>
      {/* <button onClick={() => generateTestHand(mainDeck, setTestHand, setHandValue)}>Test Hand</button>
      <button onClick={() => test100Hands(mainDeck, setAverageHandValue)}>Test 100 Hands</button> */}
      <button onClick={saveValues}>Save Values</button>
      <h2>Test Hand</h2>
      <div className={styles.deck} id="testHand">
        {testHand.map(cardId => (
          <div key={cardId} className={styles.card}>
            <img src={`https://images.ygoprodeck.com/images/cards/${cardId}.jpg`} alt={`Card ${cardId}`} />
          </div>
        ))}
      </div>
      <p>Hand Value: {handValue}</p>
      <h2>Average Hand Value</h2>
      <p>Average Hand Value: {averageHandValue}</p>
    </div>
  );
};

export default DeckViewer;
