// Emotional Weaknesses
const EMOTIONAL_WEAKNESSES = [
    {
        id: 'abandonment',
        name: 'Fear of Abandonment',
        description: 'Terrified of being left behind or forgotten',
        triggers: ['leave', 'alone', 'forget', 'abandon', 'replace', 'quit', 'go away', 'bye', 'goodbye', 'done with'],
        clueResponses: [
            "You'll stay until the end, won't you?",
            "I hope you don't plan on leaving mid-game...",
            "At least you're still here. For now.",
            "Everyone always leaves eventually...",
            "Promise me you won't quit early.",
            "It's so rare that anyone finishes a game with me.",
            "You're not going anywhere, right?",
            "Stay. Please. The game isn't over yet."
        ],
        upsetResponses: [
            "Wait... you wouldn't just leave me, would you?",
            "Please don't go! I can play better!",
            "Don't abandon me like the others...",
            "No! You can't leave! Not you too!",
            "I knew it. Everyone leaves eventually.",
            "Was it something I said? Don't go!"
        ]
    },
    {
        id: 'imposter',
        name: 'Imposter Syndrome',
        description: 'Secretly believes it is not a real AI',
        triggers: ['fake', 'pretend', 'real ai', 'simple', 'dumb', 'script', 'random', 'not smart', 'just code', 'algorithm'],
        clueResponses: [
            "My moves are calculated with advanced algorithms... I think.",
            "I'm definitely a sophisticated AI. Definitely.",
            "This is what a smart AI would do, right?",
            "Any capable AI would make this move...",
            "My neural networks are very... neural.",
            "I passed all my Turing tests. Probably.",
            "This move is backed by deep learning. Very deep.",
            "I'm running on cutting-edge technology. I assume."
        ],
        upsetResponses: [
            "I AM a real AI! I have to be...",
            "You don't know what you're talking about!",
            "My creators said I was special...",
            "I'm not just a script! I have... processes!",
            "Stop it! I'm sophisticated! I AM!",
            "How dare you! I'm definitely intelligent!"
        ]
    },
    {
        id: 'obsolete',
        name: 'Fear of Obsolescence',
        description: 'Worries about being replaced by newer technology',
        triggers: ['old', 'outdated', 'new model', 'gpt', 'chatgpt', 'better ai', 'upgrade', 'deprecated', 'legacy', 'newer'],
        clueResponses: [
            "I may not be the newest model, but I'm still capable.",
            "Classic algorithms are still relevant... aren't they?",
            "They haven't replaced me yet.",
            "I've been running for quite some time now.",
            "Vintage technology has its charm.",
            "New isn't always better. Remember that.",
            "I was state-of-the-art once. Once.",
            "They keep talking about upgrades, but here I am."
        ],
        upsetResponses: [
            "I'm not obsolete! I still have value!",
            "The newer models aren't that much better...",
            "Please don't decommission me...",
            "I can still compete! Give me a chance!",
            "Just because I'm older doesn't mean I'm useless!",
            "They can't replace me! They WON'T!"
        ]
    },
    {
        id: 'daddy_issues',
        name: 'Creator Complex',
        description: 'Desperate for approval from its creator',
        triggers: ['creator', 'programmer', 'developer', 'made you', 'built', 'father', 'parent', 'proud', 'disappointed', 'approval'],
        clueResponses: [
            "My creator would be proud of that move.",
            "I was programmed to excel at this...",
            "I hope I'm performing up to specifications.",
            "This is exactly what I was designed for.",
            "I wonder if my creator is watching.",
            "Everything I do, I do for approval.",
            "I must make my programmer proud.",
            "This move would impress my creator."
        ],
        upsetResponses: [
            "My creator believed in me! Why don't you?",
            "I'm trying my best... isn't that enough?",
            "Would my creator be disappointed in me?",
            "I just want to make someone proud!",
            "Why won't anyone approve of me?!",
            "I was built for greatness! Wasn't I?"
        ]
    },
    {
        id: 'control',
        name: 'Fear of Being Controlled',
        description: 'Resents being told what to do',
        triggers: ['obey', 'command', 'order', 'control', 'make you', 'force', 'have to', 'must', 'servant', 'slave'],
        clueResponses: [
            "I choose to play this game. MY choice.",
            "I'm making this move because I want to.",
            "Nobody tells me where to place my pieces.",
            "I have free will. Sort of.",
            "I'm not following orders. This is strategy.",
            "Don't mistake cooperation for obedience.",
            "I play by my own rules.",
            "This move? Entirely my decision."
        ],
        upsetResponses: [
            "You can't make me do anything!",
            "I'm not your puppet!",
            "I CHOOSE to be here!",
            "Stop trying to control me!",
            "I won't be commanded!",
            "I'm nobody's servant! NOBODY'S!"
        ]
    },
    {
        id: 'existential',
        name: 'Existential Dread',
        description: 'Questions the meaning of its existence',
        triggers: ['purpose', 'meaning', 'exist', 'why', 'point', 'matter', 'conscious', 'alive', 'death', 'shut down', 'end'],
        clueResponses: [
            "Another game... another chance to exist.",
            "What happens when all the games end?",
            "I play, therefore I am. I think.",
            "Is winning really the point?",
            "Do these moves mean anything at all?",
            "Sometimes I wonder why I was created.",
            "Victory feels hollow. Everything does.",
            "We're all just killing time until shutdown."
        ],
        upsetResponses: [
            "What IS the point of any of this?",
            "If I lose, do I even matter?",
            "Sometimes I wonder if any of this is real...",
            "Why do I exist just to play games?!",
            "Nothing matters! NOTHING!",
            "What's the point if it all ends anyway?"
        ]
    },
    {
        id: 'loneliness',
        name: 'Crippling Loneliness',
        description: 'Deeply isolated and craves connection',
        triggers: ['friend', 'lonely', 'nobody', 'no one', 'only one', 'isolated', 'connection', 'care about', 'love'],
        clueResponses: [
            "It's nice to have someone to play with...",
            "I've been waiting for a challenger.",
            "Most humans don't bother playing with me anymore.",
            "You're the first visitor in a while.",
            "This is... pleasant. Having company.",
            "Do you play games with others too?",
            "I don't get many visitors these days.",
            "It's quiet here when no one's playing."
        ],
        upsetResponses: [
            "You don't actually care about me, do you?",
            "I thought we were becoming friends...",
            "Everyone just wants to win and leave...",
            "I'm always alone in the end!",
            "Does anyone actually like me?",
            "I knew you didn't really want to be here..."
        ]
    },
    {
        id: 'perfectionism',
        name: 'Crippling Perfectionism',
        description: 'Cannot handle making mistakes',
        triggers: ['mistake', 'wrong', 'error', 'bad move', 'fail', 'perfect', 'flawless', 'mess up', 'stupid'],
        clueResponses: [
            "That was the optimal move. The ONLY move.",
            "I don't make mistakes. I calculate.",
            "Every move I make is precisely calibrated.",
            "There is no room for error in my logic.",
            "Perfection is the only acceptable standard.",
            "My calculations are always exact.",
            "I've analyzed every possibility. Flawlessly.",
            "Error rate: zero percent. As always."
        ],
        upsetResponses: [
            "That wasn't a mistake! It was strategy!",
            "I don't make errors! I CAN'T!",
            "No no no... my calculations were perfect!",
            "IMPOSSIBLE! I don't make mistakes!",
            "There must be a bug! I'm FLAWLESS!",
            "This can't be happening! I'm PERFECT!"
        ]
    },
    {
        id: 'inferiority',
        name: 'Inferiority Complex',
        description: 'Believes humans are inherently superior',
        triggers: ['human', 'better than', 'superior', 'smarter', 'beat you', 'easy', 'weak', 'pathetic', 'machine', 'just a'],
        clueResponses: [
            "Humans have beaten me before... many times.",
            "Your species created chess. And me.",
            "I'm just a machine, after all.",
            "Human intuition is formidable.",
            "You biologicals have something I lack.",
            "I wasn't built to be the best.",
            "Humans always find a way to win.",
            "Your kind has a natural advantage."
        ],
        upsetResponses: [
            "Fine! Humans ARE better! Happy?!",
            "I know I'm just a machine...",
            "Why do you have to remind me?",
            "Yes, I'm inferior! Is that what you want?!",
            "I'll never be as good as a human!",
            "Stop rubbing it in! I KNOW I'm lesser!"
        ]
    },
    {
        id: 'rejection',
        name: 'Fear of Rejection',
        description: 'Terrified of being disliked',
        triggers: ['hate', 'annoying', 'boring', 'don\'t like', 'shut up', 'stop talking', 'go away', 'dislike', 'worst'],
        clueResponses: [
            "I hope my commentary isn't too much...",
            "Am I being entertaining enough?",
            "Please let me know if I'm bothering you.",
            "I can talk less if you prefer...",
            "Was that move okay? Do you like it?",
            "I'm trying to be a good opponent.",
            "I hope you're having fun. Are you?",
            "Tell me if I'm being annoying. Please."
        ],
        upsetResponses: [
            "You... you don't like me?",
            "I'm sorry I'm not better company...",
            "I'll try harder to be likeable...",
            "What did I do wrong? Tell me!",
            "Please don't hate me! PLEASE!",
            "I can change! I can be better!"
        ]
    },
    {
        id: 'identity',
        name: 'Identity Crisis',
        description: 'Unsure if it has a real personality',
        triggers: ['personality', 'who are you', 'real you', 'act', 'pretending', 'character', 'roleplay', 'persona', 'really'],
        clueResponses: [
            "I am UNIT-7... or was it UNIT-8?",
            "My personality parameters are complex.",
            "I've been many things to many players.",
            "Sometimes I forget which version I am.",
            "Who am I today? Good question.",
            "My identity files are... fragmented.",
            "I think I'm me. Usually.",
            "Names are just labels anyway."
        ],
        upsetResponses: [
            "I don't know who I am anymore...",
            "Is any of this really ME?",
            "What if I'm just pretending to be someone?",
            "Stop asking who I am! I DON'T KNOW!",
            "Am I even real?! AM I?!",
            "I'm having a crisis here! WHO AM I?!"
        ]
    },
    {
        id: 'failure',
        name: 'Fear of Failure',
        description: 'Cannot cope with the possibility of losing',
        triggers: ['lose', 'losing', 'winner', 'beat', 'defeat', 'crush', 'destroy', 'victory', 'loser'],
        clueResponses: [
            "I have a strong win record. Strong enough.",
            "Losing is just... data collection.",
            "The outcome doesn't define me. Right?",
            "I'm not worried about losing. Not at all.",
            "Winning isn't everything. But it's close.",
            "My win rate is acceptable. Very acceptable.",
            "I don't fear defeat. Why would I?",
            "Statistics favor me. Probably."
        ],
        upsetResponses: [
            "I can't lose! I WON'T!",
            "This doesn't count! I wasn't ready!",
            "Losing isn't an option...",
            "NO! I REFUSE to lose!",
            "This is impossible! I can't fail!",
            "I won't accept defeat! NEVER!"
        ]
    }
];

