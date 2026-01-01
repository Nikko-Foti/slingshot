// Matter.js module aliases
const Engine = Matter.Engine;
const Render = Matter.Render;
const Runner = Matter.Runner;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Composite = Matter.Composite;
const Constraint = Matter.Constraint;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Events = Matter.Events;
const Vector = Matter.Vector;

// Game variables
let engine, render, runner, canvas;
let ball, slingshotConstraint;
let isDragging = false;
let isLaunched = false;
let score = 0;
let shots = 0;
let targets = [];
let ground, leftWall, rightWall;

// Slingshot position
const slingshotX = 150;
const slingshotY = 400;
const maxDragDistance = 100;

// Particle system
let particles = [];

// Audio context for sound effects
let audioContext;
let isSoundEnabled = true;

// ===== SOUND SYSTEM =====
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Web Audio API not supported');
        isSoundEnabled = false;
    }
}

function playSound(type, intensity = 1) {
    if (!isSoundEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch(type) {
        case 'stretch':
            // Elastic stretch sound
            oscillator.frequency.setValueAtTime(200 + intensity * 100, now);
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1 * intensity, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;

        case 'launch':
            // Whoosh sound
            oscillator.frequency.setValueAtTime(400, now);
            oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.3);
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;

        case 'bounce':
            // Bounce sound
            oscillator.frequency.setValueAtTime(150 + intensity * 200, now);
            oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.1);
            oscillator.type = 'triangle';
            gainNode.gain.setValueAtTime(0.2 * intensity, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;

        case 'hit_low':
            // Low score hit
            oscillator.frequency.setValueAtTime(300, now);
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;

        case 'hit_medium':
            // Medium score hit
            oscillator.frequency.setValueAtTime(450, now);
            oscillator.frequency.setValueAtTime(600, now + 0.05);
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.35, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            oscillator.start(now);
            oscillator.stop(now + 0.25);
            break;

        case 'hit_high':
            // High score hit - victorious sound
            oscillator.frequency.setValueAtTime(500, now);
            oscillator.frequency.setValueAtTime(700, now + 0.05);
            oscillator.frequency.setValueAtTime(900, now + 0.1);
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.4, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            oscillator.start(now);
            oscillator.stop(now + 0.4);
            break;
    }
}

// ===== PARTICLE SYSTEM =====
class Particle {
    constructor(x, y, color, velocity) {
        this.x = x;
        this.y = y;
        this.vx = velocity.x + (Math.random() - 0.5) * 4;
        this.vy = velocity.y + (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.decay = 0.015 + Math.random() * 0.015;
        this.size = 3 + Math.random() * 4;
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // gravity
        this.vx *= 0.98; // air resistance
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

function createExplosion(x, y, color, count = 20, velocity = {x: 0, y: 0}) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color, velocity));
    }
}

function updateParticles(ctx) {
    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);

        if (particles[i].isDead()) {
            particles.splice(i, 1);
        }
    }
}

// Initialize the game
function init() {
    canvas = document.getElementById('gameCanvas');

    // Initialize audio
    initAudio();

    // Set canvas size based on viewport
    const width = Math.min(800, window.innerWidth - 40);
    const height = Math.min(600, window.innerHeight - 300);
    canvas.width = width;
    canvas.height = height;

    // Create engine
    engine = Engine.create({
        gravity: {
            x: 0,
            y: 1
        }
    });

    // Create renderer
    render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: width,
            height: height,
            wireframes: false,
            background: '#E8F4F8'
        }
    });

    Render.run(render);

    // Create runner
    runner = Runner.create();
    Runner.run(runner, engine);

    // Create world boundaries
    createBoundaries();

    // Create slingshot
    createSlingshot();

    // Create targets
    createTargets();

    // Set up controls
    setupControls();

    // Update loop for custom rendering
    Events.on(engine, 'afterUpdate', update);

    // Collision detection
    Events.on(engine, 'collisionStart', handleCollision);

    // Button listeners
    document.getElementById('resetBtn').addEventListener('click', resetShot);
    document.getElementById('newGameBtn').addEventListener('click', newGame);
}

function createBoundaries() {
    const width = canvas.width;
    const height = canvas.height;

    // Ground
    ground = Bodies.rectangle(width / 2, height - 10, width, 20, {
        isStatic: true,
        render: {
            fillStyle: '#8B4513'
        }
    });

    // Left wall
    leftWall = Bodies.rectangle(10, height / 2, 20, height, {
        isStatic: true,
        render: {
            fillStyle: '#8B4513'
        }
    });

    // Right wall
    rightWall = Bodies.rectangle(width - 10, height / 2, 20, height, {
        isStatic: true,
        render: {
            fillStyle: '#8B4513'
        }
    });

    Composite.add(engine.world, [ground, leftWall, rightWall]);
}

