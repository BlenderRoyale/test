import { Motion } from './animation.js';

/**
 * Bubble Engine
 * Handles rendering and managing DOM-based physics bubbles with gooey layers.
 */
export default class BubbleEngine {
    constructor(container, onMerge, onGroupDoubleClick, onContactDoubleClick, checkGroupMembership, onCogClick, onPositionChange, onDebug) {
        this.container = container;
        this.bubbles = [];
        this.onMerge = onMerge;
        this.onGroupDoubleClick = onGroupDoubleClick;
        this.onContactDoubleClick = onContactDoubleClick;
        this.checkGroupMembership = checkGroupMembership;
        this.onCogClick = onCogClick;
        this.onPositionChange = onPositionChange;
        this.onDebug = onDebug;

        // Inject SVG Filter and Layers
        // Create SVG Filter
        const svgHTML = `
            <svg style="position: absolute; width: 0; height: 0; pointer-events: none;" xmlns="http://www.w3.org/2000/svg" version="1.1">
              <defs>
                <filter id="bc-goo" color-interpolation-filters="sRGB">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                  <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
                  <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
                </filter>
              </defs>
            </svg>
            <div class="bc-gooey-layer" style="position: absolute; inset: 0; filter: url('#bc-goo'); pointer-events: none;"></div>
            <div class="bc-ui-layer" style="position: absolute; inset: 0;"></div>
        `;

        // Use insertAdjacentHTML to avoid blowing away existing bg-particles container
        if (!document.getElementById('bc-goo-filter-svg')) {
            const svgHTML = `
                <svg id="bc-goo-filter-svg" style="position: absolute; width: 0; height: 0; pointer-events: none;" xmlns="http://www.w3.org/2000/svg" version="1.1">
                  <defs>
                    <filter id="bc-goo" color-interpolation-filters="sRGB">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                      <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
                      <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
                    </filter>
                  </defs>
                </svg>
            `;
            this.container.insertAdjacentHTML('beforeend', svgHTML);
        }

        const layersHTML = `
            <div class="bc-gooey-layer" style="position: absolute; inset: 0; filter: url('#bc-goo'); pointer-events: none;"></div>
            <div class="bc-ui-layer" style="position: absolute; inset: 0;"></div>
        `;
        this.container.insertAdjacentHTML('beforeend', layersHTML);

        this.gooeyLayer = this.container.querySelector('.bc-gooey-layer');
        this.uiLayer = this.container.querySelector('.bc-ui-layer');

        // Ambient Motion State
        this.driftX = 0;
        this.driftY = 0;
        this.driftTime = 0;
        this.isFloating = false;
        this.floatRequestId = null;

        this.startFloating();
    }

    destroy() {
        this.stopFloating();
        if (this.gooeyLayer) this.gooeyLayer.remove();
        if (this.uiLayer) this.uiLayer.remove();
        this.bubbles = [];
    }

    clear() {
        this.stopFloating();
        if (this.gooeyLayer) this.gooeyLayer.innerHTML = '';
        if (this.uiLayer) this.uiLayer.innerHTML = '';
        this.bubbles = [];
        this.startFloating();
    }

    getPositions() {
        const positions = {};
        this.bubbles.forEach(b => {
            if (b.id) {
                const x = parseFloat(b.el.style.left);
                const y = parseFloat(b.el.style.top);
                positions[b.id] = {
                    x: x || 0,
                    y: y || 0
                };
            }
        });
        return positions;
    }

