const VisualEffects = {
    createSnowflakes() {
        const container = document.getElementById('snowflakes');
        if (!container) return;

        const snowflakeCount = 30; 
        const snowflakes = [];

        for (let i = 0; i < snowflakeCount; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake-advanced';
            snowflake.innerHTML = '❄';

            const physics = {
                x: Math.random() * window.innerWidth,
                y: -20,
                vx: (Math.random() - 0.5) * 2,
                vy: 1 + Math.random() * 2,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 5,
                size: 0.5 + Math.random() * 1.5,
                opacity: 0.3 + Math.random() * 0.7,
                swingAmplitude: 20 + Math.random() * 30,
                swingSpeed: 0.02 + Math.random() * 0.03,
                swingOffset: Math.random() * Math.PI * 2
            };

            Object.assign(snowflake.style, {
                fontSize: `${physics.size}em`,
                opacity: physics.opacity,
                position: 'fixed',
                pointerEvents: 'none',
                zIndex: '9999',
                color: '#fff',
                textShadow: '0 0 5px rgba(255, 255, 255, 0.8)',
                willChange: 'transform'
            });

            container.appendChild(snowflake);
            snowflakes.push({ element: snowflake, physics });
        }

        let windStrength = 0;
        let windDirection = 1;
        let time = 0;
        let animationFrameId = null;

        function animate() {
            time += 0.016;

            windStrength = Math.sin(time * 0.5) * 2;

            snowflakes.forEach(({ element, physics }) => {
                physics.x += physics.vx + windStrength * windDirection;
                physics.y += physics.vy;

                const swing = Math.sin(time * physics.swingSpeed + physics.swingOffset) * physics.swingAmplitude;
                physics.x += swing * 0.1;

                physics.rotation += physics.rotationSpeed;

                if (physics.y > window.innerHeight) {
                    physics.y = -20;
                    physics.x = Math.random() * window.innerWidth;
                }
                if (physics.x > window.innerWidth + 50) {
                    physics.x = -50;
                } else if (physics.x < -50) {
                    physics.x = window.innerWidth + 50;
                }

                element.style.transform = `translate3d(${physics.x}px, ${physics.y}px, 0) rotate(${physics.rotation}deg)`;
            });

            animationFrameId = requestAnimationFrame(animate);
        }

        animate();

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            snowflakes.forEach(({ element }) => element.remove());
        };
    }
};

if (typeof window !== 'undefined') {
    window.VisualEffects = VisualEffects;
}