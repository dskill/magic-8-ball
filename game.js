/**
 * ASCII Survivor Game Engine
 * A vampire survivors style game with robot voice announcements
 */

export const gameState = {
    running: false,
    paused: false,
    width: 60,
    height: 35,
    player: { x: 30, y: 17, char: '@', color: '#00ffff', facing: 'right' },
    enemies: [],
    drops: [],
    projectiles: [],
    bombs: [],
    explosions: [],
    weapons: {
        bomb: 0,
        projectile: 0,
        speed: 0
    },
    time: 0,
    score: 0,
    wave: 1,
    keys: {},
    grid: null,
    gridColors: null,
    lastSpawn: 0,
    spawnInterval: 2500,
    gameLoopId: null,
    lastFrameTime: 0,
    fps: 30,
    bombCooldown: 0,
    projectileCooldown: 0,
    speedBoostActive: 0,
    speedBoostCooldown: 0,
    kills: 0,
    pulseTime: 0,
    screenEl: null,
    onWaveChange: null,
    onGameOver: null,
    onGameStart: null,
    lastAnnouncedWave: 0
};

const ENEMY_TYPES = [
    { char: 'V', color: '#ff0000', speed: 0.064, points: 10, name: 'Vampire', maxHp: 2 },
    { char: 'Z', color: '#ff8800', speed: 0.045, points: 5, name: 'Zombie', maxHp: 2 },
    { char: 'G', color: '#8800ff', speed: 0.090, points: 15, name: 'Ghost', maxHp: 2 },
    { char: 'W', color: '#ffff00', speed: 0.038, points: 8, name: 'Wraith', maxHp: 2 },
    { char: 'D', color: '#00ff00', speed: 0.055, points: 12, name: 'Demon', maxHp: 3 }
];

const WEAPON_CONFIG = {
    bomb: {
        1: { radius: 4, cooldown: 3.0, fuseTime: 2.0 },
        2: { radius: 5, cooldown: 2.5, fuseTime: 1.8 },
        3: { radius: 6, cooldown: 2.0, fuseTime: 1.5 },
        4: { radius: 7, cooldown: 1.5, fuseTime: 1.2 }
    },
    projectile: {
        1: { count: 1, speed: 8, cooldown: 0.8 },
        2: { count: 1, speed: 12, cooldown: 0.6 },
        3: { count: 2, speed: 12, cooldown: 0.5 },
        4: { count: 3, speed: 15, cooldown: 0.4 }
    },
    speed: {
        1: { duration: 3.0, cooldown: 8.0, multiplier: 1.5 },
        2: { duration: 4.0, cooldown: 7.0, multiplier: 1.5 },
        3: { duration: 5.0, cooldown: 6.0, multiplier: 1.5 },
        4: { duration: 6.0, cooldown: 5.0, multiplier: 1.5 }
    }
};

// Wave announcements - the robot will speak these
export const WAVE_ANNOUNCEMENTS = {
    1: "Warning. Hostile entities detected. Wave one commencing. Prepare for combat.",
    2: "Alert. Wave two approaching. Enemy reinforcements inbound.",
    3: "Danger. Wave three initiated. Multiple threat signatures detected.",
    4: "Critical warning. Wave four. High density hostile formation approaching.",
    5: "Emergency. Wave five. Extreme threat level. Survival probability decreasing.",
    6: "Maximum alert. Wave six. Overwhelming force detected. Good luck, human.",
    7: "Wave seven. They are everywhere. I cannot guarantee your survival.",
    8: "Wave eight. This is beyond my calculations. Fight well.",
    9: "Wave nine. I am detecting something massive approaching.",
    10: "Final wave. All systems critical. It has been an honor serving you."
};

function getTotalWeaponLevel() {
    return gameState.weapons.bomb + gameState.weapons.projectile + gameState.weapons.speed;
}

function getScaledEnemySpeed(baseSpeed) {
    const totalLevel = getTotalWeaponLevel();
    const speedMultiplier = 1 + (totalLevel * 0.05);
    return baseSpeed * speedMultiplier;
}

function getScaledSpawnInterval(baseInterval) {
    const totalLevel = getTotalWeaponLevel();
    const waveMultiplier = gameState.wave <= 2 ? 1 : (gameState.wave === 3 ? 3 : 5);
    const reduction = totalLevel * 0.1;
    const minInterval = 150;
    const scaledInterval = baseInterval * (1 - reduction) / waveMultiplier;
    return Math.max(minInterval, scaledInterval);
}