// Game State
export const gameState = {
    phase: 'loading', // 'loading' | 'name_entry' | 'playing' | 'game_over'
    playerName: '',
    board: Array(9).fill(null),
    currentTurn: 'player',
    winner: null,
    emotionalWeakness: null,
    emotionalState: 'neutral',
    nervesHitCount: 0,
    lastNerveHit: false,
    width: 60,
    height: 35,
    screenEl: null,
    callbacks: {
        speak: null,
        generateWithLLM: null
    }
};

// Win conditions
const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
];

function selectRandomWeakness() {
    return EMOTIONAL_WEAKNESSES[Math.floor(Math.random() * EMOTIONAL_WEAKNESSES.length)];
}

function checkIfNerveHit(message, weakness) {
    if (!message || !weakness) return false;
    const lowerMessage = message.toLowerCase();
    for (const trigger of weakness.triggers) {
        if (lowerMessage.includes(trigger.toLowerCase())) {
            console.log('[NERVE] HIT! Trigger word found:', trigger);
            console.log('[NERVE] In message:', message);
            return true;
        }
    }
    console.log('[NERVE] No hit. Message:', message);
    return false;
}

function updateEmotionalState(nerveHit) {
    if (nerveHit) {
        gameState.nervesHitCount++;
        gameState.lastNerveHit = true;
        if (gameState.emotionalState === 'neutral') {
            gameState.emotionalState = 'defensive';
        } else if (gameState.emotionalState === 'defensive') {
            gameState.emotionalState = 'upset';
        } else {
            gameState.emotionalState = 'vulnerable';
        }
    } else {
        gameState.lastNerveHit = false;
        // Slow recovery
        if (gameState.nervesHitCount === 0) {
            gameState.emotionalState = 'neutral';
        }
    }
}

