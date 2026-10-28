export type GamePhase = 'ready' | 'playing' | 'gameover';

export interface GameCallbacks {
  onPhaseChange?: (phase: GamePhase) => void;
  onScoreChange?: (score: number) => void;
  onBestScoreChange?: (score: number) => void;
  onMutedChange?: (muted: boolean) => void;
}

export interface GameController {
  flap: () => void;
  start: () => void;
  restart: () => void;
  toggleMute: () => void;
  dispose: () => void;
}

const WIDTH = 288;
const HEIGHT = 512;
const GROUND_TOP = 414;
const GROUND_HEIGHT = HEIGHT - GROUND_TOP;
const PIPE_WIDTH = 52;
const PIPE_CAP_HEIGHT = 22;
const PIPE_GAP = 116;
const PIPE_SPACING = 168;
const BIRD_X = 82;
const BIRD_RADIUS_X = 11;
const BIRD_RADIUS_Y = 9;
const GRAVITY = 0.24;
const FLAP_VELOCITY = -4.65;
const MAX_FALL_SPEED = 6.1;
const STORAGE_KEY = 'flappy-bird-best-score';

type Pipe = {
  x: number;
  gapY: number;
  passed: boolean;
};

type Cloud = {
  x: number;
  y: number;
  scale: number;
  speed: number;
};

const FONT: Record<string, string[]> = {
  A: ['01110', '11011', '11011', '11111', '11011', '11011', '11011'],
  B: ['11110', '11011', '11011', '11110', '11011', '11011', '11110'],
  C: ['01111', '11000', '11000', '11000', '11000', '11000', '01111'],
  D: ['11110', '11011', '11011', '11011', '11011', '11011', '11110'],
  E: ['11111', '11000', '11000', '11110', '11000', '11000', '11111'],
  F: ['11111', '11000', '11000', '11110', '11000', '11000', '11000'],
  G: ['01111', '11000', '11000', '11011', '11011', '11011', '01111'],
  H: ['11011', '11011', '11011', '11111', '11011', '11011', '11011'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00011', '00011', '00011', '11011', '11011', '01110'],
  K: ['11011', '11110', '11100', '11000', '11100', '11110', '11011'],
  L: ['11000', '11000', '11000', '11000', '11000', '11000', '11111'],
  M: ['11011', '11111', '11111', '11011', '11011', '11011', '11011'],
  N: ['11011', '11111', '11111', '11111', '11111', '11111', '11011'],
  O: ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
  P: ['11110', '11011', '11011', '11110', '11000', '11000', '11000'],
  Q: ['01110', '11011', '11011', '11011', '11111', '01110', '00011'],
  R: ['11110', '11011', '11011', '11110', '11100', '11010', '11011'],
  S: ['01111', '11000', '11000', '01110', '00011', '00011', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['11011', '11011', '11011', '11011', '11011', '11011', '01110'],
  V: ['11011', '11011', '11011', '11011', '11011', '01110', '00100'],
  W: ['11011', '11011', '11011', '11011', '11111', '11111', '11011'],
  X: ['11011', '11011', '01110', '00100', '01110', '11011', '11011'],
  Y: ['11011', '11011', '01110', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00011', '00110', '01100', '11000', '11000', '11111'],
  '0': ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '11011', '00011', '00110', '01100', '11000', '11111'],
  '3': ['11110', '00011', '00011', '01110', '00011', '00011', '11110'],
  '4': ['00011', '00111', '01111', '11011', '11111', '00011', '00011'],
  '5': ['11111', '11000', '11000', '11110', '00011', '00011', '11110'],
  '6': ['01111', '11000', '11000', '11110', '11011', '11011', '01110'],
  '7': ['11111', '00011', '00110', '00110', '01100', '01100', '01100'],
  '8': ['01110', '11011', '11011', '01110', '11011', '11011', '01110'],
  '9': ['01110', '11011', '11011', '01111', '00011', '00011', '11110'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '11011', '00011', '00110', '00100', '00000', '00100'],
  ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
};

function textWidth(text: string, scale: number, spacing = 1) {
  return Math.max(0, text.length * 5 * scale + Math.max(0, text.length - 1) * spacing * scale);
}

function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: string,
  outline?: string,
) {
  const normalized = text.toUpperCase();
  const step = scale * 6;
  const cell = scale;
  if (outline) {
    ctx.fillStyle = outline;
    for (let i = 0; i < normalized.length; i++) {
      const glyph = FONT[normalized[i]] ?? FONT[' '];
      if (!glyph) continue;
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (glyph[row]?.[col] !== '1') continue;
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              if (ox === 0 && oy === 0) continue;
              ctx.fillRect(x + i * step + col * cell + ox * cell, y + row * cell + oy * cell, cell, cell);
            }
          }
        }
      }
    }
  }
  ctx.fillStyle = color;
  for (let i = 0; i < normalized.length; i++) {
    const glyph = FONT[normalized[i]];
    if (!glyph) continue;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row]?.[col] === '1') {
          ctx.fillRect(x + i * step + col * cell, y + row * cell, cell, cell);
        }
      }
    }
  }
}

