const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#1a1a2e',
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

const game = new Phaser.Game(config);

class StartScene extends Phaser.Scene {
    constructor() {
        super('start-scene');
    }

    create() {
        this.add.text(400, 200, 'Spot the Impostor!', {
            fontSize: '64px',
            color: '#c70d3a',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(400, 300, 'Haz clic en los impostores rojos!', {
            fontSize: '28px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        const startButton = this.add.text(400, 450, 'Jugar!', {
            fontSize: '48px',
            color: '#ffffff',
            backgroundColor: '#c70d3a',
            padding: { x: 30, y: 15 },
            borderRadius: 10
        }).setOrigin(0.5).setInteractive();

        startButton.on('pointerdown', () => {
            this.scene.start('play-scene');
        });

        startButton.on('pointerover', () => {
            startButton.setBackgroundColor('#ff6b6b');
        });

        startButton.on('pointerout', () => {
            startButton.setBackgroundColor('#c70d3a');
        });
    }
}

class PlayScene extends Phaser.Scene {
    constructor() {
        super('play-scene');
        this.score = 0;
        this.timeLeft = 30;
        this.crewmates = [];
        this.isGameOver = false;
    }

    create() {
        this.score = 0;
        this.timeLeft = 30;
        this.isGameOver = false;
        this.crewmates = [];

        this.updateUI();

        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });

        this.spawnWave();

        this.spawnTimer = this.time.addEvent({
            delay: 1500,
            callback: this.spawnWave,
            callbackScope: this,
            loop: true
        });
    }

    spawnCrewmate(x, y, isImpostor) {
        const colors = isImpostor ? ['#c70d3a', '#ff6b6b'] : ['#2e86de', '#27ae60', '#9b59b6', '#f39c12'];
        const color = Phaser.Math.RND.pick(colors);
        
        const size = 50;
        const crewmate = this.add.graphics();
        
        // Body
        crewmate.fillStyle(Number(color.replace('#', '0x')), 1);
        crewmate.fillEllipse(size / 2, size / 2, size * 0.8, size * 0.9);
        
        // Backpack
        const packX = size * 0.05;
        crewmate.fillEllipse(packX, size / 2, size * 0.3, size * 0.5);

        crewmate.generateTexture(isImpostor ? 'impostor' : 'crewmate', size, size);
        crewmate.destroy();

        const sprite = this.physics.add.sprite(x, y, isImpostor ? 'impostor' : 'crewmate');
        sprite.setScale(0.8 + Math.random() * 0.4);
        sprite.setData('isImpostor', isImpostor);
        
        sprite.setInteractive();
        sprite.on('pointerdown', () => {
            if (!this.isGameOver) {
                this.onCrewmateClick(sprite);
            }
        });

        sprite.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
        sprite.setBounce(1, 1);
        sprite.setCollideWorldBounds(true);
        
        this.crewmates.push(sprite);

        this.tweens.add({
            targets: sprite,
            alpha: 0,
            y: sprite.y + 50,
            duration: 2000,
            delay: 4000,
            ease: 'Power2',
            onComplete: () => {
                const index = this.crewmates.indexOf(sprite);
                if (index > -1) {
                    this.crewmates.splice(index, 1);
                }
                sprite.destroy();
            }
        });
    }

    spawnWave() {
        if (this.isGameOver) return;
        
        const count = 3 + Math.floor(this.score / 5);
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(50, 750);
            const y = Phaser.Math.Between(50, 550);
            const isImpostor = Math.random() < 0.3;
            this.spawnCrewmate(x, y, isImpostor);
        }
    }

    onCrewmateClick(sprite) {
        const isImpostor = sprite.getData('isImpostor');
        
        if (isImpostor) {
            this.score += 10;
            this.updateUI();
            
            this.tweens.add({
                targets: sprite,
                scale: 1.5,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    const index = this.crewmates.indexOf(sprite);
                    if (index > -1) {
                        this.crewmates.splice(index, 1);
                    }
                    sprite.destroy();
                }
            });
        } else {
            this.score = Math.max(0, this.score - 5);
            this.timeLeft = Math.max(1, this.timeLeft - 2);
            this.updateUI();
            
            this.cameras.main.shake(100, 0.02);
        }
    }

    updateTimer() {
        if (this.isGameOver) return;
        
        this.timeLeft--;
        this.updateUI();
        
        if (this.timeLeft <= 0) {
            this.endGame();
        }
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

class GameOverScene extends Phaser.Scene {
    constructor() {
        super('game-over-scene');
    }

    init(data) {
        this.finalScore = data.score;
    }

    create() {
        this.add.text(400, 180, 'Game Over!', {
            fontSize: '72px',
            color: '#c70d3a',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(400, 300, `Puntuación: ${this.finalScore}`, {
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const restartButton = this.add.text(400, 450, 'Jugar de nuevo', {
            fontSize: '40px',
            color: '#ffffff',
            backgroundColor: '#2e86de',
            padding: { x: 25, y: 12 },
            borderRadius: 10
        }).setOrigin(0.5).setInteractive();

        restartButton.on('pointerdown', () => {
            this.scene.start('play-scene');
        });

        restartButton.on('pointerover', () => {
            restartButton.setBackgroundColor('#66b3ff');
        });

        restartButton.on('pointerout', () => {
            restartButton.setBackgroundColor('#2e86de');
        });
    }
}