export function startGame(screenEl, callbacks = {}) {
    if (gameState.running) {
        stopGame();
    }

    gameState.screenEl = screenEl;
    gameState.onWaveChange = callbacks.onWaveChange || null;
    gameState.onGameOver = callbacks.onGameOver || null;
    gameState.onGameStart = callbacks.onGameStart || null;

    gameState.grid = Array(gameState.height).fill(null).map(() =>
        Array(gameState.width).fill(' ')
    );
    gameState.gridColors = Array(gameState.height).fill(null).map(() =>
        Array(gameState.width).fill('#00ffff')
    );

    gameState.player = { x: Math.floor(gameState.width / 2), y: Math.floor(gameState.height / 2), char: '@', color: '#00ffff', facing: 'right' };
    gameState.enemies = [];
    gameState.drops = [];
    gameState.projectiles = [];
    gameState.bombs = [];
    gameState.explosions = [];
    gameState.weapons = { bomb: 0, projectile: 0, speed: 0 };
    gameState.time = 0;
    gameState.score = 0;
    gameState.wave = 1;
    gameState.keys = {};
    gameState.running = true;
    gameState.paused = false;
    gameState.lastSpawn = Date.now();
    gameState.lastFrameTime = Date.now();
    gameState.startTime = Date.now();
    gameState.bombCooldown = 0;
    gameState.projectileCooldown = 0;
    gameState.speedBoostActive = 0;
    gameState.speedBoostCooldown = 0;
    gameState.kills = 0;
    gameState.pulseTime = 0;
    gameState.lastAnnouncedWave = 0;

    // Start with a random weapon
    const startWeapons = ['bomb', 'projectile', 'speed'];
    const startWeapon = startWeapons[Math.floor(Math.random() * startWeapons.length)];
    gameState.weapons[startWeapon] = 1;

    setupInput();

    if (gameState.onGameStart) {
        gameState.onGameStart();
    }

    // Announce first wave
    if (gameState.onWaveChange) {
        gameState.onWaveChange(1, WAVE_ANNOUNCEMENTS[1]);
        gameState.lastAnnouncedWave = 1;
    }

    gameLoop();
}

export function stopGame() {
    gameState.running = false;
    if (gameState.gameLoopId) {
        clearTimeout(gameState.gameLoopId);
        gameState.gameLoopId = null;
    }
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
}

export function pauseGame() {
    gameState.paused = !gameState.paused;
}

function setupInput() {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}

function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
        gameState.keys[key] = true;
    }
    if (key === 'p') {
        pauseGame();
    }
}

function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    gameState.keys[key] = false;
}

function spawnDrop(x, y) {
    if (Math.random() > 0.25) return;

    const types = ['bomb', 'projectile', 'speed'];
    const weaponType = types[Math.floor(Math.random() * types.length)];

    const dropConfig = {
        bomb: { char: 'B', color: '#ff6600' },
        projectile: { char: 'P', color: '#ffff00' },
        speed: { char: 'S', color: '#ff00ff' }
    };

    const config = dropConfig[weaponType];
    gameState.drops.push({
        x, y,
        char: config.char,
        color: config.color,
        weaponType
    });
}

function activateSpeedBoost() {
    const level = gameState.weapons.speed;
    if (level === 0) return;

    const config = WEAPON_CONFIG.speed[level];
    gameState.speedBoostActive = config.duration;
    gameState.speedBoostCooldown = config.cooldown;
}

function placeBomb() {
    const level = gameState.weapons.bomb;
    if (level === 0) return;

    const config = WEAPON_CONFIG.bomb[level];
    gameState.bombCooldown = config.cooldown;

    gameState.bombs.push({
        x: Math.floor(gameState.player.x),
        y: Math.floor(gameState.player.y),
        fuseTime: config.fuseTime,
        radius: config.radius,
        char: '*',
        color: '#ff6600'
    });
}

function updateBombs(deltaTime) {
    for (let i = gameState.bombs.length - 1; i >= 0; i--) {
        const bomb = gameState.bombs[i];
        bomb.fuseTime -= deltaTime;

        const blinkRate = Math.max(0.1, bomb.fuseTime / 2);
        const shouldBlink = (Math.floor(gameState.time / blinkRate) % 2) === 0;
        bomb.color = shouldBlink ? '#ff6600' : '#ff0000';

        if (bomb.fuseTime <= 0) {
            explodeBomb(bomb);
            gameState.bombs.splice(i, 1);
        }
    }
}