    /**
     * Creates a new group bubble
     */
    addGroupBubble(name, id, groupContacts = [], color = '#4c1d95', isFocusedGroup = false, startX, startY, noAnimate = false) {
        // UI Node (draggable)
        const uiNode = document.createElement('div');
        uiNode.className = 'bc-physics-node';
        uiNode.style.position = 'absolute';
        if (noAnimate) {
            uiNode.style.animation = 'none';
            uiNode.style.transform = 'scale(1)';
            uiNode.style.opacity = '1';
        }

        const uiCircle = document.createElement('div');
        uiCircle.className = 'bc-visual-circle bc-node-group-ui';
        uiCircle.title = name;

        // Dynamic group coloring
        if (color === 'transparent') {
            uiCircle.style.background = 'var(--bc-color-trans)';
            uiCircle.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            uiCircle.style.backdropFilter = 'blur(4px)';
        } else {
            uiCircle.style.background = color;
            uiCircle.style.borderColor = color === '#FFFFFF' ? '#8F9098' : color;
        }
        uiCircle.style.animationDelay = `${-Math.random() * 8}s`;
        uiCircle.style.animationDuration = `${7 + Math.random() * 3}s`;

        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'bc-group-thumbnails';
        uiCircle.appendChild(thumbContainer);
        uiNode.appendChild(uiCircle);

        let cogBubble = null;
        let indicatorEl = null;
        if (isFocusedGroup) {
            cogBubble = document.createElement('div');
            cogBubble.className = 'bc-visual-circle bc-node-group-cog';
            cogBubble.style.width = '48px';
            cogBubble.style.height = '48px';
            cogBubble.style.background = color;
            cogBubble.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            cogBubble.style.display = 'flex';
            cogBubble.style.alignItems = 'center';
            cogBubble.style.justifyContent = 'center';
            cogBubble.style.cursor = 'pointer';
            cogBubble.style.zIndex = '10';
            cogBubble.title = 'Edit Group';
            cogBubble.innerHTML = '<svg width="24" height="24" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"></path></svg>';
            cogBubble.style.transition = 'transform 0.1s';
            cogBubble.onmouseenter = () => cogBubble.style.transform = 'translate(-50%, -50%) scale(1.1)';
            cogBubble.onmouseleave = () => cogBubble.style.transform = 'translate(-50%, -50%) scale(1)';

            cogBubble.onpointerdown = (e) => e.stopPropagation();
            cogBubble.onclick = (e) => {
                e.stopPropagation();
                if (this.onCogClick) {
                    this.onCogClick(name);
                }
            };
            uiNode.appendChild(cogBubble);
        } else {
            // Group indicator cluster — "enter group" bubble with two small decorative dots
            indicatorEl = document.createElement('div');
            indicatorEl.className = 'bc-group-indicator-cluster';

            // Main indicator circle with bubble icon
            const mainDot = document.createElement('div');
            mainDot.className = 'bc-visual-circle bc-node-group-indicator';
            mainDot.style.background = color;
            mainDot.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>';
            mainDot.style.cursor = 'pointer';
            mainDot.title = 'Open Group';
            mainDot.onpointerdown = (e) => e.stopPropagation();
            mainDot.onclick = (e) => {
                e.stopPropagation();
                if (this.onGroupDoubleClick) {
                    this.onGroupDoubleClick(name);
                }
            };
            indicatorEl.appendChild(mainDot);

            // Small decorative dot 1 (top-right of indicator)
            const dot1 = document.createElement('div');
            dot1.className = 'bc-indicator-dot bc-indicator-dot-1';
            dot1.style.background = color;
            indicatorEl.appendChild(dot1);

            // Small decorative dot 2 (above dot 1, smaller)
            const dot2 = document.createElement('div');
            dot2.className = 'bc-indicator-dot bc-indicator-dot-2';
            dot2.style.background = color;
            indicatorEl.appendChild(dot2);

            uiNode.appendChild(indicatorEl);
        }

        const groupLabel = document.createElement('div');
        groupLabel.className = 'bc-node-group-label';
        groupLabel.textContent = name;
        uiNode.appendChild(groupLabel);

        // Gooey Node (proxy for liquid effect)
        const gooNode = document.createElement('div');
        gooNode.className = 'bc-physics-node';
        if (noAnimate) {
            gooNode.style.animation = 'none';
            gooNode.style.transform = 'scale(1)';
            gooNode.style.opacity = '1';
        }
        const gooCircle = document.createElement('div');
        gooCircle.className = 'bc-visual-circle bc-node-group-goo';
        gooCircle.style.background = color === 'transparent' ? 'rgba(255, 255, 255, 0.1)' : color;
        gooCircle.style.animationDelay = uiCircle.style.animationDelay;
        gooCircle.style.animationDuration = uiCircle.style.animationDuration;
        gooNode.appendChild(gooCircle);

        // Calculate center position or use provided
        const rect = this.container.getBoundingClientRect();
        const fallbackW = rect.width > 0 ? rect.width : 800;
        const fallbackH = rect.height > 0 ? rect.height : 600;

        const finalX = (startX !== undefined && startX !== null) ? startX : (fallbackW / 2);
        const finalY = (startY !== undefined && startY !== null) ? startY : (fallbackH / 2);

        uiNode.style.left = `${finalX}px`;
        uiNode.style.top = `${finalY}px`;
        gooNode.style.left = `${finalX}px`;
        gooNode.style.top = `${finalY}px`;

        this.uiLayer.appendChild(uiNode);
        this.gooeyLayer.appendChild(gooNode);

        const calculatedSize = 80 + (groupContacts.length * 15);

        const bubbleData = {
            el: uiNode,
            uiCircle: uiCircle,
            gooEl: gooNode,
            gooCircle: gooCircle,
            indicatorEl: indicatorEl,
            thumbContainer: thumbContainer,
            groupLabel: groupLabel,
            type: 'group',
            name: name,
            id: id,
            size: calculatedSize,
            // Random float parameters
            floatX: Math.random() * 1000,
            floatY: Math.random() * 1000,
            floatSpeed: 0.001 + (Math.random() * 0.001)
        };
        this.bubbles.push(bubbleData);

        // Set dynamic size based on existing contacts
        uiCircle.style.width = `${calculatedSize}px`;
        uiCircle.style.height = `${calculatedSize}px`;
        gooCircle.style.width = `${calculatedSize}px`;
        gooCircle.style.height = `${calculatedSize}px`;
        groupLabel.style.top = `${(calculatedSize / 2) + 8}px`;

        if (cogBubble) {
            const radius = calculatedSize / 2;
            const offset = radius * 0.707; // 45 degrees edge
            cogBubble.style.top = `-${offset}px`;
            cogBubble.style.left = `${offset}px`;
        }

        if (indicatorEl) {
            const radius = calculatedSize / 2;
            const distance = radius + 6; // Push it further out
            const offset = distance * 0.707;
            indicatorEl.style.top = `-${offset}px`;
            indicatorEl.style.left = `${offset}px`;
        }

        // Render thumbnails — scatter inside circle
        groupContacts.forEach((c, i) => {
            const thumb = document.createElement('div');
            thumb.className = 'bc-mini-thumbnail';
            if (c.color === 'transparent') {
                thumb.style.background = 'var(--bc-color-trans)';
                thumb.style.border = '1px solid rgba(255, 255, 255, 0.2)';
            } else {
                thumb.style.background = c.color;
                thumb.style.border = '1px solid rgba(255,255,255,0.1)';
            }
            thumb.textContent = c.initials;

            // Scatter within circle — evenly spaced angles with jitter
            const angle = (i / Math.max(groupContacts.length, 1)) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const radius = 15 + Math.random() * 20; // 15-35% from center
            thumb.style.left = `${50 + Math.cos(angle) * radius}%`;
            thumb.style.top = `${50 + Math.sin(angle) * radius}%`;

            thumbContainer.appendChild(thumb);
        });

        // Bind double click
        uiNode.ondblclick = () => {
            if (this.onGroupDoubleClick) {
                this.onGroupDoubleClick(name);
            }
        };

        this.makeDraggable(bubbleData);
        return bubbleData;
    }

