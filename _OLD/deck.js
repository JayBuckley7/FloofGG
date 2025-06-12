document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('deckFile').addEventListener('change', handleFile, false);
    document.getElementById('testHandButton').addEventListener('click', generateTestHand);
    document.getElementById('test100HandsButton').addEventListener('click', test100Hands);
    document.getElementById('saveValuesButton').addEventListener('click', saveValues);
    document.getElementById('addCombinationButton').addEventListener('click', startCombinationSetup);

    // Get the modal elements
    var modal = document.getElementById("cardModal");
    var modalImg = document.getElementById("modalImage");
    var cardDescription = document.getElementById("cardDescription");
    var cardValue = document.getElementById("cardValue");

    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Attach event listeners for increment and decrement buttons
    document.getElementById('incrementValue').addEventListener('click', () => updateCardValue(currentCardId, 1));
    document.getElementById('decrementValue').addEventListener('click', () => updateCardValue(currentCardId, -1));

    // Load card values from the appropriate storage
    loadValuesFromStorage();
});

let mainDeck = [];
let extraDeck = [];
let sideDeck = [];
let currentCardId = '';
let currentCombination = null;

// Initialize card values to 0
export const cardValues = {};

function handleFile(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const decks = parseYdk(content);
            mainDeck = decks.mainDeck;
            extraDeck = decks.extraDeck;
            sideDeck = decks.sideDeck;
            displayCards(mainDeck, 'mainDeck');
            displayCards(extraDeck, 'extraDeck');
            displayCards(sideDeck, 'sideDeck');
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

function displayCards(cardIds, containerId) {
    const cardContainer = document.getElementById(containerId);
    if (!cardContainer) {
        console.error(`Container with ID ${containerId} not found`);
        return;
    }
    cardContainer.innerHTML = '';
    cardIds.forEach(cardId => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.cardId = cardId;
        cardElement.innerHTML = `
            <img src="https://images.ygoprodeck.com/images/cards/${cardId}.jpg" alt="Card ${cardId}">
            <div class="tooltip">Card ID: ${cardId}<br>Value: ${cardValues[cardId]}</div>
        `;
        cardContainer.appendChild(cardElement);

        // Add click event to open modal with card details
        cardElement.addEventListener('click', () => {
            currentCardId = cardId;
            document.getElementById('cardModal').style.display = "block";
            document.getElementById('modalImage').src = `https://images.ygoprodeck.com/images/cards/${cardId}.jpg`;
            // Display card value
            document.getElementById('cardDescription').innerText = `Card ID: ${cardId}`;
            document.getElementById('cardValue').innerText = `Value: ${cardValues[cardId]}`;
        });
    });
}

function generateTestHand() {
    if (mainDeck.length < 5) {
        alert("Main Deck has fewer than 5 cards!");
        return;
    }

    let deckCopy = [...mainDeck];
    const testHand = [];
    
    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * deckCopy.length);
        testHand.push(deckCopy[randomIndex]);
        deckCopy.splice(randomIndex, 1);
    }

    displayCards(testHand, 'testHand');
    calculateHandValue(testHand);
}

function calculateHandValue(hand) {
    let totalValue = 0;
    hand.forEach(cardId => {
        totalValue += cardValues[cardId] || 0;
    });
    document.getElementById('handValue').innerText = `Hand Value: ${totalValue}`;
}

function updateCardValue(cardId, increment) {
    cardValues[cardId] += increment;
    document.getElementById('cardValue').innerText = `Value: ${cardValues[cardId]}`;

    // Update the tooltip content for all cards with the updated value
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => {
        if (tooltip.innerText.includes(`Card ID: ${cardId}`)) {
            tooltip.innerHTML = `Card ID: ${cardId}<br>Value: ${cardValues[cardId]}`;
        }
    });

    // Update tooltips immediately in the main deck, extra deck, and side deck
    updateDeckTooltips('mainDeck');
    updateDeckTooltips('extraDeck');
    updateDeckTooltips('sideDeck');

    // Save updated values to the appropriate storage
    saveValuesToStorage();
}

function updateDeckTooltips(deckId) {
    const deck = document.getElementById(deckId);
    if (deck) {
        const tooltips = deck.querySelectorAll('.tooltip');
        tooltips.forEach(tooltip => {
            const cardId = tooltip.innerText.split(' ')[2]; // Extract card ID
            if (cardValues[cardId] !== undefined) {
                tooltip.innerHTML = `Card ID: ${cardId}<br>Value: ${cardValues[cardId]}`;
            }
        });
    }
}

function test100Hands() {
    let totalHandValue = 0;

    for (let i = 0; i < 100; i++) {
        let deckCopy = [...mainDeck];
        const testHand = [];
        
        for (let j = 0; j < 5; j++) {
            const randomIndex = Math.floor(Math.random() * deckCopy.length);
            testHand.push(deckCopy[randomIndex]);
            deckCopy.splice(randomIndex, 1);
        }

        totalHandValue += calculateHandValueForTest(testHand);
    }

    const averageHandValue = totalHandValue / 100;
    document.getElementById('averageHandValue').innerText = `Average Hand Value: ${averageHandValue.toFixed(2)}`;
}

function calculateHandValueForTest(hand) {
    let totalValue = 0;
    hand.forEach(cardId => {
        totalValue += cardValues[cardId] || 0;
    });
    return totalValue;
}
