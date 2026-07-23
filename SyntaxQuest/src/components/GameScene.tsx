import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Trophy, XCircle } from 'lucide-react';
import Phaser from 'phaser';
import { useGameContext } from '../context/GameContext';
import type { Challenge, LevelData, PlayerProgress } from '../types';

interface Props {
  levelId: string;
  gameMode: 'single' | 'race';
  onBack: () => void;
}

type RaceResult = {
  player1Time: number | null;
  player2Time: number | null;
};

const CELL_SIZE = 64;

class GamePlayScene extends Phaser.Scene {
  level!: LevelData;
  gameMode!: 'single' | 'race';
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  rival!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  rivalKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  walls!: Phaser.Physics.Arcade.StaticGroup;
  sensors!: Phaser.Physics.Arcade.StaticGroup;
  exitZone!: Phaser.Physics.Arcade.Sprite;
  startTime = 0;
  completedChallenges = new Set<string>();
  onWin: ((time: number) => void) | null = null;
  onRaceResult: ((result: RaceResult) => void) | null = null;
  onChallenge: ((challenge: Challenge) => void) | null = null;
  player1Finished = false;
  player2Finished = false;
  player1Time: number | null = null;
  player2Time: number | null = null;

  constructor() {
    super({ key: 'gameplay' });
  }

  init(data: { level: LevelData; gameMode: 'single' | 'race'; onWin: (time: number) => void; onRaceResult: (result: RaceResult) => void; onChallenge: (challenge: Challenge) => void }) {
    this.level = data.level;
    this.gameMode = data.gameMode;
    this.onWin = data.onWin;
    this.onRaceResult = data.onRaceResult;
    this.onChallenge = data.onChallenge;
  }

