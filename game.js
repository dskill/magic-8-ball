/**
 * Robot Navigator Game
 * ASCII maze game with voice controls
 */

// Game state
export const gameState = {
    phase: 'loading', // 'loading' | 'playing' | 'win' | 'game_over'

    // Display dimensions
    width: 60,
    height: 35,

    // Map dimensions (playable area)
    mapWidth: 15,
    mapHeight: 10,

    // Entities
    robot: { x: 1, y: 1 },
    pellets: [],
    bombs: [],
    walls: [],

    // Score
    pelletsCollected: 0,
    totalPellets: 0,

    // DOM
    screenEl: null,

    // Callbacks
    callbacks: {
        speak: null,
        onGameOver: null,
        onWin: null,
    }
};

// ASCII characters
const CHARS = {
    ROBOT: '@',
    PELLET: '.',
    BOMB: '*',
    WALL: '#',
    EMPTY: ' ',
    BORDER_H: '─',
    BORDER_V: '│',
    CORNER_TL: '┌',
    CORNER_TR: '┐',
    CORNER_BL: '└',
    CORNER_BR: '┘',
};

// Colors
const COLORS = {
    ROBOT: '#00ff00',
    PELLET: '#ffff00',
    BOMB: '#ff0000',
    WALL: '#666666',
    BORDER: '#00ffff',
    TEXT: '#00ffff',
    DIM: '#888888',
};

/**
 * Generate a random map with pellets, bombs, and walls
 */
function generateMap() {
    gameState.pellets = [];
    gameState.bombs = [];
    gameState.walls = [];
    gameState.robot = { x: 1, y: 1 };
    gameState.pelletsCollected = 0;

    // Create a grid to track occupied cells
    const occupied = new Set();
    occupied.add('1,1'); // Robot starting position

    // Add some random walls (not too many)
    const wallCount = 8;
    for (let i = 0; i < wallCount; i++) {
        const pos = getRandomEmptyPosition(occupied);
        if (pos) {
            gameState.walls.push(pos);
            occupied.add(`${pos.x},${pos.y}`);
        }
    }

    // Add pellets
    const pelletCount = 8;
    for (let i = 0; i < pelletCount; i++) {
        const pos = getRandomEmptyPosition(occupied);
        if (pos) {
            gameState.pellets.push(pos);
            occupied.add(`${pos.x},${pos.y}`);
        }
    }
    gameState.totalPellets = gameState.pellets.length;

    // Add bombs
    const bombCount = 4;
    for (let i = 0; i < bombCount; i++) {
        const pos = getRandomEmptyPosition(occupied);
        if (pos) {
            gameState.bombs.push(pos);
            occupied.add(`${pos.x},${pos.y}`);
        }
    }
}

/**
 * Get a random empty position on the map
 */
function getRandomEmptyPosition(occupied) {
    const maxAttempts = 100;
    for (let i = 0; i < maxAttempts; i++) {
        const x = Math.floor(Math.random() * (gameState.mapWidth - 2)) + 1;
        const y = Math.floor(Math.random() * (gameState.mapHeight - 2)) + 1;
        const key = `${x},${y}`;
        if (!occupied.has(key)) {
            return { x, y };
        }
    }
    return null;
}

/**
 * Check if a position contains a specific entity type
 */
function hasEntityAt(entities, x, y) {
    return entities.some(e => e.x === x && e.y === y);
}

/**
 * Remove entity at position
 */
function removeEntityAt(entities, x, y) {
    const index = entities.findIndex(e => e.x === x && e.y === y);
    if (index !== -1) {
        entities.splice(index, 1);
        return true;
    }
    return false;
}

/**
 * Move the robot in a direction
 * @returns {{ success: boolean, event: string }}
 */