function makeBirdSprite(
  ctx: CanvasRenderingContext2D,
  y: number,
  wingFrame: number,
  rotation: number,
  hit: boolean,
) {
  ctx.save();
  ctx.translate(BIRD_X - 3, y - 5);
  ctx.scale(0.78, 0.78);
  ctx.rotate(rotation);

  // Dark pixel edge gives the bird the bold outline of the original sprite.
  const body = [
    [6, 0, 7, 1], [3, 1, 12, 1], [1, 2, 15, 1], [0, 3, 17, 1],
    [0, 4, 18, 1], [1, 5, 17, 1], [2, 6, 15, 1], [4, 7, 11, 1],
    [7, 8, 7, 1],
  ];
  ctx.fillStyle = '#60432c';
  body.forEach(([x, y, width]) => ctx.fillRect((x - 8) * 2, (y - 4) * 2, width * 2 + 2, 4));
  ctx.fillStyle = hit ? '#f8bd35' : '#ffdf38';
  body.forEach(([x, y, width]) => ctx.fillRect((x - 8) * 2 + 2, (y - 4) * 2 + 2, width * 2 - 2, 2));

  // Belly and the little orange tail.
  ctx.fillStyle = '#fff4c2';
  ctx.fillRect(-8, 2, 20, 6);
  ctx.fillRect(-4, 8, 12, 2);
  ctx.fillStyle = '#e99420';
  ctx.fillRect(-23, -1, 4, 6);
  ctx.fillRect(-21, 5, 3, 4);

  // Wing has three frames and stays blocky at every scale.
  ctx.fillStyle = '#b87522';
  const wingY = wingFrame === 0 ? -1 : wingFrame === 1 ? 1 : 3;
  ctx.fillRect(-10, wingY + 1, 16, 10);
  ctx.fillStyle = '#f2a62b';
  ctx.fillRect(-8, wingY + 1, 12, 6);
  ctx.fillStyle = '#ffca39';
  ctx.fillRect(-6, wingY + 1, 8, 2);

  // Eye, pupil, and white glint.
  ctx.fillStyle = '#fff';
  ctx.fillRect(7, -12, 11, 12);
  ctx.fillStyle = '#252a2b';
  ctx.fillRect(13, -9, 4, 7);
  ctx.fillStyle = '#fff';
  ctx.fillRect(14, -8, 2, 2);

  // Beak, with a dark lower edge.
  ctx.fillStyle = '#8b4d28';
  ctx.fillRect(17, -2, 10, 7);
  ctx.fillRect(19, 5, 7, 2);
  ctx.fillStyle = '#ff8b1f';
  ctx.fillRect(18, -2, 8, 4);
  ctx.fillRect(19, 2, 7, 3);
  ctx.fillStyle = '#ffc04a';
  ctx.fillRect(19, -1, 4, 1);

  ctx.restore();
}

function drawCloud(ctx: CanvasRenderingContext2D, cloud: Cloud) {
  const s = cloud.scale;
  const x = Math.round(cloud.x);
  const y = cloud.y;
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 7 * s, y, 10 * s, 3 * s);
  ctx.fillRect(x + 3 * s, y + 3 * s, 22 * s, 5 * s);
  ctx.fillRect(x, y + 7 * s, 28 * s, 5 * s);
  ctx.fillRect(x + 5 * s, y + 12 * s, 18 * s, 3 * s);
  ctx.fillStyle = '#e9f8f6';
  ctx.fillRect(x + 4 * s, y + 10 * s, 5 * s, 2 * s);
  ctx.fillRect(x + 18 * s, y + 10 * s, 5 * s, 2 * s);
}

function drawPipeBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  capAtBottom: boolean,
) {
  const px = Math.round(x);
  const top = Math.round(y);
  const h = Math.max(0, Math.round(height));
  if (h === 0) return;

  ctx.fillStyle = '#315b27';
  ctx.fillRect(px - 2, top, PIPE_WIDTH + 4, h);
  ctx.fillStyle = '#71bf2d';
  ctx.fillRect(px + 1, top + 2, PIPE_WIDTH - 2, h - 4);
  ctx.fillStyle = '#a0df4b';
  ctx.fillRect(px + 5, top + 2, 8, h - 4);
  ctx.fillStyle = '#8bd43e';
  ctx.fillRect(px + 15, top + 2, 3, h - 4);
  ctx.fillStyle = '#5a9e2b';
  ctx.fillRect(px + PIPE_WIDTH - 9, top + 2, 6, h - 4);

  const capY = capAtBottom
    ? top + h - PIPE_CAP_HEIGHT + 3
    : top - 3;
  ctx.fillStyle = '#315b27';
  ctx.fillRect(px - 5, capY - 2, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT + 4);
  ctx.fillStyle = '#72bf2d';
  ctx.fillRect(px - 2, capY, PIPE_WIDTH + 4, PIPE_CAP_HEIGHT);
  ctx.fillStyle = '#9fdf4a';
  ctx.fillRect(px + 2, capY + 3, 10, PIPE_CAP_HEIGHT - 6);
  ctx.fillStyle = '#5a9c2c';
  ctx.fillRect(px + PIPE_WIDTH - 6, capY + 3, 5, PIPE_CAP_HEIGHT - 6);
  ctx.fillStyle = '#b4eb58';
  ctx.fillRect(px - 2, capY, PIPE_WIDTH + 4, 4);
  ctx.fillStyle = '#8fd840';
  ctx.fillRect(px + 2, capY + 5, PIPE_WIDTH - 1, 2);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.lineTo(x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.lineTo(x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.lineTo(x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.closePath();
}

export function mountGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks = {},
): GameController {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('This browser does not support the Canvas game.');

  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.touchAction = 'none';
  const ctx = context;
  ctx.imageSmoothingEnabled = false;

  const clouds: Cloud[] = [
    { x: 22, y: 83, scale: 1.1, speed: 0.12 },
    { x: 204, y: 143, scale: 0.78, speed: 0.08 },
    { x: 127, y: 44, scale: 0.58, speed: 0.1 },
    { x: 292, y: 242, scale: 0.8, speed: 0.07 },
  ];

  let phase: GamePhase = 'ready';
  let score = 0;
  let bestScore = readBestScore();
  let muted = false;
  let birdY = 214;
  let birdVelocity = 0;
  let groundOffset = 0;
  let animationTime = 0;
  let lastFrameTime = 0;
  let raf = 0;
  let landed = false;
  let pipes: Pipe[] = [];
  let audioContext: AudioContext | null = null;
  let disposed = false;

  callbacks.onBestScoreChange?.(bestScore);
  callbacks.onScoreChange?.(score);
  callbacks.onMutedChange?.(muted);

  function readBestScore() {
    try {
      return Number(window.localStorage.getItem(STORAGE_KEY) ?? 0) || 0;
    } catch {
      return 0;
    }
  }

  function changePhase(nextPhase: GamePhase) {
    if (phase === nextPhase) return;
    phase = nextPhase;
    callbacks.onPhaseChange?.(phase);
  }

  function playTone(kind: 'flap' | 'score' | 'hit') {
    if (muted) return;
    try {
      audioContext ??= new window.AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;
      const sounds = {
        flap: { start: 430, end: 620, duration: 0.075, wave: 'square' as OscillatorType, volume: 0.036 },
        score: { start: 710, end: 980, duration: 0.12, wave: 'square' as OscillatorType, volume: 0.04 },
        hit: { start: 280, end: 85, duration: 0.22, wave: 'sawtooth' as OscillatorType, volume: 0.055 },
      }[kind];
      oscillator.type = sounds.wave;
      oscillator.frequency.setValueAtTime(sounds.start, now);
      oscillator.frequency.exponentialRampToValueAtTime(sounds.end, now + sounds.duration);
      gain.gain.setValueAtTime(sounds.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + sounds.duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + sounds.duration);
    } catch {
      // Audio is optional; gameplay remains available if browser audio is blocked.
    }
  }

  function resetGame() {
    score = 0;
    birdY = 214;
    birdVelocity = 0;
    landed = false;
    pipes = [];
    groundOffset = 0;
    callbacks.onScoreChange?.(score);
    changePhase('ready');
  }

  function start() {
    if (phase === 'playing') return;
    if (phase === 'gameover') resetGame();
    changePhase('playing');
    birdVelocity = FLAP_VELOCITY;
    playTone('flap');
  }

  function flap() {
    if (phase !== 'playing') {
      start();
      return;
    }
    birdVelocity = FLAP_VELOCITY;
    playTone('flap');
  }

  function restart() {
    resetGame();
  }

  function toggleMute() {
    muted = !muted;
    callbacks.onMutedChange?.(muted);
    return muted;
  }

  function spawnPipe() {
    const minGapY = 156;
    const maxGapY = GROUND_TOP - PIPE_GAP - 80;
    const gapY = minGapY + Math.random() * (maxGapY - minGapY);
    pipes.push({ x: WIDTH + 14, gapY, passed: false });
  }

  function birdCollidesWithPipe(pipe: Pipe) {
    const left = BIRD_X - BIRD_RADIUS_X;
    const right = BIRD_X + BIRD_RADIUS_X;
    const top = birdY - BIRD_RADIUS_Y;
    const bottom = birdY + BIRD_RADIUS_Y;
    const pipeLeft = pipe.x - 5;
    const pipeRight = pipe.x + PIPE_WIDTH + 5;
    if (right <= pipeLeft || left >= pipeRight) return false;
    return top < pipe.gapY + 5 || bottom > pipe.gapY + PIPE_GAP - 5;
  }

  function crash() {
    if (phase !== 'playing') return;
    changePhase('gameover');
    birdVelocity = Math.max(1.6, birdVelocity);
    playTone('hit');
  }

  function update(deltaFrames: number) {
    animationTime += deltaFrames;
    const worldMoving = phase !== 'gameover' || !landed;
    if (worldMoving) {
      groundOffset = (groundOffset + deltaFrames * (phase === 'playing' ? 2.35 : 1.2)) % 24;
      clouds.forEach((cloud) => {
        cloud.x -= cloud.speed * deltaFrames;
        if (cloud.x < -40 * cloud.scale) cloud.x = WIDTH + 8;
      });
    }

    if (phase === 'ready') {
      birdY = 214 + Math.sin(animationTime / 11) * 5;
      return;
    }

    if (phase === 'playing') {
      birdVelocity = Math.min(MAX_FALL_SPEED, birdVelocity + GRAVITY * deltaFrames);
      birdY += birdVelocity * deltaFrames;
      if (pipes.length === 0 || pipes[pipes.length - 1].x < WIDTH - PIPE_SPACING) {
        spawnPipe();
      }
      pipes.forEach((pipe) => {
        pipe.x -= 2.35 * deltaFrames;
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true;
          score += 1;
          callbacks.onScoreChange?.(score);
          playTone('score');
          if (score > bestScore) {
            bestScore = score;
            callbacks.onBestScoreChange?.(bestScore);
            try {
              window.localStorage.setItem(STORAGE_KEY, String(bestScore));
            } catch {
              // Scores still count for this session if storage is unavailable.
            }
          }
        }
        if (birdCollidesWithPipe(pipe)) crash();
      });
      pipes = pipes.filter((pipe) => pipe.x > -PIPE_WIDTH - 12);

      if (birdY + BIRD_RADIUS_Y >= GROUND_TOP) {
        birdY = GROUND_TOP - BIRD_RADIUS_Y;
        crash();
        landed = true;
        birdVelocity = 0;
      }
      if (birdY - BIRD_RADIUS_Y < -12) {
        birdY = -12 + BIRD_RADIUS_Y;
        birdVelocity = 0;
      }
      return;
    }

    if (!landed) {
      birdVelocity = Math.min(MAX_FALL_SPEED, birdVelocity + GRAVITY * deltaFrames);
      birdY += birdVelocity * deltaFrames;
      if (birdY + BIRD_RADIUS_Y >= GROUND_TOP) {
        birdY = GROUND_TOP - BIRD_RADIUS_Y;
        birdVelocity = 0;
        landed = true;
      }
    }
  }

  function drawBackground() {
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // The flat, bright sky and drifting white pixel clouds are kept deliberately simple.
    clouds.forEach((cloud) => drawCloud(ctx, cloud));
    ctx.fillStyle = '#dff3b6';
    ctx.fillRect(0, GROUND_TOP - 4, WIDTH, 4);
    ctx.fillStyle = '#d7efad';
    ctx.fillRect(0, GROUND_TOP - 2, WIDTH, 1);

    // Distant low horizon, intentionally subtle like the original game.
    ctx.fillStyle = '#b8df91';
    ctx.fillRect(0, GROUND_TOP - 9, 35, 5);
    ctx.fillRect(42, GROUND_TOP - 7, 48, 3);
    ctx.fillRect(210, GROUND_TOP - 8, 39, 4);
  }

  function drawPipes() {
    pipes.forEach((pipe) => {
      const gapBottom = pipe.gapY + PIPE_GAP;
      drawPipeBody(ctx, pipe.x, 0, pipe.gapY + 2, true);
      drawPipeBody(ctx, pipe.x, gapBottom - 2, GROUND_TOP - gapBottom + 2, false);
    });
  }

  function drawGround() {
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, GROUND_TOP, WIDTH, GROUND_HEIGHT);
    ctx.fillStyle = '#80c944';
    ctx.fillRect(0, GROUND_TOP, WIDTH, 13);
    ctx.fillStyle = '#4a9e36';
    ctx.fillRect(0, GROUND_TOP + 11, WIDTH, 4);
    ctx.fillStyle = '#b7e557';
    ctx.fillRect(0, GROUND_TOP, WIDTH, 3);

    const tile = 24;
    const shift = Math.floor(groundOffset) % tile;
    for (let x = -shift; x < WIDTH + tile; x += tile) {
      ctx.fillStyle = '#68b83d';
      ctx.fillRect(x + 4, GROUND_TOP + 4, 6, 2);
      ctx.fillRect(x + 16, GROUND_TOP + 7, 4, 2);
      ctx.fillStyle = '#f0e4aa';
      ctx.fillRect(x + 3, GROUND_TOP + 22, 8, 3);
      ctx.fillRect(x + 16, GROUND_TOP + 35, 5, 3);
      ctx.fillStyle = '#c1b875';
      ctx.fillRect(x + 11, GROUND_TOP + 51, 7, 3);
      ctx.fillRect(x + 2, GROUND_TOP + 72, 5, 3);
      ctx.fillRect(x + 15, GROUND_TOP + 87, 8, 3);
      ctx.fillStyle = '#d2c889';
      ctx.fillRect(x + 7, GROUND_TOP + 103, 10, 2);
    }
    ctx.fillStyle = '#f4e9b8';
    ctx.fillRect(0, GROUND_TOP + 16, WIDTH, 2);
    ctx.fillStyle = '#ab9f65';
    ctx.fillRect(0, HEIGHT - 2, WIDTH, 2);
  }

  function drawReady() {
    const title = 'FLAPPY BIRD';
    const titleScale = 3;
    drawPixelText(
      ctx,
      title,
      Math.floor((WIDTH - textWidth(title, titleScale)) / 2),
      101,
      titleScale,
      '#f9f2ad',
      '#7b4e27',
    );

    const prompt = 'GET READY';
    const promptScale = 2;
    drawPixelText(
      ctx,
      prompt,
      Math.floor((WIDTH - textWidth(prompt, promptScale)) / 2),
      274,
      promptScale,
      '#fff',
      '#5d5844',
    );
    const hint = 'TAP TO START';
    drawPixelText(
      ctx,
      hint,
      Math.floor((WIDTH - textWidth(hint, 1)) / 2),
      297,
      1,
      '#fff',
      '#42666a',
    );
  }

  function drawLiveScore() {
    const scoreText = String(score);
    const scale = 5;
    drawPixelText(
      ctx,
      scoreText,
      Math.floor((WIDTH - textWidth(scoreText, scale)) / 2),
      33,
      scale,
      '#fff',
      '#51452f',
    );
  }

  function drawGameOver() {
    const title = 'GAME OVER';
    const scale = 3;
    drawPixelText(
      ctx,
      title,
      Math.floor((WIDTH - textWidth(title, scale)) / 2),
      124,
      scale,
      '#f9f5dd',
      '#a84732',
    );

    const x = 47;
    const y = 166;
    const width = 194;
    const height = 112;
    ctx.fillStyle = '#6b5034';
    ctx.fillRect(x - 3, y - 3, width + 6, height + 6);
    ctx.fillStyle = '#e3dda1';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = '#f5f0c8';
    ctx.fillRect(x + 3, y + 3, width - 6, 5);
    ctx.fillStyle = '#c1b477';
    ctx.fillRect(x + 3, y + height - 7, width - 6, 4);
    ctx.fillStyle = '#8a744c';
    ctx.fillRect(x + 96, y + 12, 2, 87);

    drawPixelText(ctx, 'SCORE', x + 13, y + 19, 1, '#70583a');
    drawPixelText(ctx, String(score), x + 16, y + 40, 2, '#fff', '#6d6240');
    drawPixelText(ctx, 'BEST', x + 111, y + 19, 1, '#70583a');
    drawPixelText(ctx, String(bestScore), x + 114, y + 40, 2, '#fff', '#6d6240');

    const medalColor = score >= 10 ? '#f6c84c' : score >= 5 ? '#d8dfe0' : '#ca7b47';
    ctx.fillStyle = '#80613b';
    ctx.fillRect(x + 29, y + 70, 14, 20);
    ctx.fillStyle = '#e75c4e';
    ctx.fillRect(x + 31, y + 70, 5, 18);
    ctx.fillStyle = '#f4d04c';
    ctx.fillRect(x + 36, y + 70, 5, 18);
    ctx.fillStyle = '#805d39';
    ctx.beginPath();
    ctx.arc(x + 36, y + 71, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = medalColor;
    ctx.beginPath();
    ctx.arc(x + 36, y + 71, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff0a1';
    ctx.fillRect(x + 32, y + 63, 5, 3);

    const retry = 'TAP TO RETRY';
    drawPixelText(
      ctx,
      retry,
      Math.floor((WIDTH - textWidth(retry, 1)) / 2),
      304,
      1,
      '#fff',
      '#42666a',
    );

    // A little pixelated star appears when the player sets a new personal best.
    if (score > 0 && score >= bestScore) {
      ctx.fillStyle = '#fff4a3';
      ctx.fillRect(196, 174, 5, 17);
      ctx.fillRect(190, 180, 17, 5);
      ctx.fillStyle = '#fff';
      ctx.fillRect(198, 178, 2, 9);
      ctx.fillRect(194, 182, 10, 2);
    }
  }

  function drawFrame() {
    drawBackground();
    drawPipes();
    drawGround();

    const wingFrame = Math.floor(animationTime / 5) % 3;
    const rotation = phase === 'playing'
      ? Math.max(-0.38, Math.min(1.18, birdVelocity * 0.095))
      : phase === 'gameover'
        ? Math.min(1.42, 0.55 + Math.max(0, birdVelocity) * 0.09)
        : Math.sin(animationTime / 8) * 0.035;
    makeBirdSprite(ctx, birdY, wingFrame, rotation, phase === 'gameover');

    if (phase === 'ready') drawReady();
    else if (phase === 'playing') drawLiveScore();
    else drawGameOver();
  }

  function frame(now: number) {
    if (disposed) return;
    const deltaFrames = lastFrameTime === 0 ? 1 : Math.min(2, Math.max(0.25, (now - lastFrameTime) / (1000 / 60)));
    lastFrameTime = now;
    update(deltaFrames);
    drawFrame();
    raf = window.requestAnimationFrame(frame);
  }

  function onCanvasPointerDown(event: PointerEvent) {
    event.preventDefault();
    if (phase === 'gameover') restart();
    flap();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      flap();
    }
  }

  canvas.addEventListener('pointerdown', onCanvasPointerDown);
  window.addEventListener('keydown', onKeyDown);
  raf = window.requestAnimationFrame(frame);

  return {
    flap,
    start,
    restart,
    toggleMute,
    dispose() {
      disposed = true;
      window.cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onCanvasPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      if (audioContext) void audioContext.close();
    },
  };
}
