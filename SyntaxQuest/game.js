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
let wasd;
let obstacles;
let walls;
let enemy;
let currentChallenge = null;
let gameScene = null;
let isGameOver = false;
let completedChallengesCount = 0;

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
        completed: false,
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
        completed: false,
        onSuccess: (scene) => {
            scene.feedback('¡Acceso concedido! El camino está libre.');
            const wall = walls.children.entries.find(w => w.getData('id') === 'maze_wall_2');
            if (wall) {
                scene.emitSuccess(wall.x, wall.y);
                wall.destroy();
            }
        }
    },
    {
        id: 'choice_3',
        title: 'Variables Constantes',
        description: '¿Qué palabra clave se usa para declarar una variable que no cambia?',
        options: [
            { text: 'let', correct: false },
            { text: 'const', correct: true },
            { text: 'var', correct: false }
        ],
        completed: false,
        onSuccess: (scene) => {
            scene.feedback('¡Energía restaurada!');
            const wall = walls.children.entries.find(w => w.getData('id') === 'maze_wall_3');
            if (wall) {
                scene.emitSuccess(wall.x, wall.y);
                wall.destroy();
            }
        }
    },
    {
        id: 'choice_4',
        title: 'Operadores Lógicos',
        description: '¿Cuál es el operador lógico para "Y" (AND) en JavaScript?',
        options: [
            { text: '||', correct: false },
            { text: '!', correct: false },
            { text: '&&', correct: true }
        ],
        completed: false,
        onSuccess: (scene) => {
            scene.feedback('¡Puerta de seguridad abierta!');
            const wall = walls.children.entries.find(w => w.getData('id') === 'maze_wall_4');
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
    completedChallengesCount = 0;
    
    // Resetear estado de desafíos
    challenges.forEach(c => c.completed = false);
    
    this.particles = this.add.particles(0, 0, 'particle', {
        speed: { min: 50, max: 150 },
        scale: { start: 1, end: 0 },
        lifespan: 600,
        gravityY: 100,
        emitting: false
    });

    this.add.grid(400, 300, 800, 600, 40, 40, 0x1a1a1a).setAltFillStyle(0x222222);

    walls = this.physics.add.staticGroup();
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

    // Laberinto más complejo
    createWall(150, 100, 10, 200);
    createWall(150, 400, 10, 200);
    createWall(300, 250, 10, 300);
    createWall(450, 100, 10, 200);
    createWall(450, 500, 10, 200);
    createWall(600, 300, 10, 400);

    createWall(75, 200, 150, 10);
    createWall(225, 400, 150, 10);
    createWall(375, 100, 150, 10);
    createWall(525, 500, 150, 10);
    createWall(700, 300, 200, 10);

    // Paredes de bloqueo
    createWall(100, 500, 200, 10, 'maze_wall_1');
    createWall(400, 300, 200, 10, 'maze_wall_2');
    createWall(700, 100, 200, 10, 'maze_wall_3');
    createWall(700, 500, 200, 10, 'maze_wall_4');

    // Desafíos
    obstacles = this.physics.add.staticGroup();
    const addTrigger = (x, y, id) => {
        const t = this.add.circle(x, y, 10, 0xffeb3b);
        this.physics.add.existing(t, true);
        t.setData('id', id);
        obstacles.add(t);
        return t;
    };

    addTrigger(80, 80, 'choice_1');
    addTrigger(220, 520, 'choice_2');
    addTrigger(380, 80, 'choice_3');
    addTrigger(520, 420, 'choice_4');

    enemy = this.add.circle(700, 500, 12, 0xf44336);
    this.physics.add.existing(enemy);
    enemy.body.setCollideWorldBounds(true);

    player = this.add.circle(50, 50, 15, 0x4fc3f7);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    this.physics.add.collider(player, walls);
    this.physics.add.collider(enemy, walls);
    
    this.physics.add.overlap(player, obstacles, (p, o) => {
        const id = o.getData('id');
        const challenge = challenges.find(c => c.id === id);
        if (challenge && !challenge.completed && (!currentChallenge || currentChallenge.id !== id)) {
            loadChoiceChallenge(id);
        }
    });

    this.physics.add.overlap(player, enemy, () => {
        if (!isGameOver) gameOver(this);
    });

    const goal = this.add.star(750, 550, 5, 10, 20, 0xffd700);
    this.physics.add.existing(goal);
    this.physics.add.overlap(player, goal, () => {
        if (completedChallengesCount === challenges.length) {
            this.feedback('¡ESCAPE EXITOSO! Has burlado al Virus.');
            this.physics.pause();
        } else {
            this.feedback(`Faltan ${challenges.length - completedChallengesCount} desafíos.`, true);
        }
    });

    // Controles WASD y Flechas
    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

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

    updateProgressUI();
    setupChoiceUI(this);
}

function update() {
    if (isGameOver) return;

    player.body.setVelocity(0);
    const speed = 200;

    if (cursors.left.isDown || wasd.left.isDown) player.body.setVelocityX(-speed);
    else if (cursors.right.isDown || wasd.right.isDown) player.body.setVelocityX(speed);
    
    if (cursors.up.isDown || wasd.up.isDown) player.body.setVelocityY(-speed);
    else if (cursors.down.isDown || wasd.down.isDown) player.body.setVelocityY(speed);

    const enemySpeed = 130; // Un poco más rápido
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
    if (!challenge || challenge.completed) return;

    currentChallenge = challenge;
    document.getElementById('challenge-title').innerText = challenge.title;
    document.getElementById('challenge-desc').innerText = challenge.description;
    
    const container = document.getElementById('code-editor-wrapper');
    container.innerHTML = '';
    
    challenge.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'choice-button';
        btn.innerText = opt.text;
        btn.onclick = () => checkChoice(opt, gameScene);
        container.appendChild(btn);
    });
}

function checkChoice(opt, scene) {
    if (!currentChallenge) return;

    if (opt.correct) {
        currentChallenge.completed = true;
        completedChallengesCount++;
        currentChallenge.onSuccess(scene);
        document.getElementById('code-editor-wrapper').innerHTML = '<p style="color: #4caf50">Desafío Completado</p>';
        
        // Destruir el sensor visualmente
        const trigger = obstacles.children.entries.find(o => o.getData('id') === currentChallenge.id);
        if (trigger) trigger.destroy();
        
        currentChallenge = null;
        updateProgressUI();
    } else {
        scene.feedback('¡Incorrecto! El virus gana velocidad.', true);
    }
}

function updateProgressUI() {
    const title = document.getElementById('challenge-title');
    if (!currentChallenge) {
        title.innerText = `Progreso: ${completedChallengesCount}/${challenges.length}`;
    }
}

function setupChoiceUI(scene) {
    document.getElementById('run-button').style.display = 'none';
}
