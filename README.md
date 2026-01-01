# Slingshot Physics Game

A mobile-first physics-based game where you shoot a bouncy ball with a slingshot to hit targets.

## Features

- **Realistic Physics**: Powered by Matter.js physics engine
- **Touch Controls**: Drag the ball back to aim and adjust power
- **Trajectory Preview**: See where your shot will go before releasing
- **Scoring System**: Hit different parts of the target for different points
  - Bullseye (Gold): 50 points
  - Middle Ring (White): 25 points
  - Outer Ring (Red): 10 points
- **Obstacles**: Bounce off platforms to reach the target
- **Mobile-First Design**: Optimized for touch screens
- **Responsive**: Works on desktop and mobile devices

## How to Play

1. Open `index.html` in a web browser
2. Drag the red ball backward to pull the slingshot
3. Aim by dragging in different directions
4. Release to launch the ball
5. Try to hit the target to score points!

## Controls

- **Drag Ball**: Pull back and aim the slingshot
- **Release**: Launch the ball
- **Reset Shot**: Get a new ball to try again
- **New Game**: Reset score and start over

## Technologies Used

- HTML5 Canvas
- Matter.js (Physics Engine)
- Vanilla JavaScript
- CSS3

## Game Mechanics

- Gravity and realistic ball physics
- Ball restitution (bounciness) of 0.8
- Maximum drag distance of 100px for balance
- Auto-reset when ball stops moving
- Collision detection with targets and obstacles

## Future Enhancements

- Multiple levels with increasing difficulty
- Different ball types (heavy, light, super bouncy)
- Moving targets
- Wind effects
- Power-ups
- High score tracking
- Sound effects
- Particle effects on collision

## License

MIT License