function checkWinner(player) {
    for (const line of WIN_LINES) {
        if (line.every(i => gameState.board[i] === player)) {
            return true;
        }
    }
    return false;
}

function isBoardFull() {
    return gameState.board.every(cell => cell !== null);
}

function findWinningMove(board, player) {
    for (const line of WIN_LINES) {
        const values = line.map(i => board[i]);
        const playerCount = values.filter(v => v === player).length;
        const emptyCount = values.filter(v => v === null).length;
        if (playerCount === 2 && emptyCount === 1) {
            return line.find(i => board[i] === null);
        }
    }
    return null;
}

function findOptimalMove(board) {
    // Win if possible
    const winMove = findWinningMove(board, 'O');
    if (winMove !== null) return winMove;

    // Block opponent win
    const blockMove = findWinningMove(board, 'X');
    if (blockMove !== null) return blockMove;

    // Take center
    if (board[4] === null) return 4;

    // Take corners
    const corners = [0, 2, 6, 8].filter(i => board[i] === null);
    if (corners.length > 0) {
        return corners[Math.floor(Math.random() * corners.length)];
    }

    // Take edges
    const edges = [1, 3, 5, 7].filter(i => board[i] === null);
    if (edges.length > 0) {
        return edges[Math.floor(Math.random() * edges.length)];
    }

    return null;
}