function createSlingshot() {
    // Create the ball
    ball = Bodies.circle(slingshotX, slingshotY, 15, {
        density: 0.004,
        restitution: 0.8, // Bounciness
        friction: 0.01,
        render: {
            fillStyle: '#FF6B6B',
            strokeStyle: '#C92A2A',
            lineWidth: 2
        },
        label: 'ball'
    });

    // Create the elastic constraint (slingshot band)
    slingshotConstraint = Constraint.create({
        pointA: { x: slingshotX, y: slingshotY },
        bodyB: ball,
        stiffness: 0.05,
        length: 0,
        render: {
            strokeStyle: '#8B4513',
            lineWidth: 3
        }
    });

    Composite.add(engine.world, [ball, slingshotConstraint]);
}

function createTargets() {
    const width = canvas.width;
    const height = canvas.height;

    // Main target - bullseye style
    const targetX = width - 150;
    const targetY = height - 100;

    // Outer circle
    const target1 = Bodies.circle(targetX, targetY, 40, {
        isStatic: true,
        isSensor: true,
        render: {
            fillStyle: '#FF4444',
            strokeStyle: '#FFFFFF',
            lineWidth: 3
        },
        label: 'target_outer',
        points: 10
    });

    // Middle circle
    const target2 = Bodies.circle(targetX, targetY, 25, {
        isStatic: true,
        isSensor: true,
        render: {
            fillStyle: '#FFFFFF',
            strokeStyle: '#FF4444',
            lineWidth: 2
        },
        label: 'target_middle',
        points: 25
    });

    // Inner circle (bullseye)
    const target3 = Bodies.circle(targetX, targetY, 10, {
        isStatic: true,
        isSensor: true,
        render: {
            fillStyle: '#FFD700',
            strokeStyle: '#FF4444',
            lineWidth: 2
        },
        label: 'target_inner',
        points: 50
    });

    targets = [target1, target2, target3];
    Composite.add(engine.world, targets);

    // Add some obstacles for fun
    const obstacle1 = Bodies.rectangle(width / 2, height - 150, 80, 20, {
        isStatic: true,
        angle: Math.PI / 6,
        render: {
            fillStyle: '#4ECDC4'
        }
    });

    const obstacle2 = Bodies.rectangle(width / 2 + 150, height - 200, 60, 15, {
        isStatic: true,
        angle: -Math.PI / 8,
        render: {
            fillStyle: '#95E1D3'
        }
    });

    Composite.add(engine.world, [obstacle1, obstacle2]);
}