function explodeBomb(bomb) {
    const explosion = {
        x: bomb.x,
        y: bomb.y,
        radius: bomb.radius,
        duration: 0.3,
        age: 0
    };
    gameState.explosions.push(explosion);

    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        const dx = enemy.x - bomb.x;
        const dy = enemy.y - bomb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= bomb.radius) {
            enemy.hp -= 2;
            enemy.damageFlash = 0.2;

            if (enemy.hp <= 0) {
                gameState.score += enemy.points;
                gameState.kills++;
                spawnDrop(Math.floor(enemy.x), Math.floor(enemy.y));
                gameState.enemies.splice(i, 1);
            }
        }
    }
}

function updateExplosions(deltaTime) {
    for (let i = gameState.explosions.length - 1; i >= 0; i--) {
        const explosion = gameState.explosions[i];
        explosion.age += deltaTime;

        if (explosion.age >= explosion.duration) {
            gameState.explosions.splice(i, 1);
        }
    }
}

function attackProjectile() {
    const level = gameState.weapons.projectile;
    if (level === 0) return;

    const config = WEAPON_CONFIG.projectile[level];
    gameState.projectileCooldown = config.cooldown;

    const targets = findNearestEnemies(config.count);

    for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const angle = Math.atan2(target.y - gameState.player.y, target.x - gameState.player.x);

        let spreadAngle = angle;
        if (config.count > 1) {
            const spreadAmount = 0.3;
            spreadAngle = angle + (i - (config.count - 1) / 2) * spreadAmount;
        }

        gameState.projectiles.push({
            x: gameState.player.x,
            y: gameState.player.y,
            vx: Math.cos(spreadAngle) * config.speed,
            vy: Math.sin(spreadAngle) * config.speed,
            char: '-',
            color: '#ffff00'
        });
    }
}

function findNearestEnemies(count) {
    if (gameState.enemies.length === 0) return [];

    const sorted = [...gameState.enemies].sort((a, b) => {
        const distA = Math.sqrt((a.x - gameState.player.x) ** 2 + (a.y - gameState.player.y) ** 2);
        const distB = Math.sqrt((b.x - gameState.player.x) ** 2 + (b.y - gameState.player.y) ** 2);
        return distA - distB;
    });

    return sorted.slice(0, count);
}

function updateProjectiles(deltaTime) {
    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        const proj = gameState.projectiles[i];

        proj.x += proj.vx * deltaTime;
        proj.y += proj.vy * deltaTime;

        if (proj.x < 0 || proj.x >= gameState.width || proj.y < 0 || proj.y >= gameState.height) {
            gameState.projectiles.splice(i, 1);
            continue;
        }

        const px = Math.floor(proj.x);
        const py = Math.floor(proj.y);

        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
            const enemy = gameState.enemies[j];
            const ex = Math.floor(enemy.x);
            const ey = Math.floor(enemy.y);

            if (px === ex && py === ey) {
                enemy.hp--;
                enemy.damageFlash = 0.1;
                if (enemy.hp <= 0) {
                    gameState.score += enemy.points;
                    gameState.kills++;
                    spawnDrop(ex, ey);
                    gameState.enemies.splice(j, 1);
                }
                gameState.projectiles.splice(i, 1);
                break;
            }
        }
    }
}

