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
let currentChallenge = null;
let codeEditor = null;
let gameScene = null;

// Sistema de persistencia
const GameState = {
    completedChallenges: JSON.parse(localStorage.getItem('syntaxquest_progress')) || [],
    save: function(id) {
        if (!this.completedChallenges.includes(id)) {
            this.completedChallenges.push(id);
            localStorage.setItem('syntaxquest_progress', JSON.stringify(this.completedChallenges));
        }
    }
};

const challenges = [
    {
        id: 'door_1',
        title: 'Acceso a la Terminal',
        description: 'Escribe una función llamada "abrir" que retorne true.',
        initialCode: 'function abrir() {\n  // Tu código aquí\n}',
        testCases: [
            { input: 'abrir()', expected: true }
        ],
        onSuccess: (scene) => {
            scene.feedback('¡Puerta abierta! Código verificado.');
            const door = obstacles.children.entries.find(o => o.getData('id') === 'door_1');
            if (door) door.destroy();
            GameState.save('door_1');
        }
    },
    {
        id: 'bridge_1',
        title: 'Generador de Puente',
        description: 'Escribe una función "sumar(a, b)" que retorne la suma de dos números.',
        initialCode: 'function sumar(a, b) {\n  \n}',
        testCases: [
            { input: 'sumar(2, 3)', expected: 5 },
            { input: 'sumar(-1, 1)', expected: 0 },
            { input: 'sumar(10, 20)', expected: 30 }
        ],
        onSuccess: (scene) => {
            scene.feedback('¡Puente extendido! Los tests pasaron.');
            const bridge = obstacles.children.entries.find(o => o.getData('id') === 'bridge_1');
            if (bridge) {
                bridge.setAlpha(1);
                bridge.body.enable = true;
            }
            GameState.save('bridge_1');
        }
    },
    {
        id: 'array_1',
        title: 'Filtro de Seguridad',
        description: 'Crea una función "filtrarPares(arr)" que retorne solo los números pares del arreglo.',
        initialCode: 'function filtrarPares(numeros) {\n  \n}',
        testCases: [
            { input: 'filtrarPares([1, 2, 3, 4, 5, 6])', expected: [2, 4, 6] },
            { input: 'filtrarPares([10, 15, 20, 25])', expected: [10, 20] }
        ],
        onSuccess: (scene) => {
            scene.feedback('¡Filtro desactivado! Has superado el desafío final.');
            const barrier = obstacles.children.entries.find(o => o.getData('id') === 'array_1');
            if (barrier) barrier.destroy();
            GameState.save('array_1');
        }
    },
    {
        id: 'recursion_1',
        title: 'El Oráculo Infinito',
        description: 'Escribe una función recursiva "factorial(n)" para calcular el factorial de un número.',
        initialCode: 'function factorial(n) {\n  // Caso base y recursión\n}',
        testCases: [
            { input: 'factorial(5)', expected: 120 },
            { input: 'factorial(3)', expected: 6 },
            { input: 'factorial(0)', expected: 1 }
        ],
        onSuccess: (scene) => {
            scene.feedback('¡Conocimiento obtenido! El Oráculo te deja pasar.');
            const oracle = obstacles.children.entries.find(o => o.getData('id') === 'recursion_1');
            if (oracle) oracle.destroy();
            GameState.save('recursion_1');
        }
    }
];

function preload() {}