    /**
     * Creates a contact bubble.
     */
    addContactBubble(contact, startX, startY, noAnimate = false) {
        // UI Node
        const uiNode = document.createElement('div');
        uiNode.className = 'bc-physics-node';
        if (noAnimate) {
            uiNode.style.animation = 'none';
            uiNode.style.transform = 'scale(1)';
            uiNode.style.opacity = '1';
        }

        const uiCircle = document.createElement('div');
        uiCircle.className = 'bc-visual-circle bc-node-contact-circle';
        if (contact.color === 'transparent') {
            uiCircle.style.background = 'var(--bc-color-trans)';
            uiCircle.style.border = '1px solid rgba(255, 255, 255, 0.4)';
            uiCircle.style.backdropFilter = 'blur(4px)';
        } else {
            uiCircle.style.background = contact.color;
        }
        uiCircle.textContent = contact.initials;
        uiCircle.style.animationDelay = `${-Math.random() * 8}s`;
        uiCircle.style.animationDuration = `${7 + Math.random() * 3}s`;

        const label = document.createElement('div');
        label.className = 'bc-node-contact-label';
        label.textContent = contact.first;

        uiNode.appendChild(uiCircle);
        uiNode.appendChild(label);

        // Goo Node
        const gooNode = document.createElement('div');
        gooNode.className = 'bc-physics-node';
        if (noAnimate) {
            gooNode.style.animation = 'none';
            gooNode.style.transform = 'scale(1)';
            gooNode.style.opacity = '1';
        }

        const gooCircle = document.createElement('div');
        gooCircle.className = 'bc-visual-circle bc-node-contact-goo';
        gooCircle.style.background = contact.color;
        gooCircle.style.animationDelay = uiCircle.style.animationDelay;
        gooCircle.style.animationDuration = uiCircle.style.animationDuration;
        gooNode.appendChild(gooCircle);

        const rect = this.container.getBoundingClientRect();
        const fallbackW = rect.width > 0 ? rect.width : 800;
        const fallbackH = rect.height > 0 ? rect.height : 600;

        const finalX = (startX !== undefined && startX !== null) ? startX : (fallbackW / 2);
        const finalY = (startY !== undefined && startY !== null) ? startY : (fallbackH / 2);

        uiNode.style.left = `${finalX}px`;
        uiNode.style.top = `${finalY}px`;
        gooNode.style.left = `${finalX}px`;
        gooNode.style.top = `${finalY}px`;

        this.uiLayer.appendChild(uiNode);
        this.gooeyLayer.appendChild(gooNode);

        const nodeData = {
            el: uiNode,
            uiCircle: uiCircle,
            gooEl: gooNode,
            gooCircle: gooCircle,
            type: 'contact',
            id: contact.id,
            contact: contact,
            // Random float parameters
            floatX: Math.random() * 1000,
            floatY: Math.random() * 1000,
            floatSpeed: 0.001 + (Math.random() * 0.002)
        };
        this.bubbles.push(nodeData);

        // Bind double click
        uiNode.ondblclick = () => {
            if (this.onContactDoubleClick) {
                this.onContactDoubleClick(contact);
            }
        };

        this.makeDraggable(nodeData);
        return nodeData;
    }