function gameLoop() {
    if (!gameState.running) return;

    const now = Date.now();
    const deltaTime = (now - gameState.lastFrameTime) / 1000;
    gameState.lastFrameTime = now;

    if (gameState.paused) {
        gameState.gameLoopId = setTimeout(() => gameLoop(), 1000 / gameState.fps);
        return;
    }

    gameState.time = (now - gameState.startTime) / 1000;
    gameState.pulseTime += deltaTime;

    // Check for wave change
    const newWave = Math.floor(gameState.time / 30) + 1;
    if (newWave > gameState.wave) {
        gameState.wave = newWave;

        // Announce new wave
        if (gameState.onWaveChange && newWave > gameState.lastAnnouncedWave) {
            const announcement = WAVE_ANNOUNCEMENTS[newWave] ||
                `Wave ${newWave}. Threat level continues to escalate. Remain vigilant.`;
            gameState.onWaveChange(newWave, announcement);
            gameState.lastAnnouncedWave = newWave;
        }
    }

    const baseSpawnInterval = Math.max(500, 2500 - (gameState.wave * 150));
    gameState.spawnInterval = getScaledSpawnInterval(baseSpawnInterval);

    if (now - gameState.lastSpawn > gameState.spawnInterval) {
        spawnEnemy();
        gameState.lastSpawn = now;
    }

    if (gameState.bombCooldown > 0) gameState.bombCooldown -= deltaTime;
    if (gameState.projectileCooldown > 0) gameState.projectileCooldown -= deltaTime;
    if (gameState.speedBoostCooldown > 0) gameState.speedBoostCooldown -= deltaTime;
    if (gameState.speedBoostActive > 0) gameState.speedBoostActive -= deltaTime;

    updatePlayer(deltaTime);
    updateEnemies(deltaTime);
    updateProjectiles(deltaTime);
    updateBombs(deltaTime);
    updateExplosions(deltaTime);

    // Auto-place bombs
    if (gameState.weapons.bomb > 0 && gameState.bombCooldown <= 0) {
        placeBomb();
    }

    // Auto-fire projectiles
    if (gameState.weapons.projectile > 0 && gameState.projectileCooldown <= 0 && gameState.enemies.length > 0) {
        attackProjectile();
    }

    // Auto-activate speed boost
    if (gameState.weapons.speed > 0 && gameState.speedBoostCooldown <= 0 && gameState.speedBoostActive <= 0) {
        activateSpeedBoost();
    }

    if (checkCollisions()) {
        gameOver();
        return;
    }

    // Collect drops
    for (let i = gameState.drops.length - 1; i >= 0; i--) {
        const drop = gameState.drops[i];
        const px = Math.floor(gameState.player.x);
        const py = Math.floor(gameState.player.y);
        const dx = Math.floor(drop.x);
        const dy = Math.floor(drop.y);

        if (px === dx && py === dy) {
            if (gameState.weapons[drop.weaponType] < 4) {
                gameState.weapons[drop.weaponType]++;
            }
            gameState.drops.splice(i, 1);
        }
    }

    render();

    gameState.gameLoopId = setTimeout(() => gameLoop(), 1000 / gameState.fps);
}

function updatePlayer(deltaTime) {
    let baseSpeed = 13;

    if (gameState.speedBoostActive > 0 && gameState.weapons.speed > 0) {
        const config = WEAPON_CONFIG.speed[gameState.weapons.speed];
        baseSpeed *= config.multiplier;
        gameState.player.color = '#ff00ff';
    } else {
        gameState.player.color = '#00ffff';
    }

    const speed = baseSpeed * deltaTime;
    let dx = 0, dy = 0;

    if (gameState.keys['w'] || gameState.keys['arrowup']) {
        dy -= speed;
        gameState.player.facing = 'up';
    }
    if (gameState.keys['s'] || gameState.keys['arrowdown']) {
        dy += speed;
        gameState.player.facing = 'down';
    }
    if (gameState.keys['a'] || gameState.keys['arrowleft']) {
        dx -= speed;
        gameState.player.facing = 'left';
    }
    if (gameState.keys['d'] || gameState.keys['arrowright']) {
        dx += speed;
        gameState.player.facing = 'right';
    }

    if (dx !== 0 && dy !== 0) {
        const factor = Math.sqrt(2) / 2;
        dx *= factor;
        dy *= factor;
    }

    gameState.player.x = Math.max(1, Math.min(gameState.width - 2, gameState.player.x + dx));
    gameState.player.y = Math.max(1, Math.min(gameState.height - 2, gameState.player.y + dy));
}

function spawnEnemy() {
    const availableTypes = ENEMY_TYPES.slice(0, Math.min(ENEMY_TYPES.length, 1 + Math.floor(gameState.wave / 2)));
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const edge = Math.floor(Math.random() * 4);

    let x, y;
    switch (edge) {
        case 0: x = Math.random() * gameState.width; y = 0; break;
        case 1: x = gameState.width - 1; y = Math.random() * gameState.height; break;
        case 2: x = Math.random() * gameState.width; y = gameState.height - 1; break;
        case 3: x = 0; y = Math.random() * gameState.height; break;
    }

    gameState.enemies.push({
        x, y,
        char: type.char,
        color: type.color,
        speed: getScaledEnemySpeed(type.speed),
        points: type.points,
        name: type.name,
        hp: type.maxHp,
        phaseTimer: 0,
        damageFlash: 0
    });
}

