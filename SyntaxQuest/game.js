import { Validator } from './validator.js';

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-game',
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let obstacles;
let walls;
let enemy;
let currentChallenge = null;
let codeEditor = null;
let gameScene = null;
let isGameOver = false;

const challenges = [
    {
        id: 'choice_1',
        title: 'Selector de Bucles',
        description: '¿Cuál es la sintaxis correcta para un bucle for de 0 a 4?',
        options: [
            { text: 'for(let i=0; i<5; i++)', correct: true },
            { text: 'for(let i=0; i<=5; i++)', correct: false },
            { text: 'for(i=1 to 5)', correct: false }
        ],
        onSuccess: (scene) => {
            scene.feedback('¡Correcto! El firewall se ha debilitado.');
            const wall = walls.children.entries.find(w => w.getData('id') === 'maze_wall_1');
            if (wall) {
                scene.emitSuccess(wall.x, wall.y);
                wall.destroy();
            }
        }
    },
    {
        id: 'choice_2',
        title: 'Lógica de Arreglos',
        description: '¿Cómo obtienes el primer elemento de un arreglo "data"?',
        options: [
            { text: 'data[1]', correct: false },
            { text: 'data.first()', correct: false },
            { text: 'data[0]', correct: true }
        ],
        onSuccess: (scene) => {
            scene.feedback('¡Acceso concedido! El camino está libre.');
            const wall = walls.children.entries.find(w => w.getData('id') === 'maze_wall_2');
            if (wall) {
                scene.emitSuccess(wall.x, wall.y);
                wall.destroy();
            }
        }
    }
];

function preload() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 4);
    graphics.generateTexture('particle', 4, 4);
}

function create() {
    gameScene = this;
    isGameOver = false;
    
    this.particles = this.add.particles(0, 0, 'particle', {
        speed: { min: 50, max: 150 },
        scale: { start: 1, end: 0 },
        lifespan: 600,
        gravityY: 100,
        emitting: false
    });

    this.add.grid(400, 300, 800, 600, 40, 40, 0x1a1a1a).setAltFillStyle(0x222222);

    // Paredes del Laberinto
    walls = this.physics.add.staticGroup();
    
    // Crear un laberinto simple
    const createWall = (x, y, w, h, id = null) => {
        const wall = this.add.rectangle(x, y, w, h, 0x333333);
        this.physics.add.existing(wall, true);
        if (id) wall.setData('id', id);
        walls.add(wall);
        return wall;
    };

    // Bordes
    createWall(400, 5, 800, 10);
    createWall(400, 595, 800, 10);
    createWall(5, 300, 10, 600);
    createWall(795, 300, 10, 600);

    // Obstáculos internos (Laberinto)
    createWall(200, 150, 10, 300);
    createWall(400, 450, 10, 300);
    createWall(600, 150, 10, 300);
    
    // Paredes que se abren con desafíos
    createWall(100, 300, 200, 10, 'maze_wall_1');
    createWall(500, 300, 200, 10, 'maze_wall_2');

    // Desafíos (Sensores)
    obstacles = this.physics.add.staticGroup();
    const trigger1 = this.add.circle(100, 250, 10, 0xffeb3b);
    this.physics.add.existing(trigger1, true);
    trigger1.setData('id', 'choice_1');
    obstacles.add(trigger1);

    const trigger2 = this.add.circle(500, 350, 10, 0xffeb3b);
    this.physics.add.existing(trigger2, true);
    trigger2.setData('id', 'choice_2');
    obstacles.add(trigger2);

    // Enemigo (El Virus)
    enemy = this.add.circle(700, 500, 12, 0xf44336);
    this.physics.add.existing(enemy);
    enemy.body.setCollideWorldBounds(true);

    player = this.add.circle(50, 50, 15, 0x4fc3f7);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    // Colisiones
    this.physics.add.collider(player, walls);
    this.physics.add.collider(enemy, walls);
    
    this.physics.add.overlap(player, obstacles, (p, o) => {
        const challengeId = o.getData('id');
        if (challengeId && (!currentChallenge || currentChallenge.id !== challengeId)) {
            loadChoiceChallenge(challengeId);
        }
    });

    this.physics.add.overlap(player, enemy, () => {
        if (!isGameOver) gameOver(this);
    });

    // Victoria
    const goal = this.add.star(750, 550, 5, 10, 20, 0xffd700);
    this.physics.add.existing(goal);
    this.physics.add.overlap(player, goal, () => {
        this.feedback('¡ESCAPE EXITOSO! Has burlado al Virus.');
        this.physics.pause();
    });

    cursors = this.input.keyboard.createCursorKeys();

    this.feedback = (msg, isError = false) => {
        const text = document.getElementById('feedback-text');
        text.innerText = msg;
        text.style.color = isError ? '#f44336' : '#4caf50';
        if (isError) this.cameras.main.shake(200, 0.01);
        else this.cameras.main.flash(500, 76, 175, 80);
    };

    this.emitSuccess = (x, y) => {
        this.particles.emitParticleAt(x, y, 50);
    };

    setupChoiceUI(this);
}

function update() {
    if (isGameOver) return;

    player.body.setVelocity(0);
    const speed = 200;

    if (cursors.left.isDown) player.body.setVelocityX(-speed);
    else if (cursors.right.isDown) player.body.setVelocityX(speed);
    if (cursors.up.isDown) player.body.setVelocityY(-speed);
    else if (cursors.down.isDown) player.body.setVelocityY(speed);

    // IA del Enemigo (Persecución simple)
    const enemySpeed = 120;
    this.physics.moveToObject(enemy, player, enemySpeed);
}

function gameOver(scene) {
    isGameOver = true;
    scene.physics.pause();
    player.setAlpha(0.5);
    scene.feedback('EL VIRUS TE HA ATRAPADO. Reiniciando...', true);
    setTimeout(() => {
        scene.scene.restart();
    }, 2000);
}

function loadChoiceChallenge(id) {
    const challenge = challenges.find(c => c.id === id);
    if (!challenge) return;

    currentChallenge = challenge;
    document.getElementById('challenge-title').innerText = challenge.title;
    document.getElementById('challenge-desc').innerText = challenge.description;
    
    const container = document.getElementById('code-editor-wrapper');
    container.innerHTML = ''; // Limpiar editor
    
    challenge.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'choice-button';
        btn.innerText = opt.text;
        btn.onclick = () => checkChoice(opt, gameScene);
        container.appendChild(btn);
    });
}

function checkChoice(opt, scene) {
    if (opt.correct) {
        currentChallenge.onSuccess(scene);
        document.getElementById('code-editor-wrapper').innerHTML = '<p style="color: #4caf50">Desafío Completado</p>';
        currentChallenge = null;
    } else {
        scene.feedback('Respuesta incorrecta. ¡El virus se acerca!', true);
    }
}

function setupChoiceUI(scene) {
    document.getElementById('run-button').style.display = 'none'; // No necesitamos botón de ejecutar
}
