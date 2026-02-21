/**
 * bg_particles.js
 * Manages atmospheric background bubbles with interactive pop effects.
 */

export default class BackgroundParticles {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.particles = [];
        this.enabled = true;
        this.spawnTimer = null;
    }

    init(enabled) {
        this.updateState(enabled);
    }

    updateState(enabled) {
        this.enabled = enabled;
        if (!this.enabled) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        if (this.spawnTimer) return;

        // Spawn initial batch
        for (let i = 0; i < 20; i++) {
            this.spawn(true);
        }

        // Continuous spawn
        this.spawnTimer = setInterval(() => {
            if (this.particles.length < 40) {
                this.spawn();
            }
        }, 1500);
    }

    stop() {
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = null;
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.particles = [];
    }

    destroy() {
        this.stop();
    }

    spawn(randomInitialY = false) {
        if (!this.container) return;

        const particle = document.createElement('div');
        particle.className = 'bc-bg-bubble';

        const size = 10 + Math.random() * 60;
        const left = Math.random() * 100;
        const duration = 20 + Math.random() * 25;
        const delay = Math.random() * -30;
        const opacity = 0.05 + Math.random() * 0.15;

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${left}%`;
        particle.style.opacity = opacity;
        particle.style.animation = `bc-bg-drift ${duration}s linear infinite`;
        particle.style.animationDelay = `${delay}s`;

        if (randomInitialY) {
            const startY = Math.random() * -100;
            particle.style.bottom = `${startY}vh`;
        }

        const pop = (e) => {
            if (particle.classList.contains('popping')) return;
            particle.classList.add('popping');

            const x = e.clientX || 0;
            const y = e.clientY || 0;
            const appRoot = document.querySelector('.bubble-contact-app') || document.body;

            // Simple Ring FX
            const fx = document.createElement('div');
            fx.className = 'bc-pop-fx';
            fx.style.left = `${x}px`;
            fx.style.top = `${y}px`;
            fx.style.width = `40px`;
            fx.style.height = `40px`;
            appRoot.appendChild(fx);
            setTimeout(() => fx.remove(), 400);

            // "POP!" Text
            const text = document.createElement('div');
            text.className = 'bc-pop-text';
            text.textContent = 'POP!';
            text.style.left = `${x}px`;
            text.style.top = `${y}px`;
            appRoot.appendChild(text);
            setTimeout(() => text.remove(), 500);

            if (particle.parentNode) particle.remove();
            this.particles = this.particles.filter(p => p !== particle);

            // Notify pop counter
            document.dispatchEvent(new CustomEvent('bubblepopped'));
        };

        particle.addEventListener('pointerdown', pop);

        this.container.appendChild(particle);
        this.particles.push(particle);

        setTimeout(() => {
            if (particle && particle.parentNode) {
                particle.remove();
                this.particles = this.particles.filter(p => p !== particle);
            }
        }, duration * 1000);
    }
}
