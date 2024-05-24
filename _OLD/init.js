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
