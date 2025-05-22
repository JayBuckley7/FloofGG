import { saveValuesToStorage } from '../utils/storage';

// These arrays are kept for storage.js compatibility but are controlled by React state.
export let mainDeck = [];
export let extraDeck = [];
export let sideDeck = [];
export let currentCardId = '';
export let currentCombination = null;

// Initialize card values to 0
export const cardValues = {};

export function handleFile(event, setMain, setExtra, setSide) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result;
            const decks = parseYdk(content);
            mainDeck = decks.mainDeck;
            extraDeck = decks.extraDeck;
            sideDeck = decks.sideDeck;

            if (setMain) setMain([...mainDeck]);
            if (setExtra) setExtra([...extraDeck]);
            if (setSide) setSide([...sideDeck]);
        };
        reader.readAsText(file);
    }
}

function parseYdk(content) {
    const lines = content.split('\n');
    const mainDeck = [];
    const extraDeck = [];
    const sideDeck = [];
    let currentSection = '';
    const cardValuePattern = /^(\d+)\s+(\d+)$/;

    lines.forEach(line => {
        if (line.startsWith('#main')) {
            currentSection = 'main';
        } else if (line.startsWith('#extra')) {
            currentSection = 'extra';
        } else if (line.startsWith('!side')) {
            currentSection = 'side';
        } else if (line && !line.startsWith('#') && !line.startsWith('!')) {
            const match = line.match(cardValuePattern);
            if (match) {
                const cardId = match[1];
                const cardValue = parseInt(match[2], 10);
                cardValues[cardId] = cardValue;
                if (currentSection === 'main') {
                    mainDeck.push(cardId);
                } else if (currentSection === 'extra') {
                    extraDeck.push(cardId);
                } else if (currentSection === 'side') {
                    sideDeck.push(cardId);
                }
            } else {
                if (currentSection === 'main') {
                    mainDeck.push(line.trim());
                } else if (currentSection === 'extra') {
                    extraDeck.push(line.trim());
                } else if (currentSection === 'side') {
                    sideDeck.push(line.trim());
                }
                // Initialize card values to 0 if not present in file
                if (!cardValues[line.trim()]) {
                    cardValues[line.trim()] = 0;
                }
            }
        }
    });

    return { mainDeck, extraDeck, sideDeck };
}


export function generateTestHand(deck, setTestHand, setHandValue) {
    if (!deck || deck.length < 5) {
        alert('Main Deck has fewer than 5 cards!');
        return;
    }

    const deckCopy = [...deck];
    const hand = [];

    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * deckCopy.length);
        hand.push(deckCopy.splice(randomIndex, 1)[0]);
    }

    if (setTestHand) setTestHand(hand);
    if (setHandValue) setHandValue(calculateHandValue(hand));
}

function calculateHandValue(hand) {
    let totalValue = 0;
    hand.forEach(cardId => {
        totalValue += cardValues[cardId] || 0;
    });
    return totalValue;
}

export function updateCardValue(cardId, increment) {
    if (!cardValues[cardId]) {
        cardValues[cardId] = 0;
    }
    cardValues[cardId] += increment;

    // Persist the updated values
    saveValuesToStorage();
}


export function test100Hands(deck, setAverageHandValue) {
    if (!deck || deck.length < 5) {
        alert('Main Deck has fewer than 5 cards!');
        return;
    }

    let totalHandValue = 0;

    for (let i = 0; i < 100; i++) {
        let deckCopy = [...deck];
        const testHand = [];

        for (let j = 0; j < 5; j++) {
            const randomIndex = Math.floor(Math.random() * deckCopy.length);
            testHand.push(deckCopy.splice(randomIndex, 1)[0]);
        }

        totalHandValue += calculateHandValueForTest(testHand);
    }

    const averageHandValue = totalHandValue / 100;
    if (setAverageHandValue) setAverageHandValue(averageHandValue);
}

function calculateHandValueForTest(hand) {
    let totalValue = 0;
    hand.forEach(cardId => {
        totalValue += cardValues[cardId] || 0;
    });
    return totalValue;
}
