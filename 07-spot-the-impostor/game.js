// Constants - Game Configuration
const CONFIG = {
    WIDTH: 800,
    HEIGHT: 600,
    BACKGROUND_COLOR: '#1a1a2e',
    INITIAL_TIME: 30,
    POINTS_PER_IMPOSTOR: 15,
    POINTS_LOST_PER_CREWMATE: 10,
    TIME_LOST_PER_CREWMATE: 3,
    SPAWN_INTERVAL: 1200,
    MIN_SPAWN_COUNT: 2,
    MAX_SPAWN_COUNT: 4,
    IMPOSTOR_RATIO: 0.28, // 28% chance of impostor, more predictable
    CREWMATE_COLORS: ['#2e86de', '#27ae60', '#9b59b6', '#f39c12', '#3498db'],
    IMPOSTOR_COLORS: ['#c70d3a', '#ff6b6b'],
    SPRITE_SIZE: 50,
    MOVEMENT_SPEED: {
        MIN: 80,
        MAX: 130
    }
};

// Utility Functions
function randomInRange(min, max) {
    return Phaser.Math.Between(min, max);
}

function randomElement(array) {
    return Phaser.Math.RND.pick(array);
}

// --- Start Scene ---
class StartScene extends Phaser.Scene {
    constructor() {
        super('start-scene');
    }

    create() {
        // Title
        this.add.text(CONFIG.WIDTH / 2, 150, 'Spot the Impostor!', {
            fontSize: '72px',
            color: '#c70d3a',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5);

        // Instructions
        this.add.text(CONFIG.WIDTH / 2, 280, '🟥 Haz clic solo en los IMPOSTORES ROJOS!', {
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        this.add.text(CONFIG.WIDTH / 2, 330, '🟩 NO hagas clic en los CREWMATES (perderás puntos!)', {
            fontSize: '20px',
            color: '#dfe6e9',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Start Button
        const startButton = this.add.text(CONFIG.WIDTH / 2, 480, 'Jugar Ahora!', {
            fontSize: '52px',
            color: '#ffffff',
            backgroundColor: '#c70d3a',
            padding: { x: 40, y: 18 },
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
            this.spawnCrewmate(x, y, isImpostor);
        }
    }

    createSpriteTexture(isImpostor) {
        const colors = isImpostor ? CONFIG.IMPOSTOR_COLORS : CONFIG.CREWMATE_COLORS;
        const color = randomElement(colors);
        
        const graphics = this.add.graphics();
        graphics.fillStyle(Number(color.replace('#', '0x')), 1);
        
        // Draw crewmate body
        graphics.fillEllipse(
            CONFIG.SPRITE_SIZE / 2,
            CONFIG.SPRITE_SIZE / 2,
            CONFIG.SPRITE_SIZE * 0.8,
            CONFIG.SPRITE_SIZE * 0.9
        );
        
        // Draw backpack
        graphics.fillEllipse(
            CONFIG.SPRITE_SIZE * 0.05,
            CONFIG.SPRITE_SIZE / 2,
            CONFIG.SPRITE_SIZE * 0.3,
            CONFIG.SPRITE_SIZE * 0.5
        );

        const textureKey = isImpostor ? 'impostor' : 'crewmate';
        graphics.generateTexture(textureKey, CONFIG.SPRITE_SIZE, CONFIG.SPRITE_SIZE);
        graphics.destroy();
        
        return textureKey;
    }

    spawnCrewmate(x, y, isImpostor) {
        const textureKey = this.createSpriteTexture(isImpostor);
        const sprite = this.physics.add.sprite(x, y, textureKey);
        
        sprite.setScale(0.75 + Math.random() * 0.5);
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
            scale: 1.6,
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
        // Title
        this.add.text(CONFIG.WIDTH / 2, 140, 'Game Over!', {
            fontSize: '76px',
            color: '#c70d3a',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5);

        // Score
        this.add.text(CONFIG.WIDTH / 2, 280, `Puntuación Final:`, {
            fontSize: '36px',
            color: '#dfe6e9',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        this.add.text(CONFIG.WIDTH / 2, 340, `${this.finalScore}`, {
            fontSize: '80px',
            color: this.finalScore >= 100 ? '#27ae60' : '#f39c12',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Restart Button
        const restartButton = this.add.text(CONFIG.WIDTH / 2, 480, 'Jugar de Nuevo', {
            fontSize: '48px',
            color: '#ffffff',
            backgroundColor: '#2e86de',
            padding: { x: 35, y: 16 },
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
    scene: [StartScene, PlayScene, GameOverScene],
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
