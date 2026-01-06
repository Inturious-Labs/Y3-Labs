// Game constants
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const FPS = 60;

// Colors
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const RED = '#FF0000';
const BLUE = '#0064FF';
const YELLOW = '#FFFF00';
const DARK_BLUE = '#003296';

// Player settings
const PLAYER_SPEED = 5;
const PLAYER_SIZE = 60;

// Bullet settings
const BULLET_SPEED = 10;
const BULLET_SIZE = 5;
const FIRE_RATE_DELAY = 15; // Frames between shots (0.25 seconds at 60 FPS)

// Enemy settings
const ENEMY_SPEED = 3;
const ENEMY_SIZE = 35;
const ENEMY_SPAWN_RATE = 60;

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Audio context for sound effects
let audioContext;
try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
    console.log('Web Audio API not supported');
}

// Sound effect functions
function playExplosionSound() {
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    const duration = 0.4;
    
    // Create a more complex explosion with multiple components
    
    // 1. Sharp initial crack (high frequency pop)
    const crackOsc = audioContext.createOscillator();
    const crackGain = audioContext.createGain();
    crackOsc.connect(crackGain);
    crackGain.connect(audioContext.destination);
    
    crackOsc.type = 'square';
    crackOsc.frequency.setValueAtTime(800, now);
    crackOsc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
    
    crackGain.gain.setValueAtTime(0.4 * volume, now);
    crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    
    crackOsc.start(now);
    crackOsc.stop(now + 0.08);
    
    // 2. Low rumbling boom (main explosion body)
    const boomOsc = audioContext.createOscillator();
    const boomGain = audioContext.createGain();
    boomOsc.connect(boomGain);
    boomGain.connect(audioContext.destination);
    
    boomOsc.type = 'sawtooth';
    boomOsc.frequency.setValueAtTime(120, now);
    boomOsc.frequency.exponentialRampToValueAtTime(40, now + duration);
    
    boomGain.gain.setValueAtTime(0, now);
    boomGain.gain.linearRampToValueAtTime(0.5 * volume, now + 0.02);
    boomGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    boomOsc.start(now);
    boomOsc.stop(now + duration);
    
    // 3. Mid-range impact sound
    const impactOsc = audioContext.createOscillator();
    const impactGain = audioContext.createGain();
    impactOsc.connect(impactGain);
    impactGain.connect(audioContext.destination);
    
    impactOsc.type = 'triangle';
    impactOsc.frequency.setValueAtTime(300, now);
    impactOsc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    
    impactGain.gain.setValueAtTime(0.3 * volume, now);
    impactGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    impactOsc.start(now);
    impactOsc.stop(now + 0.2);
    
    // 4. Noise burst for texture (using filtered noise)
    const bufferSize = audioContext.sampleRate * 0.1;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = audioContext.createBufferSource();
    const noiseGain = audioContext.createGain();
    const noiseFilter = audioContext.createBiquadFilter();
    
    noiseSource.buffer = noiseBuffer;
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(500, now);
    noiseFilter.Q.setValueAtTime(1, now);
    
    noiseGain.gain.setValueAtTime(0.2 * volume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    noiseSource.start(now);
    noiseSource.stop(now + 0.1);
}

function playCrashSound() {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create crash sound - lower, more abrupt
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.4 * volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.25);
}

// Game state
let player;
let bullets = [];
let enemies = [];
let explosions = [];
let score = 0;
let creditsAtGameStart = 0;
let gameOver = false;
let frameCount = 0;
let keys = {};
let lastShotFrame = 0;
let screenShake = 0;
let playerShakeX = 0;
let playerShakeY = 0;
let level = 1;
let enemiesDefeated = 0;
let levelTextDisplay = 0; // Frames remaining to show level text
let shotsFired = 0;
let shotsHit = 0;
let stars = [];

// Menu state
let inMenu = true;
let selectedOption = 0;
const menuOptions = ['Start Game', 'Upgrades', 'Skins', 'Settings', 'Controls', 'About'];
let showingControls = false;
let showingAbout = false;
let showingSkins = false;
let showingUpgrades = false;
let showingSettings = false;
let upgradeSelectionIndex = 0;
let settingsSelectionIndex = 0;

// Pause state
let isPaused = false;
let pauseSelectedOption = 0;
const pauseMenuOptions = ['Resume', 'Volume', 'Quit to Menu'];

// Settings
let volume = 0.5; // 0 to 1
let turretEnabled = [true, true, true]; // Enable/disable each turret slot

// Load settings from localStorage
function loadSettings() {
    const savedVolume = localStorage.getItem('gameVolume');
    if (savedVolume !== null) {
        volume = parseFloat(savedVolume);
    }
    const savedTurrets = localStorage.getItem('turretEnabled');
    if (savedTurrets) {
        turretEnabled = JSON.parse(savedTurrets);
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('gameVolume', volume.toString());
    localStorage.setItem('turretEnabled', JSON.stringify(turretEnabled));
}

// Skins
const skins = ['F-22 Raptor', 'Eurofighter Typhoon', 'F-35 Lightning', 'Sukhoi Su-27', 'Dassault Rafale'];
let selectedSkin = 1; // Will be updated after functions are defined
let skinSelectionIndex = 0;

// Skin unlock conditions
// Index 0 (F-22): Reach level 4
// Index 1 (Eurofighter): Always unlocked (starter)
// Index 2 (F-35): Reach level 5
// Index 3 (Su-27): Finish level 3 with accuracy > 75%
// Index 4 (Rafale): Finish level 2 with accuracy > 90%
const skinUnlockConditions = [
    { type: 'level', requiredLevel: 4, description: 'Reach Level 4' },
    { type: 'always', description: 'Starter Aircraft' },
    { type: 'level', requiredLevel: 5, description: 'Reach Level 5' },
    { type: 'accuracy', requiredLevel: 3, requiredAccuracy: 75, description: 'Complete Level 3 with 75%+ accuracy' },
    { type: 'accuracy', requiredLevel: 2, requiredAccuracy: 90, description: 'Complete Level 2 with 90%+ accuracy' }
];

// Load unlocked skins from localStorage
function loadUnlockedSkins() {
    const saved = localStorage.getItem('unlockedSkins');
    if (saved) {
        return JSON.parse(saved);
    }
    // Default: only Eurofighter is unlocked
    return [false, true, false, false, false];
}

function saveUnlockedSkins() {
    localStorage.setItem('unlockedSkins', JSON.stringify(unlockedSkins));
}

function loadSelectedSkin() {
    const saved = localStorage.getItem('selectedSkin');
    if (saved !== null) {
        const skinIndex = parseInt(saved);
        // Make sure the saved skin is unlocked, otherwise default to Eurofighter
        const unlocked = loadUnlockedSkins();
        return unlocked[skinIndex] ? skinIndex : 1;
    }
    return 1; // Default to Eurofighter Typhoon
}

function saveSelectedSkin() {
    localStorage.setItem('selectedSkin', selectedSkin.toString());
}

let unlockedSkins = loadUnlockedSkins();
selectedSkin = loadSelectedSkin(); // Load saved skin selection
loadSettings(); // Load volume and turret settings

// Upgrades system
const upgrades = {
    lives: { level: 0, maxLevel: 3, baseCost: 500, costMultiplier: 2, description: 'Extra Lives', effect: '+1 life per level' },
    damage: { level: 0, maxLevel: 5, baseCost: 300, costMultiplier: 1.5, description: 'Damage Boost', effect: '+25% damage per level' },
    turrets: { level: 0, maxLevel: 3, baseCost: 1000, costMultiplier: 2.5, description: 'Auto Turrets', effect: '+1 turret per level' }
};

// Player currency (earned from gameplay, persistent)
let playerCredits = 0;

function loadUpgrades() {
    const saved = localStorage.getItem('playerUpgrades');
    if (saved) {
        const data = JSON.parse(saved);
        upgrades.lives.level = data.lives || 0;
        upgrades.damage.level = data.damage || 0;
        upgrades.turrets.level = data.turrets || 0;
    }
    const credits = localStorage.getItem('playerCredits');
    if (credits) {
        playerCredits = parseInt(credits) || 0;
    }
}

function saveUpgrades() {
    localStorage.setItem('playerUpgrades', JSON.stringify({
        lives: upgrades.lives.level,
        damage: upgrades.damage.level,
        turrets: upgrades.turrets.level
    }));
    localStorage.setItem('playerCredits', playerCredits.toString());
}

function getUpgradeCost(upgrade) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
}

function purchaseUpgrade(upgradeName) {
    const upgrade = upgrades[upgradeName];
    if (upgrade.level >= upgrade.maxLevel) return false;
    const cost = getUpgradeCost(upgrade);
    if (playerCredits >= cost) {
        playerCredits -= cost;
        upgrade.level++;
        saveUpgrades();
        return true;
    }
    return false;
}

// Load upgrades on startup
loadUpgrades();

// Game lives system
let lives = 0;
let isRespawning = false;
let respawnTimer = 0;
const RESPAWN_DELAY = 120; // 2 seconds at 60 FPS

// Auto turret system
let lastTurretShotFrame = 0;
const TURRET_FIRE_RATE = 180; // 3 seconds at 60 FPS

function getEnemiesSortedByDistance(x, y) {
    return enemies
        .map(enemy => {
            const dx = enemy.x + enemy.width / 2 - x;
            const dy = enemy.y + enemy.height / 2 - y;
            return { enemy, dist: Math.sqrt(dx * dx + dy * dy) };
        })
        .sort((a, b) => a.dist - b.dist);
}

function fireTurrets() {
    if (upgrades.turrets.level === 0 || isRespawning) return;
    if (frameCount - lastTurretShotFrame < TURRET_FIRE_RATE) return;
    if (enemies.length === 0) return;

    const turretCount = upgrades.turrets.level;
    const turretOffsets = [];

    // Position turrets based on count (centered on plane) - only add enabled turrets
    if (turretCount >= 1 && turretEnabled[0]) turretOffsets.push({ x: -12, y: 30, index: 0 });
    if (turretCount >= 2 && turretEnabled[1]) turretOffsets.push({ x: 12, y: 30, index: 1 });
    if (turretCount >= 3 && turretEnabled[2]) turretOffsets.push({ x: 0, y: 25, index: 2 });

    // If no turrets are enabled, don't fire
    if (turretOffsets.length === 0) return;

    // Get enemies sorted by distance from player center
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const sortedEnemies = getEnemiesSortedByDistance(playerCenterX, playerCenterY);

    for (let i = 0; i < turretOffsets.length; i++) {
        const offset = turretOffsets[i];
        const turretX = player.x + player.width / 2 + offset.x;
        const turretY = player.y + offset.y;

        // Each turret targets a different enemy (if available)
        // If more turrets than enemies, wrap around to closest enemies
        const targetIndex = i % sortedEnemies.length;
        const target = sortedEnemies[targetIndex].enemy;

        if (target) {
            // Create a bullet aimed at the target
            const targetX = target.x + target.width / 2;
            const targetY = target.y + target.height / 2;
            const dx = targetX - turretX;
            const dy = targetY - turretY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                const bullet = new Bullet(turretX - BULLET_SIZE / 2, turretY);
                bullet.vx = (dx / dist) * BULLET_SPEED;
                bullet.vy = (dy / dist) * BULLET_SPEED;
                bullet.isHoming = true; // Mark as turret bullet
                bullets.push(bullet);
            }
        }
    }

    lastTurretShotFrame = frameCount;
}

// Check if a skin should be unlocked based on current game state
function checkSkinUnlock(skinIndex, currentLevel, currentAccuracy, isLevelComplete) {
    if (unlockedSkins[skinIndex]) return false; // Already unlocked

    const condition = skinUnlockConditions[skinIndex];

    if (condition.type === 'always') {
        return true;
    } else if (condition.type === 'level') {
        // Unlock when reaching the required level
        if (currentLevel >= condition.requiredLevel) {
            return true;
        }
    } else if (condition.type === 'accuracy') {
        // Unlock when completing the required level with required accuracy
        if (isLevelComplete && currentLevel === condition.requiredLevel && currentAccuracy >= condition.requiredAccuracy) {
            return true;
        }
    }
    return false;
}

// Track skins unlocked during current game session
let skinsUnlockedThisGame = [];