export function moveRobot(direction) {
    if (gameState.phase !== 'playing') {
        return { success: false, event: 'not_playing' };
    }

    const dx = { up: 0, down: 0, left: -1, right: 1 }[direction] || 0;
    const dy = { up: -1, down: 1, left: 0, right: 0 }[direction] || 0;

    const newX = gameState.robot.x + dx;
    const newY = gameState.robot.y + dy;

    // Check bounds
    if (newX < 0 || newX >= gameState.mapWidth || newY < 0 || newY >= gameState.mapHeight) {
        return { success: false, event: 'wall_hit' };
    }

    // Check walls
    if (hasEntityAt(gameState.walls, newX, newY)) {
        return { success: false, event: 'wall_hit' };
    }

    // Move robot
    gameState.robot.x = newX;
    gameState.robot.y = newY;

    // Check bomb collision
    if (hasEntityAt(gameState.bombs, newX, newY)) {
        gameState.phase = 'game_over';
        return { success: true, event: 'bomb_hit' };
    }

    // Check pellet collection
    if (removeEntityAt(gameState.pellets, newX, newY)) {
        gameState.pelletsCollected++;

        // Check win condition
        if (gameState.pellets.length === 0) {
            gameState.phase = 'win';
            return { success: true, event: 'win' };
        }

        return { success: true, event: 'pellet_collected' };
    }

    return { success: true, event: 'moved' };
}

/**
 * Render the game board to the screen element
 */
export function renderBoard() {
    if (!gameState.screenEl) return;

    const { width, height, mapWidth, mapHeight } = gameState;

    // Create empty grid
    const grid = [];
    for (let y = 0; y < height; y++) {
        grid.push(new Array(width).fill(' '));
    }

    // Calculate map offset to center it
    const offsetX = Math.floor((width - mapWidth - 2) / 2);
    const offsetY = 3;

    // Draw title
    const title = '[ ROBOT NAVIGATOR ]';
    const titleX = Math.floor((width - title.length) / 2);
    for (let i = 0; i < title.length; i++) {
        grid[1][titleX + i] = title[i];
    }

    // Draw map border
    for (let x = 0; x < mapWidth + 2; x++) {
        grid[offsetY][offsetX + x] = x === 0 ? CHARS.CORNER_TL : (x === mapWidth + 1 ? CHARS.CORNER_TR : CHARS.BORDER_H);
        grid[offsetY + mapHeight + 1][offsetX + x] = x === 0 ? CHARS.CORNER_BL : (x === mapWidth + 1 ? CHARS.CORNER_BR : CHARS.BORDER_H);
    }
    for (let y = 1; y <= mapHeight; y++) {
        grid[offsetY + y][offsetX] = CHARS.BORDER_V;
        grid[offsetY + y][offsetX + mapWidth + 1] = CHARS.BORDER_V;
    }

    // Draw map contents
    const mapStartX = offsetX + 1;
    const mapStartY = offsetY + 1;

    // Draw walls
    for (const wall of gameState.walls) {
        grid[mapStartY + wall.y][mapStartX + wall.x] = CHARS.WALL;
    }

    // Draw pellets
    for (const pellet of gameState.pellets) {
        grid[mapStartY + pellet.y][mapStartX + pellet.x] = CHARS.PELLET;
    }

    // Draw bombs
    for (const bomb of gameState.bombs) {
        grid[mapStartY + bomb.y][mapStartX + bomb.x] = CHARS.BOMB;
    }

    // Draw robot
    grid[mapStartY + gameState.robot.y][mapStartX + gameState.robot.x] = CHARS.ROBOT;

    // Draw stats
    const statsY = offsetY + mapHeight + 3;
    const statsLine = `PELLETS: ${gameState.pelletsCollected}/${gameState.totalPellets}`;
    const statsX = Math.floor((width - statsLine.length) / 2);
    for (let i = 0; i < statsLine.length; i++) {
        grid[statsY][statsX + i] = statsLine[i];
    }

    // Draw phase-specific messages
    const msgY = statsY + 2;
    let message = '';
    if (gameState.phase === 'game_over') {
        message = '>>> GAME OVER - PRESS R TO RESTART <<<';
    } else if (gameState.phase === 'win') {
        message = '>>> YOU WIN! - PRESS R TO RESTART <<<';
    } else if (gameState.phase === 'playing') {
        message = 'Say "go up/down/left/right" to move';
    }

    if (message) {
        const msgX = Math.floor((width - message.length) / 2);
        for (let i = 0; i < message.length; i++) {
            grid[msgY][msgX + i] = message[i];
        }
    }

    // Draw legend
    const legendY = statsY + 4;
    const legend = [
        { char: CHARS.ROBOT, label: 'YOU', color: COLORS.ROBOT },
        { char: CHARS.PELLET, label: 'PELLET', color: COLORS.PELLET },
        { char: CHARS.BOMB, label: 'BOMB', color: COLORS.BOMB },
        { char: CHARS.WALL, label: 'WALL', color: COLORS.WALL },
    ];

    const legendStr = legend.map(l => `${l.char}=${l.label}`).join('  ');
    const legendX = Math.floor((width - legendStr.length) / 2);
    let pos = legendX;
    for (const item of legend) {
        const str = `${item.char}=${item.label}  `;
        for (let i = 0; i < str.length; i++) {
            grid[legendY][pos + i] = str[i];
        }
        pos += str.length;
    }

    // Convert grid to colored HTML
    const html = gridToColoredHtml(grid, offsetX, offsetY, mapStartX, mapStartY, mapWidth, mapHeight, legend);
    gameState.screenEl.innerHTML = html;
}