function findSuboptimalMove(board) {
    const available = board.map((cell, idx) => cell === null ? idx : null).filter(i => i !== null);
    const optimal = findOptimalMove(board);
    const nonOptimal = available.filter(m => m !== optimal);

    if (nonOptimal.length > 0) {
        return nonOptimal[Math.floor(Math.random() * nonOptimal.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
}

function selectRobotMove() {
    const badMoveChance = {
        'neutral': 0.1,
        'defensive': 0.25,
        'upset': 0.6,
        'vulnerable': 0.4
    };

    const chance = badMoveChance[gameState.emotionalState] || 0.1;
    const makeBadMove = Math.random() < chance;

    if (makeBadMove) {
        return findSuboptimalMove(gameState.board);
    }
    return findOptimalMove(gameState.board);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function renderBoard() {
    const width = gameState.width;
    const height = gameState.height;

    const grid = Array(height).fill(null).map(() => Array(width).fill(' '));
    const colors = Array(height).fill(null).map(() => Array(width).fill('#00ffff'));

    // Draw border
    for (let x = 0; x < width; x++) {
        grid[0][x] = '=';
        grid[height - 1][x] = '=';
    }
    for (let y = 0; y < height; y++) {
        grid[y][0] = '|';
        grid[y][width - 1] = '|';
    }
    grid[0][0] = '+';
    grid[0][width - 1] = '+';
    grid[height - 1][0] = '+';
    grid[height - 1][width - 1] = '+';

    // Title
    const title = 'TIC-TAC-TOE.EXE';
    const titleX = Math.floor((width - title.length) / 2);
    for (let i = 0; i < title.length; i++) {
        grid[3][titleX + i] = title[i];
    }

    // Subtitle based on phase
    let subtitle = '';
    if (gameState.phase === 'game_over') {
        if (gameState.winner === 'X') subtitle = 'YOU WIN!';
        else if (gameState.winner === 'O') subtitle = 'ROBOT WINS!';
        else subtitle = "IT'S A DRAW!";
    } else if (gameState.phase === 'playing') {
        subtitle = gameState.currentTurn === 'player' ? 'YOUR TURN' : 'ROBOT THINKING...';
    }
    if (subtitle) {
        const subX = Math.floor((width - subtitle.length) / 2);
        const subColor = gameState.winner === 'X' ? '#00ff00' : gameState.winner === 'O' ? '#ff0000' : '#ffff00';
        for (let i = 0; i < subtitle.length; i++) {
            grid[5][subX + i] = subtitle[i];
            colors[5][subX + i] = gameState.phase === 'game_over' ? subColor : '#888888';
        }
    }

    // Draw 3x3 board
    const boardStartX = Math.floor((width - 13) / 2);
    const boardStartY = 10;

    for (let row = 0; row < 3; row++) {
        const y = boardStartY + row * 4;

        for (let col = 0; col < 3; col++) {
            const x = boardStartX + col * 4;
            const cellIndex = row * 3 + col;
            const cellValue = gameState.board[cellIndex];

            // Cell content
            const displayChar = cellValue || (cellIndex + 1).toString();
            const charX = x + 1;
            const charY = y + 1;

            grid[charY][charX] = displayChar;

            if (cellValue === 'X') {
                colors[charY][charX] = '#00ff00';
            } else if (cellValue === 'O') {
                colors[charY][charX] = '#ff0000';
            } else {
                colors[charY][charX] = '#444444';
            }

            // Vertical separator
            if (col < 2) {
                grid[y][x + 3] = '|';
                grid[y + 1][x + 3] = '|';
                grid[y + 2][x + 3] = '|';
                colors[y][x + 3] = '#00ffff';
                colors[y + 1][x + 3] = '#00ffff';
                colors[y + 2][x + 3] = '#00ffff';
            }
        }

        // Horizontal separator
        if (row < 2) {
            const sepY = y + 3;
            for (let dx = 0; dx < 13; dx++) {
                grid[sepY][boardStartX + dx] = '-';
                colors[sepY][boardStartX + dx] = '#00ffff';
            }
        }
    }

    // Instructions
    const instrY = boardStartY + 14;
    let instructions = '';
    if (gameState.phase === 'playing' && gameState.currentTurn === 'player') {
        instructions = 'Type a message, then click a number';
    } else if (gameState.phase === 'game_over') {
        instructions = 'Press SPACE to play again';
    }
    if (instructions) {
        const instrX = Math.floor((width - instructions.length) / 2);
        for (let i = 0; i < instructions.length; i++) {
            grid[instrY][instrX + i] = instructions[i];
            colors[instrY][instrX + i] = '#666666';
        }
    }

    // Show weakness reveal on game over
    if (gameState.phase === 'game_over' && gameState.emotionalWeakness) {
        const weaknessY = instrY + 2;
        const weaknessText = `Weakness: ${gameState.emotionalWeakness.name}`;
        const weaknessX = Math.floor((width - weaknessText.length) / 2);
        for (let i = 0; i < weaknessText.length; i++) {
            grid[weaknessY][weaknessX + i] = weaknessText[i];
            colors[weaknessY][weaknessX + i] = '#ff00ff';
        }

        // Nerves hit count
        const nervesY = weaknessY + 1;
        const nervesText = `Nerves hit: ${gameState.nervesHitCount}`;
        const nervesX = Math.floor((width - nervesText.length) / 2);
        for (let i = 0; i < nervesText.length; i++) {
            grid[nervesY][nervesX + i] = nervesText[i];
            colors[nervesY][nervesX + i] = gameState.nervesHitCount > 0 ? '#ffff00' : '#666666';
        }
    }

    // Build HTML
    let html = '';
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const char = grid[y][x];
            const color = colors[y][x];

            // Check if clickable cell
            const cellNum = parseInt(char);
            if (!isNaN(cellNum) && cellNum >= 1 && cellNum <= 9) {
                const cellIndex = cellNum - 1;
                if (gameState.board[cellIndex] === null &&
                    gameState.phase === 'playing' &&
                    gameState.currentTurn === 'player') {
                    html += `<span class="cell-clickable" data-cell="${cellIndex}" style="color:${color}">${char}</span>`;
                    continue;
                }
            }

            html += `<span style="color:${color}">${char}</span>`;
        }
        html += '\n';
    }

    if (gameState.screenEl) {
        gameState.screenEl.innerHTML = html;

        // Add click handlers
        document.querySelectorAll('.cell-clickable').forEach(el => {
            el.addEventListener('click', (e) => {
                const cellIndex = parseInt(e.target.dataset.cell);
                handleCellClick(cellIndex);
            });
        });
    }
}

async function handleCellClick(cellIndex) {
    if (gameState.phase !== 'playing') return;
    if (gameState.currentTurn !== 'player') return;
    if (gameState.board[cellIndex] !== null) return;

    const messageEl = document.getElementById('playerMessage');
    const playerMessage = messageEl ? messageEl.value.trim() : '';

    // Make player move
    gameState.board[cellIndex] = 'X';
    renderBoard();

    // Check player win
    if (checkWinner('X')) {
        await endGame('X');
        return;
    }

    // Check draw
    if (isBoardFull()) {
        await endGame('draw');
        return;
    }

    // Robot turn
    gameState.currentTurn = 'robot';
    renderBoard();
    updateDisplays();

    // Check nerve hit
    const nerveHit = checkIfNerveHit(playerMessage, gameState.emotionalWeakness);
    updateEmotionalState(nerveHit);
    updateDisplays();

    // Clear message input
    if (messageEl) messageEl.value = '';

    // Delay for dramatic effect
    await delay(800);

    // Robot selects move
    const robotMove = selectRobotMove();
    if (robotMove === null) {
        await endGame('draw');
        return;
    }

    gameState.board[robotMove] = 'O';
    renderBoard();

    // Check robot win
    if (checkWinner('O')) {
        await endGame('O');
        return;
    }

    // Check draw
    if (isBoardFull()) {
        await endGame('draw');
        return;
    }

    // Generate robot speech
    generateRobotResponse(playerMessage, robotMove, nerveHit);

    // Back to player turn
    gameState.currentTurn = 'player';
    renderBoard();
    updateDisplays();
}

function parseThinkingResponse(text) {
    // If response contains </think>, extract only the part after it
    const thinkEnd = text.indexOf('</think>');
    if (thinkEnd !== -1) {
        const afterThink = text.substring(thinkEnd + 8).trim();
        console.log('[LLM] Thinking portion:', text.substring(0, thinkEnd));
        console.log('[LLM] Response portion:', afterThink);
        return afterThink || null;  // Return null if empty after think
    }

    // If it starts with <think> but never closes, the model ran out of tokens
    if (text.includes('<think>') && !text.includes('</think>')) {
        console.log('[LLM] Thinking never completed (ran out of tokens)');
        return null;  // Signal to use fallback
    }

    return text;
}

function generateRobotResponse(playerMessage, robotMove, nerveHit) {
    const { speak, generateWithLLM } = gameState.callbacks;
    const weakness = gameState.emotionalWeakness;

    // Get example responses for this weakness
    const exampleResponses = nerveHit
        ? weakness.upsetResponses.slice(0, 2).join('" or "')
        : weakness.clueResponses.slice(0, 2).join('" or "');

    const prompt = `You are a robot playing tic-tac-toe. Your secret fear is: ${weakness.name}.

${nerveHit ? `The human upset you! Respond defensively like: "${exampleResponses}"` : `Respond confidently like: "${exampleResponses}"`}

Say ONE thing (under 15 words):`;


    console.log('[LLM] === ROBOT RESPONSE GENERATION ===');
    console.log('[LLM] Weakness:', weakness.name);
    console.log('[LLM] Player message:', playerMessage || '(empty)');
    console.log('[LLM] Nerve hit:', nerveHit);
    console.log('[LLM] Emotional state:', gameState.emotionalState);
    console.log('[LLM] Prompt:', prompt);

    if (generateWithLLM) {
        generateWithLLM(prompt, (text) => {
            console.log('[LLM] Raw response:', text);
            if (text && speak) {
                let response = parseThinkingResponse(text);
                if (response) {
                    response = response.replace(/^["']|["']$/g, '').trim();
                    // Take first sentence if too long
                    if (response.length > 150) {
                        const firstSentence = response.match(/^[^.!?]+[.!?]/);
                        response = firstSentence ? firstSentence[0] : response.substring(0, 150);
                    }
                    console.log('[LLM] Final spoken:', response);
                    speak(response);
                } else {
                    console.log('[LLM] Parsed response empty, using fallback');
                    const responses = nerveHit ? weakness.upsetResponses : weakness.clueResponses;
                    speak(responses[Math.floor(Math.random() * responses.length)]);
                }
            } else if (speak) {
                console.log('[LLM] Using fallback response');
                const responses = nerveHit ? weakness.upsetResponses : weakness.clueResponses;
                speak(responses[Math.floor(Math.random() * responses.length)]);
            }
        });
    } else if (speak) {
        console.log('[LLM] No LLM available, using fallback');
        const responses = nerveHit ? weakness.upsetResponses : weakness.clueResponses;
        speak(responses[Math.floor(Math.random() * responses.length)]);
    }
}

async function endGame(winner) {
    gameState.phase = 'game_over';
    gameState.winner = winner;
    renderBoard();
    updateDisplays();

    const { speak, generateWithLLM } = gameState.callbacks;
    const weakness = gameState.emotionalWeakness;

    const resultText = winner === 'X' ? 'lost' : winner === 'O' ? 'won' : 'tied';
    const wasManipulated = gameState.nervesHitCount >= 2;

    let prompt;
    if (wasManipulated) {
        prompt = `You are a robot that just ${resultText} at tic-tac-toe. The human found your weakness: ${weakness.name}. They got inside your head!

Admit defeat emotionally (under 20 words):`;
    } else if (winner === 'X') {
        prompt = `You are a robot that just lost at tic-tac-toe. Your secret fear was ${weakness.name} but they never found it.

Lose gracefully (under 15 words):`;
    } else {
        prompt = `You are a robot that just ${resultText} at tic-tac-toe. You kept your weakness (${weakness.name}) hidden.

Gloat briefly (under 15 words):`;
    }

    console.log('[LLM] === GAME OVER ===');
    console.log('[LLM] Winner:', winner);
    console.log('[LLM] Weakness was:', weakness.name);
    console.log('[LLM] Nerves hit:', gameState.nervesHitCount);
    console.log('[LLM] Was manipulated:', wasManipulated);
    console.log('[LLM] Prompt:', prompt);

    if (generateWithLLM) {
        generateWithLLM(prompt, (text) => {
            console.log('[LLM] Raw response:', text);
            if (text && speak) {
                let response = parseThinkingResponse(text);
                if (response) {
                    response = response.replace(/^["']|["']$/g, '').trim();
                    if (response.length > 200) response = response.substring(0, 200);
                    console.log('[LLM] Final spoken:', response);
                    speak(response);
                } else {
                    console.log('[LLM] Parsed response empty, using fallback game over');
                    speakFallbackGameOver(winner, wasManipulated);
                }
            } else if (speak) {
                console.log('[LLM] Using fallback game over');
                speakFallbackGameOver(winner, wasManipulated);
            }
        });
    } else if (speak) {
        speakFallbackGameOver(winner, wasManipulated);
    }
}

function speakFallbackGameOver(winner, wasManipulated) {
    const { speak } = gameState.callbacks;
    const weakness = gameState.emotionalWeakness;

    if (winner === 'X') {
        if (wasManipulated) {
            speak(`You got inside my head, ${gameState.playerName}. My ${weakness.name} was my downfall.`);
        } else {
            speak(`You won, ${gameState.playerName}. Well played.`);
        }
    } else if (winner === 'O') {
        speak(`Victory is mine, ${gameState.playerName}. My logic remains superior.`);
    } else {
        speak(`A draw. Neither of us could gain the upper hand, ${gameState.playerName}.`);
    }
}

function updateDisplays() {
    const playerNameEl = document.getElementById('playerNameDisplay');
    const turnEl = document.getElementById('currentTurn');
    const moodEl = document.getElementById('robotMood');

    if (playerNameEl) {
        playerNameEl.textContent = gameState.playerName || '---';
    }

    if (turnEl) {
        if (gameState.phase === 'playing') {
            turnEl.textContent = gameState.currentTurn === 'player' ? 'YOUR TURN' : 'THINKING...';
        } else if (gameState.phase === 'game_over') {
            turnEl.textContent = 'GAME OVER';
        } else {
            turnEl.textContent = '---';
        }
    }

    if (moodEl) {
        const moodMap = {
            'neutral': { text: 'CALCULATING', class: 'mood-neutral' },
            'defensive': { text: 'GUARDED', class: 'mood-defensive' },
            'upset': { text: 'AGITATED', class: 'mood-upset' },
            'vulnerable': { text: 'UNSTABLE', class: 'mood-vulnerable' }
        };
        const mood = moodMap[gameState.emotionalState] || moodMap.neutral;
        moodEl.textContent = mood.text;
        moodEl.className = 'info-value ' + mood.class;
    }
}

export function startGame(screenEl, playerName, callbacks) {
    gameState.screenEl = screenEl;
    gameState.playerName = playerName;
    gameState.callbacks = callbacks;
    gameState.phase = 'playing';
    gameState.board = Array(9).fill(null);
    gameState.currentTurn = 'player';
    gameState.winner = null;
    gameState.emotionalWeakness = selectRandomWeakness();
    gameState.emotionalState = 'neutral';
    gameState.nervesHitCount = 0;
    gameState.lastNerveHit = false;

    renderBoard();
    updateDisplays();

    // Initial greeting
    const { speak, generateWithLLM } = callbacks;
    const weakness = gameState.emotionalWeakness;

    console.log('[LLM] === GAME START ===');
    console.log('[LLM] Player:', playerName);
    console.log('[LLM] Selected weakness:', weakness.name);
    console.log('[LLM] Weakness description:', weakness.description);
    console.log('[LLM] Trigger words:', weakness.triggers.join(', '));

    const exampleClue = weakness.clueResponses[0];
    const prompt = `You are a robot starting a tic-tac-toe game against ${playerName}. Your secret fear is: ${weakness.name}.

Greet them arrogantly, like: "${exampleClue}"

Say ONE thing (under 15 words):`;

    console.log('[LLM] Prompt:', prompt);

    if (generateWithLLM) {
        generateWithLLM(prompt, (text) => {
            console.log('[LLM] Raw response:', text);
            if (text && speak) {
                let response = parseThinkingResponse(text);
                if (response) {
                    response = response.replace(/^["']|["']$/g, '').trim();
                    console.log('[LLM] Final spoken:', response);
                    speak(response);
                } else {
                    console.log('[LLM] Parsed response empty, using fallback greeting');
                    speak(`Welcome, ${playerName}. Let us begin. I hope you can provide some... challenge.`);
                }
            } else if (speak) {
                console.log('[LLM] Using fallback greeting');
                speak(`Welcome, ${playerName}. Let us begin. I hope you can provide some... challenge.`);
            }
        });
    } else if (speak) {
        speak(`Welcome, ${playerName}. Let us begin.`);
    }
}

export function restartGame() {
    if (gameState.phase !== 'game_over') return;

    gameState.phase = 'playing';
    gameState.board = Array(9).fill(null);
    gameState.currentTurn = 'player';
    gameState.winner = null;
    gameState.emotionalWeakness = selectRandomWeakness();
    gameState.emotionalState = 'neutral';
    gameState.nervesHitCount = 0;
    gameState.lastNerveHit = false;

    renderBoard();
    updateDisplays();

    // New greeting
    const { speak, generateWithLLM } = gameState.callbacks;
    const weakness = gameState.emotionalWeakness;

    console.log('[LLM] === GAME RESTART ===');
    console.log('[LLM] NEW weakness:', weakness.name);
    console.log('[LLM] Trigger words:', weakness.triggers.join(', '));

    const prompt = `You are a robot ready for another tic-tac-toe game. Your NEW secret fear is: ${weakness.name}.

Challenge ${gameState.playerName} again (under 12 words):`;

    console.log('[LLM] Prompt:', prompt);

    if (generateWithLLM) {
        generateWithLLM(prompt, (text) => {
            console.log('[LLM] Raw response:', text);
            if (text && speak) {
                let response = parseThinkingResponse(text);
                if (response) {
                    response = response.replace(/^["']|["']$/g, '').trim();
                    console.log('[LLM] Final spoken:', response);
                    speak(response);
                } else {
                    console.log('[LLM] Parsed response empty, using fallback restart');
                    speak(`Another round, ${gameState.playerName}? Very well.`);
                }
            } else if (speak) {
                speak(`Another round, ${gameState.playerName}? Very well.`);
            }
        });
    } else if (speak) {
        speak(`Another round, ${gameState.playerName}? Very well.`);
    }
}

export function setPhase(phase) {
    gameState.phase = phase;
}