function checkAllSkinUnlocks(isLevelComplete = false) {
    const currentAccuracy = shotsFired > 0 ? (shotsHit / shotsFired * 100) : 0;

    for (let i = 0; i < skins.length; i++) {
        if (checkSkinUnlock(i, level, currentAccuracy, isLevelComplete)) {
            unlockedSkins[i] = true;
            skinsUnlockedThisGame.push(i);
            saveUnlockedSkins();
        }
    }
}

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = PLAYER_SIZE;
        this.height = PLAYER_SIZE;
        this.speed = PLAYER_SPEED;
        this.health = 100;
        this.tilt = 0; // Current tilt angle in radians
    }

    move() {
        const movingLeft = keys['ArrowLeft'] || keys['a'] || keys['A'];
        const movingRight = keys['ArrowRight'] || keys['d'] || keys['D'];

        if (movingLeft) {
            this.x -= this.speed;
        }
        if (movingRight) {
            this.x += this.speed;
        }
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            this.y -= this.speed;
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            this.y += this.speed;
        }

        // Update tilt based on horizontal movement
        const maxTilt = 0.3; // Max tilt angle in radians (~17 degrees)
        const tiltSpeed = 0.15; // How fast to tilt

        if (movingLeft && !movingRight) {
            this.tilt = Math.max(this.tilt - tiltSpeed, -maxTilt);
        } else if (movingRight && !movingLeft) {
            this.tilt = Math.min(this.tilt + tiltSpeed, maxTilt);
        } else {
            // Return to center when not moving horizontally
            if (this.tilt > 0) {
                this.tilt = Math.max(0, this.tilt - tiltSpeed);
            } else if (this.tilt < 0) {
                this.tilt = Math.min(0, this.tilt + tiltSpeed);
            }
        }

        // Keep player on screen
        this.x = Math.max(0, Math.min(this.x, SCREEN_WIDTH - this.width));
        this.y = Math.max(0, Math.min(this.y, SCREEN_HEIGHT - this.height));
    }

    draw(shakeX = 0, shakeY = 0) {
        ctx.save();

        const drawX = this.x + shakeX;
        const drawY = this.y + shakeY;
        const w = this.width;
        const h = this.height;
        const cx = drawX + w / 2;
        const cy = drawY + h / 2;

        // Apply tilt rotation around center
        ctx.translate(cx, cy);
        ctx.rotate(this.tilt);
        ctx.translate(-cx, -cy);

        if (selectedSkin === 0) {
            // F-22 RAPTOR - Smooth stealth design with curves

            const wingGradient = ctx.createLinearGradient(drawX - 15, 0, drawX + w + 15, 0);
            wingGradient.addColorStop(0, '#2D3338');
            wingGradient.addColorStop(0.3, '#6A7279');
            wingGradient.addColorStop(0.5, '#8A9199');
            wingGradient.addColorStop(0.7, '#6A7279');
            wingGradient.addColorStop(1, '#2D3338');

            // Left wing with curves
            ctx.fillStyle = wingGradient;
            ctx.beginPath();
            ctx.moveTo(cx - 6, drawY + h * 0.28);
            ctx.quadraticCurveTo(cx - 20, drawY + h * 0.35, drawX - 18, drawY + h * 0.48);
            ctx.quadraticCurveTo(drawX - 20, drawY + h * 0.58, drawX - 15, drawY + h * 0.62);
            ctx.quadraticCurveTo(drawX - 5, drawY + h * 0.58, cx - 8, drawY + h * 0.52);
            ctx.closePath();
            ctx.fill();

            // Right wing with curves
            ctx.beginPath();
            ctx.moveTo(cx + 6, drawY + h * 0.28);
            ctx.quadraticCurveTo(cx + 20, drawY + h * 0.35, drawX + w + 18, drawY + h * 0.48);
            ctx.quadraticCurveTo(drawX + w + 20, drawY + h * 0.58, drawX + w + 15, drawY + h * 0.62);
            ctx.quadraticCurveTo(drawX + w + 5, drawY + h * 0.58, cx + 8, drawY + h * 0.52);
            ctx.closePath();
            ctx.fill();

            // Horizontal stabilizers with curves
            ctx.beginPath();
            ctx.moveTo(cx - 9, drawY + h * 0.72);
            ctx.quadraticCurveTo(drawX - 5, drawY + h * 0.78, drawX - 10, drawY + h * 0.84);
            ctx.quadraticCurveTo(drawX - 8, drawY + h * 0.92, drawX + 5, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx - 5, drawY + h * 0.82, cx - 8, drawY + h * 0.78);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 9, drawY + h * 0.72);
            ctx.quadraticCurveTo(drawX + w + 5, drawY + h * 0.78, drawX + w + 10, drawY + h * 0.84);
            ctx.quadraticCurveTo(drawX + w + 8, drawY + h * 0.92, drawX + w - 5, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx + 5, drawY + h * 0.82, cx + 8, drawY + h * 0.78);
            ctx.closePath();
            ctx.fill();

            // Fuselage with smooth curves
            const bodyGradient = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0);
            bodyGradient.addColorStop(0, '#3D4348');
            bodyGradient.addColorStop(0.2, '#7A8289');
            bodyGradient.addColorStop(0.5, '#A5ACB4');
            bodyGradient.addColorStop(0.8, '#7A8289');
            bodyGradient.addColorStop(1, '#3D4348');
            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.moveTo(cx, drawY + h * 0.01);
            ctx.bezierCurveTo(cx - 3, drawY + h * 0.02, cx - 6, drawY + h * 0.06, cx - 8, drawY + h * 0.12);
            ctx.bezierCurveTo(cx - 14, drawY + h * 0.2, cx - 14, drawY + h * 0.35, cx - 12, drawY + h * 0.5);
            ctx.bezierCurveTo(cx - 11, drawY + h * 0.7, cx - 10, drawY + h * 0.85, cx - 8, drawY + h * 0.95);
            ctx.lineTo(cx + 8, drawY + h * 0.95);
            ctx.bezierCurveTo(cx + 10, drawY + h * 0.85, cx + 11, drawY + h * 0.7, cx + 12, drawY + h * 0.5);
            ctx.bezierCurveTo(cx + 14, drawY + h * 0.35, cx + 14, drawY + h * 0.2, cx + 8, drawY + h * 0.12);
            ctx.bezierCurveTo(cx + 6, drawY + h * 0.06, cx + 3, drawY + h * 0.02, cx, drawY + h * 0.01);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#2D3338';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Canted vertical tails with curves
            ctx.fillStyle = '#3D4348';
            ctx.beginPath();
            ctx.moveTo(cx - 9, drawY + h * 0.65);
            ctx.quadraticCurveTo(cx - 14, drawY + h * 0.7, cx - 15, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx - 12, drawY + h * 0.86, cx - 10, drawY + h * 0.82);
            ctx.quadraticCurveTo(cx - 8, drawY + h * 0.72, cx - 9, drawY + h * 0.65);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 9, drawY + h * 0.65);
            ctx.quadraticCurveTo(cx + 14, drawY + h * 0.7, cx + 15, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx + 12, drawY + h * 0.86, cx + 10, drawY + h * 0.82);
            ctx.quadraticCurveTo(cx + 8, drawY + h * 0.72, cx + 9, drawY + h * 0.65);
            ctx.fill();

            // Cockpit canopy with smooth shape
            ctx.fillStyle = '#0a1520';
            ctx.beginPath();
            ctx.moveTo(cx, drawY + h * 0.1);
            ctx.bezierCurveTo(cx - 6, drawY + h * 0.12, cx - 7, drawY + h * 0.2, cx - 6, drawY + h * 0.34);
            ctx.quadraticCurveTo(cx, drawY + h * 0.36, cx + 6, drawY + h * 0.34);
            ctx.bezierCurveTo(cx + 7, drawY + h * 0.2, cx + 6, drawY + h * 0.12, cx, drawY + h * 0.1);
            ctx.fill();
            ctx.fillStyle = 'rgba(100, 200, 255, 0.35)';
            ctx.beginPath();
            ctx.ellipse(cx - 2, drawY + h * 0.2, 2.5, 7, -0.1, 0, Math.PI * 2);
            ctx.fill();

            // Engine nozzles
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.roundRect(cx - 10, drawY + h * 0.88, 7, 8, 2);
            ctx.roundRect(cx + 3, drawY + h * 0.88, 7, 8, 2);
            ctx.fill();
            const glowIntensity = 0.6 + Math.sin(Date.now() / 80) * 0.4;
            ctx.fillStyle = `rgba(255, 100, 0, ${glowIntensity})`;
            ctx.beginPath();
            ctx.arc(cx - 6.5, drawY + h * 0.94, 3, 0, Math.PI * 2);
            ctx.arc(cx + 6.5, drawY + h * 0.94, 3, 0, Math.PI * 2);
            ctx.fill();

        } else if (selectedSkin === 1) {
            // EUROFIGHTER TYPHOON - Smooth canard-delta

            const wingGradient = ctx.createLinearGradient(drawX - 18, 0, drawX + w + 18, 0);
            wingGradient.addColorStop(0, '#3A4048');
            wingGradient.addColorStop(0.3, '#6A7178');
            wingGradient.addColorStop(0.5, '#9AA1A9');
            wingGradient.addColorStop(0.7, '#6A7178');
            wingGradient.addColorStop(1, '#3A4048');

            // Delta wings with smooth curves
            ctx.fillStyle = wingGradient;
            ctx.beginPath();
            ctx.moveTo(cx - 5, drawY + h * 0.3);
            ctx.bezierCurveTo(cx - 15, drawY + h * 0.5, drawX - 20, drawY + h * 0.75, drawX - 18, drawY + h * 0.85);
            ctx.quadraticCurveTo(drawX - 10, drawY + h * 0.92, drawX - 2, drawY + h * 0.9);
            ctx.quadraticCurveTo(cx - 6, drawY + h * 0.7, cx - 5, drawY + h * 0.55);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 5, drawY + h * 0.3);
            ctx.bezierCurveTo(cx + 15, drawY + h * 0.5, drawX + w + 20, drawY + h * 0.75, drawX + w + 18, drawY + h * 0.85);
            ctx.quadraticCurveTo(drawX + w + 10, drawY + h * 0.92, drawX + w + 2, drawY + h * 0.9);
            ctx.quadraticCurveTo(cx + 6, drawY + h * 0.7, cx + 5, drawY + h * 0.55);
            ctx.closePath();
            ctx.fill();

            // Canards with curves
            ctx.beginPath();
            ctx.moveTo(cx - 6, drawY + h * 0.18);
            ctx.quadraticCurveTo(drawX - 5, drawY + h * 0.2, drawX - 10, drawY + h * 0.24);
            ctx.quadraticCurveTo(drawX - 8, drawY + h * 0.3, drawX + 5, drawY + h * 0.28);
            ctx.quadraticCurveTo(cx - 4, drawY + h * 0.24, cx - 6, drawY + h * 0.22);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 6, drawY + h * 0.18);
            ctx.quadraticCurveTo(drawX + w + 5, drawY + h * 0.2, drawX + w + 10, drawY + h * 0.24);
            ctx.quadraticCurveTo(drawX + w + 8, drawY + h * 0.3, drawX + w - 5, drawY + h * 0.28);
            ctx.quadraticCurveTo(cx + 4, drawY + h * 0.24, cx + 6, drawY + h * 0.22);
            ctx.closePath();
            ctx.fill();

            // Fuselage with smooth curves
            const bodyGradient = ctx.createLinearGradient(cx - 10, 0, cx + 10, 0);
            bodyGradient.addColorStop(0, '#4A5058');
            bodyGradient.addColorStop(0.2, '#8A9199');
            bodyGradient.addColorStop(0.5, '#B5BCC4');
            bodyGradient.addColorStop(0.8, '#8A9199');
            bodyGradient.addColorStop(1, '#4A5058');
            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.moveTo(cx, drawY + h * 0.01);
            ctx.bezierCurveTo(cx - 4, drawY + h * 0.04, cx - 7, drawY + h * 0.1, cx - 8, drawY + h * 0.18);
            ctx.bezierCurveTo(cx - 9, drawY + h * 0.3, cx - 8, drawY + h * 0.6, cx - 7, drawY + h * 0.92);
            ctx.quadraticCurveTo(cx, drawY + h * 0.94, cx + 7, drawY + h * 0.92);
            ctx.bezierCurveTo(cx + 8, drawY + h * 0.6, cx + 9, drawY + h * 0.3, cx + 8, drawY + h * 0.18);
            ctx.bezierCurveTo(cx + 7, drawY + h * 0.1, cx + 4, drawY + h * 0.04, cx, drawY + h * 0.01);
            ctx.closePath();
            ctx.fill();

            // Vertical tail with curve
            ctx.fillStyle = '#4A5058';
            ctx.beginPath();
            ctx.moveTo(cx - 2, drawY + h * 0.5);
            ctx.quadraticCurveTo(cx - 3, drawY + h * 0.6, cx - 2, drawY + h * 0.88);
            ctx.lineTo(cx + 2, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx + 3, drawY + h * 0.6, cx + 2, drawY + h * 0.5);
            ctx.closePath();
            ctx.fill();

            // Air intakes with curves
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.ellipse(cx - 9, drawY + h * 0.35, 4, 6, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 9, drawY + h * 0.35, 4, 6, -0.2, 0, Math.PI * 2);
            ctx.fill();

            // Cockpit with smooth bubble
            ctx.fillStyle = '#0a1520';
            ctx.beginPath();
            ctx.ellipse(cx, drawY + h * 0.16, 5, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(100, 200, 255, 0.35)';
            ctx.beginPath();
            ctx.ellipse(cx - 1.5, drawY + h * 0.13, 2, 5, -0.15, 0, Math.PI * 2);
            ctx.fill();

            // Twin engines
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(cx - 4, drawY + h * 0.94, 5, 0, Math.PI * 2);
            ctx.arc(cx + 4, drawY + h * 0.94, 5, 0, Math.PI * 2);
            ctx.fill();
            const glowIntensity = 0.6 + Math.sin(Date.now() / 80) * 0.4;
            ctx.fillStyle = `rgba(255, 100, 0, ${glowIntensity})`;
            ctx.beginPath();
            ctx.arc(cx - 4, drawY + h * 0.95, 3.5, 0, Math.PI * 2);
            ctx.arc(cx + 4, drawY + h * 0.95, 3.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (selectedSkin === 2) {
            // F-35 LIGHTNING II - Sleeker stealth design

            const wingGradient = ctx.createLinearGradient(drawX - 22, 0, drawX + w + 22, 0);
            wingGradient.addColorStop(0, '#22282E');
            wingGradient.addColorStop(0.3, '#4A5056');
            wingGradient.addColorStop(0.5, '#6A7076');
            wingGradient.addColorStop(0.7, '#4A5056');
            wingGradient.addColorStop(1, '#22282E');

            // Trapezoid wings - longer and more prominent
            ctx.fillStyle = wingGradient;
            ctx.beginPath();
            ctx.moveTo(cx - 6, drawY + h * 0.35);
            ctx.bezierCurveTo(cx - 12, drawY + h * 0.4, drawX - 20, drawY + h * 0.48, drawX - 22, drawY + h * 0.54);
            ctx.quadraticCurveTo(drawX - 18, drawY + h * 0.66, drawX - 8, drawY + h * 0.64);
            ctx.quadraticCurveTo(cx - 5, drawY + h * 0.56, cx - 6, drawY + h * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 6, drawY + h * 0.35);
            ctx.bezierCurveTo(cx + 12, drawY + h * 0.4, drawX + w + 20, drawY + h * 0.48, drawX + w + 22, drawY + h * 0.54);
            ctx.quadraticCurveTo(drawX + w + 18, drawY + h * 0.66, drawX + w + 8, drawY + h * 0.64);
            ctx.quadraticCurveTo(cx + 5, drawY + h * 0.56, cx + 6, drawY + h * 0.5);
            ctx.closePath();
            ctx.fill();

            // Horizontal stabilizers - extended
            ctx.beginPath();
            ctx.moveTo(cx - 7, drawY + h * 0.74);
            ctx.quadraticCurveTo(drawX - 8, drawY + h * 0.8, drawX - 10, drawY + h * 0.86);
            ctx.quadraticCurveTo(drawX - 6, drawY + h * 0.92, drawX + 4, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx - 4, drawY + h * 0.82, cx - 6, drawY + h * 0.78);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 7, drawY + h * 0.74);
            ctx.quadraticCurveTo(drawX + w + 8, drawY + h * 0.8, drawX + w + 10, drawY + h * 0.86);
            ctx.quadraticCurveTo(drawX + w + 6, drawY + h * 0.92, drawX + w - 4, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx + 4, drawY + h * 0.82, cx + 6, drawY + h * 0.78);
            ctx.closePath();
            ctx.fill();

            // Slimmer fuselage
            const bodyGradient = ctx.createLinearGradient(cx - 10, 0, cx + 10, 0);
            bodyGradient.addColorStop(0, '#32383E');
            bodyGradient.addColorStop(0.2, '#5A6066');
            bodyGradient.addColorStop(0.5, '#8A9096');
            bodyGradient.addColorStop(0.8, '#5A6066');
            bodyGradient.addColorStop(1, '#32383E');
            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.moveTo(cx, drawY + h * 0.01);
            ctx.bezierCurveTo(cx - 4, drawY + h * 0.04, cx - 7, drawY + h * 0.12, cx - 9, drawY + h * 0.22);
            ctx.bezierCurveTo(cx - 10, drawY + h * 0.35, cx - 9, drawY + h * 0.5, cx - 7, drawY + h * 0.7);
            ctx.quadraticCurveTo(cx - 6, drawY + h * 0.85, cx - 5, drawY + h * 0.95);
            ctx.quadraticCurveTo(cx, drawY + h * 0.97, cx + 5, drawY + h * 0.95);
            ctx.quadraticCurveTo(cx + 6, drawY + h * 0.85, cx + 7, drawY + h * 0.7);
            ctx.bezierCurveTo(cx + 9, drawY + h * 0.5, cx + 10, drawY + h * 0.35, cx + 9, drawY + h * 0.22);
            ctx.bezierCurveTo(cx + 7, drawY + h * 0.12, cx + 4, drawY + h * 0.04, cx, drawY + h * 0.01);
            ctx.closePath();
            ctx.fill();

            // DSI bumps - smaller
            ctx.fillStyle = '#32383E';
            ctx.beginPath();
            ctx.ellipse(cx - 8, drawY + h * 0.32, 3, 5, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 8, drawY + h * 0.32, 3, 5, -0.3, 0, Math.PI * 2);
            ctx.fill();

            // Canted tails - adjusted for slimmer body
            ctx.fillStyle = '#32383E';
            ctx.beginPath();
            ctx.moveTo(cx - 7, drawY + h * 0.66);
            ctx.quadraticCurveTo(cx - 10, drawY + h * 0.72, cx - 11, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx - 8, drawY + h * 0.86, cx - 7, drawY + h * 0.82);
            ctx.quadraticCurveTo(cx - 5, drawY + h * 0.74, cx - 7, drawY + h * 0.66);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 7, drawY + h * 0.66);
            ctx.quadraticCurveTo(cx + 10, drawY + h * 0.72, cx + 11, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx + 8, drawY + h * 0.86, cx + 7, drawY + h * 0.82);
            ctx.quadraticCurveTo(cx + 5, drawY + h * 0.74, cx + 7, drawY + h * 0.66);
            ctx.fill();

            // Cockpit with gold tint - narrower
            ctx.fillStyle = '#0a1015';
            ctx.beginPath();
            ctx.moveTo(cx, drawY + h * 0.07);
            ctx.bezierCurveTo(cx - 5, drawY + h * 0.1, cx - 6, drawY + h * 0.2, cx - 5, drawY + h * 0.32);
            ctx.quadraticCurveTo(cx, drawY + h * 0.34, cx + 5, drawY + h * 0.32);
            ctx.bezierCurveTo(cx + 6, drawY + h * 0.2, cx + 5, drawY + h * 0.1, cx, drawY + h * 0.07);
            ctx.fill();
            ctx.fillStyle = 'rgba(220, 200, 100, 0.4)';
            ctx.beginPath();
            ctx.ellipse(cx - 1.5, drawY + h * 0.2, 2, 6, -0.1, 0, Math.PI * 2);
            ctx.fill();

            // Single engine - smaller
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(cx, drawY + h * 0.92, 5, 0, Math.PI * 2);
            ctx.fill();
            const glowIntensity = 0.6 + Math.sin(Date.now() / 80) * 0.4;
            ctx.fillStyle = `rgba(255, 80, 0, ${glowIntensity})`;
            ctx.beginPath();
            ctx.arc(cx, drawY + h * 0.93, 3.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (selectedSkin === 3) {
            // SU-27 FLANKER - Smooth blended body with long wings

            const wingGradient = ctx.createLinearGradient(drawX - 28, 0, drawX + w + 28, 0);
            wingGradient.addColorStop(0, '#1A3A5A');
            wingGradient.addColorStop(0.3, '#4A6A8A');
            wingGradient.addColorStop(0.5, '#7899B8');
            wingGradient.addColorStop(0.7, '#4A6A8A');
            wingGradient.addColorStop(1, '#1A3A5A');

            // LERX with smooth curves
            ctx.fillStyle = wingGradient;
            ctx.beginPath();
            ctx.moveTo(cx - 6, drawY + h * 0.15);
            ctx.bezierCurveTo(cx - 12, drawY + h * 0.18, cx - 18, drawY + h * 0.28, cx - 18, drawY + h * 0.42);
            ctx.quadraticCurveTo(cx - 14, drawY + h * 0.4, cx - 7, drawY + h * 0.36);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 6, drawY + h * 0.15);
            ctx.bezierCurveTo(cx + 12, drawY + h * 0.18, cx + 18, drawY + h * 0.28, cx + 18, drawY + h * 0.42);
            ctx.quadraticCurveTo(cx + 14, drawY + h * 0.4, cx + 7, drawY + h * 0.36);
            ctx.closePath();
            ctx.fill();

            // Main swept wings - longer and more prominent
            ctx.beginPath();
            ctx.moveTo(cx - 16, drawY + h * 0.38);
            ctx.bezierCurveTo(drawX - 20, drawY + h * 0.44, drawX - 28, drawY + h * 0.50, drawX - 26, drawY + h * 0.55);
            ctx.quadraticCurveTo(drawX - 20, drawY + h * 0.66, drawX - 10, drawY + h * 0.64);
            ctx.quadraticCurveTo(cx - 12, drawY + h * 0.56, cx - 14, drawY + h * 0.50);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 16, drawY + h * 0.38);
            ctx.bezierCurveTo(drawX + w + 20, drawY + h * 0.44, drawX + w + 28, drawY + h * 0.50, drawX + w + 26, drawY + h * 0.55);
            ctx.quadraticCurveTo(drawX + w + 20, drawY + h * 0.66, drawX + w + 10, drawY + h * 0.64);
            ctx.quadraticCurveTo(cx + 12, drawY + h * 0.56, cx + 14, drawY + h * 0.50);
            ctx.closePath();
            ctx.fill();

            // Horizontal stabilizers - extended
            ctx.beginPath();
            ctx.moveTo(cx - 14, drawY + h * 0.76);
            ctx.quadraticCurveTo(drawX - 12, drawY + h * 0.82, drawX - 16, drawY + h * 0.88);
            ctx.quadraticCurveTo(drawX - 10, drawY + h * 0.96, drawX - 2, drawY + h * 0.92);
            ctx.quadraticCurveTo(cx - 10, drawY + h * 0.86, cx - 12, drawY + h * 0.82);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 14, drawY + h * 0.76);
            ctx.quadraticCurveTo(drawX + w + 12, drawY + h * 0.82, drawX + w + 16, drawY + h * 0.88);
            ctx.quadraticCurveTo(drawX + w + 10, drawY + h * 0.96, drawX + w + 2, drawY + h * 0.92);
            ctx.quadraticCurveTo(cx + 10, drawY + h * 0.86, cx + 12, drawY + h * 0.82);
            ctx.closePath();
            ctx.fill();

            // Blended fuselage with smooth curves
            const bodyGradient = ctx.createLinearGradient(cx - 10, 0, cx + 10, 0);
            bodyGradient.addColorStop(0, '#2A4A6A');
            bodyGradient.addColorStop(0.2, '#5879A8');
            bodyGradient.addColorStop(0.5, '#88A9C8');
            bodyGradient.addColorStop(0.8, '#5879A8');
            bodyGradient.addColorStop(1, '#2A4A6A');
            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.moveTo(cx, drawY + h * 0.01);
            ctx.bezierCurveTo(cx - 4, drawY + h * 0.04, cx - 7, drawY + h * 0.1, cx - 8, drawY + h * 0.18);
            ctx.bezierCurveTo(cx - 9, drawY + h * 0.3, cx - 7, drawY + h * 0.5, cx - 5, drawY + h * 0.95);
            ctx.quadraticCurveTo(cx, drawY + h * 0.97, cx + 5, drawY + h * 0.95);
            ctx.bezierCurveTo(cx + 7, drawY + h * 0.5, cx + 9, drawY + h * 0.3, cx + 8, drawY + h * 0.18);
            ctx.bezierCurveTo(cx + 7, drawY + h * 0.1, cx + 4, drawY + h * 0.04, cx, drawY + h * 0.01);
            ctx.closePath();
            ctx.fill();

            // Engine nacelles with curves
            ctx.fillStyle = '#2A4A6A';
            ctx.beginPath();
            ctx.moveTo(cx - 8, drawY + h * 0.52);
            ctx.bezierCurveTo(cx - 14, drawY + h * 0.56, cx - 16, drawY + h * 0.65, cx - 16, drawY + h * 0.95);
            ctx.lineTo(cx - 8, drawY + h * 0.95);
            ctx.quadraticCurveTo(cx - 7, drawY + h * 0.7, cx - 8, drawY + h * 0.52);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 8, drawY + h * 0.52);
            ctx.bezierCurveTo(cx + 14, drawY + h * 0.56, cx + 16, drawY + h * 0.65, cx + 16, drawY + h * 0.95);
            ctx.lineTo(cx + 8, drawY + h * 0.95);
            ctx.quadraticCurveTo(cx + 7, drawY + h * 0.7, cx + 8, drawY + h * 0.52);
            ctx.fill();

            // Twin vertical tails with curves
            ctx.beginPath();
            ctx.moveTo(cx - 15, drawY + h * 0.56);
            ctx.quadraticCurveTo(cx - 18, drawY + h * 0.65, cx - 17, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx - 14, drawY + h * 0.86, cx - 14, drawY + h * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 15, drawY + h * 0.56);
            ctx.quadraticCurveTo(cx + 18, drawY + h * 0.65, cx + 17, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx + 14, drawY + h * 0.86, cx + 14, drawY + h * 0.6);
            ctx.closePath();
            ctx.fill();

            // Cockpit
            ctx.fillStyle = '#051525';
            ctx.beginPath();
            ctx.ellipse(cx, drawY + h * 0.15, 5, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(80, 180, 255, 0.35)';
            ctx.beginPath();
            ctx.ellipse(cx - 1.5, drawY + h * 0.12, 2, 5, -0.15, 0, Math.PI * 2);
            ctx.fill();

            // Wide-spaced engines
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(cx - 12, drawY + h * 0.94, 5, 0, Math.PI * 2);
            ctx.arc(cx + 12, drawY + h * 0.94, 5, 0, Math.PI * 2);
            ctx.fill();
            const glowIntensity = 0.6 + Math.sin(Date.now() / 80) * 0.4;
            ctx.fillStyle = `rgba(255, 120, 0, ${glowIntensity})`;
            ctx.beginPath();
            ctx.arc(cx - 12, drawY + h * 0.95, 3.5, 0, Math.PI * 2);
            ctx.arc(cx + 12, drawY + h * 0.95, 3.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (selectedSkin === 4) {
            // DASSAULT RAFALE - Smooth canard delta

            const wingGradient = ctx.createLinearGradient(drawX - 16, 0, drawX + w + 16, 0);
            wingGradient.addColorStop(0, '#2D343D');
            wingGradient.addColorStop(0.3, '#5A6574');
            wingGradient.addColorStop(0.5, '#8A95A4');
            wingGradient.addColorStop(0.7, '#5A6574');
            wingGradient.addColorStop(1, '#2D343D');

            // Delta wings with smooth curves
            ctx.fillStyle = wingGradient;
            ctx.beginPath();
            ctx.moveTo(cx - 5, drawY + h * 0.28);
            ctx.bezierCurveTo(cx - 12, drawY + h * 0.45, drawX - 18, drawY + h * 0.7, drawX - 16, drawY + h * 0.82);
            ctx.quadraticCurveTo(drawX - 8, drawY + h * 0.92, drawX, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx - 5, drawY + h * 0.65, cx - 5, drawY + h * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 5, drawY + h * 0.28);
            ctx.bezierCurveTo(cx + 12, drawY + h * 0.45, drawX + w + 18, drawY + h * 0.7, drawX + w + 16, drawY + h * 0.82);
            ctx.quadraticCurveTo(drawX + w + 8, drawY + h * 0.92, drawX + w, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx + 5, drawY + h * 0.65, cx + 5, drawY + h * 0.5);
            ctx.closePath();
            ctx.fill();

            // Canards with curves
            ctx.beginPath();
            ctx.moveTo(cx - 6, drawY + h * 0.2);
            ctx.quadraticCurveTo(drawX - 2, drawY + h * 0.22, drawX - 8, drawY + h * 0.26);
            ctx.quadraticCurveTo(drawX - 4, drawY + h * 0.34, drawX + 6, drawY + h * 0.32);
            ctx.quadraticCurveTo(cx - 4, drawY + h * 0.28, cx - 6, drawY + h * 0.24);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 6, drawY + h * 0.2);
            ctx.quadraticCurveTo(drawX + w + 2, drawY + h * 0.22, drawX + w + 8, drawY + h * 0.26);
            ctx.quadraticCurveTo(drawX + w + 4, drawY + h * 0.34, drawX + w - 6, drawY + h * 0.32);
            ctx.quadraticCurveTo(cx + 4, drawY + h * 0.28, cx + 6, drawY + h * 0.24);
            ctx.closePath();
            ctx.fill();

            // Fuselage with smooth curves
            const bodyGradient = ctx.createLinearGradient(cx - 10, 0, cx + 10, 0);
            bodyGradient.addColorStop(0, '#3D444D');
            bodyGradient.addColorStop(0.2, '#6A7584');
            bodyGradient.addColorStop(0.5, '#9AA5B4');
            bodyGradient.addColorStop(0.8, '#6A7584');
            bodyGradient.addColorStop(1, '#3D444D');
            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.moveTo(cx, drawY + h * 0.01);
            ctx.bezierCurveTo(cx - 4, drawY + h * 0.04, cx - 7, drawY + h * 0.1, cx - 8, drawY + h * 0.2);
            ctx.bezierCurveTo(cx - 8, drawY + h * 0.35, cx - 7, drawY + h * 0.45, cx - 7, drawY + h * 0.9);
            ctx.quadraticCurveTo(cx, drawY + h * 0.92, cx + 7, drawY + h * 0.9);
            ctx.bezierCurveTo(cx + 7, drawY + h * 0.45, cx + 8, drawY + h * 0.35, cx + 8, drawY + h * 0.2);
            ctx.bezierCurveTo(cx + 7, drawY + h * 0.1, cx + 4, drawY + h * 0.04, cx, drawY + h * 0.01);
            ctx.closePath();
            ctx.fill();

            // Air intakes with curves
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.ellipse(cx - 9, drawY + h * 0.34, 4, 7, 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 9, drawY + h * 0.34, 4, 7, -0.4, 0, Math.PI * 2);
            ctx.fill();

            // Vertical tail with curve
            ctx.fillStyle = '#3D444D';
            ctx.beginPath();
            ctx.moveTo(cx - 2, drawY + h * 0.48);
            ctx.quadraticCurveTo(cx - 3, drawY + h * 0.6, cx - 2, drawY + h * 0.88);
            ctx.lineTo(cx + 2, drawY + h * 0.88);
            ctx.quadraticCurveTo(cx + 3, drawY + h * 0.6, cx + 2, drawY + h * 0.48);
            ctx.closePath();
            ctx.fill();

            // Cockpit
            ctx.fillStyle = '#0a1520';
            ctx.beginPath();
            ctx.ellipse(cx, drawY + h * 0.15, 5, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(100, 200, 255, 0.35)';
            ctx.beginPath();
            ctx.ellipse(cx - 1.5, drawY + h * 0.12, 2, 5, -0.15, 0, Math.PI * 2);
            ctx.fill();

            // Twin engines
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(cx - 4, drawY + h * 0.93, 4, 0, Math.PI * 2);
            ctx.arc(cx + 4, drawY + h * 0.93, 4, 0, Math.PI * 2);
            ctx.fill();
            const glowIntensity = 0.6 + Math.sin(Date.now() / 80) * 0.4;
            ctx.fillStyle = `rgba(255, 100, 0, ${glowIntensity})`;
            ctx.beginPath();
            ctx.arc(cx - 4, drawY + h * 0.94, 2.5, 0, Math.PI * 2);
            ctx.arc(cx + 4, drawY + h * 0.94, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    getRect() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

// Bullet class
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = BULLET_SIZE;
        this.height = BULLET_SIZE * 2;
        this.speed = BULLET_SPEED;
        this.vx = 0; // For directional bullets (turrets)
        this.vy = -BULLET_SPEED; // Default: straight up
        this.isHoming = false; // Turret bullets
    }

    update() {
        if (this.isHoming) {
            this.x += this.vx;
            this.y += this.vy;
        } else {
            this.y -= this.speed;
        }
    }

    draw() {
        ctx.fillStyle = this.isHoming ? '#00FFFF' : YELLOW; // Cyan for turret bullets
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    getRect() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    isOffScreen() {
        // Check all screen edges for homing bullets
        return this.y < -20 || this.y > SCREEN_HEIGHT + 20 ||
               this.x < -20 || this.x > SCREEN_WIDTH + 20;
    }
}

// Enemy class
// Enemy types configuration
const ENEMY_TYPES = {
    basic: {
        health: 100,
        damage: 25,
        colors: { light: '#ff3333', main: '#cc0000', dark: '#990000', cockpit: '#330000', cockpitLight: '#C80000' },
        spawnWeight: 70
    },
    intermediate: {
        health: 200,
        damage: 40,
        colors: { light: '#ffaa33', main: '#ff8800', dark: '#cc6600', cockpit: '#332200', cockpitLight: '#cc8800' },
        spawnWeight: 25
    },
    strong: {
        health: 300,
        damage: 60,
        colors: { light: '#cc66ff', main: '#9933cc', dark: '#660099', cockpit: '#220033', cockpitLight: '#9944cc' },
        spawnWeight: 5
    }
};

class Enemy {
    constructor(x, y, speedMultiplier = 1, type = 'basic') {
        this.x = x;
        this.y = y;
        this.width = ENEMY_SIZE;
        this.height = ENEMY_SIZE;
        this.type = type;
        const typeConfig = ENEMY_TYPES[type];
        this.speed = (ENEMY_SPEED * speedMultiplier) + (Math.random() * 2 - 1);
        // Stronger enemies are slightly slower
        if (type === 'intermediate') this.speed *= 0.85;
        if (type === 'strong') this.speed *= 0.7;
        this.maxHealth = typeConfig.health;
        this.health = this.maxHealth;
        this.damage = typeConfig.damage;
        this.colors = typeConfig.colors;
    }

    update() {
        this.y += this.speed;
    }

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }

    draw() {
        ctx.save();
        const c = this.colors;
        const cx = this.x + this.width / 2;
        const w = this.width;
        const h = this.height;

        // Draw based on enemy type for variety
        if (this.type === 'basic') {
            // Basic enemy: MiG-21 style (delta wing, pointed nose)

            // Main wings (swept delta)
            const wingGradient = ctx.createLinearGradient(this.x - 10, 0, this.x + w + 10, 0);
            wingGradient.addColorStop(0, c.dark);
            wingGradient.addColorStop(0.5, c.main);
            wingGradient.addColorStop(1, c.dark);
            ctx.fillStyle = wingGradient;
            ctx.beginPath();
            ctx.moveTo(cx, this.y + h * 0.35);
            ctx.lineTo(this.x - 12, this.y + h * 0.7);
            ctx.lineTo(this.x + 5, this.y + h * 0.65);
            ctx.lineTo(cx, this.y + h * 0.5);
            ctx.lineTo(this.x + w - 5, this.y + h * 0.65);
            ctx.lineTo(this.x + w + 12, this.y + h * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Fuselage
            const bodyGradient = ctx.createLinearGradient(this.x + 15, 0, this.x + w - 15, 0);
            bodyGradient.addColorStop(0, c.dark);
            bodyGradient.addColorStop(0.3, c.light);
            bodyGradient.addColorStop(0.7, c.light);
            bodyGradient.addColorStop(1, c.dark);
            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.moveTo(cx, this.y + h); // Nose (pointing down)
            ctx.lineTo(this.x + w * 0.35, this.y + h * 0.7);
            ctx.lineTo(this.x + w * 0.35, this.y + h * 0.1);
            ctx.lineTo(this.x + w * 0.4, this.y);
            ctx.lineTo(this.x + w * 0.6, this.y);
            ctx.lineTo(this.x + w * 0.65, this.y + h * 0.1);
            ctx.lineTo(this.x + w * 0.65, this.y + h * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Tail fins
            ctx.fillStyle = c.main;
            ctx.beginPath();
            ctx.moveTo(this.x + w * 0.4, this.y);
            ctx.lineTo(this.x + w * 0.35, this.y - 8);
            ctx.lineTo(this.x + w * 0.45, this.y + h * 0.1);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.x + w * 0.6, this.y);
            ctx.lineTo(this.x + w * 0.65, this.y - 8);
            ctx.lineTo(this.x + w * 0.55, this.y + h * 0.1);
            ctx.closePath();
            ctx.fill();

            // Cockpit canopy
            ctx.fillStyle = '#001133';
            ctx.beginPath();
            ctx.ellipse(cx, this.y + h * 0.55, w * 0.12, h * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
            ctx.beginPath();
            ctx.ellipse(cx - 2, this.y + h * 0.52, w * 0.06, h * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();

            // Engine intakes (sides)
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.ellipse(this.x + w * 0.3, this.y + h * 0.25, 4, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(this.x + w * 0.7, this.y + h * 0.25, 4, 6, 0, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === 'intermediate') {
            // Intermediate: F-18 style (twin tail, wider body)

            // Main wings
            const wingGradient = ctx.createLinearGradient(this.x - 15, 0, this.x + w + 15, 0);
            wingGradient.addColorStop(0, c.dark);
            wingGradient.addColorStop(0.5, c.main);
            wingGradient.addColorStop(1, c.dark);
            ctx.fillStyle = wingGradient;
            ctx.beginPath();
            ctx.moveTo(cx, this.y + h * 0.4);
            ctx.lineTo(this.x - 18, this.y + h * 0.65);
            ctx.lineTo(this.x - 15, this.y + h * 0.75);
            ctx.lineTo(this.x + 8, this.y + h * 0.55);
            ctx.lineTo(this.x + w - 8, this.y + h * 0.55);
            ctx.lineTo(this.x + w + 15, this.y + h * 0.75);
            ctx.lineTo(this.x + w + 18, this.y + h * 0.65);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Horizontal stabilizers
            ctx.fillStyle = c.main;
            ctx.beginPath();
            ctx.moveTo(this.x + w * 0.25, this.y + h * 0.1);
            ctx.lineTo(this.x - 8, this.y + h * 0.2);
            ctx.lineTo(this.x + 5, this.y + h * 0.25);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.x + w * 0.75, this.y + h * 0.1);
            ctx.lineTo(this.x + w + 8, this.y + h * 0.2);
            ctx.lineTo(this.x + w - 5, this.y + h * 0.25);
            ctx.closePath();
            ctx.fill();

            // Fuselage
            const bodyGradient = ctx.createLinearGradient(this.x + 10, 0, this.x + w - 10, 0);
            bodyGradient.addColorStop(0, c.dark);
            bodyGradient.addColorStop(0.3, c.light);
            bodyGradient.addColorStop(0.7, c.light);
            bodyGradient.addColorStop(1, c.dark);
            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.moveTo(cx, this.y + h);
            ctx.lineTo(this.x + w * 0.3, this.y + h * 0.65);
            ctx.lineTo(this.x + w * 0.25, this.y + h * 0.15);
            ctx.lineTo(this.x + w * 0.35, this.y);
            ctx.lineTo(this.x + w * 0.65, this.y);
            ctx.lineTo(this.x + w * 0.75, this.y + h * 0.15);
            ctx.lineTo(this.x + w * 0.7, this.y + h * 0.65);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Twin tail fins
            ctx.fillStyle = c.main;
            ctx.beginPath();
            ctx.moveTo(this.x + w * 0.3, this.y + h * 0.05);
            ctx.lineTo(this.x + w * 0.22, this.y - 10);
            ctx.lineTo(this.x + w * 0.35, this.y + h * 0.15);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = c.dark;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.x + w * 0.7, this.y + h * 0.05);
            ctx.lineTo(this.x + w * 0.78, this.y - 10);
            ctx.lineTo(this.x + w * 0.65, this.y + h * 0.15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Cockpit
            ctx.fillStyle = '#001133';
            ctx.beginPath();
            ctx.ellipse(cx, this.y + h * 0.55, w * 0.15, h * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
            ctx.beginPath();
            ctx.ellipse(cx - 2, this.y + h * 0.5, w * 0.08, h * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();

            // Engine nozzles
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.ellipse(this.x + w * 0.35, this.y + h * 0.05, 5, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(this.x + w * 0.65, this.y + h * 0.05, 5, 4, 0, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // Strong: Su-57 style (stealth, angular)

            // Main wings (angular stealth design)
            const wingGradient = ctx.createLinearGradient(this.x - 20, 0, this.x + w + 20, 0);
            wingGradient.addColorStop(0, c.dark);
            wingGradient.addColorStop(0.5, c.main);
            wingGradient.addColorStop(1, c.dark);
            ctx.fillStyle = wingGradient;
            ctx.beginPath();
            ctx.moveTo(cx, this.y + h * 0.3);
            ctx.lineTo(this.x - 22, this.y + h * 0.55);
            ctx.lineTo(this.x - 18, this.y + h * 0.7);
            ctx.lineTo(this.x + 5, this.y + h * 0.5);
            ctx.lineTo(this.x + w - 5, this.y + h * 0.5);
            ctx.lineTo(this.x + w + 18, this.y + h * 0.7);
            ctx.lineTo(this.x + w + 22, this.y + h * 0.55);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Canards (front wings)
            ctx.fillStyle = c.main;
            ctx.beginPath();
            ctx.moveTo(this.x + w * 0.3, this.y + h * 0.65);
            ctx.lineTo(this.x - 10, this.y + h * 0.8);
            ctx.lineTo(this.x + 5, this.y + h * 0.75);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.x + w * 0.7, this.y + h * 0.65);
            ctx.lineTo(this.x + w + 10, this.y + h * 0.8);
            ctx.lineTo(this.x + w - 5, this.y + h * 0.75);
            ctx.closePath();
            ctx.fill();

            // Fuselage (wide stealth body)
            const bodyGradient = ctx.createLinearGradient(this.x + 5, 0, this.x + w - 5, 0);
            bodyGradient.addColorStop(0, c.dark);
            bodyGradient.addColorStop(0.2, c.light);
            bodyGradient.addColorStop(0.8, c.light);
            bodyGradient.addColorStop(1, c.dark);
            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.moveTo(cx, this.y + h); // Nose
            ctx.lineTo(this.x + w * 0.25, this.y + h * 0.6);
            ctx.lineTo(this.x + w * 0.2, this.y + h * 0.2);
            ctx.lineTo(this.x + w * 0.35, this.y);
            ctx.lineTo(this.x + w * 0.65, this.y);
            ctx.lineTo(this.x + w * 0.8, this.y + h * 0.2);
            ctx.lineTo(this.x + w * 0.75, this.y + h * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Angular tail fins (canted)
            ctx.fillStyle = c.main;
            ctx.beginPath();
            ctx.moveTo(this.x + w * 0.28, this.y + h * 0.1);
            ctx.lineTo(this.x + w * 0.15, this.y - 8);
            ctx.lineTo(this.x + w * 0.32, this.y + h * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = c.dark;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.x + w * 0.72, this.y + h * 0.1);
            ctx.lineTo(this.x + w * 0.85, this.y - 8);
            ctx.lineTo(this.x + w * 0.68, this.y + h * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Stealth cockpit (angular)
            ctx.fillStyle = '#001122';
            ctx.beginPath();
            ctx.moveTo(cx, this.y + h * 0.4);
            ctx.lineTo(this.x + w * 0.35, this.y + h * 0.5);
            ctx.lineTo(this.x + w * 0.35, this.y + h * 0.7);
            ctx.lineTo(this.x + w * 0.65, this.y + h * 0.7);
            ctx.lineTo(this.x + w * 0.65, this.y + h * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(100, 150, 255, 0.25)';
            ctx.beginPath();
            ctx.moveTo(cx, this.y + h * 0.45);
            ctx.lineTo(this.x + w * 0.4, this.y + h * 0.52);
            ctx.lineTo(this.x + w * 0.4, this.y + h * 0.65);
            ctx.lineTo(cx, this.y + h * 0.6);
            ctx.closePath();
            ctx.fill();

            // Twin engine nozzles
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.ellipse(this.x + w * 0.35, this.y + h * 0.05, 6, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(this.x + w * 0.65, this.y + h * 0.05, 6, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Engine glow (all types)
        const glowIntensity = 0.6 + Math.sin(Date.now() / 80) * 0.4;
        ctx.fillStyle = `rgba(255, 120, 0, ${glowIntensity})`;
        if (this.type === 'basic') {
            ctx.beginPath();
            ctx.ellipse(cx, this.y - 3, 4, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.ellipse(this.x + w * 0.35, this.y - 3, 3, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(this.x + w * 0.65, this.y - 3, 3, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw health bar above enemy (only if damaged)
        if (this.health < this.maxHealth) {
            const barWidth = this.width;
            const barHeight = 4;
            const barX = this.x;
            const barY = this.y - 10;
            const healthPercent = this.health / this.maxHealth;

            // Background (dark red)
            ctx.fillStyle = '#330000';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Health fill (green to red based on health)
            const r = Math.floor(255 * (1 - healthPercent));
            const g = Math.floor(255 * healthPercent);
            ctx.fillStyle = `rgb(${r}, ${g}, 0)`;
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

            // Border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }

        ctx.restore();
    }

    getRect() {
        // Include wing extensions in hitbox based on enemy type
        let wingExtend = 12; // basic
        if (this.type === 'intermediate') wingExtend = 18;
        if (this.type === 'strong') wingExtend = 22;

        return {
            x: this.x - wingExtend,
            y: this.y,
            width: this.width + wingExtend * 2,
            height: this.height
        };
    }

    isOffScreen() {
        return this.y > SCREEN_HEIGHT;
    }
}

// Explosion class
class Explosion {
    constructor(x, y, size = 'normal') {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.life = 0;
        this.maxLife = 30; // Frames the explosion lasts
        this.size = size; // 'normal' or 'large' for player death
        
        // Create particles
        const particleCount = size === 'large' ? 20 : 12;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                color: Math.random() > 0.5 ? YELLOW : RED,
                life: this.maxLife
            });
        }
    }

    update() {
        this.life++;
        for (let particle of this.particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.95; // Friction
            particle.vy *= 0.95;
            particle.life--;
        }
    }

    draw() {
        const alpha = 1 - (this.life / this.maxLife);
        for (let particle of this.particles) {
            if (particle.life > 0) {
                ctx.save();
                ctx.globalAlpha = alpha * (particle.life / this.maxLife);
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    isFinished() {
        return this.life >= this.maxLife;
    }
}

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Initialize game
function initGame() {
    player = new Player(SCREEN_WIDTH / 2 - PLAYER_SIZE / 2, SCREEN_HEIGHT - PLAYER_SIZE - 20);
    bullets = [];
    enemies = [];
    explosions = [];
    score = 0;
    creditsAtGameStart = playerCredits;
    gameOver = false;
    frameCount = 0;
    lastShotFrame = 0;
    lastTurretShotFrame = -TURRET_FIRE_RATE;
    screenShake = 0;
    playerShakeX = 0;
    playerShakeY = 0;
    level = 1;
    enemiesDefeated = 0;
    levelTextDisplay = 0;
    shotsFired = 0;
    shotsHit = 0;
    skinsUnlockedThisGame = [];

    // Initialize lives based on upgrade level
    lives = upgrades.lives.level;
    isRespawning = false;
    respawnTimer = 0;

    // Generate random star positions
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * SCREEN_WIDTH,
            y: Math.random() * SCREEN_HEIGHT,
            size: Math.random() * 2 + 1
        });
    }
}

// Handle input
let pauseKeyPressed = false;
function handleInput() {
    // Handle pause toggle with P key
    if ((keys['p'] || keys['P']) && !gameOver && !pauseKeyPressed) {
        isPaused = !isPaused;
        pauseSelectedOption = 0;
        pauseKeyPressed = true;
    }
    if (!keys['p'] && !keys['P']) {
        pauseKeyPressed = false;
    }

    if (isPaused) {
        handlePauseInput();
        return;
    }

    if (!gameOver) {
        player.move();

        // Shooting (with 0.25 second delay between shots)
        if (keys[' '] || keys['Space']) {
            if (frameCount - lastShotFrame >= FIRE_RATE_DELAY) {
                const bullet = new Bullet(
                    player.x + player.width / 2 - BULLET_SIZE / 2,
                    player.y
                );
                bullets.push(bullet);
                shotsFired++;
                lastShotFrame = frameCount;
            }
        }
    }

    // Restart game
    if (gameOver && (keys['r'] || keys['R'])) {
        initGame();
    }

    // Return to menu
    if (gameOver && (keys['m'] || keys['M'])) {
        inMenu = true;
        selectedOption = 0;
        showingControls = false;
        showingAbout = false;
        showingSkins = false;
        showingUpgrades = false;
        showingSettings = false;
    }
}

// Handle pause menu input
let pauseMenuKeyPressed = false;
function handlePauseInput() {
    if (!pauseMenuKeyPressed) {
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            pauseSelectedOption = (pauseSelectedOption - 1 + pauseMenuOptions.length) % pauseMenuOptions.length;
            pauseMenuKeyPressed = true;
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            pauseSelectedOption = (pauseSelectedOption + 1) % pauseMenuOptions.length;
            pauseMenuKeyPressed = true;
        }
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            if (pauseSelectedOption === 1) { // Volume
                volume = Math.max(0, volume - 0.1);
                pauseMenuKeyPressed = true;
            }
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            if (pauseSelectedOption === 1) { // Volume
                volume = Math.min(1, volume + 0.1);
                pauseMenuKeyPressed = true;
            }
        }
        if (keys['Enter'] || keys[' ']) {
            if (pauseMenuOptions[pauseSelectedOption] === 'Resume') {
                isPaused = false;
            } else if (pauseMenuOptions[pauseSelectedOption] === 'Quit to Menu') {
                isPaused = false;
                inMenu = true;
                selectedOption = 0;
                playerCredits = creditsAtGameStart; // Don't keep credits earned this session
            }
            pauseMenuKeyPressed = true;
        }
        if (keys['Escape']) {
            isPaused = false;
            pauseMenuKeyPressed = true;
        }
    }

    // Reset key pressed state
    if (!keys['ArrowUp'] && !keys['ArrowDown'] && !keys['ArrowLeft'] && !keys['ArrowRight'] &&
        !keys['w'] && !keys['W'] && !keys['s'] && !keys['S'] && !keys['a'] && !keys['A'] &&
        !keys['d'] && !keys['D'] && !keys['Enter'] && !keys[' '] && !keys['Escape']) {
        pauseMenuKeyPressed = false;
    }
}

// Select random enemy type based on spawn weights
function getRandomEnemyType() {
    const totalWeight = ENEMY_TYPES.basic.spawnWeight + ENEMY_TYPES.intermediate.spawnWeight + ENEMY_TYPES.strong.spawnWeight;
    const roll = Math.random() * totalWeight;

    if (roll < ENEMY_TYPES.basic.spawnWeight) {
        return 'basic';
    } else if (roll < ENEMY_TYPES.basic.spawnWeight + ENEMY_TYPES.intermediate.spawnWeight) {
        return 'intermediate';
    } else {
        return 'strong';
    }
}

// Spawn enemies
function spawnEnemy() {
    // Calculate spawn rate based on level (lower number = more frequent)
    // Level 1: 60, Level 2: 50, Level 3: 40, etc.
    const spawnRate = Math.max(20, ENEMY_SPAWN_RATE - (level - 1) * 10);

    if (Math.floor(Math.random() * spawnRate) === 0) {
        const x = Math.random() * (SCREEN_WIDTH - ENEMY_SIZE);
        // Calculate speed multiplier based on level (Level 1: 1.0, Level 2: 1.2, Level 3: 1.4, etc.)
        const speedMultiplier = 1 + (level - 1) * 0.2;
        const enemyType = getRandomEnemyType();
        const enemy = new Enemy(x, -ENEMY_SIZE, speedMultiplier, enemyType);
        enemies.push(enemy);
    }
}

// Update game state
function update() {
    if (isPaused) return;

    if (gameOver) {
        // Still update explosions even when game is over
        for (let i = explosions.length - 1; i >= 0; i--) {
            explosions[i].update();
            if (explosions[i].isFinished()) {
                explosions.splice(i, 1);
            }
        }
        // Update screen shake
        if (screenShake > 0) {
            screenShake--;
            playerShakeX = (Math.random() - 0.5) * screenShake * 2;
            playerShakeY = (Math.random() - 0.5) * screenShake * 2;
        } else {
            playerShakeX = 0;
            playerShakeY = 0;
        }
        return;
    }

    frameCount++;

    // Update level text display
    if (levelTextDisplay > 0) {
        levelTextDisplay--;
    }

    // Update screen shake
    if (screenShake > 0) {
        screenShake--;
        playerShakeX = (Math.random() - 0.5) * screenShake * 2;
        playerShakeY = (Math.random() - 0.5) * screenShake * 2;
    } else {
        playerShakeX = 0;
        playerShakeY = 0;
    }

    // Spawn enemies
    spawnEnemy();

    // Fire auto-turrets
    fireTurrets();

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        if (bullets[i].isOffScreen()) {
            bullets.splice(i, 1);
        }
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        if (enemies[i].isOffScreen()) {
            enemies.splice(i, 1);
        }
    }

    // Update explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].update();
        if (explosions[i].isFinished()) {
            explosions.splice(i, 1);
        }
    }

    // Check bullet-enemy collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[i].getRect(), enemies[j].getRect())) {
                // Calculate damage: base 50% + 25% per damage upgrade level
                const baseDamage = 50;
                const damageBonus = upgrades.damage.level * 25;
                const totalDamage = baseDamage + damageBonus;

                const enemyKilled = enemies[j].takeDamage(totalDamage);
                if (!bullets[i].isHoming) {
                    shotsHit++; // Only track player shots, not turret shots
                }

                // Remove bullet
                bullets.splice(i, 1);

                if (enemyKilled) {
                    // Create explosion at enemy position
                    const enemyX = enemies[j].x + enemies[j].width / 2;
                    const enemyY = enemies[j].y + enemies[j].height / 2;
                    explosions.push(new Explosion(enemyX, enemyY, 'normal'));

                    // Play explosion sound
                    playExplosionSound();

                    // Award credits based on enemy type
                    const enemyType = enemies[j].type;
                    if (enemyType === 'basic') {
                        playerCredits += 5;
                    } else if (enemyType === 'intermediate') {
                        playerCredits += 10;
                    } else if (enemyType === 'strong') {
                        playerCredits += 15;
                    }

                    enemies.splice(j, 1);
                    score += 10;
                    enemiesDefeated++;

                    // Level up every 10 enemies
                    if (enemiesDefeated % 10 === 0) {
                        // Check for accuracy-based unlocks before level up (completing current level)
                        checkAllSkinUnlocks(true);
                        level++;
                        levelTextDisplay = 180; // 3 seconds at 60 FPS
                        // Check for level-based unlocks after level up
                        checkAllSkinUnlocks(false);
                    }
                }
                break;
            }
        }
    }

    // Check player-enemy collisions (skip if respawning)
    if (!isRespawning) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (checkCollision(player.getRect(), enemies[i].getRect())) {
                // Reduce health based on enemy type
                player.health -= enemies[i].damage;

                // Play crash sound
                playCrashSound();

                // Add screen shake effect
                screenShake = 10;

                // Create explosion at collision point
                const collisionX = enemies[i].x + enemies[i].width / 2;
                const collisionY = enemies[i].y + enemies[i].height / 2;
                explosions.push(new Explosion(collisionX, collisionY, 'normal'));

                // Remove the enemy after collision
                enemies.splice(i, 1);

                // Check if health is 0 or below
                if (player.health <= 0) {
                    player.health = 0;
                    // Create large explosion at player position
                    const playerX = player.x + player.width / 2;
                    const playerY = player.y + player.height / 2;
                    explosions.push(new Explosion(playerX, playerY, 'large'));

                    // Check if we have extra lives
                    if (lives > 0) {
                        lives--;
                        isRespawning = true;
                        respawnTimer = RESPAWN_DELAY;
                    } else {
                        gameOver = true;
                        // Save credits earned this game
                        saveUpgrades();
                    }
                }
                break;
            }
        }
    }

    // Handle respawn timer
    if (isRespawning) {
        respawnTimer--;
        if (respawnTimer <= 0) {
            isRespawning = false;
            player.health = 100;
            player.x = SCREEN_WIDTH / 2 - PLAYER_SIZE / 2;
            player.y = SCREEN_HEIGHT - PLAYER_SIZE - 20;
        }
    }
}

// Draw space background
function drawBackground() {
    // Create dark space gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    gradient.addColorStop(0, '#000011');
    gradient.addColorStop(0.5, '#000022');
    gradient.addColorStop(1, '#110022');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Draw stars
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const twinkle = Math.sin(frameCount * 0.05 + i) * 0.3 + 0.7;

        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw game
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Draw background
    drawBackground();

    // Draw game objects
    // Apply shake only to player (blink during respawn)
    if (!isRespawning || Math.floor(frameCount / 5) % 2 === 0) {
        player.draw(playerShakeX, playerShakeY);

        // Draw turrets if upgraded
        if (upgrades.turrets.level > 0) {
            const turretCount = upgrades.turrets.level;
            const turretOffsets = [];
            if (turretCount >= 1) turretOffsets.push({ x: -12, y: 30 });
            if (turretCount >= 2) turretOffsets.push({ x: 12, y: 30 });
            if (turretCount >= 3) turretOffsets.push({ x: 0, y: 25 });

            ctx.fillStyle = '#00AAFF';
            for (const offset of turretOffsets) {
                const tx = player.x + player.width / 2 + offset.x + playerShakeX;
                const ty = player.y + offset.y + playerShakeY;
                ctx.beginPath();
                ctx.arc(tx, ty, 5, 0, Math.PI * 2);
                ctx.fill();
                // Turret barrel
                ctx.fillStyle = '#006699';
                ctx.fillRect(tx - 2, ty - 8, 4, 8);
                ctx.fillStyle = '#00AAFF';
            }
        }
    }

    // Draw respawn message
    if (isRespawning) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 32px American Typewriter';
        ctx.textAlign = 'center';
        ctx.fillText('RESPAWNING...', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
        ctx.textAlign = 'left';
    }

    bullets.forEach(bullet => bullet.draw());
    enemies.forEach(enemy => enemy.draw());
    
    // Draw explosions
    explosions.forEach(explosion => explosion.draw());

    // Draw UI
    ctx.fillStyle = '#00FF00';
    ctx.font = '36px American Typewriter';
    ctx.fillText(`Score: ${score}`, 10, 40);

    // Draw health bar
    const healthBarX = 50;
    const healthBarY = 50;
    const healthBarWidth = 200;
    const healthBarHeight = 20;
    const healthPercent = Math.max(0, player.health) / 100;

    // HP label
    ctx.fillStyle = '#00FF00';
    ctx.font = '20px American Typewriter';
    ctx.fillText('HP', 10, 66);

    // Health bar background (dark gray)
    ctx.fillStyle = '#333333';
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    // Health bar fill (green to red based on health)
    const healthColor = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
    ctx.fillStyle = healthColor;
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);

    // Health bar border
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 2;
    ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    // Status text (green)
    ctx.fillStyle = '#00FF00';
    ctx.font = '24px American Typewriter';
    ctx.fillText(`Level: ${level}`, 10, 100);
    ctx.fillText(`Enemies Defeated: ${enemiesDefeated}`, 10, 130);

    // Calculate and display accuracy
    const accuracy = shotsFired > 0 ? (shotsHit / shotsFired * 100) : 0;
    ctx.fillText(`Accuracy: ${accuracy.toFixed(1)}%`, 10, 160);

    // Display lives
    if (upgrades.lives.level > 0) {
        ctx.fillStyle = '#FF6666';
        ctx.fillText(`Lives: ${lives}`, 10, 190);
        ctx.fillStyle = '#00FF00';
    }

    // Display credits (top right)
    ctx.fillStyle = '#FFD700';
    ctx.font = '20px American Typewriter';
    ctx.textAlign = 'right';
    ctx.fillText(`Credits: ${playerCredits}`, SCREEN_WIDTH - 60, 40);
    ctx.textAlign = 'left';

    // Draw level up text
    if (levelTextDisplay > 0) {
        const alpha = Math.min(1, levelTextDisplay / 60); // Fade out in last second
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = YELLOW;
        ctx.font = 'bold 64px American Typewriter';
        ctx.textAlign = 'center';
        ctx.strokeStyle = BLACK;
        ctx.lineWidth = 4;
        const levelText = `LEVEL ${level}`;
        ctx.strokeText(levelText, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
        ctx.fillText(levelText, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
        ctx.restore();
        ctx.textAlign = 'left';
    }

    // Draw controls hint
    if (frameCount < 180) {
        ctx.fillStyle = BLACK;
        ctx.fillRect(SCREEN_WIDTH / 2 - 200, SCREEN_HEIGHT - 50, 400, 30);
        ctx.fillStyle = WHITE;
        ctx.font = '20px American Typewriter';
        ctx.textAlign = 'center';
        ctx.fillText('WASD/Arrows: Move | SPACE: Shoot', SCREEN_WIDTH / 2, SCREEN_HEIGHT - 25);
        ctx.textAlign = 'left';
    }

    // Draw game over screen
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        ctx.fillStyle = RED;
        ctx.font = '48px American Typewriter';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 80);

        ctx.fillStyle = WHITE;
        ctx.font = '36px American Typewriter';
        ctx.fillText(`Final Score: ${score}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 40);

        // Calculate accuracy for display
        const accuracy = shotsFired > 0 ? (shotsHit / shotsFired * 100) : 0;
        
        ctx.font = '28px American Typewriter';
        ctx.fillText(`Final Level: ${level}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
        ctx.fillText(`Enemies Defeated: ${enemiesDefeated}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 35);
        ctx.fillText(`Accuracy: ${accuracy.toFixed(1)}%`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 70);

        // Show unlocked skins
        let yOffset = 115;
        if (skinsUnlockedThisGame.length > 0) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 24px American Typewriter';
            ctx.fillText('NEW AIRCRAFT UNLOCKED!', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + yOffset);
            yOffset += 30;

            ctx.font = '22px American Typewriter';
            for (const skinIndex of skinsUnlockedThisGame) {
                ctx.fillText(skins[skinIndex], SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + yOffset);
                yOffset += 28;
            }
            yOffset += 10;
        }

        ctx.fillStyle = WHITE;
        ctx.font = '24px American Typewriter';
        ctx.fillText('Press R to Restart', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + yOffset);
        ctx.fillText('Press M for Menu', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + yOffset + 35);
        ctx.textAlign = 'left';
    }

    // Draw pause button (top right corner)
    if (!gameOver) {
        drawPauseButton();
    }

    // Draw pause menu
    if (isPaused) {
        drawPauseMenu();
    }
}

// Draw pause button
function drawPauseButton() {
    const btnX = SCREEN_WIDTH - 50;
    const btnY = 10;
    const btnSize = 40;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(btnX, btnY, btnSize, btnSize);
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnSize, btnSize);

    // Draw pause icon (two vertical bars)
    ctx.fillStyle = WHITE;
    ctx.fillRect(btnX + 12, btnY + 10, 6, 20);
    ctx.fillRect(btnX + 22, btnY + 10, 6, 20);
}

// Draw pause menu
function drawPauseMenu() {
    // Darken background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Title
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 48px American Typewriter';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 100);

    // Menu options
    for (let i = 0; i < pauseMenuOptions.length; i++) {
        const y = SCREEN_HEIGHT / 2 - 20 + i * 50;

        if (i === pauseSelectedOption) {
            ctx.fillStyle = '#00FF00';
            ctx.font = 'bold 32px American Typewriter';
        } else {
            ctx.fillStyle = WHITE;
            ctx.font = '28px American Typewriter';
        }

        if (i === 1) { // Volume option
            // Draw volume label
            const label = pauseMenuOptions[i] + ': ';
            if (i === pauseSelectedOption) {
                ctx.fillText('> ' + label, SCREEN_WIDTH / 2 - 80, y);
            } else {
                ctx.fillText(label, SCREEN_WIDTH / 2 - 60, y);
            }

            // Draw volume bar
            const barX = SCREEN_WIDTH / 2 + 20;
            const barY = y - 15;
            const barWidth = 100;
            const barHeight = 20;

            ctx.fillStyle = '#333333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(barX, barY, barWidth * volume, barHeight);
            ctx.strokeStyle = WHITE;
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barWidth, barHeight);

            // Show percentage
            ctx.fillStyle = WHITE;
            ctx.font = '18px American Typewriter';
            ctx.fillText(Math.round(volume * 100) + '%', barX + barWidth + 15, y);
        } else {
            if (i === pauseSelectedOption) {
                ctx.fillText('> ' + pauseMenuOptions[i] + ' <', SCREEN_WIDTH / 2, y);
            } else {
                ctx.fillText(pauseMenuOptions[i], SCREEN_WIDTH / 2, y);
            }
        }
    }

    // Instructions
    ctx.fillStyle = '#888888';
    ctx.font = '20px American Typewriter';
    ctx.fillText('UP/DOWN: Navigate | LEFT/RIGHT: Adjust Volume', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 120);
    ctx.fillText('ENTER: Select | P/ESC: Resume', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 150);

    ctx.textAlign = 'left';
}

// Draw jet preview for skins menu
function drawJetPreview(x, y, w, h, skinIndex) {
    ctx.save();
    const cx = x + w / 2;

    if (skinIndex === 0) {
        // F-22 RAPTOR - Smooth stealth design
        const wingGradient = ctx.createLinearGradient(x, 0, x + w, 0);
        wingGradient.addColorStop(0, '#2D3338');
        wingGradient.addColorStop(0.3, '#5C6268');
        wingGradient.addColorStop(0.5, '#8A9099');
        wingGradient.addColorStop(0.7, '#5C6268');
        wingGradient.addColorStop(1, '#2D3338');

        // Trapezoidal wings with smooth curves
        ctx.fillStyle = wingGradient;
        ctx.beginPath();
        ctx.moveTo(cx - 4, y + h * 0.25);
        ctx.bezierCurveTo(cx - 8, y + h * 0.32, x + 2, y + h * 0.42, x + 3, y + h * 0.48);
        ctx.quadraticCurveTo(x + 5, y + h * 0.62, x + 10, y + h * 0.58);
        ctx.quadraticCurveTo(cx - 3, y + h * 0.52, cx - 4, y + h * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 4, y + h * 0.25);
        ctx.bezierCurveTo(cx + 8, y + h * 0.32, x + w - 2, y + h * 0.42, x + w - 3, y + h * 0.48);
        ctx.quadraticCurveTo(x + w - 5, y + h * 0.62, x + w - 10, y + h * 0.58);
        ctx.quadraticCurveTo(cx + 3, y + h * 0.52, cx + 4, y + h * 0.45);
        ctx.closePath();
        ctx.fill();

        // Horizontal stabilizers with curves
        ctx.beginPath();
        ctx.moveTo(cx - 5, y + h * 0.72);
        ctx.quadraticCurveTo(x + 6, y + h * 0.78, x + 8, y + h * 0.84);
        ctx.quadraticCurveTo(x + 10, y + h * 0.9, x + 14, y + h * 0.88);
        ctx.quadraticCurveTo(cx - 3, y + h * 0.84, cx - 4, y + h * 0.78);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 5, y + h * 0.72);
        ctx.quadraticCurveTo(x + w - 6, y + h * 0.78, x + w - 8, y + h * 0.84);
        ctx.quadraticCurveTo(x + w - 10, y + h * 0.9, x + w - 14, y + h * 0.88);
        ctx.quadraticCurveTo(cx + 3, y + h * 0.84, cx + 4, y + h * 0.78);
        ctx.closePath();
        ctx.fill();

        // Fuselage with smooth curves
        const bodyGradient = ctx.createLinearGradient(cx - 8, 0, cx + 8, 0);
        bodyGradient.addColorStop(0, '#3D4348');
        bodyGradient.addColorStop(0.2, '#7A8289');
        bodyGradient.addColorStop(0.5, '#A8B0B8');
        bodyGradient.addColorStop(0.8, '#7A8289');
        bodyGradient.addColorStop(1, '#3D4348');
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(cx, y + h * 0.02);
        ctx.bezierCurveTo(cx - 3, y + h * 0.05, cx - 6, y + h * 0.12, cx - 8, y + h * 0.22);
        ctx.bezierCurveTo(cx - 9, y + h * 0.35, cx - 8, y + h * 0.6, cx - 7, y + h * 0.90);
        ctx.quadraticCurveTo(cx, y + h * 0.92, cx + 7, y + h * 0.90);
        ctx.bezierCurveTo(cx + 8, y + h * 0.6, cx + 9, y + h * 0.35, cx + 8, y + h * 0.22);
        ctx.bezierCurveTo(cx + 6, y + h * 0.12, cx + 3, y + h * 0.05, cx, y + h * 0.02);
        ctx.closePath();
        ctx.fill();

        // Canted tails with smooth curves
        ctx.fillStyle = '#3D4348';
        ctx.beginPath();
        ctx.moveTo(cx - 7, y + h * 0.65);
        ctx.quadraticCurveTo(cx - 10, y + h * 0.7, cx - 11, y + h * 0.86);
        ctx.quadraticCurveTo(cx - 9, y + h * 0.84, cx - 8, y + h * 0.8);
        ctx.quadraticCurveTo(cx - 6, y + h * 0.72, cx - 7, y + h * 0.65);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 7, y + h * 0.65);
        ctx.quadraticCurveTo(cx + 10, y + h * 0.7, cx + 11, y + h * 0.86);
        ctx.quadraticCurveTo(cx + 9, y + h * 0.84, cx + 8, y + h * 0.8);
        ctx.quadraticCurveTo(cx + 6, y + h * 0.72, cx + 7, y + h * 0.65);
        ctx.fill();

        // Cockpit with smooth canopy
        ctx.fillStyle = '#0a1520';
        ctx.beginPath();
        ctx.moveTo(cx, y + h * 0.1);
        ctx.bezierCurveTo(cx - 4, y + h * 0.12, cx - 5, y + h * 0.18, cx - 4, y + h * 0.30);
        ctx.quadraticCurveTo(cx, y + h * 0.32, cx + 4, y + h * 0.30);
        ctx.bezierCurveTo(cx + 5, y + h * 0.18, cx + 4, y + h * 0.12, cx, y + h * 0.1);
        ctx.fill();
        ctx.fillStyle = 'rgba(100, 200, 255, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx - 1, y + h * 0.18, 1.5, 4, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // Engines with glow
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(cx - 4, y + h * 0.92, 2.5, 0, Math.PI * 2);
        ctx.arc(cx + 4, y + h * 0.92, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF6600';
        ctx.beginPath();
        ctx.arc(cx - 4, y + h * 0.92, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 4, y + h * 0.92, 1.5, 0, Math.PI * 2);
        ctx.fill();

    } else if (skinIndex === 1) {
        // EUROFIGHTER TYPHOON - Smooth canard-delta
        const wingGradient = ctx.createLinearGradient(x, 0, x + w, 0);
        wingGradient.addColorStop(0, '#3A4048');
        wingGradient.addColorStop(0.3, '#6A7178');
        wingGradient.addColorStop(0.5, '#9AA1A9');
        wingGradient.addColorStop(0.7, '#6A7178');
        wingGradient.addColorStop(1, '#3A4048');

        // Delta wings with smooth curves
        ctx.fillStyle = wingGradient;
        ctx.beginPath();
        ctx.moveTo(cx - 3, y + h * 0.30);
        ctx.bezierCurveTo(cx - 10, y + h * 0.5, x + 2, y + h * 0.75, x + 3, y + h * 0.85);
        ctx.quadraticCurveTo(x + 8, y + h * 0.92, x + 14, y + h * 0.90);
        ctx.quadraticCurveTo(cx - 2, y + h * 0.7, cx - 3, y + h * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 3, y + h * 0.30);
        ctx.bezierCurveTo(cx + 10, y + h * 0.5, x + w - 2, y + h * 0.75, x + w - 3, y + h * 0.85);
        ctx.quadraticCurveTo(x + w - 8, y + h * 0.92, x + w - 14, y + h * 0.90);
        ctx.quadraticCurveTo(cx + 2, y + h * 0.7, cx + 3, y + h * 0.55);
        ctx.closePath();
        ctx.fill();

        // Canards with curves
        ctx.beginPath();
        ctx.moveTo(cx - 4, y + h * 0.18);
        ctx.quadraticCurveTo(x + 10, y + h * 0.2, x + 8, y + h * 0.24);
        ctx.quadraticCurveTo(x + 10, y + h * 0.28, x + 16, y + h * 0.27);
        ctx.quadraticCurveTo(cx - 3, y + h * 0.24, cx - 4, y + h * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 4, y + h * 0.18);
        ctx.quadraticCurveTo(x + w - 10, y + h * 0.2, x + w - 8, y + h * 0.24);
        ctx.quadraticCurveTo(x + w - 10, y + h * 0.28, x + w - 16, y + h * 0.27);
        ctx.quadraticCurveTo(cx + 3, y + h * 0.24, cx + 4, y + h * 0.22);
        ctx.closePath();
        ctx.fill();

        // Fuselage with smooth curves
        const bodyGradient = ctx.createLinearGradient(cx - 6, 0, cx + 6, 0);
        bodyGradient.addColorStop(0, '#4A5058');
        bodyGradient.addColorStop(0.2, '#8A9199');
        bodyGradient.addColorStop(0.5, '#B5BCC4');
        bodyGradient.addColorStop(0.8, '#8A9199');
        bodyGradient.addColorStop(1, '#4A5058');
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(cx, y + h * 0.02);
        ctx.bezierCurveTo(cx - 3, y + h * 0.04, cx - 5, y + h * 0.1, cx - 6, y + h * 0.18);
        ctx.bezierCurveTo(cx - 7, y + h * 0.3, cx - 6, y + h * 0.6, cx - 5, y + h * 0.92);
        ctx.quadraticCurveTo(cx, y + h * 0.94, cx + 5, y + h * 0.92);
        ctx.bezierCurveTo(cx + 6, y + h * 0.6, cx + 7, y + h * 0.3, cx + 6, y + h * 0.18);
        ctx.bezierCurveTo(cx + 5, y + h * 0.1, cx + 3, y + h * 0.04, cx, y + h * 0.02);
        ctx.closePath();
        ctx.fill();

        // Vertical tail with curve
        ctx.fillStyle = '#4A5058';
        ctx.beginPath();
        ctx.moveTo(cx - 1, y + h * 0.5);
        ctx.quadraticCurveTo(cx - 2, y + h * 0.6, cx - 1.5, y + h * 0.88);
        ctx.lineTo(cx + 1.5, y + h * 0.88);
        ctx.quadraticCurveTo(cx + 2, y + h * 0.6, cx + 1, y + h * 0.5);
        ctx.closePath();
        ctx.fill();

        // Cockpit with smooth bubble
        ctx.fillStyle = '#0a1520';
        ctx.beginPath();
        ctx.ellipse(cx, y + h * 0.16, 3, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(100, 200, 255, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx - 1, y + h * 0.14, 1.2, 3, -0.15, 0, Math.PI * 2);
        ctx.fill();

        // Engines with glow
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(cx - 3, y + h * 0.94, 2.5, 0, Math.PI * 2);
        ctx.arc(cx + 3, y + h * 0.94, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF6600';
        ctx.beginPath();
        ctx.arc(cx - 3, y + h * 0.94, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 3, y + h * 0.94, 1.5, 0, Math.PI * 2);
        ctx.fill();

    } else if (skinIndex === 2) {
        // F-35 LIGHTNING - Sleeker stealth design
        const wingGradient = ctx.createLinearGradient(x - 4, 0, x + w + 4, 0);
        wingGradient.addColorStop(0, '#22282E');
        wingGradient.addColorStop(0.3, '#4A5056');
        wingGradient.addColorStop(0.5, '#6A7076');
        wingGradient.addColorStop(0.7, '#4A5056');
        wingGradient.addColorStop(1, '#22282E');

        // Trapezoid wings - longer and more prominent
        ctx.fillStyle = wingGradient;
        ctx.beginPath();
        ctx.moveTo(cx - 5, y + h * 0.35);
        ctx.bezierCurveTo(cx - 8, y + h * 0.4, x - 2, y + h * 0.48, x - 4, y + h * 0.54);
        ctx.quadraticCurveTo(x - 2, y + h * 0.66, x + 6, y + h * 0.64);
        ctx.quadraticCurveTo(cx - 3, y + h * 0.56, cx - 5, y + h * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 5, y + h * 0.35);
        ctx.bezierCurveTo(cx + 8, y + h * 0.4, x + w + 2, y + h * 0.48, x + w + 4, y + h * 0.54);
        ctx.quadraticCurveTo(x + w + 2, y + h * 0.66, x + w - 6, y + h * 0.64);
        ctx.quadraticCurveTo(cx + 3, y + h * 0.56, cx + 5, y + h * 0.5);
        ctx.closePath();
        ctx.fill();

        // Horizontal stabilizers - extended
        ctx.beginPath();
        ctx.moveTo(cx - 5, y + h * 0.74);
        ctx.quadraticCurveTo(x + 2, y + h * 0.8, x + 4, y + h * 0.86);
        ctx.quadraticCurveTo(x + 6, y + h * 0.92, x + 12, y + h * 0.88);
        ctx.quadraticCurveTo(cx - 3, y + h * 0.82, cx - 4, y + h * 0.78);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 5, y + h * 0.74);
        ctx.quadraticCurveTo(x + w - 2, y + h * 0.8, x + w - 4, y + h * 0.86);
        ctx.quadraticCurveTo(x + w - 6, y + h * 0.92, x + w - 12, y + h * 0.88);
        ctx.quadraticCurveTo(cx + 3, y + h * 0.82, cx + 4, y + h * 0.78);
        ctx.closePath();
        ctx.fill();

        // Slimmer fuselage
        const bodyGradient = ctx.createLinearGradient(cx - 6, 0, cx + 6, 0);
        bodyGradient.addColorStop(0, '#32383E');
        bodyGradient.addColorStop(0.2, '#5A6066');
        bodyGradient.addColorStop(0.5, '#8A9096');
        bodyGradient.addColorStop(0.8, '#5A6066');
        bodyGradient.addColorStop(1, '#32383E');
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(cx, y + h * 0.02);
        ctx.bezierCurveTo(cx - 3, y + h * 0.05, cx - 5, y + h * 0.12, cx - 6, y + h * 0.22);
        ctx.bezierCurveTo(cx - 7, y + h * 0.35, cx - 6, y + h * 0.5, cx - 5, y + h * 0.7);
        ctx.quadraticCurveTo(cx - 4, y + h * 0.85, cx - 4, y + h * 0.94);
        ctx.quadraticCurveTo(cx, y + h * 0.96, cx + 4, y + h * 0.94);
        ctx.quadraticCurveTo(cx + 4, y + h * 0.85, cx + 5, y + h * 0.7);
        ctx.bezierCurveTo(cx + 6, y + h * 0.5, cx + 7, y + h * 0.35, cx + 6, y + h * 0.22);
        ctx.bezierCurveTo(cx + 5, y + h * 0.12, cx + 3, y + h * 0.05, cx, y + h * 0.02);
        ctx.closePath();
        ctx.fill();

        // DSI bumps - smaller
        ctx.fillStyle = '#32383E';
        ctx.beginPath();
        ctx.ellipse(cx - 5, y + h * 0.32, 2, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 5, y + h * 0.32, 2, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Canted tails - adjusted for slimmer body
        ctx.fillStyle = '#32383E';
        ctx.beginPath();
        ctx.moveTo(cx - 5, y + h * 0.66);
        ctx.quadraticCurveTo(cx - 8, y + h * 0.72, cx - 8, y + h * 0.86);
        ctx.quadraticCurveTo(cx - 6, y + h * 0.84, cx - 5, y + h * 0.8);
        ctx.quadraticCurveTo(cx - 4, y + h * 0.74, cx - 5, y + h * 0.66);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 5, y + h * 0.66);
        ctx.quadraticCurveTo(cx + 8, y + h * 0.72, cx + 8, y + h * 0.86);
        ctx.quadraticCurveTo(cx + 6, y + h * 0.84, cx + 5, y + h * 0.8);
        ctx.quadraticCurveTo(cx + 4, y + h * 0.74, cx + 5, y + h * 0.66);
        ctx.fill();

        // Cockpit with gold tint - narrower
        ctx.fillStyle = '#0a1015';
        ctx.beginPath();
        ctx.moveTo(cx, y + h * 0.08);
        ctx.bezierCurveTo(cx - 4, y + h * 0.1, cx - 4, y + h * 0.18, cx - 4, y + h * 0.30);
        ctx.quadraticCurveTo(cx, y + h * 0.32, cx + 4, y + h * 0.30);
        ctx.bezierCurveTo(cx + 4, y + h * 0.18, cx + 4, y + h * 0.1, cx, y + h * 0.08);
        ctx.fill();
        ctx.fillStyle = 'rgba(220, 200, 100, 0.4)';
        ctx.beginPath();
        ctx.ellipse(cx - 1, y + h * 0.18, 1.5, 4, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // Single engine - smaller
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(cx, y + h * 0.92, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF5500';
        ctx.beginPath();
        ctx.arc(cx, y + h * 0.92, 2, 0, Math.PI * 2);
        ctx.fill();

    } else if (skinIndex === 3) {
        // SU-27 FLANKER - Smooth blended body with long wings
        const wingGradient = ctx.createLinearGradient(x - 6, 0, x + w + 6, 0);
        wingGradient.addColorStop(0, '#1A3A5A');
        wingGradient.addColorStop(0.3, '#4A6A8A');
        wingGradient.addColorStop(0.5, '#7899B8');
        wingGradient.addColorStop(0.7, '#4A6A8A');
        wingGradient.addColorStop(1, '#1A3A5A');

        // LERX with smooth curves
        ctx.fillStyle = wingGradient;
        ctx.beginPath();
        ctx.moveTo(cx - 4, y + h * 0.15);
        ctx.bezierCurveTo(cx - 8, y + h * 0.18, cx - 12, y + h * 0.28, cx - 12, y + h * 0.40);
        ctx.quadraticCurveTo(cx - 9, y + h * 0.38, cx - 5, y + h * 0.34);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 4, y + h * 0.15);
        ctx.bezierCurveTo(cx + 8, y + h * 0.18, cx + 12, y + h * 0.28, cx + 12, y + h * 0.40);
        ctx.quadraticCurveTo(cx + 9, y + h * 0.38, cx + 5, y + h * 0.34);
        ctx.closePath();
        ctx.fill();

        // Main swept wings - longer and more prominent
        ctx.beginPath();
        ctx.moveTo(cx - 10, y + h * 0.38);
        ctx.bezierCurveTo(x - 2, y + h * 0.44, x - 6, y + h * 0.50, x - 4, y + h * 0.55);
        ctx.quadraticCurveTo(x, y + h * 0.66, x + 8, y + h * 0.64);
        ctx.quadraticCurveTo(cx - 7, y + h * 0.56, cx - 9, y + h * 0.50);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 10, y + h * 0.38);
        ctx.bezierCurveTo(x + w + 2, y + h * 0.44, x + w + 6, y + h * 0.50, x + w + 4, y + h * 0.55);
        ctx.quadraticCurveTo(x + w, y + h * 0.66, x + w - 8, y + h * 0.64);
        ctx.quadraticCurveTo(cx + 7, y + h * 0.56, cx + 9, y + h * 0.50);
        ctx.closePath();
        ctx.fill();

        // Horizontal stabilizers - extended
        ctx.beginPath();
        ctx.moveTo(cx - 9, y + h * 0.76);
        ctx.quadraticCurveTo(x + 2, y + h * 0.82, x + 4, y + h * 0.88);
        ctx.quadraticCurveTo(x + 7, y + h * 0.94, x + 12, y + h * 0.92);
        ctx.quadraticCurveTo(cx - 6, y + h * 0.86, cx - 8, y + h * 0.82);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 9, y + h * 0.76);
        ctx.quadraticCurveTo(x + w - 2, y + h * 0.82, x + w - 4, y + h * 0.88);
        ctx.quadraticCurveTo(x + w - 7, y + h * 0.94, x + w - 12, y + h * 0.92);
        ctx.quadraticCurveTo(cx + 6, y + h * 0.86, cx + 8, y + h * 0.82);
        ctx.closePath();
        ctx.fill();

        // Blended fuselage with smooth curves
        const bodyGradient = ctx.createLinearGradient(cx - 6, 0, cx + 6, 0);
        bodyGradient.addColorStop(0, '#2A4A6A');
        bodyGradient.addColorStop(0.2, '#5879A8');
        bodyGradient.addColorStop(0.5, '#88A9C8');
        bodyGradient.addColorStop(0.8, '#5879A8');
        bodyGradient.addColorStop(1, '#2A4A6A');
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(cx, y + h * 0.02);
        ctx.bezierCurveTo(cx - 3, y + h * 0.04, cx - 5, y + h * 0.1, cx - 6, y + h * 0.18);
        ctx.bezierCurveTo(cx - 7, y + h * 0.3, cx - 5, y + h * 0.5, cx - 4, y + h * 0.94);
        ctx.quadraticCurveTo(cx, y + h * 0.96, cx + 4, y + h * 0.94);
        ctx.bezierCurveTo(cx + 5, y + h * 0.5, cx + 7, y + h * 0.3, cx + 6, y + h * 0.18);
        ctx.bezierCurveTo(cx + 5, y + h * 0.1, cx + 3, y + h * 0.04, cx, y + h * 0.02);
        ctx.closePath();
        ctx.fill();

        // Engine nacelles with curves
        ctx.fillStyle = '#2A4A6A';
        ctx.beginPath();
        ctx.moveTo(cx - 6, y + h * 0.52);
        ctx.bezierCurveTo(cx - 10, y + h * 0.56, cx - 11, y + h * 0.65, cx - 11, y + h * 0.94);
        ctx.lineTo(cx - 6, y + h * 0.94);
        ctx.quadraticCurveTo(cx - 5, y + h * 0.7, cx - 6, y + h * 0.52);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 6, y + h * 0.52);
        ctx.bezierCurveTo(cx + 10, y + h * 0.56, cx + 11, y + h * 0.65, cx + 11, y + h * 0.94);
        ctx.lineTo(cx + 6, y + h * 0.94);
        ctx.quadraticCurveTo(cx + 5, y + h * 0.7, cx + 6, y + h * 0.52);
        ctx.fill();

        // Twin vertical tails with curves
        ctx.beginPath();
        ctx.moveTo(cx - 10, y + h * 0.56);
        ctx.quadraticCurveTo(cx - 13, y + h * 0.65, cx - 12, y + h * 0.86);
        ctx.quadraticCurveTo(cx - 10, y + h * 0.84, cx - 10, y + h * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 10, y + h * 0.56);
        ctx.quadraticCurveTo(cx + 13, y + h * 0.65, cx + 12, y + h * 0.86);
        ctx.quadraticCurveTo(cx + 10, y + h * 0.84, cx + 10, y + h * 0.6);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#051525';
        ctx.beginPath();
        ctx.ellipse(cx, y + h * 0.15, 3, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(80, 180, 255, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx - 1, y + h * 0.13, 1.2, 3, -0.15, 0, Math.PI * 2);
        ctx.fill();

        // Wide-spaced engines with glow
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(cx - 8, y + h * 0.94, 2.5, 0, Math.PI * 2);
        ctx.arc(cx + 8, y + h * 0.94, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF7700';
        ctx.beginPath();
        ctx.arc(cx - 8, y + h * 0.94, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 8, y + h * 0.94, 1.5, 0, Math.PI * 2);
        ctx.fill();

    } else if (skinIndex === 4) {
        // DASSAULT RAFALE - Smooth canard delta
        const wingGradient = ctx.createLinearGradient(x, 0, x + w, 0);
        wingGradient.addColorStop(0, '#2D343D');
        wingGradient.addColorStop(0.3, '#5A6574');
        wingGradient.addColorStop(0.5, '#8A95A4');
        wingGradient.addColorStop(0.7, '#5A6574');
        wingGradient.addColorStop(1, '#2D343D');

        // Delta wings with smooth curves
        ctx.fillStyle = wingGradient;
        ctx.beginPath();
        ctx.moveTo(cx - 3, y + h * 0.28);
        ctx.bezierCurveTo(cx - 8, y + h * 0.45, x + 2, y + h * 0.7, x + 4, y + h * 0.82);
        ctx.quadraticCurveTo(x + 10, y + h * 0.92, x + 16, y + h * 0.88);
        ctx.quadraticCurveTo(cx - 3, y + h * 0.65, cx - 3, y + h * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 3, y + h * 0.28);
        ctx.bezierCurveTo(cx + 8, y + h * 0.45, x + w - 2, y + h * 0.7, x + w - 4, y + h * 0.82);
        ctx.quadraticCurveTo(x + w - 10, y + h * 0.92, x + w - 16, y + h * 0.88);
        ctx.quadraticCurveTo(cx + 3, y + h * 0.65, cx + 3, y + h * 0.5);
        ctx.closePath();
        ctx.fill();

        // Canards with curves
        ctx.beginPath();
        ctx.moveTo(cx - 4, y + h * 0.2);
        ctx.quadraticCurveTo(x + 12, y + h * 0.22, x + 10, y + h * 0.26);
        ctx.quadraticCurveTo(x + 13, y + h * 0.32, x + 18, y + h * 0.30);
        ctx.quadraticCurveTo(cx - 2, y + h * 0.26, cx - 4, y + h * 0.24);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 4, y + h * 0.2);
        ctx.quadraticCurveTo(x + w - 12, y + h * 0.22, x + w - 10, y + h * 0.26);
        ctx.quadraticCurveTo(x + w - 13, y + h * 0.32, x + w - 18, y + h * 0.30);
        ctx.quadraticCurveTo(cx + 2, y + h * 0.26, cx + 4, y + h * 0.24);
        ctx.closePath();
        ctx.fill();

        // Fuselage with smooth curves
        const bodyGradient = ctx.createLinearGradient(cx - 6, 0, cx + 6, 0);
        bodyGradient.addColorStop(0, '#3D444D');
        bodyGradient.addColorStop(0.2, '#6A7584');
        bodyGradient.addColorStop(0.5, '#9AA5B4');
        bodyGradient.addColorStop(0.8, '#6A7584');
        bodyGradient.addColorStop(1, '#3D444D');
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(cx, y + h * 0.02);
        ctx.bezierCurveTo(cx - 3, y + h * 0.04, cx - 5, y + h * 0.1, cx - 6, y + h * 0.2);
        ctx.bezierCurveTo(cx - 6, y + h * 0.35, cx - 5, y + h * 0.45, cx - 5, y + h * 0.9);
        ctx.quadraticCurveTo(cx, y + h * 0.92, cx + 5, y + h * 0.9);
        ctx.bezierCurveTo(cx + 5, y + h * 0.45, cx + 6, y + h * 0.35, cx + 6, y + h * 0.2);
        ctx.bezierCurveTo(cx + 5, y + h * 0.1, cx + 3, y + h * 0.04, cx, y + h * 0.02);
        ctx.closePath();
        ctx.fill();

        // Air intakes with curves
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(cx - 6, y + h * 0.34, 2, 4, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 6, y + h * 0.34, 2, 4, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // Vertical tail with curve
        ctx.fillStyle = '#3D444D';
        ctx.beginPath();
        ctx.moveTo(cx - 1, y + h * 0.48);
        ctx.quadraticCurveTo(cx - 2, y + h * 0.6, cx - 1.5, y + h * 0.88);
        ctx.lineTo(cx + 1.5, y + h * 0.88);
        ctx.quadraticCurveTo(cx + 2, y + h * 0.6, cx + 1, y + h * 0.48);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#0a1520';
        ctx.beginPath();
        ctx.ellipse(cx, y + h * 0.15, 3, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(100, 200, 255, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx - 1, y + h * 0.13, 1.2, 3, -0.15, 0, Math.PI * 2);
        ctx.fill();

        // Twin engines with glow
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(cx - 3, y + h * 0.93, 2, 0, Math.PI * 2);
        ctx.arc(cx + 3, y + h * 0.93, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF6600';
        ctx.beginPath();
        ctx.arc(cx - 3, y + h * 0.93, 1.2, 0, Math.PI * 2);
        ctx.arc(cx + 3, y + h * 0.93, 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// Draw menu screen
function drawMenu() {
    // Draw space background
    drawBackground();

    // Draw title
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 64px American Typewriter';
    ctx.textAlign = 'center';
    ctx.fillText('SPACE INTRUDERS', SCREEN_WIDTH / 2, 80);

    // Draw subtitle
    ctx.font = '24px American Typewriter';
    ctx.fillStyle = '#888888';
    ctx.fillText('A Space Shooter Game', SCREEN_WIDTH / 2, 120);

    if (showingUpgrades) {
        // Upgrades screen
        ctx.fillStyle = '#00FF00';
        ctx.font = '36px American Typewriter';
        ctx.fillText('UPGRADES', SCREEN_WIDTH / 2, 180);

        // Show credits
        ctx.fillStyle = '#FFD700';
        ctx.font = '28px American Typewriter';
        ctx.fillText(`Credits: ${playerCredits}`, SCREEN_WIDTH / 2, 220);

        const upgradeList = [
            { key: 'lives', name: 'Extra Lives', icon: '❤️' },
            { key: 'damage', name: 'Damage Boost', icon: '💥' },
            { key: 'turrets', name: 'Auto Turrets', icon: '🔫' }
        ];

        for (let i = 0; i < upgradeList.length; i++) {
            const y = 280 + i * 90;
            const upgrade = upgrades[upgradeList[i].key];
            const cost = getUpgradeCost(upgrade);
            const isMaxed = upgrade.level >= upgrade.maxLevel;
            const canAfford = playerCredits >= cost;
            const isSelected = i === upgradeSelectionIndex;

            // Background box
            ctx.fillStyle = isSelected ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(SCREEN_WIDTH / 2 - 200, y - 25, 400, 80);

            if (isSelected) {
                ctx.strokeStyle = '#00FF00';
                ctx.lineWidth = 2;
                ctx.strokeRect(SCREEN_WIDTH / 2 - 200, y - 25, 400, 80);
            }

            // Upgrade name
            ctx.fillStyle = isSelected ? '#00FF00' : WHITE;
            ctx.font = isSelected ? 'bold 26px American Typewriter' : '24px American Typewriter';
            ctx.textAlign = 'left';
            ctx.fillText(upgradeList[i].name, SCREEN_WIDTH / 2 - 180, y + 5);

            // Level indicator
            ctx.fillStyle = '#888888';
            ctx.font = '18px American Typewriter';
            ctx.fillText(`Level ${upgrade.level}/${upgrade.maxLevel}`, SCREEN_WIDTH / 2 - 180, y + 30);

            // Level bar
            const barX = SCREEN_WIDTH / 2 + 20;
            const barWidth = 150;
            ctx.fillStyle = '#333333';
            ctx.fillRect(barX, y - 5, barWidth, 15);
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(barX, y - 5, barWidth * (upgrade.level / upgrade.maxLevel), 15);
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, y - 5, barWidth, 15);

            // Cost or MAXED
            ctx.textAlign = 'right';
            if (isMaxed) {
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 20px American Typewriter';
                ctx.fillText('MAXED', SCREEN_WIDTH / 2 + 180, y + 35);
            } else {
                ctx.fillStyle = canAfford ? '#00FF00' : '#FF6666';
                ctx.font = '20px American Typewriter';
                ctx.fillText(`Cost: ${cost}`, SCREEN_WIDTH / 2 + 180, y + 35);
            }

            // Effect description
            ctx.textAlign = 'left';
            ctx.fillStyle = '#AAAAAA';
            ctx.font = '14px American Typewriter';
            ctx.fillText(upgrade.effect, SCREEN_WIDTH / 2 - 180, y + 48);
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#888888';
        ctx.font = '18px American Typewriter';
        ctx.fillText('ENTER to purchase | ESC to go back', SCREEN_WIDTH / 2, 560);
        ctx.fillText('Earn credits by defeating enemies (10 per kill)', SCREEN_WIDTH / 2, 585);

    } else if (showingSkins) {
        // Skins screen
        ctx.fillStyle = '#00FF00';
        ctx.font = '36px American Typewriter';
        ctx.fillText('SELECT YOUR FIGHTER', SCREEN_WIDTH / 2, 200);

        // Draw skin options with previews
        for (let i = 0; i < skins.length; i++) {
            const y = 250 + i * 60;
            const previewX = SCREEN_WIDTH / 2 - 180;
            const previewY = y - 25;
            const isLocked = !unlockedSkins[i];

            // Draw mini jet preview (dimmed if locked)
            ctx.save();
            if (isLocked) {
                ctx.globalAlpha = 0.4;
            }
            drawJetPreview(previewX, previewY, 40, 50, i);
            ctx.restore();

            // Draw text
            ctx.textAlign = 'left';
            const textX = SCREEN_WIDTH / 2 - 120;
            let textWidth = 0;

            if (isLocked) {
                // Locked skin styling
                ctx.fillStyle = '#666666';
                ctx.font = i === skinSelectionIndex ? 'bold 26px American Typewriter' : '22px American Typewriter';
                ctx.fillText(skins[i], textX, y);
                textWidth = ctx.measureText(skins[i]).width;

                // Show lock icon and unlock requirement
                ctx.fillStyle = '#FF6666';
                ctx.font = '14px American Typewriter';
                ctx.fillText('[LOCKED]', textX + textWidth + 15, y - 5);
                ctx.fillStyle = '#888888';
                ctx.font = '12px American Typewriter';
                ctx.fillText(skinUnlockConditions[i].description, textX + textWidth + 15, y + 10);

                // Selection indicator (dimmed)
                if (i === skinSelectionIndex) {
                    ctx.fillStyle = '#666666';
                    ctx.font = 'bold 26px American Typewriter';
                    ctx.fillText('>', SCREEN_WIDTH / 2 - 145, y);
                }
            } else {
                // Unlocked skin styling
                if (i === skinSelectionIndex) {
                    ctx.fillStyle = '#00FF00';
                    ctx.font = 'bold 26px American Typewriter';
                    ctx.fillText(skins[i], textX, y);
                    textWidth = ctx.measureText(skins[i]).width;
                    // Selection indicator
                    ctx.fillText('>', SCREEN_WIDTH / 2 - 145, y);
                } else {
                    ctx.fillStyle = i === selectedSkin ? '#FFD700' : WHITE;
                    ctx.font = '22px American Typewriter';
                    ctx.fillText(skins[i], textX, y);
                    textWidth = ctx.measureText(skins[i]).width;
                }

                // Show "EQUIPPED" badge to the right of the skin name
                if (i === selectedSkin) {
                    ctx.fillStyle = '#FFD700';
                    ctx.font = '14px American Typewriter';
                    ctx.fillText('[EQUIPPED]', textX + textWidth + 15, y);
                }
            }
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#888888';
        ctx.font = '20px American Typewriter';
        ctx.fillText('ENTER to equip | ESC to go back', SCREEN_WIDTH / 2, 570);
    } else if (showingSettings) {
        // Settings screen
        ctx.fillStyle = '#00FF00';
        ctx.font = '36px American Typewriter';
        ctx.fillText('SETTINGS', SCREEN_WIDTH / 2, 200);

        const settingsOptions = [
            { label: 'Master Volume', type: 'slider', value: volume },
            { label: 'Turret 1', type: 'toggle', value: turretEnabled[0], locked: upgrades.turrets.level < 1 },
            { label: 'Turret 2', type: 'toggle', value: turretEnabled[1], locked: upgrades.turrets.level < 2 },
            { label: 'Turret 3', type: 'toggle', value: turretEnabled[2], locked: upgrades.turrets.level < 3 }
        ];

        for (let i = 0; i < settingsOptions.length; i++) {
            const y = 270 + i * 60;
            const opt = settingsOptions[i];
            const isSelected = i === settingsSelectionIndex;

            // Label
            ctx.fillStyle = opt.locked ? '#555555' : (isSelected ? '#00FF00' : WHITE);
            ctx.font = isSelected ? 'bold 28px American Typewriter' : '24px American Typewriter';
            ctx.textAlign = 'left';
            ctx.fillText(opt.label + (opt.locked ? ' (Locked)' : ''), 120, y);

            ctx.textAlign = 'right';
            if (opt.type === 'slider') {
                // Draw volume bar
                const barX = 480;
                const barY = y - 12;
                const barWidth = 150;
                const barHeight = 20;

                // Background
                ctx.fillStyle = '#333333';
                ctx.fillRect(barX, barY, barWidth, barHeight);

                // Filled portion
                ctx.fillStyle = isSelected ? '#00FF00' : '#00AA00';
                ctx.fillRect(barX, barY, barWidth * opt.value, barHeight);

                // Border
                ctx.strokeStyle = isSelected ? '#00FF00' : '#888888';
                ctx.lineWidth = 2;
                ctx.strokeRect(barX, barY, barWidth, barHeight);

                // Percentage text
                ctx.fillStyle = WHITE;
                ctx.font = '20px American Typewriter';
                ctx.textAlign = 'center';
                ctx.fillText(Math.round(opt.value * 100) + '%', barX + barWidth / 2, y + 2);
            } else if (opt.type === 'toggle') {
                // Draw toggle
                const toggleText = opt.locked ? '---' : (opt.value ? 'ON' : 'OFF');
                ctx.fillStyle = opt.locked ? '#555555' : (opt.value ? '#00FF00' : '#FF4444');
                ctx.font = isSelected ? 'bold 28px American Typewriter' : '24px American Typewriter';
                ctx.fillText(toggleText, 630, y);
            }
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#888888';
        ctx.font = '18px American Typewriter';
        ctx.fillText('UP/DOWN to select | LEFT/RIGHT to adjust | ESC to go back', SCREEN_WIDTH / 2, 560);

    } else if (showingControls) {
        // Controls screen
        ctx.fillStyle = '#00FF00';
        ctx.font = '36px American Typewriter';
        ctx.fillText('CONTROLS', SCREEN_WIDTH / 2, 280);

        ctx.font = '24px American Typewriter';
        ctx.fillStyle = WHITE;
        ctx.fillText('WASD / Arrow Keys - Move', SCREEN_WIDTH / 2, 340);
        ctx.fillText('SPACE - Shoot', SCREEN_WIDTH / 2, 380);
        ctx.fillText('R - Restart (when game over)', SCREEN_WIDTH / 2, 420);

        ctx.fillStyle = '#888888';
        ctx.font = '20px American Typewriter';
        ctx.fillText('Press ESC or ENTER to go back', SCREEN_WIDTH / 2, 500);
    } else if (showingAbout) {
        // About screen
        ctx.fillStyle = '#00FF00';
        ctx.font = '36px American Typewriter';
        ctx.fillText('ABOUT', SCREEN_WIDTH / 2, 260);

        ctx.fillStyle = '#00FF00';
        ctx.font = '28px American Typewriter';
        ctx.fillText('How to Play', SCREEN_WIDTH / 2, 310);

        ctx.font = '22px American Typewriter';
        ctx.fillStyle = WHITE;
        ctx.fillText('Destroy enemy ships to score points!', SCREEN_WIDTH / 2, 350);
        ctx.fillText('Every 10 enemies defeated = Level Up', SCREEN_WIDTH / 2, 380);
        ctx.fillText('Higher levels = Faster & more enemies', SCREEN_WIDTH / 2, 410);
        ctx.fillText('Avoid collisions - You have 4 hits!', SCREEN_WIDTH / 2, 440);

        ctx.fillStyle = '#FFD700';
        ctx.font = '20px American Typewriter';
        ctx.fillText('Developed by Brandon Yang, created by claude.code', SCREEN_WIDTH / 2, 490);

        ctx.fillStyle = '#888888';
        ctx.font = '20px American Typewriter';
        ctx.fillText('Press ESC or ENTER to go back', SCREEN_WIDTH / 2, 540);
    } else {
        // Draw 3D-like horizontally rotating preview of equipped skin
        ctx.save();
        const previewX = SCREEN_WIDTH / 2;
        const previewY = 185;
        const time = Date.now() / 1500;
        const rotationAngle = time % (Math.PI * 2);
        const scaleX = Math.cos(rotationAngle);
        const bob = Math.sin(Date.now() / 800) * 3;
        const baseScale = 1.5;

        ctx.translate(previewX, previewY + bob);

        // Draw shadow that moves with rotation
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(scaleX * 8, 50, 25 * Math.abs(scaleX) + 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Apply horizontal 3D rotation effect
        ctx.scale(scaleX * baseScale, baseScale);

        // Adjust shading based on rotation
        const facing = scaleX > 0 ? 1 : -1;

        // Draw the jet preview
        if (Math.abs(scaleX) > 0.1) {
            // Draw highlight/shadow overlay based on rotation
            drawJetPreview(-25, -40, 50, 80, selectedSkin);

            // Add dynamic lighting effect
            const lightIntensity = (scaleX + 1) / 2;
            ctx.fillStyle = `rgba(255, 255, 255, ${lightIntensity * 0.15})`;
            ctx.fillRect(-25, -40, 25, 80);
            ctx.fillStyle = `rgba(0, 0, 0, ${(1 - lightIntensity) * 0.2})`;
            ctx.fillRect(0, -40, 25, 80);
        } else {
            // Edge view - draw thin profile
            ctx.fillStyle = '#555';
            ctx.fillRect(-2, -35, 4, 70);
        }

        ctx.restore();

        // Skin name label
        ctx.fillStyle = '#888888';
        ctx.font = '18px American Typewriter';
        ctx.textAlign = 'center';
        ctx.fillText(skins[selectedSkin], SCREEN_WIDTH / 2, 260);

        // Main menu options
        for (let i = 0; i < menuOptions.length; i++) {
            const y = 313 + i * 50;

            if (i === selectedOption) {
                // Selected option
                ctx.fillStyle = '#00FF00';
                ctx.font = 'bold 36px American Typewriter';
                ctx.fillText('> ' + menuOptions[i] + ' <', SCREEN_WIDTH / 2, y);
            } else {
                // Unselected option
                ctx.fillStyle = WHITE;
                ctx.font = '32px American Typewriter';
                ctx.fillText(menuOptions[i], SCREEN_WIDTH / 2, y);
            }
        }

        // Navigation hint
        ctx.fillStyle = '#888888';
        ctx.font = '20px American Typewriter';
        ctx.fillText('Use UP/DOWN to navigate, ENTER to select', SCREEN_WIDTH / 2, 580);
    }

    ctx.textAlign = 'left';
}

// Handle menu input
let menuKeyPressed = false;
function handleMenuInput() {
    if (!menuKeyPressed) {
        if (showingUpgrades) {
            if (keys['Escape']) {
                showingUpgrades = false;
                menuKeyPressed = true;
            } else if (keys['ArrowUp'] || keys['w'] || keys['W']) {
                upgradeSelectionIndex = (upgradeSelectionIndex - 1 + 3) % 3;
                menuKeyPressed = true;
            } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
                upgradeSelectionIndex = (upgradeSelectionIndex + 1) % 3;
                menuKeyPressed = true;
            } else if (keys['Enter'] || keys[' ']) {
                // Try to purchase upgrade
                const upgradeNames = ['lives', 'damage', 'turrets'];
                purchaseUpgrade(upgradeNames[upgradeSelectionIndex]);
                menuKeyPressed = true;
            }
        } else if (showingSkins) {
            if (keys['Escape']) {
                showingSkins = false;
                menuKeyPressed = true;
            } else if (keys['ArrowUp'] || keys['w'] || keys['W']) {
                skinSelectionIndex = (skinSelectionIndex - 1 + skins.length) % skins.length;
                menuKeyPressed = true;
            } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
                skinSelectionIndex = (skinSelectionIndex + 1) % skins.length;
                menuKeyPressed = true;
            } else if (keys['Enter'] || keys[' ']) {
                // Only allow equipping unlocked skins
                if (unlockedSkins[skinSelectionIndex]) {
                    selectedSkin = skinSelectionIndex;
                    saveSelectedSkin();
                }
                menuKeyPressed = true;
            }
        } else if (showingSettings) {
            if (keys['Escape']) {
                showingSettings = false;
                saveSettings();
                menuKeyPressed = true;
            } else if (keys['ArrowUp'] || keys['w'] || keys['W']) {
                settingsSelectionIndex = (settingsSelectionIndex - 1 + 4) % 4;
                menuKeyPressed = true;
            } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
                settingsSelectionIndex = (settingsSelectionIndex + 1) % 4;
                menuKeyPressed = true;
            } else if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
                if (settingsSelectionIndex === 0) {
                    // Volume slider - decrease
                    volume = Math.max(0, volume - 0.1);
                    saveSettings();
                } else {
                    // Turret toggles - only if unlocked
                    const turretIndex = settingsSelectionIndex - 1;
                    if (upgrades.turrets.level > turretIndex) {
                        turretEnabled[turretIndex] = !turretEnabled[turretIndex];
                        saveSettings();
                    }
                }
                menuKeyPressed = true;
            } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
                if (settingsSelectionIndex === 0) {
                    // Volume slider - increase
                    volume = Math.min(1, volume + 0.1);
                    saveSettings();
                } else {
                    // Turret toggles - only if unlocked
                    const turretIndex = settingsSelectionIndex - 1;
                    if (upgrades.turrets.level > turretIndex) {
                        turretEnabled[turretIndex] = !turretEnabled[turretIndex];
                        saveSettings();
                    }
                }
                menuKeyPressed = true;
            }
        } else if (showingControls || showingAbout) {
            if (keys['Escape'] || keys['Enter']) {
                showingControls = false;
                showingAbout = false;
                menuKeyPressed = true;
            }
        } else {
            if (keys['ArrowUp'] || keys['w'] || keys['W']) {
                selectedOption = (selectedOption - 1 + menuOptions.length) % menuOptions.length;
                menuKeyPressed = true;
            }
            if (keys['ArrowDown'] || keys['s'] || keys['S']) {
                selectedOption = (selectedOption + 1) % menuOptions.length;
                menuKeyPressed = true;
            }
            if (keys['Enter'] || keys[' ']) {
                if (menuOptions[selectedOption] === 'Start Game') {
                    inMenu = false;
                    initGame();
                } else if (menuOptions[selectedOption] === 'Upgrades') {
                    showingUpgrades = true;
                    upgradeSelectionIndex = 0;
                } else if (menuOptions[selectedOption] === 'Skins') {
                    showingSkins = true;
                    skinSelectionIndex = selectedSkin;
                } else if (menuOptions[selectedOption] === 'Settings') {
                    showingSettings = true;
                    settingsSelectionIndex = 0;
                } else if (menuOptions[selectedOption] === 'Controls') {
                    showingControls = true;
                } else if (menuOptions[selectedOption] === 'About') {
                    showingAbout = true;
                }
                menuKeyPressed = true;
            }
        }
    }

    // Reset key pressed state when no keys are held
    if (!keys['ArrowUp'] && !keys['ArrowDown'] && !keys['ArrowLeft'] && !keys['ArrowRight'] &&
        !keys['w'] && !keys['W'] && !keys['s'] && !keys['S'] && !keys['a'] && !keys['A'] &&
        !keys['d'] && !keys['D'] && !keys['Enter'] && !keys[' '] && !keys['Escape']) {
        menuKeyPressed = false;
    }
}

// Game loop
function gameLoop() {
    frameCount++;

    if (inMenu) {
        handleMenuInput();
        drawMenu();
    } else {
        handleInput();
        update();
        draw();
    }
    requestAnimationFrame(gameLoop);
}

// Event listeners
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Prevent spacebar from scrolling
window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
    }
});

// Mouse click handler for pause button
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if pause button was clicked
    const btnX = SCREEN_WIDTH - 50;
    const btnY = 10;
    const btnSize = 40;

    if (!inMenu && !gameOver &&
        mouseX >= btnX && mouseX <= btnX + btnSize &&
        mouseY >= btnY && mouseY <= btnY + btnSize) {
        isPaused = !isPaused;
        pauseSelectedOption = 0;
    }
});

// Initialize stars for menu background
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * SCREEN_WIDTH,
            y: Math.random() * SCREEN_HEIGHT,
            size: Math.random() * 2 + 1
        });
    }
}

// Start game
initStars();
gameLoop();