/**
 * Convert grid to colored HTML with spans
 */
function gridToColoredHtml(grid, offsetX, offsetY, mapStartX, mapStartY, mapWidth, mapHeight, legend) {
    let html = '';

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const char = grid[y][x];
            let color = COLORS.TEXT;

            // Check if we're in the map area
            const inMapX = x >= mapStartX && x < mapStartX + mapWidth;
            const inMapY = y >= mapStartY && y < mapStartY + mapHeight;

            if (inMapX && inMapY) {
                // Color based on character
                switch (char) {
                    case CHARS.ROBOT: color = COLORS.ROBOT; break;
                    case CHARS.PELLET: color = COLORS.PELLET; break;
                    case CHARS.BOMB: color = COLORS.BOMB; break;
                    case CHARS.WALL: color = COLORS.WALL; break;
                }
            } else if (char === CHARS.BORDER_H || char === CHARS.BORDER_V ||
                       char === CHARS.CORNER_TL || char === CHARS.CORNER_TR ||
                       char === CHARS.CORNER_BL || char === CHARS.CORNER_BR) {
                color = COLORS.BORDER;
            }

            // Legend coloring - check for legend characters
            const legendY = mapStartY + mapHeight + 6;
            if (y === legendY) {
                if (char === CHARS.ROBOT) color = COLORS.ROBOT;
                else if (char === CHARS.PELLET) color = COLORS.PELLET;
                else if (char === CHARS.BOMB) color = COLORS.BOMB;
                else if (char === CHARS.WALL) color = COLORS.WALL;
            }

            // Escape HTML entities
            let displayChar = char;
            if (char === '<') displayChar = '&lt;';
            else if (char === '>') displayChar = '&gt;';
            else if (char === '&') displayChar = '&amp;';

            if (color !== COLORS.TEXT) {
                html += `<span style="color:${color}">${displayChar}</span>`;
            } else {
                html += displayChar;
            }
        }
        html += '\n';
    }

    return html;
}

/**
 * Handle a direction command from the player
 */
export function handleDirection(direction) {
    const result = moveRobot(direction);
    renderBoard();
    return result;
}

/**
 * Start a new game
 */
export function startGame(screenEl, callbacks = {}) {
    gameState.screenEl = screenEl;
    gameState.callbacks = { ...gameState.callbacks, ...callbacks };
    gameState.phase = 'playing';

    generateMap();
    renderBoard();

    return gameState;
}

/**
 * Restart the game
 */
export function restartGame() {
    gameState.phase = 'playing';
    generateMap();
    renderBoard();

    if (gameState.callbacks.speak) {
        gameState.callbacks.speak('Navigation systems online. Ready for your commands!');
    }
}

/**
 * Get current game phase
 */
export function getPhase() {
    return gameState.phase;
}

/**
 * Set game phase (for loading state)
 */
export function setPhase(phase) {
    gameState.phase = phase;
}
