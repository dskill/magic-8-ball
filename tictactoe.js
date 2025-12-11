// Game State
export const gameState = {
    phase: 'loading', // 'loading' | 'name_entry' | 'playing' | 'game_over'
    playerName: '',
    board: Array(9).fill(null),
    currentTurn: 'player',
    winner: null,
    width: 60,
    height: 35,
    screenEl: null,
    callbacks: {
        speak: null,
        generateWithLLM: null,
        clearConversationHistory: null
    }
};

// Win conditions
const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
];

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

function selectRobotMove() {
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
        instructions = 'Click a number to place X';
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

    // Generate robot taunt
    generateRobotResponse(robotMove);

    // Back to player turn
    gameState.currentTurn = 'player';
    renderBoard();
    updateDisplays();
}

function generateRobotResponse(robotMove) {
    const { speak, generateWithLLM } = gameState.callbacks;

    if (generateWithLLM) {
        generateWithLLM(`I just placed my O in position ${robotMove + 1}. Taunt the human.`, (text) => {
            if (text && speak) {
                let response = text.replace(/^["']|["']$/g, '').trim();
                if (response.length > 150) {
                    const firstSentence = response.match(/^[^.!?]+[.!?]/);
                    response = firstSentence ? firstSentence[0] : response.substring(0, 150);
                }
                speak(response);
            }
        });
    }
}

async function endGame(winner) {
    gameState.phase = 'game_over';
    gameState.winner = winner;
    renderBoard();
    updateDisplays();

    const { speak, generateWithLLM } = gameState.callbacks;

    let prompt;
    if (winner === 'X') {
        prompt = `The human beat you at tic-tac-toe. Express disbelief or make an excuse.`;
    } else if (winner === 'O') {
        prompt = `You won at tic-tac-toe! Gloat about your victory.`;
    } else {
        prompt = `The tic-tac-toe game ended in a draw. Comment on it.`;
    }

    if (generateWithLLM) {
        generateWithLLM(prompt, (text) => {
            if (text && speak) {
                let response = text.replace(/^["']|["']$/g, '').trim();
                if (response.length > 200) response = response.substring(0, 200);
                speak(response);
            }
        });
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
        moodEl.textContent = 'CALCULATING';
        moodEl.className = 'info-value';
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

    // Clear conversation history for new game
    if (callbacks.clearConversationHistory) {
        callbacks.clearConversationHistory();
    }

    renderBoard();
    updateDisplays();

    // Initial greeting
    const { speak, generateWithLLM } = callbacks;

    if (generateWithLLM) {
        generateWithLLM(`A new game of tic-tac-toe is starting against ${playerName}. Greet them with a taunt.`, (text) => {
            if (text && speak) {
                let response = text.replace(/^["']|["']$/g, '').trim();
                speak(response);
            } else if (speak) {
                speak(`Welcome, ${playerName}. Let us begin.`);
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

    // Clear conversation history for new game
    if (gameState.callbacks.clearConversationHistory) {
        gameState.callbacks.clearConversationHistory();
    }

    renderBoard();
    updateDisplays();

    // New greeting
    const { speak, generateWithLLM } = gameState.callbacks;

    if (generateWithLLM) {
        generateWithLLM(`Another game begins. Taunt the human.`, (text) => {
            if (text && speak) {
                let response = text.replace(/^["']|["']$/g, '').trim();
                speak(response);
            } else if (speak) {
                speak(`Another round? Very well.`);
            }
        });
    } else if (speak) {
        speak(`Another round? Very well.`);
    }
}

export function setPhase(phase) {
    gameState.phase = phase;
}
