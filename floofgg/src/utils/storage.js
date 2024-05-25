import { cardValues, mainDeck, extraDeck, sideDeck } from './deck';
const DEV = true; // Set to true for local development

function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
}

export function saveValuesToCookie() {
    setCookie('cardValues', JSON.stringify(cardValues), 365);
}

export function loadValuesFromCookie() {
    const cookieValue = getCookie('cardValues');
    if (cookieValue) {
        const loadedValues = JSON.parse(cookieValue);
        for (const [cardId, value] of Object.entries(loadedValues)) {
            cardValues[cardId] = value;
        }
    }
}

export function saveValuesToLocalStorage() {
    localStorage.setItem('cardValues', JSON.stringify(cardValues));
}

export function loadValuesFromLocalStorage() {
    const storedValues = localStorage.getItem('cardValues');
    if (storedValues) {
        const loadedValues = JSON.parse(storedValues);
        for (const [cardId, value] of Object.entries(loadedValues)) {
            cardValues[cardId] = value;
        }
    }
}

export function saveValuesToStorage() {
    if (DEV) {
        saveValuesToLocalStorage();
    } else {
        saveValuesToCookie();
    }
}

export function loadValuesFromStorage() {
    if (DEV) {
        loadValuesFromLocalStorage();
    } else {
        loadValuesFromCookie();
    }
}

export function saveValues() {
    const lines = [];
    lines.push('#main');
    mainDeck.forEach(cardId => {
        lines.push(`${cardId} ${cardValues[cardId]}`);
    });
    lines.push('#extra');
    extraDeck.forEach(cardId => {
        lines.push(`${cardId} ${cardValues[cardId]}`);
    });
    lines.push('!side');
    sideDeck.forEach(cardId => {
        lines.push(`${cardId} ${cardValues[cardId]}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deck_with_values.ydk';
    a.click();
    URL.revokeObjectURL(url);
}