  create() {
    const { maze } = this.level;
    const cols = maze[0].length;
    const rows = maze.length;
    const mapWidth = cols * CELL_SIZE;
    const mapHeight = rows * CELL_SIZE;

    this.startTime = this.time.now;
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

    this.walls = this.physics.add.staticGroup();
    this.sensors = this.physics.add.staticGroup();

    let startX = 0;
    let startY = 0;

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const cell = maze[y][x];
        const cx = x * CELL_SIZE + CELL_SIZE / 2;
        const cy = y * CELL_SIZE + CELL_SIZE / 2;

        if (cell === 1) {
          const wall = this.add.rectangle(cx, cy, CELL_SIZE, CELL_SIZE, 0x0f172a);
          this.walls.add(wall, true);
        } else if (cell === 2) {
          startX = cx;
          startY = cy;
        } else if (cell === 3) {
          this.exitZone = this.physics.add.staticSprite(cx, cy, '') as Phaser.Physics.Arcade.Sprite;
          this.exitZone.setDisplaySize(CELL_SIZE, CELL_SIZE);
        }
      }
    }

    this.level.challenges.forEach((challenge) => {
      const sx = challenge.position.x * CELL_SIZE + CELL_SIZE / 2;
      const sy = challenge.position.y * CELL_SIZE + CELL_SIZE / 2;
      const sensor = this.physics.add.staticSprite(sx, sy, '') as Phaser.Physics.Arcade.Sprite;
      sensor.setDisplaySize(CELL_SIZE * 0.8, CELL_SIZE * 0.8);
      sensor.setData('challenge', challenge);
      this.sensors.add(sensor, true);
      this.add.circle(sx, sy, 20, 0xfacc15).setAlpha(0.7);
    });

    this.player = this.createPlayer(startX, startY, 0x10b981) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    this.rival = this.gameMode === 'race' ? this.createPlayer(startX + CELL_SIZE, startY, 0x38bdf8) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody : null;

    this.cameras.main.startFollow(this.player);

    this.cursors = this.input.keyboard?.createCursorKeys() as Phaser.Types.Input.Keyboard.CursorKeys;
    this.wasd = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.rivalKeys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.overlap(this.player, this.sensors, this.onSensorHit as any, undefined, this);
    this.physics.add.overlap(this.player, this.exitZone, this.onExitHit as any, undefined, this);

    if (this.rival) {
      this.physics.add.collider(this.rival, this.walls);
      this.physics.add.overlap(this.rival, this.sensors, this.onSensorHit as any, undefined, this);
      this.physics.add.overlap(this.rival, this.exitZone, this.onExitHit as any, undefined, this);
    }
  }

  createPlayer(x: number, y: number, color: number) {
    const sprite = this.physics.add.sprite(x, y, '').setDisplaySize(32, 32) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    const graphics = this.make.graphics({}) as Phaser.GameObjects.Graphics;
    graphics.fillStyle(color, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture(`player-${color}`, 32, 32);
    sprite.setTexture(`player-${color}`);
    return sprite;
  }

  onSensorHit(_player: Phaser.Types.Physics.Arcade.GameObjectWithBody, sensor: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
    const challenge = (sensor as Phaser.GameObjects.GameObject & { getData: (key: string) => Challenge | undefined }).getData('challenge');
    if (!challenge || this.completedChallenges.has(challenge.id)) return;

    (sensor as Phaser.GameObjects.GameObject & { disableBody: (disableGameObject?: boolean, hideGameObject?: boolean) => void }).disableBody(true, true);
    this.completedChallenges.add(challenge.id);
    this.onChallenge?.(challenge);
  }

  onExitHit(player: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
    const isPlayerOne = player === this.player;
    const elapsed = this.time.now - this.startTime;

    if (this.gameMode === 'race') {
      if (isPlayerOne && !this.player1Finished) {
        this.player1Finished = true;
        this.player1Time = elapsed;
      }
      if (!isPlayerOne && !this.player2Finished) {
        this.player2Finished = true;
        this.player2Time = elapsed;
      }

      if (this.player1Finished && this.player2Finished) {
        this.onRaceResult?.({ player1Time: this.player1Time, player2Time: this.player2Time });
      }
      return;
    }

    if (this.completedChallenges.size >= this.level.challenges.length) {
      this.onWin?.(elapsed);
    }
  }

  update() {
    const speed = 220;
    this.player.setVelocity(0);

    if (this.cursors.left?.isDown || this.wasd.left?.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right?.isDown || this.wasd.right?.isDown) {
      this.player.setVelocityX(speed);
    }

    if (this.cursors.up?.isDown || this.wasd.up?.isDown) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down?.isDown || this.wasd.down?.isDown) {
      this.player.setVelocityY(speed);
    }

    if (this.rival) {
      this.rival.setVelocity(0);
      if (this.rivalKeys.left?.isDown) {
        this.rival.setVelocityX(-speed);
      } else if (this.rivalKeys.right?.isDown) {
        this.rival.setVelocityX(speed);
      }

      if (this.rivalKeys.up?.isDown) {
        this.rival.setVelocityY(-speed);
      } else if (this.rivalKeys.down?.isDown) {
        this.rival.setVelocityY(speed);
      }
    }
  }
}

