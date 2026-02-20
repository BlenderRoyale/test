/**
 * Bubble Engine
 * Handles rendering and managing DOM-based physics bubbles with gooey layers.
 */
export default class BubbleEngine {
    constructor(container, onMerge, onGroupDoubleClick, onContactDoubleClick, checkGroupMembership, onCogClick, onPositionChange) {
        this.container = container;
        this.bubbles = [];
        this.onMerge = onMerge;
        this.onGroupDoubleClick = onGroupDoubleClick;
        this.onContactDoubleClick = onContactDoubleClick;
        this.checkGroupMembership = checkGroupMembership;
        this.onCogClick = onCogClick;
        this.onPositionChange = onPositionChange;

        // Inject SVG Filter and Layers
        this.container.innerHTML = `
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

        this.gooeyLayer = this.container.querySelector('.bc-gooey-layer');
        this.uiLayer = this.container.querySelector('.bc-ui-layer');
    }

    clear() {
        this.gooeyLayer.innerHTML = '';
        this.uiLayer.innerHTML = '';
        this.bubbles = [];
    }

    /**
     * Returns a Set of all bubble IDs currently in the engine
     */
    getBubbleIds() {
        return new Set(this.bubbles.map(b => b.id).filter(Boolean));
    }

    getPositions() {
        const positions = {};
        this.bubbles.forEach(b => {
            if (b.id) {
                const rawLeft = b.el.style.left;
                const rawTop = b.el.style.top;
                positions[b.id] = {
                    x: parseFloat(rawLeft) || 0,
                    y: parseFloat(rawTop) || 0
                };
                console.log('[Engine] getPositions:', b.id, '→ left:', rawLeft, 'top:', rawTop, '→', positions[b.id].x.toFixed(1), positions[b.id].y.toFixed(1));
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
        uiCircle.style.background = color;
        uiCircle.style.borderColor = color === '#FFFFFF' ? '#8F9098' : color;

        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'bc-group-thumbnails';
        uiCircle.appendChild(thumbContainer);
        uiNode.appendChild(uiCircle);

        let cogBubble = null;
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
        gooCircle.style.background = color;
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
            thumbContainer: thumbContainer,
            groupLabel: groupLabel,
            type: 'group',
            name: name,
            id: id,
            size: calculatedSize
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

        // Render thumbnails
        groupContacts.forEach(c => {
            const thumb = document.createElement('div');
            thumb.className = 'bc-mini-thumbnail';
            thumb.style.background = c.color;
            thumb.textContent = c.initials;
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
        uiCircle.style.background = contact.color;
        uiCircle.textContent = contact.initials;

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
            contact: contact
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

        console.log('[Engine] scatterContacts: container rect =', width, 'x', height, '| contacts:', contacts.length, '| savedPositions keys:', Object.keys(savedPositions));

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;

        contacts.forEach((contact, i) => {
            if (savedPositions[contact.id]) {
                console.log('[Engine]   → contact', contact.id, contact.initials, 'RESTORED to', savedPositions[contact.id].x.toFixed(1), savedPositions[contact.id].y.toFixed(1));
                this.addContactBubble(contact, savedPositions[contact.id].x, savedPositions[contact.id].y, noAnimate);
                return;
            }

            console.log('[Engine]   → contact', contact.id, contact.initials, 'NO saved position, scattering fresh');
            const angle = (i / contacts.length) * Math.PI * 2;
            const jitterX = (Math.random() - 0.5) * 40;
            const jitterY = (Math.random() - 0.5) * 40;

            // X/Y are exactly the center anchor
            const x = centerX + Math.cos(angle) * radius + jitterX;
            const y = centerY + Math.sin(angle) * radius + jitterY;

            this.addContactBubble(contact, x, y);
        });
    }

    checkOverlap(el1, el2) {
        // Compare the 0x0 center points
        const c1x = parseFloat(el1.style.left) || 0;
        const c1y = parseFloat(el1.style.top) || 0;
        const c2x = parseFloat(el2.style.left) || 0;
        const c2y = parseFloat(el2.style.top) || 0;

        const dist = Math.hypot(c2x - c1x, c2y - c1y);
        // Distance threshold for snapping the goo bridge
        return dist < 85;
    }

    makeDraggable(bubbleData) {
        const el = bubbleData.el;
        const gooEl = bubbleData.gooEl;
        let isDragging = false;
        let pX = 0, pY = 0;
        let hoveredGroup = null;

        const onPointerDown = (e) => {
            isDragging = true;
            pX = e.clientX;
            pY = e.clientY;
            el.setPointerCapture(e.pointerId);
            el.style.zIndex = 100;

            el.style.transform = 'scale(1.1)';
            el.style.transition = 'none';
            gooEl.style.transform = 'scale(1.1)';
            gooEl.style.transition = 'none';
        };

        const onPointerMove = (e) => {
            if (!isDragging) return;

            const dx = e.clientX - pX;
            const dy = e.clientY - pY;
            pX = e.clientX;
            pY = e.clientY;

            const currentLeft = parseFloat(el.style.left) || 0;
            const currentTop = parseFloat(el.style.top) || 0;

            const rect = this.container.getBoundingClientRect();
            // Restrict anchor point to container boundary
            const newLeft = Math.max(40, Math.min(rect.width - 40, currentLeft + dx));
            const newTop = Math.max(40, Math.min(rect.height - 40, currentTop + dy));

            el.style.left = `${newLeft}px`;
            el.style.top = `${newTop}px`;
            gooEl.style.left = `${newLeft}px`;
            gooEl.style.top = `${newTop}px`;

            if (bubbleData.type === 'contact') {
                let currentHover = null;
                const groups = this.bubbles.filter(b => b.type === 'group');

                for (const group of groups) {
                    if (this.checkOverlap(el, group.el)) {
                        currentHover = group;
                        break;
                    }
                }

                if (hoveredGroup && hoveredGroup !== currentHover) {
                    hoveredGroup.uiCircle.classList.remove('bc-group-hover');
                    hoveredGroup.uiCircle.classList.remove('bc-group-error-hover');
                }

                if (currentHover) {
                    // Check if contact is already in this group
                    let alreadyInGroup = false;
                    if (this.checkGroupMembership) {
                        alreadyInGroup = this.checkGroupMembership(currentHover.name, bubbleData.contact.id);
                    }

                    if (alreadyInGroup) {
                        currentHover.uiCircle.classList.add('bc-group-error-hover');
                    } else {
                        currentHover.uiCircle.classList.add('bc-group-hover');
                    }
                }
                hoveredGroup = currentHover;
            }
        };

        const onPointerUp = (e) => {
            isDragging = false;
            el.releasePointerCapture(e.pointerId);

            el.style.zIndex = 10;
            el.style.transform = 'scale(1)';
            el.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            gooEl.style.transform = 'scale(1)';
            gooEl.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

            if (bubbleData.type === 'contact' && hoveredGroup) {
                // Check if contact is already in group
                let alreadyInGroup = false;
                if (this.checkGroupMembership) {
                    alreadyInGroup = this.checkGroupMembership(hoveredGroup.name, bubbleData.contact.id);
                }

                hoveredGroup.uiCircle.classList.remove('bc-group-hover');
                hoveredGroup.uiCircle.classList.remove('bc-group-error-hover');

                if (!alreadyInGroup) {
                    hoveredGroup.size += 15;
                    const newSize = hoveredGroup.size;

                    // Animate volume increase
                    hoveredGroup.uiCircle.style.width = `${newSize}px`;
                    hoveredGroup.uiCircle.style.height = `${newSize}px`;
                    hoveredGroup.gooCircle.style.width = `${newSize}px`;
                    hoveredGroup.gooCircle.style.height = `${newSize}px`;

                    // Shift label down
                    if (hoveredGroup.groupLabel) {
                        hoveredGroup.groupLabel.style.top = `${(newSize / 2) + 8}px`;
                    }

                    // Add contact visual thumbnail inside group bubble
                    if (hoveredGroup.thumbContainer && bubbleData.contact) {
                        const thumb = document.createElement('div');
                        thumb.className = 'bc-mini-thumbnail';
                        thumb.style.background = bubbleData.contact.color;
                        thumb.textContent = bubbleData.contact.initials;
                        hoveredGroup.thumbContainer.appendChild(thumb);
                    }

                    // Notify application state
                    if (this.onMerge) {
                        this.onMerge(hoveredGroup.name, bubbleData.contact);
                    }
                } else {
                    // Wiggle warning for duplicate
                    hoveredGroup.uiCircle.classList.add('bc-group-error-hover');
                    const errGroup = hoveredGroup;
                    setTimeout(() => {
                        if (errGroup && errGroup.uiCircle) {
                            errGroup.uiCircle.classList.remove('bc-group-error-hover');
                        }
                    }, 400);
                }

                // Bounce back effect instead of destroying node
                // Pick a new random nearby location
                const bounceX = (Math.random() - 0.5) * 200;
                const bounceY = (Math.random() - 0.5) * 200;

                const currentLeft = parseFloat(el.style.left) || 0;
                const currentTop = parseFloat(el.style.top) || 0;

                const rect = this.container.getBoundingClientRect();
                const newLeft = Math.max(40, Math.min(rect.width - 40, currentLeft + bounceX));
                const newTop = Math.max(40, Math.min(rect.height - 40, currentTop + bounceY));

                el.style.transition = 'left 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                gooEl.style.transition = 'left 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

                el.style.left = `${newLeft}px`;
                el.style.top = `${newTop}px`;
                gooEl.style.left = `${newLeft}px`;
                gooEl.style.top = `${newTop}px`;

                if (this.onPositionChange) {
                    this.onPositionChange(bubbleData.type, bubbleData.id, newLeft, newTop);
                }

                hoveredGroup = null;
            } else {
                // Not merged, just regular move
                if (this.onPositionChange) {
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
}
