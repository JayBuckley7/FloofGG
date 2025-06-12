import { currentCardId } from '../utils/deck.js';

let combinationMode = false;
let selectedCombinationCard = null;
let currentCombinationType = '';

export function startCombinationSetup() {
    document.getElementById('cardModal').style.display = "none"; // Close the modal
    document.getElementById('mainDeck').classList.add('combination-mode');
    combinationMode = true;

    selectedCombinationCard = currentCardId;
    
    // Add UI elements for combination mode
    const combinationUI = `
        <div id="combinationCard" class="card">
            <img src="https://images.ygoprodeck.com/images/cards/${currentCardId}.jpg" alt="Card ${currentCardId}">
        </div>
        <button id="combinationWithButton">With</button>
        <button id="combinationWithoutButton">Without</button>
        <button id="combinationSaveButton">Save</button>
    `;
    document.getElementById('combinationSetup').innerHTML = combinationUI;
    document.getElementById('combinationSetup').style.display = 'block';

    document.getElementById('combinationWithButton').addEventListener('click', () => setCombinationType('with'));
    document.getElementById('combinationWithoutButton').addEventListener('click', () => setCombinationType('without'));
    document.getElementById('combinationSaveButton').addEventListener('click', saveCombination);
}

function setCombinationType(type) {
    currentCombinationType = type;
}

export let combinations = [];

function saveCombination() {
    const selectedCards = Array.from(document.querySelectorAll('.card.selected')).map(card => card.dataset.cardId);
    if (selectedCombinationCard && selectedCards.length > 0 && currentCombinationType) {
        combinations.push({
            card: selectedCombinationCard,
            type: currentCombinationType,
            relatedCards: selectedCards
        });
        console.log('Combination saved:', combinations);

        // Reset combination mode
        combinationMode = false;
        document.getElementById('mainDeck').classList.remove('combination-mode');
        document.getElementById('combinationSetup').style.display = 'none';
    } else {
        alert('Please select related cards and set a combination type.');
    }
}

// Function to handle card selection in combination mode
document.addEventListener('click', function (event) {
    if (combinationMode && event.target.closest('.card')) {
        const cardElement = event.target.closest('.card');
        cardElement.classList.toggle('selected');
    }
});