export default function GameScene({ levelId, gameMode, onBack }: Props) {
  const { levels, progress, saveProgress } = useGameContext();
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showChallenge, setShowChallenge] = useState<Challenge | null>(null);
  const [hasWon, setHasWon] = useState(false);
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);

  const level = levels.find((entry) => entry.id === levelId);

  useEffect(() => {
    if (!containerRef.current || !level) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 800,
      height: 600,
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
      },
      scene: GamePlayScene,
    };

    const game = new Phaser.Game(config);

    game.scene.start('gameplay', {
      level,
      gameMode,
      onWin: (elapsed: number) => {
        setHasWon(true);
        const nextProgress: PlayerProgress = {
          ...progress,
          completedLevelIds: progress.completedLevelIds.includes(levelId) ? progress.completedLevelIds : [...progress.completedLevelIds, levelId],
          bestTimes: { ...progress.bestTimes, [levelId]: Math.min(progress.bestTimes[levelId] ?? Number.POSITIVE_INFINITY, elapsed) },
          leaderboard: [...progress.leaderboard, { id: `${levelId}-${Date.now()}`, levelId, playerName: 'Tú', time: elapsed, mode: 'single', completedAt: new Date().toISOString() }],
        };
        saveProgress(nextProgress);
      },
      onRaceResult: (result: RaceResult) => {
        setRaceResult(result);
        const bestTime = Math.min(result.player1Time ?? Number.POSITIVE_INFINITY, result.player2Time ?? Number.POSITIVE_INFINITY);
        const nextProgress: PlayerProgress = {
          ...progress,
          completedLevelIds: progress.completedLevelIds.includes(levelId) ? progress.completedLevelIds : [...progress.completedLevelIds, levelId],
          bestTimes: { ...progress.bestTimes, [levelId]: Math.min(progress.bestTimes[levelId] ?? Number.POSITIVE_INFINITY, bestTime) },
          leaderboard: [...progress.leaderboard, { id: `${levelId}-${Date.now()}`, levelId, playerName: 'Carrera', time: bestTime, mode: 'race', completedAt: new Date().toISOString() }],
        };
        saveProgress(nextProgress);
      },
      onChallenge: (challenge: Challenge) => setShowChallenge(challenge),
    });

    gameRef.current = game;

    return () => {
      game.destroy(true);
    };
  }, [gameMode, level, levelId, progress, saveProgress]);

  const handleChallengeAnswer = (correct: boolean) => {
    setShowChallenge(null);
    if (!correct) {
      window.alert('¡Inténtalo de nuevo!');
    }
  };

  if (hasWon) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center gap-6 p-8">
        <h1 className="text-6xl font-black text-emerald-400">🎉 ¡Nivel Completado!</h1>
        <p className="text-xl text-slate-300">¡Genial! Has completado {level?.name}.</p>
        <button onClick={onBack} className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl font-bold text-2xl hover:opacity-90">
          Volver
        </button>
      </div>
    );
  }

  if (gameMode === 'race' && raceResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center gap-6 p-8">
        <h1 className="text-6xl font-black text-amber-400">🏁 Carrera terminada</h1>
        <p className="text-xl text-slate-300">{level?.name}</p>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 text-left min-w-[280px]">
          <div className="flex items-center gap-2 mb-3 text-cyan-400"><Trophy className="w-5 h-5" /> Resultados</div>
          <p className="text-slate-200">Jugador 1: {(raceResult.player1Time ?? 0) / 1000}s</p>
          <p className="text-slate-200">Jugador 2: {(raceResult.player2Time ?? 0) / 1000}s</p>
        </div>
        <button onClick={onBack} className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl font-bold text-2xl hover:opacity-90">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4 max-w-4xl mx-auto w-full">
        <button onClick={onBack} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h3 className="text-2xl font-bold text-slate-100">{level?.name}</h3>
          <p className="text-sm text-slate-400">{gameMode === 'race' ? 'Carrera 1v1 • Flechas y WASD' : 'Modo individual'}</p>
        </div>
        <div className="w-12"></div>
      </div>
      <div className="flex-1 flex items-center justify-center relative">
        <div ref={containerRef} className="rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl" />
        {showChallenge && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
            <div className="bg-slate-900 p-8 rounded-2xl max-w-lg border border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-cyan-400">{showChallenge.title}</h3>
                <button onClick={() => setShowChallenge(null)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <p className="text-lg text-slate-200 mb-8">{showChallenge.description}</p>
              <div className="flex flex-col gap-3">
                {showChallenge.options.map((option, index) => (
                  <button
                    key={`${option.text}-${index}`}
                    onClick={() => handleChallengeAnswer(option.correct)}
                    className="px-6 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-lg text-left transition-colors"
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