function updateEnemies(deltaTime) {
    const collisionRadius = 1.5;

    for (let i = 0; i < gameState.enemies.length; i++) {
        const enemy = gameState.enemies[i];

        if (enemy.damageFlash > 0) {
            enemy.damageFlash -= deltaTime;
        }

        const dx = gameState.player.x - enemy.x;
        const dy = gameState.player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            let moveSpeed = enemy.speed * 60 * deltaTime;
            let targetDx = dx;
            let targetDy = dy;

            if (enemy.name === 'Vampire' && dist < 10) {
                moveSpeed *= 2;
            }

            if (enemy.name === 'Wraith' && enemy.hp === 1) {
                targetDx = -dx;
                targetDy = -dy;
            }

            if (enemy.name === 'Ghost') {
                enemy.phaseTimer += deltaTime;
                if (enemy.phaseTimer > 0.5) {
                    enemy.phaseTimer = 0;
                    const angle = Math.random() * Math.PI * 2;
                    targetDx = Math.cos(angle) * dist;
                    targetDy = Math.sin(angle) * dist;
                }
            }

            // Collision avoidance
            let repelX = 0;
            let repelY = 0;
            for (let j = 0; j < gameState.enemies.length; j++) {
                if (i === j) continue;

                const other = gameState.enemies[j];
                const edx = enemy.x - other.x;
                const edy = enemy.y - other.y;
                const edist = Math.sqrt(edx * edx + edy * edy);

                if (edist > 0 && edist < collisionRadius) {
                    const repelStrength = (collisionRadius - edist) / collisionRadius;
                    repelX += (edx / edist) * repelStrength;
                    repelY += (edy / edist) * repelStrength;
                }
            }

            const totalRepel = Math.sqrt(repelX * repelX + repelY * repelY);
            if (totalRepel > 0) {
                repelX = (repelX / totalRepel) * moveSpeed * 0.7;
                repelY = (repelY / totalRepel) * moveSpeed * 0.7;

                const targetDist = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
                targetDx = (targetDx / targetDist) * moveSpeed * 0.3;
                targetDy = (targetDy / targetDist) * moveSpeed * 0.3;

                enemy.x += targetDx + repelX;
                enemy.y += targetDy + repelY;
            } else {
                const targetDist = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
                enemy.x += (targetDx / targetDist) * moveSpeed;
                enemy.y += (targetDy / targetDist) * moveSpeed;
            }
        }
    }
}

function checkCollisions() {
    const px = Math.floor(gameState.player.x);
    const py = Math.floor(gameState.player.y);

    for (const enemy of gameState.enemies) {
        const ex = Math.floor(enemy.x);
        const ey = Math.floor(enemy.y);

        if (px === ex && py === ey) {
            return true;
        }
    }

    return false;
}