function create() {
    gameScene = this;
    
    this.add.grid(400, 300, 800, 600, 40, 40, 0x1a1a1a).setAltFillStyle(0x222222);

    obstacles = this.physics.add.staticGroup();
    
    // Puerta 1
    if (!GameState.completedChallenges.includes('door_1')) {
        const door = this.add.rectangle(400, 300, 100, 20, 0xff5722);
        this.physics.add.existing(door, true);
        door.setData('id', 'door_1');
        obstacles.add(door);
    }

    // Puente 1
    const bridge = this.add.rectangle(600, 150, 40, 120, 0x4caf50);
    bridge.setAlpha(GameState.completedChallenges.includes('bridge_1') ? 1 : 0.2);
    bridge.setData('id', 'bridge_1');
    obstacles.add(bridge);
    bridge.body.enable = GameState.completedChallenges.includes('bridge_1');

    // Barrera final
    if (!GameState.completedChallenges.includes('array_1')) {
        const barrier = this.add.rectangle(750, 250, 100, 10, 0x00bcd4);
        this.physics.add.existing(barrier, true);
        barrier.setData('id', 'array_1');
        obstacles.add(barrier);
    }

    // Oráculo (Recursión)
    if (!GameState.completedChallenges.includes('recursion_1')) {
        const oracle = this.add.triangle(750, 450, 0, 30, 15, 0, 30, 30, 0xe91e63);
        this.physics.add.existing(oracle, true);
        oracle.setData('id', 'recursion_1');
        obstacles.add(oracle);
    }

    player = this.add.circle(100, 300, 15, 0x4fc3f7);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    this.physics.add.collider(player, obstacles, (p, o) => {
        const challengeId = o.getData('id');
        if (challengeId && (!currentChallenge || currentChallenge.id !== challengeId)) {
            loadChallenge(challengeId);
        }
    });

    // Victoria
    const goal = this.add.star(750, 100, 5, 10, 20, 0xffd700);
    this.physics.add.existing(goal);
    this.physics.add.overlap(player, goal, () => {
        this.feedback('¡SINTAXIS RESTAURADA! Has completado SyntaxQuest.');
        this.physics.pause();
    });

    cursors = this.input.keyboard.createCursorKeys();

    this.feedback = (msg, isError = false) => {
        const text = document.getElementById('feedback-text');
        text.innerText = msg;
        text.style.color = isError ? '#f44336' : '#4caf50';
        if (!isError) this.cameras.main.flash(500, 76, 175, 80);
    };

    setupEditor();
}

function update() {
    player.body.setVelocity(0);
    if (cursors.left.isDown) player.body.setVelocityX(-200);
    else if (cursors.right.isDown) player.body.setVelocityX(200);
    if (cursors.up.isDown) player.body.setVelocityY(-200);
    else if (cursors.down.isDown) player.body.setVelocityY(200);
}

function loadChallenge(id) {
    const challenge = challenges.find(c => c.id === id);
    if (!challenge || GameState.completedChallenges.includes(id)) return;

    currentChallenge = challenge;
    document.getElementById('challenge-title').innerText = challenge.title;
    document.getElementById('challenge-desc').innerText = challenge.description;
    codeEditor.setValue(challenge.initialCode);
    document.getElementById('test-cases-panel').innerHTML = '<strong>Tests listos...</strong>';
    gameScene.feedback('Desafío cargado. Escribe tu solución.');
}

function setupEditor() {
    // Inicializar CodeMirror 5 (usando el script de CDN)
    const wrapper = document.getElementById('code-editor-wrapper');
    codeEditor = CodeMirror(wrapper, {
        value: "// Explora para encontrar desafíos",
        mode: "javascript",
        theme: "dracula",
        lineNumbers: true,
        tabSize: 2,
        indentUnit: 2,
        matchBrackets: true,
        autoCloseBrackets: true
    });

    document.getElementById('run-button').addEventListener('click', async () => {
        if (!currentChallenge) {
            gameScene.feedback('No hay un desafío activo.', true);
            return;
        }

        const code = codeEditor.getValue();
        gameScene.feedback('Validando código...');

        try {
            const result = await Validator.runCode(code, currentChallenge.testCases);
            Validator.renderTestCases(result.results, result.logs);

            if (result.allPassed) {
                currentChallenge.onSuccess(gameScene);
            } else {
                gameScene.feedback('Algunos tests fallaron.', true);
            }
        } catch (err) {
            gameScene.feedback(`Error: ${err.message}`, true);
        }
    });
}