    /**
     * Scatters a list of contacts in a circular pattern
     */
    scatterContacts(contacts, savedPositions = {}, noAnimate = false) {
        let rect = this.container.getBoundingClientRect();
        const width = rect.width > 0 ? rect.width : 640;
        const height = rect.height > 0 ? rect.height : 600;

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;

        contacts.forEach((contact, i) => {
            const saved = savedPositions[contact.id];
            if (saved) {
                this.addContactBubble(contact, saved.x, saved.y, noAnimate);
                return;
            }

            const angle = (i / contacts.length) * Math.PI * 2;
            const jitterX = (Math.random() - 0.5) * 40;
            const jitterY = (Math.random() - 0.5) * 40;

            const x = centerX + Math.cos(angle) * radius + jitterX;
            const y = centerY + Math.sin(angle) * radius + jitterY;

            this.addContactBubble(contact, x, y);
        });
    }

    checkOverlap(bubble1, bubble2) {
        // Use getBoundingClientRect to account for float drift transforms
        const r1 = bubble1.uiCircle.getBoundingClientRect();
        const r2 = bubble2.uiCircle.getBoundingClientRect();

        const c1x = r1.left + r1.width / 2;
        const c1y = r1.top + r1.height / 2;
        const c2x = r2.left + r2.width / 2;
        const c2y = r2.top + r2.height / 2;

        const dist = Math.hypot(c2x - c1x, c2y - c1y);
        const radius1 = r1.width / 2;
        const radius2 = r2.width / 2;

        return dist < (radius1 + radius2);
    }