function render() {
    // Clear grid
    for (let y = 0; y < gameState.height; y++) {
        for (let x = 0; x < gameState.width; x++) {
            gameState.grid[y][x] = ' ';
            gameState.gridColors[y][x] = '#00ffff';
        }
    }

    // Draw border
    for (let x = 0; x < gameState.width; x++) {
        gameState.grid[0][x] = '=';
        gameState.grid[gameState.height - 1][x] = '=';
        gameState.gridColors[0][x] = '#00ffff';
        gameState.gridColors[gameState.height - 1][x] = '#00ffff';
    }
    for (let y = 0; y < gameState.height; y++) {
        gameState.grid[y][0] = '|';
        gameState.grid[y][gameState.width - 1] = '|';
        gameState.gridColors[y][0] = '#00ffff';
        gameState.gridColors[y][gameState.width - 1] = '#00ffff';
    }
    gameState.grid[0][0] = '+';
    gameState.grid[0][gameState.width - 1] = '+';
    gameState.grid[gameState.height - 1][0] = '+';
    gameState.grid[gameState.height - 1][gameState.width - 1] = '+';

    // Render explosions
    for (const explosion of gameState.explosions) {
        const progress = explosion.age / explosion.duration;
        const currentRadius = explosion.radius * (1 - progress * 0.3);

        for (let y = 1; y < gameState.height - 1; y++) {
            for (let x = 1; x < gameState.width - 1; x++) {
                const dx = x - explosion.x;
                const dy = y - explosion.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= currentRadius) {
                    gameState.grid[y][x] = '*';
                    gameState.gridColors[y][x] = progress < 0.5 ? '#ffff00' : '#ff6600';
                }
            }
        }
    }

    // Render drops
    for (const drop of gameState.drops) {
        const dx = Math.floor(drop.x);
        const dy = Math.floor(drop.y);
        if (dx >= 1 && dx < gameState.width - 1 && dy >= 1 && dy < gameState.height - 1) {
            gameState.grid[dy][dx] = drop.char;
            gameState.gridColors[dy][dx] = drop.color;
        }
    }

    // Render bombs
    for (const bomb of gameState.bombs) {
        if (bomb.x >= 1 && bomb.x < gameState.width - 1 && bomb.y >= 1 && bomb.y < gameState.height - 1) {
            gameState.grid[bomb.y][bomb.x] = bomb.char;
            gameState.gridColors[bomb.y][bomb.x] = bomb.color;
        }
    }

    // Render projectiles
    for (const proj of gameState.projectiles) {
        const px = Math.floor(proj.x);
        const py = Math.floor(proj.y);
        if (px >= 1 && px < gameState.width - 1 && py >= 1 && py < gameState.height - 1) {
            gameState.grid[py][px] = proj.char;
            gameState.gridColors[py][px] = proj.color;
        }
    }

    // Render enemies
    for (const enemy of gameState.enemies) {
        const ex = Math.floor(enemy.x);
        const ey = Math.floor(enemy.y);
        if (ex >= 1 && ex < gameState.width - 1 && ey >= 1 && ey < gameState.height - 1) {
            gameState.grid[ey][ex] = enemy.char;
            gameState.gridColors[ey][ex] = enemy.damageFlash > 0 ? '#ffffff' : enemy.color;
        }
    }

    // Render player
    const px = Math.floor(gameState.player.x);
    const py = Math.floor(gameState.player.y);
    gameState.grid[py][px] = '@';
    gameState.gridColors[py][px] = gameState.player.color;

    // Build HTML
    let html = '';
    for (let y = 0; y < gameState.height; y++) {
        for (let x = 0; x < gameState.width; x++) {
            const char = gameState.grid[y][x];
            const color = gameState.gridColors[y][x];
            html += `<span style="color:${color}">${char}</span>`;
        }
        html += '\n';
    }

    if (gameState.screenEl) {
        gameState.screenEl.innerHTML = html;
    }
}

function gameOver() {
    gameState.running = false;

    const centerY = Math.floor(gameState.height / 2);
    const gameOverText = 'GAME OVER';
    const statsText = `Time: ${Math.floor(gameState.time)}s  Score: ${gameState.score}  Kills: ${gameState.kills}`;
    const restartText = 'Press SPACE to restart';

    const startX1 = Math.floor((gameState.width - gameOverText.length) / 2);
    const startX2 = Math.floor((gameState.width - statsText.length) / 2);
    const startX3 = Math.floor((gameState.width - restartText.length) / 2);

    for (let i = 0; i < gameOverText.length; i++) {
        if (startX1 + i >= 0 && startX1 + i < gameState.width) {
            gameState.grid[centerY][startX1 + i] = gameOverText[i];
            gameState.gridColors[centerY][startX1 + i] = '#ff0000';
        }
    }
    for (let i = 0; i < statsText.length; i++) {
        if (startX2 + i >= 0 && startX2 + i < gameState.width) {
            gameState.grid[centerY + 2][startX2 + i] = statsText[i];
            gameState.gridColors[centerY + 2][startX2 + i] = '#ffff00';
        }
    }
    for (let i = 0; i < restartText.length; i++) {
        if (startX3 + i >= 0 && startX3 + i < gameState.width) {
            gameState.grid[centerY + 4][startX3 + i] = restartText[i];
            gameState.gridColors[centerY + 4][startX3 + i] = '#00ffff';
        }
    }

    let html = '';
    for (let y = 0; y < gameState.height; y++) {
        for (let x = 0; x < gameState.width; x++) {
            const char = gameState.grid[y][x];
            const color = gameState.gridColors[y][x];
            html += `<span style="color:${color}">${char}</span>`;
        }
        html += '\n';
    }

    if (gameState.screenEl) {
        gameState.screenEl.innerHTML = html;
    }

    if (gameState.onGameOver) {
        gameState.onGameOver({
            time: Math.floor(gameState.time),
            score: gameState.score,
            wave: gameState.wave,
            kills: gameState.kills
        });
    }
}

// Export game state getter for UI updates
export function getGameStats() {
    return {
        time: Math.floor(gameState.time),
        score: gameState.score,
        wave: gameState.wave,
        kills: gameState.kills,
        enemies: gameState.enemies.length,
        weapons: { ...gameState.weapons },
        running: gameState.running,
        paused: gameState.paused
    };
}
