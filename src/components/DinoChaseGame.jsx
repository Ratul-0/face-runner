import React, { useState, useEffect, useRef } from 'react';

// Fixed face image paths located inside the face-runner/public/ directory
const FIXED_FACES = [
  { id: 1, name: 'Friend 1', src: '/face1.jpg' },
  { id: 2, name: 'Friend 2', src: '/face2.jpg' },
  { id: 3, name: 'Friend 3', src: '/face3.jpg' },
  { id: 4, name: 'Friend 4', src: '/face4.jpg' },
];

const DinoChaseGame = () => {
  const [runnerFace, setRunnerFace] = useState(null);
  const [chaserFace, setChaserFace] = useState(null);
  const [gameState, setGameState] = useState('select'); // 'select' | 'playing' | 'gameover'
  const [score, setScore] = useState(0);

  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const runnerImgRef = useRef(null);
  const chaserImgRef = useRef(null);

  // Load image object for canvas rendering
  const loadImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
    });
  };

  const startGame = async () => {
    if (!runnerFace || !chaserFace) return;

    runnerImgRef.current = await loadImage(runnerFace);
    chaserImgRef.current = await loadImage(chaserFace);

    setScore(0);
    setGameState('playing');
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const groundY = 220;
    let frame = 0;
    let gameSpeed = 6;
    let currentScore = 0;

    const runner = {
      x: 180,
      y: groundY,
      width: 30,
      height: 60,
      vy: 0,
      gravity: 0.8,
      isJumping: false,
      isSliding: false,
      slideTimer: 0
    };

    const chaser = {
      x: 60,
      y: groundY,
      width: 30,
      height: 60
    };

    let obstacles = [];

    const handleJump = () => {
      if (!runner.isJumping && !runner.isSliding) {
        runner.vy = -13;
        runner.isJumping = true;
      }
    };

    const handleSlide = () => {
      if (!runner.isJumping && !runner.isSliding) {
        runner.isSliding = true;
        runner.height = 35;
        runner.slideTimer = 30;
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') {
        e.preventDefault();
        handleJump();
      }
      if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        handleSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const drawStickman = (x, y, isSliding, headImg, legOffset, isChaser = false) => {
      ctx.save();
      
      const headSize = 36;
      let headX = x - headSize / 4;
      let headY = y - (isSliding ? 30 : 60);

      // Clip head into circle
      ctx.beginPath();
      ctx.arc(headX + headSize / 2, headY + headSize / 2, headSize / 2, 0, Math.PI * 2);
      ctx.clip();
      if (headImg) {
        ctx.drawImage(headImg, headX, headY, headSize, headSize);
      }
      ctx.restore();

      // Stick body rendering
      ctx.strokeStyle = isChaser ? '#e74c3c' : '#2ecc71';
      ctx.lineWidth = 4;
      ctx.beginPath();

      if (isSliding) {
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x - 25, y - 5);
        ctx.moveTo(x - 10, y - 5);
        ctx.lineTo(x - 20, y);
      } else {
        ctx.moveTo(x + 10, y - 25);
        ctx.lineTo(x + 10, y - 5);

        const legAngle = Math.sin(legOffset) * 12;
        ctx.moveTo(x + 10, y - 5);
        ctx.lineTo(x + 10 - legAngle, y + 15);

        ctx.moveTo(x + 10, y - 5);
        ctx.lineTo(x + 10 + legAngle, y + 15);
      }
      ctx.stroke();
    };

    const loop = () => {
      frame++;
      currentScore++;
      setScore(Math.floor(currentScore / 5));

      if (frame % 300 === 0) gameSpeed += 0.5;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Ground Line
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 15);
      ctx.lineTo(canvas.width, groundY + 15);
      ctx.stroke();

      // Moving Ground Details
      ctx.fillStyle = '#888';
      for (let i = 0; i < canvas.width; i += 40) {
        let lineX = (i - (frame * gameSpeed) % 40);
        ctx.fillRect(lineX, groundY + 20, 15, 2);
      }

      // Physics
      if (runner.isJumping) {
        runner.y += runner.vy;
        runner.vy += runner.gravity;
        if (runner.y >= groundY) {
          runner.y = groundY;
          runner.isJumping = false;
          runner.vy = 0;
        }
      }

      if (runner.isSliding) {
        runner.slideTimer--;
        if (runner.slideTimer <= 0) {
          runner.isSliding = false;
          runner.height = 60;
        }
      }

      // Spawn Obstacles
      if (frame % Math.max(50, 120 - Math.floor(gameSpeed * 5)) === 0) {
        const type = Math.random() > 0.5 ? 'jump' : 'slide';
        obstacles.push({
          x: canvas.width,
          y: type === 'jump' ? groundY - 15 : groundY - 55,
          width: 25,
          height: type === 'jump' ? 30 : 25,
          type: type
        });
      }

      // Obstacle Updates & Collision Detection
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= gameSpeed;

        ctx.fillStyle = obs.type === 'jump' ? '#e67e22' : '#9b59b6';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        const runnerBox = {
          x: runner.x,
          y: runner.isSliding ? runner.y - 25 : runner.y - 50,
          width: 20,
          height: runner.isSliding ? 25 : 50
        };

        if (
          runnerBox.x < obs.x + obs.width &&
          runnerBox.x + runnerBox.width > obs.x &&
          runnerBox.y < obs.y + obs.height &&
          runnerBox.y + runnerBox.height > obs.y
        ) {
          setGameState('gameover');
          return;
        }

        if (obs.x + obs.width < 0) obstacles.splice(i, 1);
      }

      const legCycle = frame * 0.2;
      drawStickman(runner.x, runner.y, runner.isSliding, runnerImgRef.current, legCycle, false);
      drawStickman(chaser.x, chaser.y, false, chaserImgRef.current, legCycle, true);

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState]);

  return (
    <div className="game-wrapper">
      <h2>Stickman Face Chase</h2>

      {gameState === 'select' && (
        <div className="box">
          <h3>Pick Runner & Chaser</h3>
          <div className="face-selection-grid">
            {FIXED_FACES.map((face) => (
              <div key={face.id} className="face-card">
                <img src={face.src} alt={face.name} />
                <p>{face.name}</p>
                <div className="button-group">
                  <button
                    className={runnerFace === face.src ? 'active runner-btn' : ''}
                    onClick={() => setRunnerFace(face.src)}
                    disabled={chaserFace === face.src}
                  >
                    Runner
                  </button>
                  <button
                    className={chaserFace === face.src ? 'active chaser-btn' : ''}
                    onClick={() => setChaserFace(face.src)}
                    disabled={runnerFace === face.src}
                  >
                    Chaser
                  </button>
                </div>
              </div>
            ))}
          </div>

          {runnerFace && chaserFace && (
            <button className="start-btn" onClick={startGame}>
              Start Game
            </button>
          )}
        </div>
      )}

      {(gameState === 'playing' || gameState === 'gameover') && (
        <div className="canvas-container">
          <div className="score-display">Score: {score}</div>
          <canvas ref={canvasRef} width={600} height={280} className="game-canvas" />

          {gameState === 'playing' && (
            <div className="mobile-controls">
              <button
                className="ctrl-btn jump-btn"
                onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))}
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))}
              >
                JUMP ▲
              </button>
              <button
                className="ctrl-btn slide-btn"
                onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))}
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))}
              >
                SLIDE ▼
              </button>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="game-over-overlay">
              <h3>Game Over!</h3>
              <p>Score: {score}</p>
              <button className="start-btn" onClick={() => setGameState('select')}>
                Choose Characters Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DinoChaseGame;