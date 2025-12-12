/**
 * Magic 8 Ball
 * Voice-controlled fortune teller with robotic prophecies
 * Now with ShaderToy-powered visuals
 */

import { bufferAShader, imageShader } from './shaders.js';

// State
export const ballState = {
    phase: 'idle', // 'idle' | 'listening' | 'transcribing' | 'thinking' | 'responding'

    // User info
    userName: '',
    userBirthday: '',
    userZodiac: '',

    // Current question/answer
    currentQuestion: '',
    currentAnswer: '',
    currentCategory: '',

    // ShaderToy instance
    shaderToy: null,

    // Animation frame
    animFrame: 0,

    // Callbacks
    callbacks: {
        speak: null,
    }
};

// Response categories (classic Magic 8 Ball)
export const CATEGORIES = {
    YES: ["It is certain", "Without a doubt", "Yes definitely", "As I see it, yes", "Most likely", "Signs point to yes"],
    NO: ["Don't count on it", "My reply is no", "Very doubtful", "Outlook not so good", "My sources say no"],
    MAYBE: ["Reply hazy", "Cannot predict now", "Concentrate and ask again", "Ask again later"],
    ASK_LATER: ["Better not tell you now", "Cannot predict now", "Concentrate and ask again"]
};

// Response mode mapping for shader
// 0=normal, 1=YES, 2=NO, 3=MAYBE, 4=LATER
const RESPONSE_MODES = {
    'YES': 1,
    'NO': 2,
    'MAYBE': 3,
    'ASK_LATER': 4
};

/**
 * Parse birthday string and return zodiac sign
 */
export function getZodiacSign(birthday) {
    if (!birthday) return 'Unknown';

    // Try to parse various formats
    let month, day;

    // Try "March 15" format
    const monthNames = {
        'january': 1, 'jan': 1,
        'february': 2, 'feb': 2,
        'march': 3, 'mar': 3,
        'april': 4, 'apr': 4,
        'may': 5,
        'june': 6, 'jun': 6,
        'july': 7, 'jul': 7,
        'august': 8, 'aug': 8,
        'september': 9, 'sep': 9, 'sept': 9,
        'october': 10, 'oct': 10,
        'november': 11, 'nov': 11,
        'december': 12, 'dec': 12
    };

    const wordMatch = birthday.toLowerCase().match(/([a-z]+)\s*(\d+)/);
    if (wordMatch && monthNames[wordMatch[1]]) {
        month = monthNames[wordMatch[1]];
        day = parseInt(wordMatch[2]);
    } else {
        // Try MM/DD or MM-DD format
        const numMatch = birthday.match(/(\d+)[\/\-](\d+)/);
        if (numMatch) {
            month = parseInt(numMatch[1]);
            day = parseInt(numMatch[2]);
        }
    }

    if (!month || !day) return 'Mysterious';

    // Zodiac date ranges
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Pisces';

    return 'Mysterious';
}

/**
 * Pick a random response category and phrase
 * Weighted to match a real Magic 8 Ball: 50% positive, 25% negative, 25% non-committal
 */
export function pickRandomResponse() {
    const roll = Math.random();
    let categoryKey;
    
    if (roll < 0.5) {
        // 50% chance of YES (positive)
        categoryKey = 'YES';
    } else if (roll < 0.75) {
        // 25% chance of NO (negative)
        categoryKey = 'NO';
    } else {
        // 25% chance of MAYBE or ASK_LATER (non-committal)
        categoryKey = Math.random() < 0.5 ? 'MAYBE' : 'ASK_LATER';
    }
    
    const phrases = CATEGORIES[categoryKey];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];

    return {
        category: categoryKey,
        phrase: phrase
    };
}

/**
 * Set ball state phase
 */
export function setPhase(phase) {
    ballState.phase = phase;
}

/**
 * Get current phase
 */
export function getPhase() {
    return ballState.phase;
}

/**
 * Set user info
 */
export function setUserInfo(name, birthday) {
    ballState.userName = name;
    ballState.userBirthday = birthday;
    ballState.userZodiac = getZodiacSign(birthday);
}

/**
 * Set the current question
 */
export function setQuestion(question) {
    ballState.currentQuestion = question;
}

/**
 * Set the current answer
 */
export function setAnswer(answer) {
    ballState.currentAnswer = answer;
}

/**
 * Set the shader response mode based on category
 * @param {string|null} category - 'YES', 'NO', 'MAYBE', 'ASK_LATER', or null for normal mode
 */
export function setResponseMode(category) {
    if (!ballState.shaderToy) return;
    
    const mode = category ? (RESPONSE_MODES[category] || 0) : 0;
    ballState.shaderToy.setResponseMode(mode);
    ballState.currentCategory = category || '';
}

/**
 * Advance animation frame
 */
export function advanceAnimation() {
    ballState.animFrame++;
}

/**
 * Initialize the 8 ball with ShaderToy
 */
export function initMagic8Ball(canvasId, callbacks = {}) {
    ballState.callbacks = { ...ballState.callbacks, ...callbacks };
    ballState.phase = 'idle';
    ballState.currentQuestion = '';
    ballState.currentAnswer = '';

    // Initialize ShaderToyLite
    // ShaderToyLite is loaded as a global from ShaderToyLite.js
    const toy = new ShaderToyLite(canvasId);
    ballState.shaderToy = toy;

    // Set up the shader pipeline
    toy.setCommon('');
    toy.setBufferA({ source: bufferAShader });
    toy.setImage({ source: imageShader, iChannel0: 'A' });

    // Start the shader animation
    toy.play();

    return ballState;
}

/**
 * Reset for new question
 */
export function resetQuestion() {
    ballState.currentQuestion = '';
    ballState.currentAnswer = '';
    ballState.currentCategory = '';
    ballState.phase = 'idle';
    
    // Reset shader to normal mode
    setResponseMode(null);
}
