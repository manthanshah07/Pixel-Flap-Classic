import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { mountGame, type GameController } from '@/game/engine';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
type GamePhase = 'ready' | 'playing' | 'gameover';

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10v4h4l5 4V6l-5 4H4Z" stroke="currentColor" strokeLinejoin="round" />
      {muted ? (
        <path d="m17 9 5 6m0-6-5 6" stroke="currentColor" strokeLinecap="square" />
      ) : (
        <>
          <path d="M16 9a5 5 0 0 1 0 6" stroke="currentColor" strokeLinecap="square" />
          <path d="M18.5 6.5a9 9 0 0 1 0 11" stroke="currentColor" strokeLinecap="square" />
        </>
      )}
    </svg>
  );
}

function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = mountGame(canvas, {
      onPhaseChange: setPhase,
      onScoreChange: setScore,
      onBestScoreChange: setBestScore,
      onMutedChange: setMuted,
    });
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  const handlePlay = () => {
    controllerRef.current?.start();
  };

  const phaseCopy: Record<GamePhase, string> = {
    ready: 'READY?',
    playing: 'FLYING',
    gameover: 'GAME OVER',
  };

  return (
    <main className="arcade-page">
      <section className="game-shell" aria-label="Flappy Bird arcade game">
        <header className="masthead">
          <h1 className="brand">
            FLAPPY BIRD
            <span>ARCADE EDITION</span>
          </h1>
          <button
            className="sound-button"
            type="button"
            aria-label={muted ? 'Turn sound on' : 'Mute sound'}
            aria-pressed={muted}
            data-testid="button-sound"
            onClick={() => controllerRef.current?.toggleMute()}
          >
            <SoundIcon muted={muted} />
          </button>
        </header>

        <div className="score-strip" aria-label="Game scores">
          <div className="score-box">
            <span className="score-label">SCORE</span>
            <output className="score-value" aria-live="polite" data-testid="score-current">{score}</output>
          </div>
          <div className="score-box">
            <span className="score-label">BEST</span>
            <output className="score-value" aria-live="polite" data-testid="score-best">{bestScore}</output>
          </div>
        </div>

        <div className="playfield-frame">
          <canvas
            ref={canvasRef}
            className="game-canvas"
            width={450}
            height={800}
            aria-label="Flappy Bird playfield. Tap, click, or press Space or Arrow Up to flap."
            aria-describedby="control-hint"
            data-testid="game-canvas"
            tabIndex={0}
          >
            Flappy Bird playfield. Use Space or Arrow Up to flap.
          </canvas>
        </div>

        <p className="phase-line" role="status" aria-live="polite" data-phase={phase} data-testid="status-phase">
          {phaseCopy[phase]}
        </p>

        {phase !== 'playing' && (
          <button
            className="primary-action"
            type="button"
            data-testid={phase === 'ready' ? 'button-start' : 'button-retry'}
            onClick={handlePlay}
          >
            {phase === 'ready' ? 'Start flight' : 'Try again'}
          </button>
        )}

        <p className="controls-hint" id="control-hint" data-testid="text-controls">
          <span className="keycap">SPACE</span>
          <span>or</span>
          <span className="keycap">↑</span>
          <span>to flap</span>
        </p>
        <p className="footer-note">One more flight?</p>
      </section>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
