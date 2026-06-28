(function () {
    'use strict';

    const wordDictionary = {
        programacion: [
            'javascript', 'python', 'react', 'angular', 'typescript',
            'html', 'css', 'nodejs', 'git', 'github',
            'database', 'api', 'framework', 'variable', 'function',
            'algoritmo', 'compilador', 'depuracion', 'frontend', 'backend'
        ],
        videojuegos: [
            'mario', 'zelda', 'pokemon', 'minecraft', 'fortnite',
            'playstation', 'xbox', 'nintendo', 'tetris', 'pacman',
            'sonic', 'halo', 'godofwar', 'witcher', 'destiny',
            'overwatch', 'valorant', 'roblox', 'amongus', 'cuphead'
        ],
        animales: [
            'elefante', 'jirafa', 'hipopotamo', 'cocodrilo', 'pinguino',
            'leopardo', 'orangutan', 'chimpance', 'komodo', 'narval',
            'axolotl', 'quetzal', 'tapir', 'manati', 'canguro'
        ],
        paises: [
            'argentina', 'brasil', 'canada', 'dinamarca', 'egipto',
            'finlandia', 'grecia', 'honduras', 'india', 'japon',
            'kenia', 'luxemburgo', 'mexico', 'noruega', 'peru'
        ],
        deportes: [
            'futbol', 'basketball', 'tenis', 'natacion', 'atletismo',
            'voleibol', 'beisbol', 'rugby', 'boxeo', 'esgrima',
            'surf', 'ski', 'ciclismo', 'golf', 'hockey'
        ]
    };

    const categoryNames = {
        programacion: 'Programación',
        videojuegos: 'Videojuegos',
        animales: 'Animales',
        paises: 'Países',
        deportes: 'Deportes'
    };

    let currentWord = '';
    let currentCategory = 'programacion';
    let guessedLetters = [];
    let wrongLetters = [];
    let score = 0;
    let highScore = 0;
    let wrongAttempts = 0;
    let gameOver = false;
    const maxWrongAttempts = 6;

    let canvas = null;
    let ctx = null;
    let wordDisplay = null;
    let wrongLettersDiv = null;
    let keyboardDiv = null;
    let scoreDiv = null;
    let highScoreDiv = null;
    let categorySelect = null;
    let categoryNameEl = null;
    let newGameBtn = null;
    let gameMessage = null;
    let recordsList = null;
    let installBtn = null;
    let offlineBadge = null;

    function normalize(text) {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function storageGet(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? fallback : value;
        } catch {
            return fallback;
        }
    }

    function storageSet(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch {
            return false;
        }
    }

    function storageGetJSON(key, fallback) {
        try {
            const raw = storageGet(key, null);
            if (raw === null) return fallback;
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    }

    function init() {
        canvas = document.getElementById('hangmanCanvas');
        wordDisplay = document.getElementById('wordDisplay');
        wrongLettersDiv = document.getElementById('wrongLetters');
        keyboardDiv = document.getElementById('keyboard');
        scoreDiv = document.getElementById('score');
        highScoreDiv = document.getElementById('highScore');
        categorySelect = document.getElementById('categorySelect');
        categoryNameEl = document.getElementById('categoryName');
        newGameBtn = document.getElementById('newGameBtn');
        gameMessage = document.getElementById('gameMessage');
        recordsList = document.getElementById('recordsList');
        installBtn = document.getElementById('installBtn');
        offlineBadge = document.getElementById('offlineBadge');

        if (!canvas || !wordDisplay || !keyboardDiv || !scoreDiv) {
            showFatalError('No se pudieron cargar los elementos del juego. Recarga la página.');
            return;
        }

        ctx = canvas.getContext('2d');
        if (!ctx) {
            showFatalError('Tu navegador no soporta canvas.');
            return;
        }

        loadRecords();
        createKeyboard();
        newGame();
        setupEventListeners();
        setupConnectivityBadge();
        registerServiceWorker();
        showFileProtocolHint();
    }

    function showFatalError(message) {
        const box = document.createElement('div');
        box.className = 'game-message lose';
        box.style.display = 'block';
        box.textContent = message;
        document.querySelector('.container')?.prepend(box);
    }

    function showFileProtocolHint() {
        if (location.protocol !== 'file:') return;
        if (!offlineBadge) return;
        offlineBadge.textContent = 'Modo archivo local — usa un servidor local para PWA e récords';
        offlineBadge.classList.add('offline');
    }

    function drawHangman() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const danger = wrongAttempts / maxWrongAttempts;
        ctx.strokeStyle = wrongAttempts > 3 ? '#f87171' : '#f8fafc';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(20, 280);
        ctx.lineTo(180, 280);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(50, 280);
        ctx.lineTo(50, 20);
        ctx.lineTo(150, 20);
        ctx.lineTo(150, 50);
        ctx.stroke();

        if (wrongAttempts >= 1) {
            ctx.beginPath();
            ctx.arc(150, 70, 20, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (wrongAttempts >= 2) {
            ctx.beginPath();
            ctx.moveTo(150, 90);
            ctx.lineTo(150, 160);
            ctx.stroke();
        }

        if (wrongAttempts >= 3) {
            ctx.beginPath();
            ctx.moveTo(150, 110);
            ctx.lineTo(120, 140);
            ctx.stroke();
        }

        if (wrongAttempts >= 4) {
            ctx.beginPath();
            ctx.moveTo(150, 110);
            ctx.lineTo(180, 140);
            ctx.stroke();
        }

        if (wrongAttempts >= 5) {
            ctx.beginPath();
            ctx.moveTo(150, 160);
            ctx.lineTo(120, 210);
            ctx.stroke();
        }

        if (wrongAttempts >= 6) {
            ctx.beginPath();
            ctx.moveTo(150, 160);
            ctx.lineTo(180, 210);
            ctx.stroke();
            ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + danger * 0.35})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    function createKeyboard() {
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        keyboardDiv.innerHTML = '';
        for (const letter of letters) {
            const btn = document.createElement('button');
            btn.textContent = letter;
            btn.className = 'key';
            btn.dataset.letter = letter;
            btn.type = 'button';
            btn.addEventListener('click', () => guessLetter(letter));
            keyboardDiv.appendChild(btn);
        }
    }

    function getRandomWord() {
        const words = wordDictionary[currentCategory];
        return words[Math.floor(Math.random() * words.length)];
    }

    function wordContainsLetter(letter) {
        const normalizedLetter = normalize(letter);
        return currentWord.split('').some((char) => normalize(char) === normalizedLetter);
    }

    function displayWord() {
        wordDisplay.innerHTML = '';
        for (const letter of currentWord) {
            const div = document.createElement('div');
            div.className = 'letter-box';
            const normalizedLetter = normalize(letter);
            if (guessedLetters.some((g) => normalize(g) === normalizedLetter)) {
                div.textContent = letter.toUpperCase();
                div.classList.add('correct');
            }
            wordDisplay.appendChild(div);
        }
    }

    function displayWrongLetters() {
        wrongLettersDiv.innerHTML = '';
        for (const letter of wrongLetters) {
            const div = document.createElement('div');
            div.className = 'wrong-letter';
            div.textContent = letter.toUpperCase();
            wrongLettersDiv.appendChild(div);
        }
    }

    function setKeyState(letter, state) {
        const btn = keyboardDiv.querySelector(`[data-letter="${letter}"]`);
        if (!btn) return;
        btn.disabled = true;
        btn.classList.remove('pulse', 'shake');
        btn.classList.add(state);
        requestAnimationFrame(() => {
            btn.classList.add(state === 'correct' ? 'pulse' : 'shake');
        });
    }

    function guessLetter(letter) {
        if (gameOver) return;

        const normalizedLetter = normalize(letter);
        const alreadyGuessed =
            guessedLetters.some((g) => normalize(g) === normalizedLetter) ||
            wrongLetters.some((g) => normalize(g) === normalizedLetter);

        if (alreadyGuessed) return;

        if (wordContainsLetter(letter)) {
            guessedLetters.push(letter);
            setKeyState(letter, 'correct');
            displayWord();
            checkWin();
        } else {
            wrongLetters.push(letter);
            wrongAttempts++;
            setKeyState(letter, 'wrong');
            displayWrongLetters();
            drawHangman();
            checkLose();
        }
    }

    function checkWin() {
        const allLettersGuessed = currentWord
            .split('')
            .every((letter) => guessedLetters.some((g) => normalize(g) === normalize(letter)));

        if (allLettersGuessed) {
            const pointsEarned = (maxWrongAttempts - wrongAttempts) * 10 + 50;
            score += pointsEarned;
            updateScore();
            endGame(`🎉 ¡Ganaste! +${pointsEarned} puntos`, 'win');
            saveRecord();
        }
    }

    function checkLose() {
        if (wrongAttempts >= maxWrongAttempts) {
            endGame(`😢 ¡Perdiste! La palabra era: ${currentWord.toUpperCase()}`, 'lose');
            if (score > 0) saveRecord();
            score = 0;
            storageSet('hangmanCurrentScore', '0');
            updateScore();
        }
    }

    function endGame(text, type) {
        gameOver = true;
        showMessage(text, type);
        keyboardDiv.querySelectorAll('.key:not(:disabled)').forEach((btn) => {
            btn.disabled = true;
        });
    }

    function showMessage(text, type) {
        gameMessage.textContent = text;
        gameMessage.className = `game-message ${type}`;
        gameMessage.style.display = 'block';
    }

    function hideMessage() {
        gameMessage.style.display = 'none';
    }

    function updateScore() {
        scoreDiv.textContent = score;
        if (score > highScore) {
            highScore = score;
            highScoreDiv.textContent = highScore;
            storageSet('hangmanHighScore', String(highScore));
        }
    }

    function newGame() {
        currentWord = getRandomWord();
        guessedLetters = [];
        wrongLetters = [];
        wrongAttempts = 0;
        gameOver = false;
        hideMessage();
        drawHangman();
        displayWord();
        displayWrongLetters();
        resetKeyboard();
    }

    function resetKeyboard() {
        keyboardDiv.querySelectorAll('.key').forEach((btn) => {
            btn.disabled = false;
            btn.classList.remove('correct', 'wrong', 'pulse', 'shake');
        });
    }

    function loadRecords() {
        score = parseInt(storageGet('hangmanCurrentScore', '0'), 10) || 0;
        highScore = parseInt(storageGet('hangmanHighScore', '0'), 10) || 0;
        scoreDiv.textContent = score;
        highScoreDiv.textContent = highScore;

        const records = storageGetJSON('hangmanRecords', []);
        displayRecords(records);
    }

    function saveRecord() {
        if (score <= 0) return;

        let records = storageGetJSON('hangmanRecords', []);
        records.push({
            score,
            date: new Date().toLocaleDateString('es-ES'),
            category: categoryNames[currentCategory]
        });
        records.sort((a, b) => b.score - a.score);
        records = records.slice(0, 5);
        storageSet('hangmanRecords', JSON.stringify(records));
        storageSet('hangmanCurrentScore', String(score));
        displayRecords(records);
    }

    function displayRecords(records) {
        if (!records.length) {
            recordsList.innerHTML = '<p class="no-records">No hay récords aún</p>';
            return;
        }
        recordsList.innerHTML = records
            .map(
                (record, index) => `
            <div class="record-item">
                <span>${index + 1}. ${record.score} pts — ${record.category}</span>
                <span>${record.date}</span>
            </div>`
            )
            .join('');
    }

    function setupEventListeners() {
        categorySelect.addEventListener('change', (e) => {
            currentCategory = e.target.value;
            categoryNameEl.textContent = categoryNames[currentCategory];
            newGame();
        });

        newGameBtn.addEventListener('click', newGame);

        document.addEventListener('keydown', (e) => {
            if (gameOver) return;
            const letter = e.key.toLowerCase();
            if (/^[a-záéíóúñü]$/.test(letter)) {
                e.preventDefault();
                guessLetter(letter);
            }
        });

        if (installBtn) {
            let deferredPrompt = null;

            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                installBtn.classList.add('show');
            });

            installBtn.addEventListener('click', async () => {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    installBtn.classList.remove('show');
                }
                deferredPrompt = null;
            });
        }
    }

    function setupConnectivityBadge() {
        if (!offlineBadge || location.protocol === 'file:') return;

        const updateBadge = () => {
            offlineBadge.textContent = navigator.onLine ? 'En línea' : 'Modo offline';
            offlineBadge.classList.toggle('offline', !navigator.onLine);
        };

        window.addEventListener('online', updateBadge);
        window.addEventListener('offline', updateBadge);
        updateBadge();
    }

    async function registerServiceWorker() {
        if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
        if (!('serviceWorker' in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            registration.update();
        } catch (error) {
            console.warn('Service Worker registration failed:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