function setupControls() {
    const canvasElement = canvas;

    // Mouse/touch start
    canvasElement.addEventListener('mousedown', handleStart);
    canvasElement.addEventListener('touchstart', handleStart, { passive: false });

    // Mouse/touch move
    canvasElement.addEventListener('mousemove', handleMove);
    canvasElement.addEventListener('touchmove', handleMove, { passive: false });

    // Mouse/touch end
    canvasElement.addEventListener('mouseup', handleEnd);
    canvasElement.addEventListener('touchend', handleEnd);
    canvasElement.addEventListener('touchcancel', handleEnd);
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function handleStart(e) {
    e.preventDefault();

    if (isLaunched) return;

    const pos = getMousePos(e);
    const distance = Math.sqrt(
        Math.pow(pos.x - ball.position.x, 2) +
        Math.pow(pos.y - ball.position.y, 2)
    );

    if (distance < 20) {
        isDragging = true;
    }
}

function handleMove(e) {
    e.preventDefault();

    if (!isDragging || isLaunched) return;

    const pos = getMousePos(e);

    // Calculate distance from slingshot anchor
    const dx = pos.x - slingshotX;
    const dy = pos.y - slingshotY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Limit drag distance
    if (distance > maxDragDistance) {
        const angle = Math.atan2(dy, dx);
        pos.x = slingshotX + Math.cos(angle) * maxDragDistance;
        pos.y = slingshotY + Math.sin(angle) * maxDragDistance;
    }

    // Play stretch sound based on distance
    const stretchIntensity = Math.min(distance / maxDragDistance, 1);
    if (Math.random() > 0.9) { // Only play occasionally to avoid spam
        playSound('stretch', stretchIntensity);
    }

    // Update ball position
    Body.setPosition(ball, { x: pos.x, y: pos.y });
    Body.setVelocity(ball, { x: 0, y: 0 });
}

function handleEnd(e) {
    e.preventDefault();

    if (!isDragging || isLaunched) return;

    isDragging = false;
    isLaunched = true;
    shots++;
    updateHUD();

    // Remove the constraint to launch the ball
    const launchForce = {
        x: (slingshotX - ball.position.x) * 0.05,
        y: (slingshotY - ball.position.y) * 0.05
    };

    Body.applyForce(ball, ball.position, launchForce);
    slingshotConstraint.bodyB = null;

    // Play launch sound
    playSound('launch');

    // Create launch particle effect
    createExplosion(ball.position.x, ball.position.y, '#FF6B6B', 15, {
        x: -launchForce.x * 20,
        y: -launchForce.y * 20
    });
}

function update() {
    // Check if ball is out of bounds or stopped
    if (isLaunched) {
        const velocity = ball.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

        // If ball is basically stopped and on the ground
        if (speed < 0.5 && ball.position.y > canvas.height - 50) {
            // Auto-reset after a short delay
            setTimeout(() => {
                if (isLaunched) resetShot();
            }, 1000);
        }
    }

    // Update and draw particles
    const ctx = canvas.getContext('2d');
    updateParticles(ctx);

    // Draw trajectory preview
    if (isDragging && !isLaunched) {
        drawTrajectory();
    }
}

function drawTrajectory() {
    const ctx = canvas.getContext('2d');

    // Calculate launch vector
    const dx = slingshotX - ball.position.x;
    const dy = slingshotY - ball.position.y;

    const velocityX = dx * 0.05;
    const velocityY = dy * 0.05;

    // Draw dotted trajectory line
    ctx.save();
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.6;

    ctx.beginPath();
    ctx.moveTo(ball.position.x, ball.position.y);

    // Simulate trajectory
    let x = ball.position.x;
    let y = ball.position.y;
    let vx = velocityX * 60;
    let vy = velocityY * 60;
    const gravity = engine.gravity.y;

    for (let i = 0; i < 60; i++) {
        vx *= 0.99;
        vy += gravity;
        x += vx;
        y += vy;

        if (i % 3 === 0) {
            ctx.lineTo(x, y);
        }

        if (y > canvas.height - 20) break;
    }

    ctx.stroke();
    ctx.restore();
}

function handleCollision(event) {
    const pairs = event.pairs;

    pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;

        // Get the ball from the collision
        const ballBody = bodyA.label === 'ball' ? bodyA : bodyB.label === 'ball' ? bodyB : null;
        const otherBody = bodyA.label === 'ball' ? bodyB : bodyA;

        if (!ballBody) return;

        // Calculate collision intensity based on velocity
        const speed = Math.sqrt(ballBody.velocity.x ** 2 + ballBody.velocity.y ** 2);
        const intensity = Math.min(speed / 20, 1);

        // Check if ball hit a target
        if (otherBody.label && otherBody.label.startsWith('target')) {
            if (otherBody.points) {
                // Award points
                score += otherBody.points;
                updateHUD();

                // Visual feedback
                flashTarget(otherBody);

                // Sound effect based on target value
                if (otherBody.points >= 50) {
                    playSound('hit_high');
                    createExplosion(ballBody.position.x, ballBody.position.y, '#FFD700', 30, ballBody.velocity);
                } else if (otherBody.points >= 25) {
                    playSound('hit_medium');
                    createExplosion(ballBody.position.x, ballBody.position.y, '#FFFFFF', 25, ballBody.velocity);
                } else {
                    playSound('hit_low');
                    createExplosion(ballBody.position.x, ballBody.position.y, '#FF4444', 20, ballBody.velocity);
                }

                // Remove the target's scoring ability temporarily
                const points = otherBody.points;
                otherBody.points = 0;
                setTimeout(() => {
                    otherBody.points = points;
                }, 1000);
            }
        } else if (intensity > 0.3) {
            // Bounce sound for non-target collisions
            playSound('bounce', intensity);

            // Small particle effect for bounces
            const color = otherBody.render?.fillStyle || '#4ECDC4';
            createExplosion(ballBody.position.x, ballBody.position.y, color, 8, {
                x: ballBody.velocity.x * 0.5,
                y: ballBody.velocity.y * 0.5
            });
        }
    });
}

function flashTarget(target) {
    const originalColor = target.render.fillStyle;
    target.render.fillStyle = '#FFFFFF';

    setTimeout(() => {
        target.render.fillStyle = originalColor;
    }, 200);
}

function resetShot() {
    if (!isLaunched) return;

    // Remove old ball
    Composite.remove(engine.world, ball);
    Composite.remove(engine.world, slingshotConstraint);

    // Create new ball and slingshot
    createSlingshot();

    isLaunched = false;
    isDragging = false;
}

function newGame() {
    score = 0;
    shots = 0;
    updateHUD();
    resetShot();
}

function updateHUD() {
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('shots').textContent = `Shots: ${shots}`;
}

// Initialize game when page loads
window.addEventListener('load', init);

// Handle window resize
window.addEventListener('resize', () => {
    // For simplicity, just reload the page on resize
    // In production, you'd want to handle this more gracefully
    location.reload();
});