    makeDraggable(bubbleData) {
        const el = bubbleData.el;
        const gooEl = bubbleData.gooEl;
        let isDragging = false;
        let pX = 0, pY = 0;
        let hoveredGroup = null;
        let lastTime = 0;
        let vX = 0, vY = 0;

        const onPointerDown = (e) => {
            isDragging = true;
            pX = e.clientX;
            pY = e.clientY;
            lastTime = performance.now();
            vX = 0; vY = 0;
            el.setPointerCapture(e.pointerId);
            el.style.zIndex = 100;

            // Dispatch drag start for SFX
            document.dispatchEvent(new CustomEvent('bubbledragstart'));
            this._lastSlimeTime = 0;

            // Dramatic squish pickup — overshoot then settle
            const circle = bubbleData.uiCircle;
            const goo = bubbleData.gooCircle;
            circle.style.transition = 'none';
            goo.style.transition = 'none';

            // Cancel any running jelly CSS animation during drag
            circle.style.animation = 'none';
            goo.style.animation = 'none';

            // Kill any leftover WAAPI animations from previous drag/release
            circle.getAnimations().forEach(a => a.cancel());
            goo.getAnimations().forEach(a => a.cancel());

            // Squish overshoot: scale up fast, then hand off to inline styles
            const pickupAnim1 = circle.animate(
                [
                    { transform: 'translate(-50%, -50%) scale(1)' },
                    { transform: 'translate(-50%, -50%) scale(1.25)' },
                    { transform: 'translate(-50%, -50%) scale(1.12)' }
                ],
                { duration: 300, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
            );
            const pickupAnim2 = goo.animate(
                [
                    { transform: 'translate(-50%, -50%) scale(1)' },
                    { transform: 'translate(-50%, -50%) scale(1.25)' },
                    { transform: 'translate(-50%, -50%) scale(1.12)' }
                ],
                { duration: 300, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
            );
            // After overshoot finishes, set inline style so squash/stretch can take over
            pickupAnim1.onfinish = () => { circle.style.transform = 'translate(-50%, -50%) scale(1.12)'; };
            pickupAnim2.onfinish = () => { goo.style.transform = 'translate(-50%, -50%) scale(1.12)'; };
        };

        let smoothVx = 0, smoothVy = 0;

        const onPointerMove = (e) => {
            if (!isDragging) return;

            const now = performance.now();
            const dt = Math.max(1, now - lastTime);
            const dx = e.clientX - pX;
            const dy = e.clientY - pY;

            // Throttled drag move SFX event (every 400ms)
            const speed = Math.hypot(dx, dy);
            if (speed > 3 && now - (this._lastSlimeTime || 0) > 400) {
                this._lastSlimeTime = now;
                document.dispatchEvent(new CustomEvent('bubbledragmove'));
            }

            // Track raw velocity
            vX = dx / dt;
            vY = dy / dt;

            // Smooth velocity — lags behind like water sloshing
            const lerp = 0.15;
            smoothVx += (vX - smoothVx) * lerp;
            smoothVy += (vY - smoothVy) * lerp;

            pX = e.clientX;
            pY = e.clientY;
            lastTime = now;

            const currentLeft = parseFloat(el.style.left) || 0;
            const currentTop = parseFloat(el.style.top) || 0;

            const rect = this.container.getBoundingClientRect();
            const fallbackW = rect.width > 0 ? rect.width : 800;
            const fallbackH = rect.height > 0 ? rect.height : 600;

            const newLeft = Math.max(40, Math.min(fallbackW - 40, currentLeft + dx));
            const newTop = Math.max(40, Math.min(fallbackH - 40, currentTop + dy));

            el.style.left = `${newLeft}px`;
            el.style.top = `${newTop}px`;
            gooEl.style.left = `${newLeft}px`;
            gooEl.style.top = `${newTop}px`;

            // Squash & stretch — water balloon effect
            if (Motion.enabled && Motion.fluidMotion) {
                const speed = Math.sqrt(smoothVx * smoothVx + smoothVy * smoothVy);
                const stretch = Math.min(speed * 0.25, 0.35);
                const angle = Math.atan2(smoothVy, smoothVx);

                // Pickup base scale + directional stretch
                const scaleX = 1.12 + stretch;
                const scaleY = 1.12 - stretch * 0.7;

                const transform = `translate(-50%, -50%) rotate(${angle}rad) scale(${scaleX}, ${scaleY})`;
                bubbleData.uiCircle.style.transform = transform;
                bubbleData.gooCircle.style.transform = transform;

                // Edge morph — faster = more blobby
                const morph = Math.min(speed * 18, 14);
                const br = `${50 - morph}% ${50 + morph}% ${50 - morph * 0.6}% ${50 + morph * 0.6}% / ${50 + morph * 0.7}% ${50 - morph}% ${50 + morph}% ${50 - morph * 0.7}%`;
                bubbleData.uiCircle.style.borderRadius = br;
                bubbleData.gooCircle.style.borderRadius = br;
            }

            // Pin zone detection — near left edge of canvas
            const nearLeftEdge = newLeft < 60;
            const secSidebar = this.container.parentElement?.querySelector('.bc-secondary-sidebar');
            if (secSidebar) {
                if (nearLeftEdge) {
                    const bubbleColor = bubbleData.contact?.color || bubbleData.uiCircle?.style.background || 'var(--bc-accent)';
                    const alreadyPinned = this.isQuickPinned ? this.isQuickPinned(bubbleData.id || bubbleData.contact?.id) : false;

                    if (Motion.enabled) {
                        // Animations ON: wiggle
                        if (!secSidebar.classList.contains('bc-sidebar-wiggle')) {
                            secSidebar.classList.add('bc-sidebar-wiggle');
                        }
                    } else {
                        // Animations OFF: border color change
                        secSidebar.style.borderRightColor = bubbleColor;
                        if (alreadyPinned && !secSidebar.classList.contains('bc-sidebar-border-flash')) {
                            secSidebar.classList.add('bc-sidebar-border-flash');
                        }
                    }
                } else {
                    secSidebar.classList.remove('bc-sidebar-wiggle');
                    secSidebar.classList.remove('bc-sidebar-border-flash');
                    secSidebar.style.borderRightColor = '';
                }
            }
            bubbleData._inPinZone = nearLeftEdge;

            if (bubbleData.type === 'contact') {
                let currentHover = null;
                const groups = this.bubbles.filter(b => b.type === 'group');

                for (const group of groups) {
                    if (this.checkOverlap(bubbleData, group)) {
                        currentHover = group;
                        break;
                    }
                }

                if (hoveredGroup && hoveredGroup !== currentHover) {
                    hoveredGroup.uiCircle.classList.remove('bc-group-hover');
                    hoveredGroup.uiCircle.classList.remove('bc-group-error-hover');
                    if (hoveredGroup.gooCircle) {
                        hoveredGroup.gooCircle.classList.remove('bc-group-hover');
                        hoveredGroup.gooCircle.classList.remove('bc-group-error-hover');
                    }
                }

                if (currentHover) {
                    let alreadyInGroup = false;
                    if (this.checkGroupMembership) {
                        alreadyInGroup = this.checkGroupMembership(currentHover.name, bubbleData.contact.id);
                    }

                    if (alreadyInGroup) {
                        currentHover.uiCircle.classList.add('bc-group-error-hover');
                        if (currentHover.gooCircle) currentHover.gooCircle.classList.add('bc-group-error-hover');
                    } else {
                        currentHover.uiCircle.classList.add('bc-group-hover');
                        if (currentHover.gooCircle) currentHover.gooCircle.classList.add('bc-group-hover');
                    }
                }
                hoveredGroup = currentHover;
            }
        };

        const onPointerUp = (e) => {
            if (!isDragging) return;
            isDragging = false;
            el.releasePointerCapture(e.pointerId);
            el.style.zIndex = 10;
            document.dispatchEvent(new CustomEvent('bubbledragend'));

            // Elastic wobble spring-back — multiple oscillations
            Motion.animate(bubbleData.uiCircle,
                [
                    { transform: bubbleData.uiCircle.style.transform || 'translate(-50%, -50%) scale(1.12)', borderRadius: bubbleData.uiCircle.style.borderRadius || '50%', offset: 0 },
                    { transform: 'translate(-50%, -50%) scale(0.92)', borderRadius: '55% 45% 48% 52% / 48% 52% 45% 55%', offset: 0.2 },
                    { transform: 'translate(-50%, -50%) scale(1.06)', borderRadius: '46% 54% 52% 48% / 52% 48% 54% 46%', offset: 0.45 },
                    { transform: 'translate(-50%, -50%) scale(0.97)', borderRadius: '52% 48% 50% 50% / 50% 50% 48% 52%', offset: 0.7 },
                    { transform: 'translate(-50%, -50%) scale(1)', borderRadius: '50%', offset: 1 }
                ],
                { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
            );
            Motion.animate(bubbleData.gooCircle,
                [
                    { transform: bubbleData.gooCircle.style.transform || 'translate(-50%, -50%) scale(1.12)', borderRadius: bubbleData.gooCircle.style.borderRadius || '50%', offset: 0 },
                    { transform: 'translate(-50%, -50%) scale(0.92)', borderRadius: '55% 45% 48% 52% / 48% 52% 45% 55%', offset: 0.2 },
                    { transform: 'translate(-50%, -50%) scale(1.06)', borderRadius: '46% 54% 52% 48% / 52% 48% 54% 46%', offset: 0.45 },
                    { transform: 'translate(-50%, -50%) scale(0.97)', borderRadius: '52% 48% 50% 50% / 50% 50% 48% 52%', offset: 0.7 },
                    { transform: 'translate(-50%, -50%) scale(1)', borderRadius: '50%', offset: 1 }
                ],
                { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
            );

            // Restore jelly CSS animation after spring-back
            setTimeout(() => {
                bubbleData.uiCircle.style.animation = '';
                bubbleData.gooCircle.style.animation = '';
                bubbleData.uiCircle.style.borderRadius = '';
                bubbleData.gooCircle.style.borderRadius = '';
            }, 650);

            // Clear sidebar pin zone feedback
            const secSidebar = this.container.parentElement?.querySelector('.bc-secondary-sidebar');
            if (secSidebar) {
                secSidebar.classList.remove('bc-sidebar-wiggle');
                secSidebar.classList.remove('bc-sidebar-border-flash');
                secSidebar.style.borderRightColor = '';
            }

            // Quick Pin — dropped on sidebar edge
            if (bubbleData._inPinZone) {
                bubbleData._inPinZone = false;
                if (this.onQuickPin) {
                    this.onQuickPin(bubbleData);
                }
                // Snap bubble back to a safe position
                const rect = this.container.getBoundingClientRect();
                const safeX = 100 + Math.random() * 100;
                const safeY = (rect.height > 0 ? rect.height : 600) / 2 + (Math.random() - 0.5) * 100;
                el.style.left = `${safeX}px`;
                el.style.top = `${safeY}px`;
                gooEl.style.left = `${safeX}px`;
                gooEl.style.top = `${safeY}px`;
                if (this.onPositionChange) {
                    this.onPositionChange(bubbleData.type, bubbleData.id, safeX, safeY);
                }
                return;
            }

            if (bubbleData.type === 'contact' && hoveredGroup) {
                let alreadyInGroup = false;
                if (this.checkGroupMembership) {
                    alreadyInGroup = this.checkGroupMembership(hoveredGroup.name, bubbleData.contact.id);
                }

                hoveredGroup.uiCircle.classList.remove('bc-group-hover');
                hoveredGroup.uiCircle.classList.remove('bc-group-error-hover');
                if (hoveredGroup.gooCircle) {
                    hoveredGroup.gooCircle.classList.remove('bc-group-hover');
                    hoveredGroup.gooCircle.classList.remove('bc-group-error-hover');
                }

                if (!alreadyInGroup) {
                    hoveredGroup.size += 15;
                    const newSize = hoveredGroup.size;

                    // Inflate + pulse on accept
                    Motion.animate(hoveredGroup.uiCircle,
                        [
                            { width: hoveredGroup.uiCircle.style.width, height: hoveredGroup.uiCircle.style.height, offset: 0 },
                            { width: `${newSize + 20}px`, height: `${newSize + 20}px`, offset: 0.4 },
                            { width: `${newSize}px`, height: `${newSize}px`, offset: 1 }
                        ],
                        { duration: 500, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' }
                    );
                    Motion.animate(hoveredGroup.gooCircle,
                        [
                            { width: hoveredGroup.gooCircle.style.width, height: hoveredGroup.gooCircle.style.height, offset: 0 },
                            { width: `${newSize + 20}px`, height: `${newSize + 20}px`, offset: 0.4 },
                            { width: `${newSize}px`, height: `${newSize}px`, offset: 1 }
                        ],
                        { duration: 500, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' }
                    );

                    const radius = newSize / 2;
                    if (hoveredGroup.groupLabel) {
                        Motion.animate(hoveredGroup.groupLabel, { top: `${radius + 8}px` }, { duration: 400 });
                    }
                    if (hoveredGroup.indicatorEl) {
                        const distance = radius + 6;
                        const offset = distance * 0.707;
                        Motion.animate(hoveredGroup.indicatorEl, { top: `-${offset}px`, left: `${offset}px` }, { duration: 400 });
                    }

                    if (hoveredGroup.thumbContainer && bubbleData.contact) {
                        const thumb = document.createElement('div');
                        thumb.className = 'bc-mini-thumbnail';
                        thumb.style.background = bubbleData.contact.color;
                        thumb.textContent = bubbleData.contact.initials;

                        // Scatter within circle
                        const angle = Math.random() * Math.PI * 2;
                        const radius = 15 + Math.random() * 20;
                        thumb.style.left = `${50 + Math.cos(angle) * radius}%`;
                        thumb.style.top = `${50 + Math.sin(angle) * radius}%`;

                        hoveredGroup.thumbContainer.appendChild(thumb);
                    }

                    if (this.onMerge) {
                        this.onMerge(hoveredGroup.name, bubbleData.contact);
                    }
                }

                // Bounce contact away from group with inertia
                if (Motion.enabled) {
                    const bounceAngle = Math.random() * Math.PI * 2;
                    const bouncePower = 6 + Math.random() * 3;
                    this.throwBubble(bubbleData, Math.cos(bounceAngle) * bouncePower, Math.sin(bounceAngle) * bouncePower);
                }

                hoveredGroup = null;
            } else {
                // Inertia throw — continue moving with momentum (only when animations on)
                if (Motion.enabled) {
                    const throwVx = vX * 14;
                    const throwVy = vY * 14;
                    if (Math.abs(throwVx) > 1 || Math.abs(throwVy) > 1) {
                        this.throwBubble(bubbleData, throwVx, throwVy);
                    } else if (this.onPositionChange) {
                        const finalLeft = parseFloat(el.style.left) || 0;
                        const finalTop = parseFloat(el.style.top) || 0;
                        this.onPositionChange(bubbleData.type, bubbleData.id, finalLeft, finalTop);
                    }
                } else if (this.onPositionChange) {
                    const finalLeft = parseFloat(el.style.left) || 0;
                    const finalTop = parseFloat(el.style.top) || 0;
                    this.onPositionChange(bubbleData.type, bubbleData.id, finalLeft, finalTop);
                }
            }
        };

        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);
    }

    // Rubbery inertia throw with squash/stretch
    throwBubble(bubbleData, tvx, tvy) {
        const el = bubbleData.el;
        const gooEl = bubbleData.gooEl;
        const friction = 0.91; // Weighted slide — satisfying momentum

        const step = () => {
            tvx *= friction;
            tvy *= friction;

            const speed = Math.sqrt(tvx * tvx + tvy * tvy);

            if (speed < 0.3) {
                // Settle — clear any stretch
                if (Motion.fluidMotion) {
                    bubbleData.uiCircle.style.transform = 'translate(-50%, -50%) scale(1)';
                    bubbleData.gooCircle.style.transform = 'translate(-50%, -50%) scale(1)';
                    bubbleData.uiCircle.style.borderRadius = '';
                    bubbleData.gooCircle.style.borderRadius = '';
                }
                if (this.onPositionChange) {
                    this.onPositionChange(bubbleData.type, bubbleData.id,
                        parseFloat(el.style.left) || 0, parseFloat(el.style.top) || 0);
                }
                return;
            }

            let curL = parseFloat(el.style.left) || 0;
            let curT = parseFloat(el.style.top) || 0;

            const rect = this.container.getBoundingClientRect();
            const w = rect.width > 0 ? rect.width : 800;
            const h = rect.height > 0 ? rect.height : 600;

            let newL = curL + tvx;
            let newT = curT + tvy;

            // Wall bounce — satisfying thunk
            let bounced = false;
            if (newL < 40) { newL = 40; tvx *= -0.5; bounced = true; }
            if (newL > w - 40) { newL = w - 40; tvx *= -0.5; bounced = true; }
            if (newT < 40) { newT = 40; tvy *= -0.5; bounced = true; }
            if (newT > h - 40) { newT = h - 40; tvy *= -0.5; bounced = true; }
            if (bounced && speed > 2) {
                document.dispatchEvent(new CustomEvent('bubblebounce'));
            }

            el.style.left = `${newL}px`;
            el.style.top = `${newT}px`;
            gooEl.style.left = `${newL}px`;
            gooEl.style.top = `${newT}px`;

            // Squash & stretch the thrown bubble based on velocity
            if (Motion.fluidMotion) {
                const stretch = Math.min(speed * 0.015, 0.2);
                const angle = Math.atan2(tvy, tvx);
                const sx = 1 + stretch;
                const sy = 1 - stretch * 0.5;
                bubbleData.uiCircle.style.transform = `translate(-50%, -50%) rotate(${angle}rad) scale(${sx}, ${sy})`;
                bubbleData.gooCircle.style.transform = `translate(-50%, -50%) rotate(${angle}rad) scale(${sx}, ${sy})`;
            }

            // Soft collision — nudge other bubbles
            for (const other of this.bubbles) {
                if (other === bubbleData) continue;
                const ox = parseFloat(other.el.style.left) || 0;
                const oy = parseFloat(other.el.style.top) || 0;
                const dist = Math.hypot(newL - ox, newT - oy);
                const minDist = (bubbleData.size || 72) / 2 + (other.size || 72) / 2 + 10;

                if (dist < minDist && dist > 0) {
                    const pushAngle = Math.atan2(oy - newT, ox - newL);
                    const pushForce = (minDist - dist) * 0.3;
                    const px = Math.cos(pushAngle) * pushForce;
                    const py = Math.sin(pushAngle) * pushForce;

                    other.el.style.left = `${Math.max(40, Math.min(w - 40, ox + px))}px`;
                    other.el.style.top = `${Math.max(40, Math.min(h - 40, oy + py))}px`;
                    other.gooEl.style.left = other.el.style.left;
                    other.gooEl.style.top = other.el.style.top;

                    // Gentle wobble on hit
                    if (Motion.fluidMotion) {
                        Motion.animate(other.uiCircle,
                            [
                                { transform: 'translate(-50%, -50%) scale(1)', offset: 0 },
                                { transform: 'translate(-50%, -50%) scale(1.08)', offset: 0.35 },
                                { transform: 'translate(-50%, -50%) scale(0.96)', offset: 0.65 },
                                { transform: 'translate(-50%, -50%) scale(1)', offset: 1 }
                            ],
                            { duration: 500, easing: 'ease-out', fill: 'forwards' }
                        );
                    }
                }
            }

            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    startFloating() {
        if (this.isFloating) return;
        this.isFloating = true;
        this.floatLoop();
    }

    stopFloating() {
        this.isFloating = false;
        if (this.floatRequestId) {
            cancelAnimationFrame(this.floatRequestId);
            this.floatRequestId = null;
        }
        this.bubbles.forEach(b => {
            if (b.el) b.el.style.transform = 'translate(0, 0)';
            if (b.gooEl) b.gooEl.style.transform = 'translate(0, 0)';
        });
    }

    floatLoop() {
        if (!this.isFloating) return;

        if (Motion.enabled) {
            this.bubbles.forEach(b => {
                b.floatX += b.floatSpeed;
                b.floatY += b.floatSpeed * 0.85;

                const dx = (Math.sin(b.floatX) * 40) + (Math.sin(b.floatX * 0.45) * 15);
                const dy = (Math.cos(b.floatY) * 18) + (Math.sin(b.floatY * 0.35) * 8);

                if (b.el) b.el.style.transform = `translate(${dx}px, ${dy}px)`;
                if (b.gooEl) b.gooEl.style.transform = `translate(${dx}px, ${dy}px)`;
            });

            // Soft collision — gently push overlapping bubbles apart
            for (let i = 0; i < this.bubbles.length; i++) {
                for (let j = i + 1; j < this.bubbles.length; j++) {
                    const a = this.bubbles[i];
                    const b = this.bubbles[j];
                    const ax = parseFloat(a.el.style.left) || 0;
                    const ay = parseFloat(a.el.style.top) || 0;
                    const bx = parseFloat(b.el.style.left) || 0;
                    const by = parseFloat(b.el.style.top) || 0;
                    const dist = Math.hypot(bx - ax, by - ay);
                    const minDist = (a.size || 72) / 2 + (b.size || 72) / 2 + 5;

                    if (dist < minDist && dist > 0) {
                        const angle = Math.atan2(by - ay, bx - ax);
                        const push = (minDist - dist) * 0.05;

                        const rect = this.container.getBoundingClientRect();
                        const w = rect.width > 0 ? rect.width : 800;
                        const h = rect.height > 0 ? rect.height : 600;

                        a.el.style.left = `${Math.max(40, Math.min(w - 40, ax - Math.cos(angle) * push))}px`;
                        a.el.style.top = `${Math.max(40, Math.min(h - 40, ay - Math.sin(angle) * push))}px`;
                        a.gooEl.style.left = a.el.style.left;
                        a.gooEl.style.top = a.el.style.top;

                        b.el.style.left = `${Math.max(40, Math.min(w - 40, bx + Math.cos(angle) * push))}px`;
                        b.el.style.top = `${Math.max(40, Math.min(h - 40, by + Math.sin(angle) * push))}px`;
                        b.gooEl.style.left = b.el.style.left;
                        b.gooEl.style.top = b.el.style.top;
                    }
                }
            }
        } else {
            this.bubbles.forEach(b => {
                if (b.el) b.el.style.transform = 'translate(0, 0)';
                if (b.gooEl) b.gooEl.style.transform = 'translate(0, 0)';
            });
        }

        this.floatRequestId = requestAnimationFrame(() => this.floatLoop());
    }
}
