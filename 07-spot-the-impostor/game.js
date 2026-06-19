// Constants - Game Configuration
const CONFIG = {
    WIDTH: 800,
    HEIGHT: 600,
    BACKGROUND_COLOR: '#0d1117',
    INITIAL_TIME: 30,
    POINTS_PER_IMPOSTOR: 15,
    POINTS_LOST_PER_CREWMATE: 10,
    TIME_LOST_PER_CREWMATE: 3,
    SPAWN_INTERVAL: 1200,
    MIN_SPAWN_COUNT: 2,
    MAX_SPAWN_COUNT: 4,
    IMPOSTOR_RATIO: 0.28, // 28% chance of impostor
    SPRITE_SIZE: 48,
    MOVEMENT_SPEED: {
        MIN: 80,
        MAX: 130
    }
};

// Utility Functions
function randomInRange(min, max) {
    return Phaser.Math.Between(min, max);
}

// --- Boot/Preload Scene ---
class PreloadScene extends Phaser.Scene {
    constructor() {
        super('preload-scene');
    }

    preload() {
        // Loading text
        const loadingText = this.add.text(CONFIG.WIDTH/2, CONFIG.HEIGHT/2, 'Cargando...', {
            fontSize: '40px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Generate sprites programmatically to avoid loading issues!
        this.generateCrewmate();
        this.generateImpostor();
        
        // Load background - Space themed (more reliable URL)
        this.load.image('space-bg', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80&auto=format&fit=crop');

        this.load.on('complete', () => {
            this.scene.start('start-scene');
        });
    }

    generateCrewmate() {
        const gfx = this.make.graphics({ add: false });
        gfx.fillStyle(0x2e86de, 1);
        gfx.fillEllipse(CONFIG.SPRITE_SIZE/2, CONFIG.SPRITE_SIZE/2, 38, 44); // Body
        gfx.fillStyle(0x2e86de, 0.8);
        gfx.fillEllipse(8, CONFIG.SPRITE_SIZE/2, 14, 24); // Backpack
        gfx.generateTexture('crewmate', CONFIG.SPRITE_SIZE, CONFIG.SPRITE_SIZE);
        gfx.destroy();
    }

    generateImpostor() {
        const gfx = this.make.graphics({ add: false });
        gfx.fillStyle(0xc70d3a, 1);
        gfx.fillEllipse(CONFIG.SPRITE_SIZE/2, CONFIG.SPRITE_SIZE/2, 38, 44); // Body
        gfx.fillStyle(0xc70d3a, 0.8);
        gfx.fillEllipse(8, CONFIG.SPRITE_SIZE/2, 14, 24); // Backpack
        gfx.generateTexture('impostor', CONFIG.SPRITE_SIZE, CONFIG.SPRITE_SIZE);
        gfx.destroy();
    }
}

// --- Start Scene ---
class StartScene extends Phaser.Scene {
    constructor() {
        super('start-scene');
    }

    create() {
        // Add space background
        this.add.image(0, 0, 'space-bg').setOrigin(0, 0).setAlpha(0.35);

        // Title
        this.add.text(CONFIG.WIDTH / 2, 130, 'Spot the Impostor!', {
            fontSize: '76px',
            color: '#ff6b6b',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5);

        // Instructions
        this.add.text(CONFIG.WIDTH / 2, 260, '🟥 Haz clic solo en los IMPOSTORES ROJOS!', {
            fontSize: '26px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        this.add.text(CONFIG.WIDTH / 2, 310, '🟩 NO hagas clic en los CREWMATES (perderás puntos!)', {
            fontSize: '20px',
            color: '#dfe6e9',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Start Button
        const startButton = this.add.text(CONFIG.WIDTH / 2, 470, 'Jugar Ahora!', {
            fontSize: '56px',
            color: '#ffffff',
            backgroundColor: '#c70d3a',
            padding: { x: 45, y: 20 },
            borderRadius: 15
        }).setOrigin(0.5).setInteractive();

        this.addButtonEvents(startButton, '#c70d3a', '#ff6b6b', () => {
            this.scene.start('play-scene');
        });
    }

    addButtonEvents(button, normalColor, hoverColor, onClick) {
        button.on('pointerdown', onClick);
        button.on('pointerover', () => {
            button.setBackgroundColor(hoverColor);
        });
        button.on('pointerout', () => {
            button.setBackgroundColor(normalColor);
        });
    }
}

// --- Play Scene ---
class PlayScene extends Phaser.Scene {
    constructor() {
        super('play-scene');
        this.score = 0;
        this.timeLeft = CONFIG.INITIAL_TIME;
        this.crewmates = [];
        this.isGameOver = false;
    }

    create() {
        // Add space background
        this.add.image(0, 0, 'space-bg').setOrigin(0, 0).setAlpha(0.25);

        this.resetGameState();
        this.updateUI();
        
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
        
        this.spawnWave();
        
        this.spawnTimer = this.time.addEvent({
            delay: CONFIG.SPAWN_INTERVAL,
            callback: this.spawnWave,
            callbackScope: this,
            loop: true
        });
    }

    resetGameState() {
        this.score = 0;
        this.timeLeft = CONFIG.INITIAL_TIME;
        this.isGameOver = false;
        
        this.crewmates.forEach(sprite => sprite.destroy());
        this.crewmates = [];
    }

    updateTimer() {
        if (this.isGameOver) return;
        
        this.timeLeft--;
        this.updateUI();
        
        if (this.timeLeft <= 0) {
            this.endGame();
        }
    }

    spawnWave() {
        if (this.isGameOver) return;
        
        const count = randomInRange(CONFIG.MIN_SPAWN_COUNT, CONFIG.MAX_SPAWN_COUNT);
        
        for (let i = 0; i < count; i++) {
            const x = randomInRange(CONFIG.SPRITE_SIZE, CONFIG.WIDTH - CONFIG.SPRITE_SIZE);
            const y = randomInRange(CONFIG.SPRITE_SIZE, CONFIG.HEIGHT - CONFIG.SPRITE_SIZE);
            const isImpostor = Math.random() < CONFIG.IMPOSTOR_RATIO;
            this.spawnCharacter(x, y, isImpostor);
        }
    }

    spawnCharacter(x, y, isImpostor) {
        const textureKey = isImpostor ? 'impostor' : 'crewmate';
        const sprite = this.physics.add.sprite(x, y, textureKey);
        
        sprite.setScale(0.6 + Math.random() * 0.4);
        sprite.setData('isImpostor', isImpostor);
        sprite.setInteractive();

        sprite.on('pointerdown', () => {
            if (!this.isGameOver) {
                this.handleClick(sprite);
            }
        });

        sprite.setVelocity(
            randomInRange(-CONFIG.MOVEMENT_SPEED.MAX, CONFIG.MOVEMENT_SPEED.MAX),
            randomInRange(-CONFIG.MOVEMENT_SPEED.MAX, CONFIG.MOVEMENT_SPEED.MAX)
        );
        sprite.setBounce(1, 1);
        sprite.setCollideWorldBounds(true);
        
        this.crewmates.push(sprite);

        // Auto-despawn after 4.5s
        this.tweens.add({
            targets: sprite,
            alpha: 0,
            y: sprite.y + 60,
            duration: 1800,
            delay: 4500,
            ease: 'Power2',
            onComplete: () => this.removeSprite(sprite)
        });
    }

    handleClick(sprite) {
        const isImpostor = sprite.getData('isImpostor');
        
        if (isImpostor) {
            this.handleCorrectClick(sprite);
        } else {
            this.handleIncorrectClick(sprite);
        }
    }

    handleCorrectClick(sprite) {
        this.score += CONFIG.POINTS_PER_IMPOSTOR;
        this.updateUI();
        
        this.tweens.add({
            targets: sprite,
            scale: 1.7,
            alpha: 0,
            duration: 250,
            onComplete: () => this.removeSprite(sprite)
        });
    }

    handleIncorrectClick(sprite) {
        this.score = Math.max(0, this.score - CONFIG.POINTS_LOST_PER_CREWMATE);
        this.timeLeft = Math.max(1, this.timeLeft - CONFIG.TIME_LOST_PER_CREWMATE);
        this.updateUI();
        
        this.cameras.main.shake(120, 0.025);
    }

    removeSprite(sprite) {
        const index = this.crewmates.indexOf(sprite);
        if (index > -1) {
            this.crewmates.splice(index, 1);
        }
        sprite.destroy();
    }

    updateUI() {
        document.getElementById('score').textContent = `Puntos: ${this.score}`;
        document.getElementById('timer').textContent = `Tiempo: ${this.timeLeft}`;
    }

    endGame() {
        this.isGameOver = true;
        this.scene.start('game-over-scene', { score: this.score });
    }
}

// --- Game Over Scene ---
class GameOverScene extends Phaser.Scene {
    constructor() {
        super('game-over-scene');
        this.finalScore = 0;
    }

    init(data) {
        this.finalScore = data.score;
    }

    create() {
        // Add space background
        this.add.image(0, 0, 'space-bg').setOrigin(0, 0).setAlpha(0.3);

        // Title
        this.add.text(CONFIG.WIDTH / 2, 130, 'Game Over!', {
            fontSize: '78px',
            color: '#ff6b6b',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5);

        // Score
        this.add.text(CONFIG.WIDTH / 2, 270, `Puntuación Final:`, {
            fontSize: '38px',
            color: '#dfe6e9',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        this.add.text(CONFIG.WIDTH / 2, 335, `${this.finalScore}`, {
            fontSize: '85px',
            color: this.finalScore >= 100 ? '#27ae60' : '#f39c12',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Restart Button
        const restartButton = this.add.text(CONFIG.WIDTH / 2, 475, 'Jugar de Nuevo', {
            fontSize: '50px',
            color: '#ffffff',
            backgroundColor: '#2e86de',
            padding: { x: 38, y: 17 },
            borderRadius: 12
        }).setOrigin(0.5).setInteractive();

        this.addButtonEvents(restartButton, '#2e86de', '#66b3ff', () => {
            this.scene.start('play-scene');
        });
    }

    addButtonEvents(button, normalColor, hoverColor, onClick) {
        button.on('pointerdown', onClick);
        button.on('pointerover', () => {
            button.setBackgroundColor(hoverColor);
        });
        button.on('pointerout', () => {
            button.setBackgroundColor(normalColor);
        });
    }
}

// --- Initialize Game ---
const gameConfig = {
    type: Phaser.AUTO,
    width: CONFIG.WIDTH,
    height: CONFIG.HEIGHT,
    backgroundColor: CONFIG.BACKGROUND_COLOR,
    scene: [PreloadScene, StartScene, PlayScene, GameOverScene],
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(gameConfig);
