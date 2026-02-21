/**
 * animation.js
 * Central Motion Controller for Bubble Contact RD
 * Handles smart transitions and global animation state.
 */

export const Motion = {
    enabled: true,
    fluidMotion: false,

    /**
     * Initialize with application state
     * @param {boolean} animationsEnabled 
     * @param {boolean} fluidMotionEnabled
     */
    init(animationsEnabled, fluidMotionEnabled = false) {
        this.fluidMotion = fluidMotionEnabled;
        this.updateState(animationsEnabled);
    },

    /**
     * Updates the global motion state and applies CSS hooks
     * @param {boolean} enabled 
     */
    updateState(enabled) {
        this.enabled = enabled;
        const appRoot = document.querySelector('.bubble-contact-app');
        if (appRoot) {
            if (!this.enabled) {
                appRoot.classList.add('motion-disabled');
            } else {
                appRoot.classList.remove('motion-disabled');
            }

            // Fluid Motion — shape morphing
            if (this.enabled && this.fluidMotion) {
                appRoot.classList.add('fluid-motion-active');
            } else {
                appRoot.classList.remove('fluid-motion-active');
            }
        }
    },

    /**
     * Performs a smart transition. 
     * Snaps instantly if animations are disabled, otherwise uses Web Animation API.
     * @param {HTMLElement} el - Element to animate
     * @param {Object} keyframes - WAAPI Keyframes
     * @param {Object} options - Timing and easing options
     * @returns {Promise} Resolves when animation is done
     */
    async animate(el, keyframes, options = {}) {
        const {
            duration = this.fluidMotion ? 500 : 300,
            easing = this.fluidMotion ? 'cubic-bezier(0.4, 0, 0.2, 1)' : 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            fill = 'forwards'
        } = options;

        if (!this.enabled || !el) {
            // Instant Snap Logic
            // If keyframes is an array, we take the last frame
            const lastFrame = Array.isArray(keyframes) ? keyframes[keyframes.length - 1] : keyframes;

            // Apply styles directly
            Object.entries(lastFrame).forEach(([prop, value]) => {
                // Handle properties that WAAPI treats as objects or special strings
                el.style[prop] = value;
            });

            return Promise.resolve();
        }

        // Return the animation promise
        try {
            const animation = el.animate(keyframes, {
                duration,
                easing,
                fill
            });
            return animation.finished;
        } catch (e) {
            console.error('[MOTION] Animation failed, snapping to final state:', e);
            // Fallback: Snap to last frame
            const lastFrame = Array.isArray(keyframes) ? keyframes[keyframes.length - 1] : keyframes;
            Object.assign(el.style, lastFrame);
            return Promise.resolve();
        }
    }
};
