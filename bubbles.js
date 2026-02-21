import BubbleEngine from './bubble_engine.js';
import { Motion } from './animation.js';
import BackgroundParticles from './bg_particles.js';

class BubbleContactApp {
    constructor() {
        // Default Application State (Fallback)
        this.state = {
            contacts: [
                { id: "c1771640988867893", first: "Cool", last: "Worlds Podcast", initials: "CW", phone: "", email: "", color: "var(--bc-color-c)", socials: { twitter: "", linkedin: "", instagram: "", youtube: "https://www.youtube.com/@CoolWorldsPodcast", whatsapp: "", url: "" } },
                { id: "c177164090509222", first: "Event", last: "Horizon", initials: "EH", phone: "", email: "", color: "var(--bc-color-e)", socials: { twitter: "", linkedin: "", instagram: "", youtube: "https://www.youtube.com/@EventHorizonShow", whatsapp: "", url: "" } },
                { id: "c1771641082258255", first: "Harvard", last: "Univeristy", initials: "HU", phone: "", email: "", color: "var(--bc-color-c)", socials: { twitter: "", linkedin: "", instagram: "", youtube: "https://www.youtube.com/@harvard/videos", whatsapp: "", url: "" } },
                { id: "c1771640847533715", first: "PBS SPACE TIME", last: "", initials: "P", phone: "", email: "", color: "var(--bc-color-a)", socials: { twitter: "", linkedin: "", instagram: "", youtube: "https://www.youtube.com/@pbsspacetime", whatsapp: "", url: "" } },
                { id: "c1771641035859313", first: "Professor", last: "Dave Explains", initials: "PD", phone: "", email: "", color: "var(--bc-color-c)", socials: { twitter: "", linkedin: "", instagram: "", youtube: "https://www.youtube.com/@ProfessorDaveExplains", whatsapp: "", url: "" } },
                { id: "c1771641170923615", first: "Steven", last: "Scott", initials: "SS", phone: "+44 012345678910", email: "myemail@gmail.com", color: "var(--bc-color-d)", socials: { twitter: "https://x.com/IdoineTutorials", linkedin: "", instagram: "", youtube: "https://www.youtube.com/@StevenScott_studio53", whatsapp: "", url: "" } }
            ],
            groups: [
                { id: 'all', name: 'All Bubbles', contacts: [], isDefault: true },
                { id: 'g_studio_os', name: 'Studio OS', contacts: ["c1771641170923615"] },
                { id: 'grp_1771640782029', name: 'Youtube - Channels', color: "var(--bc-color-e)", contacts: ["c1771640847533715", "c177164090509222", "c1771640988867893", "c1771641035859313", "c1771641082258255"] }
            ],
            selectedGroupId: 'all',
            isBubbleView: true,
            renderedGroupId: null,
            positions: {
                "g_studio_os": { "x": 620, "y": 250 },
                "grp_1771640782029": { "x": 500, "y": 500 },
                "c1771641035859313": { "x": 150, "y": 280 },
                "c1771641170923615": { "x": 350, "y": 240 },
                "c1771640988867893": { "x": 750, "y": 450 },
                "c1771641082258255": { "x": 250, "y": 550 },
                "c177164090509222": { "x": 420, "y": 750 },
                "c1771640847533715": { "x": 720, "y": 700 }
            },
            animationsEnabled: false,
            fluidMotionEnabled: false,
            bgBubblesEnabled: false,
            whatsappCallEnabled: false,
            telegramChatEnabled: false,
            startInBubbleView: true,
            theme: 'vibrant'
        };
    }

    async init() {
        console.log('[BUBBLE CONTACT RD] Initializing Data...');
        try {
            const savedStr = localStorage.getItem('bc_app_state_rd');
            if (savedStr) {
                const saved = JSON.parse(savedStr);
                // Merge saved data into default state
                this.state.contacts = saved.contacts || this.state.contacts;
                this.state.groups = saved.groups || this.state.groups;
                this.state.positions = saved.positions || this.state.positions;
                this.state.animationsEnabled = saved.animationsEnabled !== undefined ? saved.animationsEnabled : false;
                this.state.fluidMotionEnabled = saved.fluidMotionEnabled !== undefined ? saved.fluidMotionEnabled : false;
                this.state.bgBubblesEnabled = saved.bgBubblesEnabled !== undefined ? saved.bgBubblesEnabled : false;
                this.state.whatsappCallEnabled = saved.whatsappCallEnabled !== undefined ? saved.whatsappCallEnabled : false;
                this.state.telegramChatEnabled = saved.telegramChatEnabled !== undefined ? saved.telegramChatEnabled : false;
                this.state.startInBubbleView = saved.startInBubbleView !== undefined ? saved.startInBubbleView : true;
                this.state.theme = saved.theme || 'vibrant';
                this.state.quickPins = saved.quickPins || [];
                this.state.isBubbleView = this.state.startInBubbleView;

                this.migrateDataToVariables();
                console.log(`[BUBBLE CONTACT RD] Restored ${this.state.groups.length} groups, ${Object.keys(this.state.positions).length} positions, theme: ${this.state.theme}.`);
            }

            // Apply theme to container
            this.applyTheme();

            // Always initialize engines with latest state
            Motion.init(this.state.animationsEnabled, this.state.fluidMotionEnabled);
            this.bgParticles = new BackgroundParticles('bc-bg-particles');
            this.bgParticles.init(this.state.bgBubblesEnabled && this.state.isBubbleView);
        } catch (e) {
            console.warn('[BUBBLE CONTACT RD] Failed to load from local storage, using defaults.', e);
        }
    }

    async saveData() {
        // Sync quick pins with live contact/group data
        if (this.state.quickPins) {
            this.state.quickPins = this.state.quickPins.filter(pin => {
                if (pin.type === 'contact') {
                    const c = this.state.contacts.find(ct => ct.id === pin.id);
                    if (!c) return false; // removed contact
                    pin.name = `${c.first} ${c.last}`.trim();
                    pin.initials = c.initials;
                    pin.color = c.color;
                } else if (pin.type === 'group') {
                    const g = this.state.groups.find(gr => gr.id === pin.id);
                    if (!g) return false; // removed group
                    pin.name = g.name;
                    pin.initials = (g.name || '?').substring(0, 2).toUpperCase();
                    pin.color = g.color || 'var(--bc-accent)';
                }
                return true;
            });
        }

        const dataToSave = {
            contacts: this.state.contacts,
            groups: this.state.groups,
            positions: this.state.positions,
            animationsEnabled: this.state.animationsEnabled,
            fluidMotionEnabled: this.state.fluidMotionEnabled,
            bgBubblesEnabled: this.state.bgBubblesEnabled,
            whatsappCallEnabled: this.state.whatsappCallEnabled,
            telegramChatEnabled: this.state.telegramChatEnabled,
            startInBubbleView: this.state.startInBubbleView,
            theme: this.state.theme,
            quickPins: this.state.quickPins || []
        };
        localStorage.setItem('bc_app_state_rd', JSON.stringify(dataToSave));
    }

    async flushPositions() {
        if (this.engine) {
            const live = this.engine.getPositions();
            for (let [id, pos] of Object.entries(live)) {
                if (pos.x !== 0 || pos.y !== 0) {
                    id = String(id);
                    this.state.positions[id] = { x: pos.x, y: pos.pos?.y || pos.y };
                }
            }
            try {
                await this.saveData();
            } catch (e) {
                console.error("[BC-DEBUG] Save error", e);
            }
        }
    }

    migrateDataToVariables() {
        const map = {
            '#2E81FF': 'var(--bc-color-a)',
            '#00D348': 'var(--bc-color-b)',
            '#FFA31A': 'var(--bc-color-c)',
            '#4c1d95': 'var(--bc-color-d)',
            '#6C5CE7': 'var(--bc-color-d)',
            '#FF4757': 'var(--bc-color-e)',
            '#FFFFFF': 'var(--bc-color-trans)'
        };
        const migrate = (item) => {
            if (map[item.color]) item.color = map[item.color];
        };
        this.state.contacts.forEach(migrate);
        this.state.groups.forEach(migrate);
    }

    applyTheme() {
        const c = document.querySelector('.bubble-contact-app');
        if (!c) return;

        // Remove all theme classes first
        c.classList.remove('muted-theme', 'calm-theme');

        if (this.state.theme === 'muted') {
            c.classList.add('muted-theme');
        } else if (this.state.theme === 'calm') {
            c.classList.add('calm-theme');
        }
    }

    rebuildCanvas(noAnimate = false) {
        const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
        this.engine.clear();
        this.state.renderedGroupId = this.state.selectedGroupId;
        if (!activeGroup || activeGroup.isDefault) {
            this.engine.scatterContacts(this.state.contacts, this.state.positions, noAnimate);
            const customGroups = this.state.groups.filter(g => !g.isDefault);
            customGroups.forEach(g => {
                const gc = this.state.contacts.filter(c => g.contacts.includes(c.id));
                const pos = this.state.positions[g.id];
                this.engine.addGroupBubble(g.name, g.id, gc, g.color, false, pos?.x, pos?.y, noAnimate);
            });
        } else {
            const gc = this.state.contacts.filter(c => activeGroup.contacts.includes(c.id));
            this.engine.scatterContacts(gc, this.state.positions, noAnimate);
            const pos = this.state.positions[activeGroup.id];
            this.engine.addGroupBubble(activeGroup.name, activeGroup.id, gc, activeGroup.color, true, pos?.x, pos?.y, noAnimate);
        }
    }

    bindEventsAndInit() {
        const c = document.querySelector('.bubble-contact-app');
        if (!c) {
            console.error('[BUBBLE CONTACT RD] Main container not found in DOM!');
            return;
        }

        // --- CLEANUP (Shield) ---
        if (this.engine) {
            this.engine.destroy();
            this.engine = null;
        }
        if (this.bgParticles) {
            this.bgParticles.destroy();
            this.bgParticles = null;
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        // Remove any duplicate layers that might have been left behind manually
        const olds = c.querySelectorAll('.bc-gooey-layer, .bc-ui-layer');
        olds.forEach(o => o.remove());

        this.dom = {
            sidebarGroups: c.querySelector('#bc-sidebar-groups'),
            contactsContainer: c.querySelector('#bc-contacts-container'),
            mainTitle: c.querySelector('#bc-main-title'),
            toggleBubble: c.querySelector('#bc-toggle-bubble'),
            listView: c.querySelector('#bc-list-view'),
            bubbleView: c.querySelector('#bc-bubble-view'),
            addGroupBtn: c.querySelector('#bc-btn-add-group'),
            modalOverlay: c.querySelector('#bc-add-group-modal'),
            modalCancel: c.querySelector('#bc-btn-cancel-group'),
            modalCreate: c.querySelector('#bc-btn-create-group'),
            modalInput: c.querySelector('#bc-group-name-input'),
            groupModalTitle: c.querySelector('#bc-group-modal-title'),
            groupMembersList: c.querySelector('#bc-group-members-list'),
            groupModalDelete: c.querySelector('#bc-btn-delete-group'),
            colorSwatches: c.querySelectorAll('#bc-color-picker .bc-color-swatch'),
            contactColorSwatches: c.querySelectorAll('#bc-contact-color-picker .bc-color-swatch'),
            exportBtn: c.querySelector('#bc-export-data'),
            importBtn: c.querySelector('#bc-import-data'),
            settingsBtn: c.querySelector('#bc-btn-settings'),
            secSidebar: c.querySelector('#bc-secondary-sidebar'),
            secHeaderAction: c.querySelector('#bc-sec-header-action'),
            secList: c.querySelector('#bc-sec-list'),
            btnCloseSec: c.querySelector('#bc-btn-close-sec'),
            sidebarAddContactBtn: c.querySelector('#bc-btn-add-contact-sidebar'),
            searchInput: c.querySelector('#bc-search-input'),
            contactModalOverlay: c.querySelector('#bc-add-contact-modal'),
            contactModalCancel: c.querySelector('#bc-btn-cancel-contact'),
            contactModalCreate: c.querySelector('#bc-btn-create-contact'),
            contactModalDelete: c.querySelector('#bc-btn-delete-contact'),
            contactModalTitle: c.querySelector('#bc-contact-modal-title'),
            contactAvatar: c.querySelector('#bc-new-contact-avatar'),
            contactInputs: {
                first: c.querySelector('#bc-contact-first'),
                last: c.querySelector('#bc-contact-last'),
                phone: c.querySelector('#bc-contact-phone'),
                email: c.querySelector('#bc-contact-email'),
                twitter: c.querySelector('#bc-contact-twitter'),
                linkedin: c.querySelector('#bc-contact-linkedin'),
                instagram: c.querySelector('#bc-contact-instagram'),
                youtube: c.querySelector('#bc-contact-youtube'),
                whatsapp: c.querySelector('#bc-contact-whatsapp'),
                url: c.querySelector('#bc-contact-url'),
                notes: c.querySelector('#bc-contact-notes')
            },
            contactNoteIndicator: c.querySelector('#bc-contact-note-indicator'),
            settingsModal: c.querySelector('#bc-settings-modal'),
            btnCloseSettings: c.querySelector('#bc-btn-close-settings'),
            animationSetting: c.querySelector('#bc-setting-animations'),
            bgBubblesSetting: c.querySelector('#bc-setting-bg-bubbles'),
            whatsappCallSetting: c.querySelector('#bc-setting-whatsapp-call'),
            telegramChatSetting: c.querySelector('#bc-setting-telegram-chat'),
            startBubbleSetting: c.querySelector('#bc-setting-start-bubble'),
            sidebarAddBubbleBtn: c.querySelector('#bc-btn-add-bubble-sidebar'),
            settingsPaletteOptions: c.querySelectorAll('#bc-settings-palette-selector .bc-palette-option')
        };

        const handlePaletteSwitch = (theme) => {
            this.state.theme = theme;
            this.applyTheme();
            this.saveData();

            // Sync active state in settings selector
            this.dom.settingsPaletteOptions.forEach(opt => {
                if (opt.getAttribute('data-theme') === theme) {
                    opt.classList.add('active');
                } else {
                    opt.classList.remove('active');
                }
            });
        };

        this.dom.settingsPaletteOptions.forEach(opt => {
            opt.onclick = () => handlePaletteSwitch(opt.getAttribute('data-theme'));
        });

        this.engine = new BubbleEngine(this.dom.bubbleView, (groupName, contact) => {
            const group = this.state.groups.find(g => g.name === groupName);
            if (group && !group.contacts.includes(contact.id)) {
                group.contacts.push(contact.id);
                this.saveData();
                this.renderSidebar();
                this.renderList();
            }
        }, (groupName) => {
            const group = this.state.groups.find(g => g.name === groupName);
            if (group) {
                if (this.state.selectedGroupId === group.id) {
                    this.showSecondarySidebar(groupName);
                    return;
                }
                const groupDivs = Array.from(this.dom.sidebarGroups.children);
                const idx = this.state.groups.indexOf(group);
                if (groupDivs[idx]) groupDivs[idx].click();
            }
        }, (contact) => {
            this.showSingleContactSidebar(contact);
        }, (groupName, contactId) => {
            const group = this.state.groups.find(g => g.name === groupName);
            return group ? group.contacts.includes(contactId) : false;
        }, (groupName) => {
            this.openEditGroupModal(groupName);
        }, (type, id, x, y) => {
            this.state.positions[String(id)] = { x, y };
            this.saveData();
        });

        // Quick Pin callback — drag bubble to sidebar edge
        this.engine.onQuickPin = (bubbleData) => {
            if (!this.state.quickPins) this.state.quickPins = [];
            const pinId = bubbleData.id || bubbleData.contact?.id;
            // No duplicates, max 4
            if (this.state.quickPins.find(p => p.id === pinId)) return;
            if (this.state.quickPins.length >= 4) return;

            const pin = {
                id: pinId,
                type: bubbleData.type,
                name: bubbleData.type === 'contact'
                    ? `${bubbleData.contact?.first || ''} ${bubbleData.contact?.last || ''}`.trim()
                    : (bubbleData.name || 'Group'),
                initials: bubbleData.contact?.initials || (bubbleData.name || '?').substring(0, 2).toUpperCase(),
                color: bubbleData.type === 'group'
                    ? (bubbleData.uiCircle?.style.background || this.state.groups.find(g => g.id === pinId)?.color || 'var(--bc-accent)')
                    : (bubbleData.contact?.color || 'var(--bc-accent)')
            };
            this.state.quickPins.push(pin);
            this.saveData();
            // Refresh the sidebar if showing empty state
            const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
            if (!activeGroup || activeGroup.isDefault) {
                this.showEmptyStateSidebar();
            }
        };

        // Check if a bubble is already pinned
        this.engine.isQuickPinned = (id) => {
            return (this.state.quickPins || []).some(p => p.id === id);
        };

        // Initialize/Restart particles
        this.bgParticles = new BackgroundParticles('bc-bg-particles');
        this.bgParticles.init(this.state.bgBubblesEnabled && this.state.isBubbleView);

        // Pop counter (in-memory only, resets per session)
        this.popCount = this.popCount || 0;
        const popCounterEl = c.querySelector('#bc-pop-counter');
        const popCountSpan = c.querySelector('#bc-pop-count');
        if (popCounterEl) {
            popCounterEl.style.display = this.state.bgBubblesEnabled ? 'flex' : 'none';
            if (popCountSpan) popCountSpan.textContent = this.popCount;
        }
        // Remove old listener if re-binding
        if (this._popHandler) document.removeEventListener('bubblepopped', this._popHandler);
        this._popHandler = () => {
            this.popCount++;
            if (popCountSpan) popCountSpan.textContent = this.popCount;
            if (popCounterEl) {
                popCounterEl.classList.remove('bc-pop-bump');
                void popCounterEl.offsetWidth; // reflow to retrigger
                popCounterEl.classList.add('bc-pop-bump');
            }
            // Play random pop sound
            if (this.state.bubbleSoundsEnabled && this.popSounds && this.popSounds.length) {
                const sound = this.popSounds[Math.floor(Math.random() * this.popSounds.length)];
                const clone = sound.cloneNode();
                clone.volume = 0.4;
                clone.play().catch(() => { });
            }
        };
        document.addEventListener('bubblepopped', this._popHandler);

        // Resume engine loops if needed
        if (this.engine) this.engine.startFloating();

        // Slime SFX — one sound per drag, killed on release
        let activeSlime = null;
        document.addEventListener('bubbledragstart', () => {
            if (!this.state.animationSfxEnabled || !this.slimeSounds || !this.slimeSounds.length) return;
            const sound = this.slimeSounds[Math.floor(Math.random() * this.slimeSounds.length)];
            sound.currentTime = 0;
            sound.volume = 0.3;
            sound.play().catch(() => { });
            activeSlime = sound;
        });
        document.addEventListener('bubbledragend', () => {
            if (activeSlime) {
                activeSlime.pause();
                activeSlime.currentTime = 0;
                activeSlime = null;
            }
        });

        // Bounce SFX — wall/boundary hits
        const assetBase = new URL('./assets/', import.meta.url).href;
        this.bounceSounds = [
            new Audio(assetBase + 'bounce1.mp3'),
            new Audio(assetBase + 'bounce2.mp3'),
            new Audio(assetBase + 'bounce3.mp3')
        ];
        this.bounceSounds.forEach(s => { s.volume = 0.25; s.preload = 'auto'; });

        document.addEventListener('bubblebounce', () => {
            if (!this.state.animationSfxEnabled || !this.bounceSounds || !this.bounceSounds.length) return;
            const sound = this.bounceSounds[Math.floor(Math.random() * this.bounceSounds.length)];
            sound.currentTime = 0;
            sound.volume = 0.25;
            sound.play().catch(() => { });
        });

        // UI confirm sound — shared single Audio, reused
        this._okSound = new Audio(assetBase + 'ok.mp3');
        this._okSound.volume = 0.3;
        this._okSound.preload = 'auto';
        this.playOk = () => {
            if (!this.state.animationSfxEnabled) return;
            this._okSound.currentTime = 0;
            this._okSound.play().catch(() => { });
        };

        // Apply Initial View State based on settings
        const toggleSpan = this.dom.toggleBubble.querySelector('span');
        const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);

        if (this.state.isBubbleView) {
            this.dom.listView.style.display = 'none';
            this.dom.bubbleView.style.display = 'flex';
            this.dom.toggleBubble.style.background = 'var(--bc-accent)';
            this.dom.toggleBubble.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                <span>LIST</span>
            `;

            // Show correct secondary sidebar on load
            if (!activeGroup || activeGroup.isDefault) {
                this.showEmptyStateSidebar();
            } else {
                this.showSecondarySidebar(activeGroup.name);
            }

            // Initial build
            setTimeout(() => {
                this.flushPositions().then(() => this.rebuildCanvas(true));
            }, 50);
        } else {
            this.dom.listView.style.display = 'flex';
            this.dom.bubbleView.style.display = 'none';
            this.dom.secSidebar.style.display = 'none';
            this.dom.toggleBubble.style.background = 'rgba(255, 255, 255, 0.05)';
            this.dom.toggleBubble.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="15" cy="15" r="5"></circle><circle cx="9" cy="9" r="4"></circle><circle cx="16" cy="6" r="3"></circle>
                </svg>
                <span>BUBBLES</span>
            `;
        }

        // Setup ResizeObserver to detect when tab becomes visible or resizes
        this._lastSize = { w: 0, h: 0 };
        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const rect = entry.contentRect;
                if (rect.width > 10 && rect.height > 10) {
                    if (this.state.isBubbleView && (Math.abs(this._lastSize.w - rect.width) > 10 || Math.abs(this._lastSize.h - rect.height) > 10)) {
                        this._lastSize = { w: rect.width, h: rect.height };
                        this.flushPositions().then(() => {
                            this.rebuildCanvas(true);
                        });
                    }
                }
            }
        });

        if (this.dom.bubbleView) {
            this.resizeObserver.observe(this.dom.bubbleView);
        }

        // Canvas Filter Toggle — cycle: all → contacts only → groups only
        this.state.canvasFilter = 'all'; // 'all', 'contacts', 'groups'
        const filterBtn = c.querySelector('#bc-canvas-filter');
        if (filterBtn) {
            filterBtn.onclick = () => {
                const modes = ['all', 'contacts', 'groups'];
                const idx = modes.indexOf(this.state.canvasFilter);
                this.state.canvasFilter = modes[(idx + 1) % 3];
                const mode = this.state.canvasFilter;

                // Update icon
                const icons = {
                    all: '<circle cx="8" cy="14" r="5"/><circle cx="16" cy="10" r="5"/>',
                    contacts: '<circle cx="12" cy="8" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>',
                    groups: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>'
                };
                const titles = { all: 'Filter: All', contacts: 'Filter: Contacts Only', groups: 'Filter: Groups Only' };
                filterBtn.querySelector('svg').innerHTML = icons[mode];
                filterBtn.title = titles[mode];
                filterBtn.classList.toggle('filter-active', mode !== 'all');

                // Show/hide bubbles
                if (this.engine) {
                    this.engine.bubbles.forEach(b => {
                        const show = mode === 'all' || mode === b.type + 's' || (mode === 'contacts' && b.type === 'contact') || (mode === 'groups' && b.type === 'group');
                        b.el.style.display = show ? '' : 'none';
                        b.gooEl.style.display = show ? '' : 'none';
                    });
                }
            };
        }

        // Global Search — filters BOTH list and bubble views
        this.state.searchQuery = '';
        if (this.dom.searchInput) {
            this.dom.searchInput.oninput = () => {
                this.state.searchQuery = this.dom.searchInput.value.trim().toLowerCase();
                const q = this.state.searchQuery;

                // Filter list view
                if (!this.state.isBubbleView) {
                    this.renderList();
                }

                // Filter bubble view — respect canvas filter + search
                if (this.state.isBubbleView && this.engine) {
                    const filter = this.state.canvasFilter || 'all';
                    this.engine.bubbles.forEach(b => {
                        // Canvas filter check first
                        const typeAllowed = filter === 'all'
                            || (filter === 'contacts' && b.type === 'contact')
                            || (filter === 'groups' && b.type === 'group');

                        if (!typeAllowed) {
                            b.el.style.display = 'none';
                            b.gooEl.style.display = 'none';
                            return;
                        }

                        // Search query check (groups pass through, contacts must match)
                        if (!q || b.type === 'group') {
                            b.el.style.display = '';
                            b.gooEl.style.display = '';
                            return;
                        }
                        const name = `${b.contact?.first || ''} ${b.contact?.last || ''}`.toLowerCase();
                        const initials = (b.contact?.initials || '').toLowerCase();
                        const match = name.includes(q) || initials.includes(q);
                        b.el.style.display = match ? '' : 'none';
                        b.gooEl.style.display = match ? '' : 'none';
                    });
                }
            };
        }

        this.dom.btnCloseSec.onclick = () => {
            this.dom.secSidebar.style.display = 'none';
        };

        this.dom.toggleBubble.onclick = () => {
            this.state.isBubbleView = !this.state.isBubbleView;
            const toggleSpan = this.dom.toggleBubble.querySelector('span');

            if (this.state.isBubbleView) {
                this.dom.listView.style.display = 'none';
                this.dom.bubbleView.style.display = 'flex';
                this.dom.toggleBubble.style.background = 'var(--bc-accent)';
                this.dom.toggleBubble.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                    <span>LIST</span>
                `;

                const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
                this.updateMainHeader((!activeGroup || activeGroup.isDefault) ? 'Bubble Groups' : activeGroup.name, activeGroup && !activeGroup.isDefault);

                if (!activeGroup || activeGroup.isDefault) {
                    this.showEmptyStateSidebar();
                } else {
                    this.showSecondarySidebar(activeGroup.name);
                }

                this.flushPositions().then(() => {
                    this.rebuildCanvas(true);
                });

                if (this.bgParticles) {
                    this.bgParticles.updateState(this.state.bgBubblesEnabled);
                }
            } else {
                this.flushPositions().then(() => {
                    this.dom.listView.style.display = 'flex';
                    this.dom.bubbleView.style.display = 'none';
                    this.dom.secSidebar.style.display = 'none';
                    this.dom.toggleBubble.style.background = 'rgba(255, 255, 255, 0.05)';
                    this.dom.toggleBubble.innerHTML = `
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <circle cx="15" cy="15" r="5"></circle><circle cx="9" cy="9" r="4"></circle><circle cx="16" cy="6" r="3"></circle>
                        </svg>
                        <span>BUBBLES</span>
                    `;

                    const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
                    this.updateMainHeader(activeGroup && !activeGroup.isDefault ? activeGroup.name : 'All Bubbles', activeGroup && !activeGroup.isDefault);

                    if (this.bgParticles) {
                        this.bgParticles.updateState(false);
                    }
                });
            }
        };

        this.selectedGroupColor = '#4c1d95';
        this.dom.colorSwatches.forEach(swatch => {
            swatch.onclick = () => {
                this.dom.colorSwatches.forEach(s => s.classList.remove('selected'));
                swatch.classList.add('selected');
                this.selectedGroupColor = swatch.getAttribute('data-color');
            };
        });

        this.dom.settingsBtn.onclick = () => {
            this.closeAllModals();
            this.dom.settingsModal.style.display = 'flex';
            // Sync palette state when opening
            handlePaletteSwitch(this.state.theme);
        };

        this.dom.btnCloseSettings.onclick = () => {
            this.dom.settingsModal.style.display = 'none';
        };

        this.dom.animationSetting = c.querySelector('#bc-setting-animations');
        this.dom.fluidMotionSetting = c.querySelector('#bc-setting-fluid-motion');
        this.dom.bgBubblesSetting = c.querySelector('#bc-setting-bg-bubbles');
        this.dom.animationSubSettings = c.querySelector('#bc-animation-sub-settings');

        const syncAnimationsUI = () => {
            const enabled = this.state.animationsEnabled;
            if (this.dom.animationSubSettings) {
                this.dom.animationSubSettings.style.opacity = enabled ? '1' : '0.5';
                this.dom.animationSubSettings.style.pointerEvents = enabled ? 'auto' : 'none';
            }
        };

        this.dom.animationSetting.onchange = (e) => {
            this.state.animationsEnabled = e.target.checked;
            this.saveData();
            Motion.updateState(this.state.animationsEnabled);
            syncAnimationsUI();
        };

        this.dom.animationSetting.checked = this.state.animationsEnabled;

        this.dom.fluidMotionSetting.onchange = (e) => {
            this.state.fluidMotionEnabled = e.target.checked;
            this.saveData();
            Motion.fluidMotion = this.state.fluidMotionEnabled;
            Motion.updateState(this.state.animationsEnabled);
        };

        this.dom.fluidMotionSetting.checked = this.state.fluidMotionEnabled;

        this.dom.bgBubblesSetting.onchange = (e) => {
            this.state.bgBubblesEnabled = e.target.checked;
            this.saveData();
            if (this.bgParticles) this.bgParticles.updateState(this.state.bgBubblesEnabled && this.state.isBubbleView);
            // Toggle pop counter visibility
            const pc = document.querySelector('#bc-pop-counter');
            if (pc) {
                pc.style.display = this.state.bgBubblesEnabled ? 'flex' : 'none';
                if (!this.state.bgBubblesEnabled) {
                    this.popCount = 0;
                    const span = pc.querySelector('span');
                    if (span) span.textContent = '0';
                }
            }
        };

        this.dom.bgBubblesSetting.checked = this.state.bgBubblesEnabled;

        // Bubble Sounds
        this.dom.bubbleSoundsSetting = c.querySelector('#bc-setting-bubble-sounds');
        this.popSounds = [
            new Audio(assetBase + 'pop1.mp3'),
            new Audio(assetBase + 'pop2.mp3'),
            new Audio(assetBase + 'pop3.mp3')
        ];
        this.popSounds.forEach(s => { s.volume = 0.4; s.preload = 'auto'; });

        this.dom.bubbleSoundsSetting.onchange = (e) => {
            this.state.bubbleSoundsEnabled = e.target.checked;
            this.saveData();
        };
        this.dom.bubbleSoundsSetting.checked = this.state.bubbleSoundsEnabled || false;

        // Animation SFX (slime drag sounds)
        this.dom.animationSfxSetting = c.querySelector('#bc-setting-animation-sfx');
        this.slimeSounds = [
            new Audio(assetBase + 'slime1.mp3'),
            new Audio(assetBase + 'slime2.mp3'),
            new Audio(assetBase + 'slime3.mp3')
        ];
        this.slimeSounds.forEach(s => { s.volume = 0.3; s.preload = 'auto'; });

        this.dom.animationSfxSetting.onchange = (e) => {
            this.state.animationSfxEnabled = e.target.checked;
            this.saveData();
        };
        this.dom.animationSfxSetting.checked = this.state.animationSfxEnabled || false;

        // Initial sync
        syncAnimationsUI();

        this.dom.whatsappCallSetting.onchange = (e) => {
            this.state.whatsappCallEnabled = e.target.checked;
            this.saveData();
            this.renderList();
        };

        this.dom.whatsappCallSetting.checked = this.state.whatsappCallEnabled || false;

        this.dom.telegramChatSetting.onchange = (e) => {
            this.state.telegramChatEnabled = e.target.checked;
            this.saveData();
            this.renderList();
        };

        this.dom.telegramChatSetting.checked = this.state.telegramChatEnabled || false;

        this.dom.startBubbleSetting.onchange = (e) => {
            this.state.startInBubbleView = e.target.checked;
            this.saveData();
        };

        this.dom.startBubbleSetting.checked = this.state.startInBubbleView;

        this.openAddContactModal = () => {
            this.editingContactId = null;
            this.dom.contactModalTitle.textContent = "New Contact";
            this.dom.contactModalCreate.textContent = "Add Contact";
            this.dom.contactModalDelete.style.display = 'none';
            this.dom.contactModalOverlay.style.display = 'flex';
            this.selectedContactColor = this.contactColors[Math.floor(Math.random() * this.contactColors.length)];

            if (this.selectedContactColor === 'transparent') {
                this.dom.contactAvatar.style.background = '#3A3A3E';
                this.dom.contactAvatar.style.border = '1px solid rgba(255,255,255,0.3)';
            } else {
                this.dom.contactAvatar.style.background = this.selectedContactColor;
                this.dom.contactAvatar.style.border = 'none';
            }

            this.dom.contactColorSwatches.forEach(s => s.classList.remove('selected'));
            const matchingSwatch = Array.from(this.dom.contactColorSwatches).find(s => s.getAttribute('data-color') === this.selectedContactColor);
            if (matchingSwatch) matchingSwatch.classList.add('selected');

            this.dom.contactNoteIndicator.style.display = 'none';

            Object.values(this.dom.contactInputs).forEach(input => input.value = '');
            this.dom.contactAvatar.textContent = '?';
            setTimeout(() => this.dom.contactInputs.first.focus(), 50);
        };

        if (this.dom.sidebarAddContactBtn) {
            this.dom.sidebarAddContactBtn.onclick = () => { this.playOk(); this.openAddContactModal(); };
        }

        this.openEditContactModal = (contact) => {
            this.editingContactId = contact.id;
            this.dom.contactModalTitle.textContent = "Edit Contact";
            this.dom.contactModalCreate.textContent = "UPDATE / SAVE";
            this.dom.contactModalDelete.style.display = 'flex';
            this.selectedContactColor = contact.color || this.contactColors[0];

            if (this.selectedContactColor === 'transparent') {
                this.dom.contactAvatar.style.background = '#3A3A3E';
                this.dom.contactAvatar.style.border = '1px solid rgba(255,255,255,0.3)';
            } else {
                this.dom.contactAvatar.style.background = this.selectedContactColor;
                this.dom.contactAvatar.style.border = 'none';
            }

            this.dom.contactColorSwatches.forEach(s => s.classList.remove('selected'));
            const matchingSwatch = Array.from(this.dom.contactColorSwatches).find(s => s.getAttribute('data-color') === this.selectedContactColor);
            if (matchingSwatch) matchingSwatch.classList.add('selected');

            this.dom.contactAvatar.textContent = contact.initials;
            this.dom.contactInputs.first.value = contact.first || '';
            this.dom.contactInputs.last.value = contact.last || '';
            this.dom.contactInputs.phone.value = contact.phone || '';
            this.dom.contactInputs.email.value = contact.email || '';
            this.dom.contactInputs.twitter.value = contact.socials?.twitter || '';
            this.dom.contactInputs.linkedin.value = contact.socials?.linkedin || '';
            this.dom.contactInputs.instagram.value = contact.socials?.instagram || '';
            this.dom.contactInputs.youtube.value = contact.socials?.youtube || '';
            this.dom.contactInputs.whatsapp.value = contact.socials?.whatsapp || '';
            this.dom.contactInputs.url.value = contact.socials?.url || '';
            this.dom.contactInputs.notes.value = contact.notes || '';

            this.dom.contactNoteIndicator.style.display = contact.notes ? 'flex' : 'none';

            this.dom.contactModalOverlay.style.display = 'flex';
        };

        this.dom.addGroupBtn.onclick = () => {
            if (this.state.selectedGroupId && this.state.selectedGroupId !== 'all') {
                const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
                if (activeGroup && !activeGroup.isDefault) {
                    this.openEditGroupModal(activeGroup.name);
                    return;
                }
            }
            this.playOk();
            this.editingGroupId = null;
            this.dom.groupModalTitle.textContent = "NEW BUBBLE";
            this.dom.modalCreate.textContent = "Create";
            const editNodes = this.dom.modalOverlay.querySelectorAll('.bc-group-edit-only');
            editNodes.forEach(n => n.style.display = 'none');
            this.dom.modalOverlay.style.display = 'flex';
            this.dom.modalInput.value = '';
            this.dom.modalInput.focus();
            this.dom.colorSwatches.forEach(s => s.classList.remove('selected'));
            this.dom.colorSwatches[0].classList.add('selected');
            this.selectedGroupColor = 'var(--bc-color-d)';
        };

        // Create Bubble button in header
        if (this.dom.sidebarAddBubbleBtn) {
            this.dom.sidebarAddBubbleBtn.onclick = () => this.dom.addGroupBtn.click();
        }

        this.openEditGroupModal = (groupName) => {
            const group = this.state.groups.find(g => g.name === groupName);
            if (!group || group.isDefault) return;

            this.editingGroupId = group.id;
            this.dom.groupModalTitle.textContent = "Edit Bubble";
            this.dom.modalCreate.textContent = "UPDATE / SAVE";
            const editNodes = this.dom.modalOverlay.querySelectorAll('.bc-group-edit-only');
            editNodes.forEach(n => n.style.display = 'flex');
            this.dom.modalInput.value = group.name;
            this.dom.colorSwatches.forEach(s => s.classList.remove('selected'));
            const matchingSwatch = Array.from(this.dom.colorSwatches).find(s => {
                const c = s.getAttribute('data-color');
                return c === group.color || (c === '#000000' && group.color === '#FFFFFF');
            });
            if (matchingSwatch) {
                matchingSwatch.classList.add('selected');
                this.selectedGroupColor = group.color;
            } else {
                this.dom.colorSwatches[0].classList.add('selected');
                this.selectedGroupColor = 'var(--bc-color-d)';
            }

            this.dom.groupMembersList.innerHTML = this.state.contacts.map(c => {
                const isChecked = group.contacts.includes(c.id) ? 'checked' : '';
                return `
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--bc-text-main); font-size: 14px;">
                        <input type="checkbox" value="${c.id}" class="bc-group-member-checkbox" ${isChecked}>
                        <div class="bc-mini-thumbnail" style="background: ${c.color}; border: 1px solid rgba(255,255,255,0.1); width: 24px; height: 24px; font-size: 10px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">${c.initials}</div>
                        ${c.first} ${c.last}
                    </label>
                `;
            }).join('');
            this.dom.modalOverlay.style.display = 'flex';
        };

        this.dom.modalCancel.onclick = () => {
            this.dom.modalOverlay.style.display = 'none';
        };

        this.dom.modalCreate.onclick = () => {
            const val = this.dom.modalInput.value.trim();
            if (!val) return;
            this.playOk();
            let wasNewGroup = false;

            if (this.editingGroupId) {
                const group = this.state.groups.find(g => g.id === this.editingGroupId);
                if (group) {
                    group.name = val;
                    group.color = this.selectedGroupColor;
                    const checkedBoxes = Array.from(this.dom.groupMembersList.querySelectorAll('.bc-group-member-checkbox:checked'));
                    group.contacts = checkedBoxes.map(cb => isNaN(cb.value) ? cb.value : Number(cb.value));
                    if (this.state.selectedGroupId === group.id) {
                        this.updateMainHeader(group.name, true);
                        if (this.state.isBubbleView) this.showSecondarySidebar(group.name);
                    }
                }
            } else {
                const newId = 'grp_' + Date.now();
                this.state.groups.push({
                    id: newId,
                    name: val,
                    color: this.selectedGroupColor,
                    contacts: []
                });
                wasNewGroup = true;
            }

            this.editingGroupId = null;
            this.saveData();
            this.renderSidebar();
            this.dom.modalOverlay.style.display = 'none';

            if (this.state.isBubbleView) {
                const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
                if (wasNewGroup && activeGroup && activeGroup.isDefault) {
                    const group = this.state.groups[this.state.groups.length - 1];
                    this.engine.addGroupBubble(val, group.id, [], this.selectedGroupColor, false);
                    this.flushPositions();
                } else {
                    this.flushPositions().then(() => {
                        this.rebuildCanvas(true);
                    });
                }
            } else {
                this.renderList();
            }
        };

        this.dom.groupModalDelete.onclick = () => {
            if (!this.editingGroupId) return;
            if (confirm("Are you sure you want to delete this group?")) {
                this.state.groups = this.state.groups.filter(g => g.id !== this.editingGroupId);
                delete this.state.positions[this.editingGroupId];
                if (this.state.selectedGroupId === this.editingGroupId) {
                    this.state.selectedGroupId = 'all';
                }
                this.editingGroupId = null;
                this.saveData();
                this.dom.modalOverlay.style.display = 'none';
                this.renderSidebar();
                this.renderList();
                if (this.state.isBubbleView) {
                    this.flushPositions().then(() => {
                        this.rebuildCanvas(true);
                    });
                }
            }
        };

        this.contactColors = ['var(--bc-color-a)', 'var(--bc-color-b)', 'var(--bc-color-c)', 'var(--bc-color-d)', 'var(--bc-color-e)', 'transparent'];

        // Bind Contact Color Swatches
        this.dom.contactColorSwatches.forEach(swatch => {
            swatch.onclick = () => {
                this.dom.contactColorSwatches.forEach(s => s.classList.remove('selected'));
                swatch.classList.add('selected');
                this.selectedContactColor = swatch.getAttribute('data-color');

                if (this.selectedContactColor === 'transparent') {
                    this.dom.contactAvatar.style.background = '#3A3A3E';
                    this.dom.contactAvatar.style.border = '1px solid rgba(255,255,255,0.3)';
                } else {
                    this.dom.contactAvatar.style.background = this.selectedContactColor;
                    this.dom.contactAvatar.style.border = 'none';
                }
            };
        });

        const updateAvatar = () => {
            const first = this.dom.contactInputs.first.value.trim().toUpperCase();
            const last = this.dom.contactInputs.last.value.trim().toUpperCase();
            const init = ((first.charAt(0) || '') + (last.charAt(0) || '')) || '?';
            this.dom.contactAvatar.textContent = init;
        };
        this.dom.contactInputs.first.addEventListener('input', updateAvatar);
        this.dom.contactInputs.last.addEventListener('input', updateAvatar);

        this.dom.contactModalCancel.onclick = () => {
            this.dom.contactModalOverlay.style.display = 'none';
        };

        this.dom.contactModalCreate.onclick = () => {
            this.playOk();
            const first = this.dom.contactInputs.first.value.trim();
            const last = this.dom.contactInputs.last.value.trim();
            if (!first && !last) {
                alert("Please enter a name.");
                return;
            }

            if (this.editingContactId) {
                const contact = this.state.contacts.find(c => c.id === this.editingContactId);
                if (contact) {
                    contact.first = first;
                    contact.last = last;
                    contact.initials = ((first.charAt(0) || '') + (last.charAt(0) || '')).toUpperCase() || '?';
                    contact.phone = this.dom.contactInputs.phone.value.trim();
                    contact.email = this.dom.contactInputs.email.value.trim();
                    contact.color = this.selectedContactColor;
                    contact.socials = {
                        twitter: this.dom.contactInputs.twitter.value.trim(),
                        linkedin: this.dom.contactInputs.linkedin.value.trim(),
                        instagram: this.dom.contactInputs.instagram.value.trim(),
                        youtube: this.dom.contactInputs.youtube.value.trim(),
                        whatsapp: this.dom.contactInputs.whatsapp.value.trim(),
                        url: this.dom.contactInputs.url.value.trim()
                    };
                    contact.notes = this.dom.contactInputs.notes.value.trim();
                }
            } else {
                const newId = 'c' + Date.now() + Math.floor(Math.random() * 1000);
                const newContact = {
                    id: newId,
                    first: first || '',
                    last: last || '',
                    initials: ((first.charAt(0) || '') + (last.charAt(0) || '')).toUpperCase() || '?',
                    phone: this.dom.contactInputs.phone.value.trim(),
                    email: this.dom.contactInputs.email.value.trim(),
                    color: this.selectedContactColor || this.contactColors[0],
                    notes: this.dom.contactInputs.notes.value.trim(),
                    socials: {
                        twitter: this.dom.contactInputs.twitter.value.trim(),
                        linkedin: this.dom.contactInputs.linkedin.value.trim(),
                        instagram: this.dom.contactInputs.instagram.value.trim(),
                        youtube: this.dom.contactInputs.youtube.value.trim(),
                        whatsapp: this.dom.contactInputs.whatsapp.value.trim(),
                        url: this.dom.contactInputs.url.value.trim()
                    }
                };
                this.state.contacts.push(newContact);

                // Auto-add to active group if not in 'All'
                if (this.state.selectedGroupId !== 'all') {
                    const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
                    if (activeGroup) {
                        if (!activeGroup.contacts.includes(newId)) {
                            activeGroup.contacts.push(newId);
                        }
                    }
                }
            }

            const preEditId = this.editingContactId;
            this.saveData();
            this.dom.contactModalOverlay.style.display = 'none';
            this.editingContactId = null;
            this.renderSidebar();
            this.renderList();
            if (this.state.isBubbleView) {
                this.flushPositions().then(() => this.rebuildCanvas(true));
            }
            this.showSingleContactSidebar(this.state.contacts.find(c => c.id === preEditId) || this.state.contacts[this.state.contacts.length - 1]);
        };

        this.dom.contactModalDelete.onclick = () => {
            if (!this.editingContactId) return;
            if (confirm("Delete contact?")) {
                this.state.contacts = this.state.contacts.filter(c => c.id !== this.editingContactId);
                delete this.state.positions[this.editingContactId];
                this.state.groups.forEach(g => {
                    g.contacts = g.contacts.filter(id => id !== this.editingContactId);
                });
                this.saveData();
                this.dom.contactModalOverlay.style.display = 'none';
                this.editingContactId = null;
                const firstGroup = this.dom.sidebarGroups.firstChild;
                if (firstGroup) firstGroup.click();
            }
        };

        if (this.dom.exportBtn) {
            this.dom.exportBtn.onclick = () => {
                const dataStr = JSON.stringify({ contacts: this.state.contacts, groups: this.state.groups }, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_${Date.now()}.json`;
                a.click();
            };
        }

        if (this.dom.importBtn) {
            this.dom.importBtn.onclick = () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        try {
                            const data = JSON.parse(re.target.result);
                            if (data.contacts && data.groups) {
                                this.state.contacts = data.contacts;
                                this.state.groups = data.groups;
                                this.saveData();
                                this.renderSidebar();
                                this.renderList();
                            }
                        } catch (err) { console.error(err); }
                    };
                    reader.readAsText(file);
                };
                input.click();
            };
        }

        this.renderSidebar();
        this.renderList();
        const initialGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId) || this.state.groups[0];
        this.updateMainHeader(initialGroup.isDefault ? (this.state.isBubbleView ? 'Bubble Groups' : 'All Bubbles') : initialGroup.name, !initialGroup.isDefault);
    }

    closeAllModals() {
        if (this.dom.modalOverlay) this.dom.modalOverlay.style.display = 'none';
        if (this.dom.contactModalOverlay) this.dom.contactModalOverlay.style.display = 'none';
        if (this.dom.settingsModal) this.dom.settingsModal.style.display = 'none';
    }

    renderSidebar() {
        this.dom.sidebarGroups.innerHTML = '';

        // Update Add Contact Button Color based on active group
        const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
        if (activeGroup && !activeGroup.isDefault) {
            this.dom.sidebarAddContactBtn.style.background = activeGroup.color || 'var(--bc-accent)';
            this.dom.sidebarAddContactBtn.style.color = '#FFFFFF';
        } else {
            this.dom.sidebarAddContactBtn.style.background = '#FFFFFF';
            this.dom.sidebarAddContactBtn.style.color = '#1A1A1E';
        }

        this.state.groups.forEach(group => {
            const div = document.createElement('div');
            div.className = `bc-group-item ${this.state.selectedGroupId === group.id ? 'active' : ''}`;
            const count = group.isDefault ? this.state.contacts.length : group.contacts.length;
            if (group.isDefault) {
                group.name = 'All Bubbles';
                div.innerHTML = `<span>All Bubbles</span>`;
            } else {
                const color = group.color === 'transparent' ? '#3A3A3E' : (group.color || 'var(--bc-accent)');
                const border = group.color === 'transparent' ? '1px solid rgba(255,255,255,0.3)' : 'none';
                div.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 17px; height: 17px; border-radius: 50%; background: ${color}; border: ${border};"></div>
                        <span>${group.name}</span>
                    </div>
                    <span class="bc-count">${count}</span>
                `;
            }
            div.onclick = () => {
                this.state.selectedGroupId = group.id;
                const titleText = group.isDefault ? (this.state.isBubbleView ? 'Bubble Groups' : 'All Bubbles') : group.name;
                this.updateMainHeader(titleText, !group.isDefault);
                if (this.state.isBubbleView) {
                    if (!group.isDefault) this.showSecondarySidebar(group.name);
                    else this.showEmptyStateSidebar();
                } else {
                    this.dom.secSidebar.style.display = 'none';
                }
                this.renderSidebar();
                this.renderList();
                if (this.state.isBubbleView) {
                    this.flushPositions().then(() => this.rebuildCanvas(true));
                }
            };
            this.dom.sidebarGroups.appendChild(div);
        });
    }

    updateMainHeader(text, isGroup = false) {
        const icon = isGroup ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 12px; vertical-align: middle;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>` : '';
        const editBubbleBtn = (isGroup && !this.state.isBubbleView) ? `<button id="bc-btn-edit-bubble-header" style="margin-right: 15px; padding: 6px 12px; font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: var(--bc-text-main); cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: middle; transition: all 0.2s;">Edit Bubble</button>` : '';

        this.dom.mainTitle.innerHTML = `${editBubbleBtn}${icon}<span style="vertical-align: middle;">${text}</span>`;

        const btn = this.dom.mainTitle.querySelector('#bc-btn-edit-bubble-header');
        if (btn) {
            btn.onclick = (e) => {
                e.stopPropagation();
                const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
                if (activeGroup) this.openEditGroupModal(activeGroup.name);
            };
            btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.15)';
            btn.onmouseleave = () => btn.style.background = 'rgba(255,255,255,0.08)';
        }
    }

    showSecondarySidebar(groupName) {
        const group = this.state.groups.find(g => g.name === groupName);
        if (!group) return;

        this.dom.secSidebar.style.display = 'flex';

        // Header Action (Replacing title)
        this.dom.secHeaderAction.innerHTML = `
            <button class="bc-btn-create" id="bc-sec-btn-manage-group-sb" style="width: auto; padding: 8px 14px; font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,0.15); display: flex; align-items: center; gap: 8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"></path></svg>
                Edit Bubble
            </button>
        `;

        const manageBtn = this.dom.secHeaderAction.querySelector('#bc-sec-btn-manage-group-sb');
        if (manageBtn) manageBtn.onclick = () => this.openEditGroupModal(group.name);

        this.dom.btnCloseSec.style.display = 'flex';
        if (this.state.isBubbleView) {
            this.dom.btnCloseSec.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
            this.dom.btnCloseSec.title = "Back to Canvas";
            this.dom.btnCloseSec.onclick = () => {
                const defaultGroupDiv = this.dom.sidebarGroups.firstChild;
                if (defaultGroupDiv) defaultGroupDiv.click();
            };
        } else {
            this.dom.btnCloseSec.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            this.dom.btnCloseSec.title = "Close";
            this.dom.btnCloseSec.onclick = () => { this.dom.secSidebar.style.display = 'none'; };
        }

        let filteredContacts = group.isDefault ? this.state.contacts : this.state.contacts.filter(c => group.contacts.includes(c.id));
        if (filteredContacts.length === 0) {
            this.dom.secList.innerHTML = '<div style="color: var(--bc-text-muted); padding: 20px; text-align: center; font-size: 13px;">No contacts in this group yet.</div>';
            return;
        }

        this.dom.secList.innerHTML = filteredContacts.map(c => {
            const phoneHtml = c.phone ? `<div>${c.phone}</div>` : '';
            const emailHtml = c.email ? `<div>${c.email}</div>` : '';
            const socialsHtml = this.getSocialsHtml(c, 14);

            const color = c.color === 'transparent' ? '#3A3A3E' : c.color;
            const border = c.color === 'transparent' ? '1px solid rgba(255,255,255,0.2)' : 'none';
            return `
                <div class="bc-sec-card bc-contact-card" data-id="${c.id}" style="cursor: pointer;">
                    <div class="bc-sec-card-header">
                        <div class="bc-bubble" style="background: ${color}; border: ${border};">${c.initials}</div>
                        <div class="bc-sec-card-name">${c.first} ${c.last}</div>
                    </div>
                    <div class="bc-sec-card-info">
                        ${phoneHtml}
                        ${emailHtml}
                    </div>
                    ${socialsHtml ? `<div class="bc-sec-card-socials" style="margin-top: 8px; display: flex; gap: 10px;">${socialsHtml}</div>` : ''}
                </div>
            `;
        }).join('');

        // Bind clicks for the cards and links
        this.dom.secList.querySelectorAll('.bc-contact-card').forEach(card => {
            card.onclick = () => {
                const contact = this.state.contacts.find(c => c.id === card.getAttribute('data-id'));
                if (contact) this.showSingleContactSidebar(contact);
            };
        });

        this.dom.secList.querySelectorAll('.bc-open-link').forEach(link => {
            link.onclick = (e) => {
                e.stopPropagation();
                const url = link.getAttribute('data-url');
                if (url && window.api) window.api.invoke('security:open-url', url);
                else if (url) window.open(url, '_blank');
            };
        });
    }

    getSocialsHtml(contact, iconSize = 12) {
        if (!contact.socials) return '';
        return Object.entries(contact.socials)
            .filter(([k, v]) => v && v.trim() !== '')
            .map(([k, v]) => {
                let icon = '';
                if (k === 'twitter') icon = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>`;
                else if (k === 'linkedin') icon = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>`;
                else if (k === 'instagram') icon = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`;
                else if (k === 'youtube') icon = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>`;
                else if (k === 'whatsapp') icon = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>`;
                else if (k === 'url') icon = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

                let href = v;
                if (k === 'whatsapp' && !href.startsWith('http')) {
                    // Discord — always use HTTPS (triggers 'Open in App' prompt)
                    href = 'https://discord.com/users/' + href.replace(/^@/, '');
                }
                else if (!href.startsWith('http')) href = 'https://' + href;
                return `<div class="bc-social-icon bc-open-link" style="cursor: pointer;" title="${k}" data-url="${href}">${icon}</div>`;
            }).join('');
    }

    showSingleContactSidebar(contact) {
        this.dom.secSidebar.style.display = 'flex';
        this.dom.secHeaderAction.innerHTML = `
            <button class="bc-btn-create" id="bc-sec-btn-edit-contact" style="width: auto; padding: 8px 14px; font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,0.15); display: flex; align-items: center; gap: 8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Edit Contact
            </button>
        `;

        this.dom.btnCloseSec.style.display = 'flex';
        this.dom.btnCloseSec.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>';
        this.dom.btnCloseSec.title = "Back";
        this.dom.btnCloseSec.onclick = () => {
            const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
            if (activeGroup && !activeGroup.isDefault) {
                // Go back to the group list if we are in a group context
                this.showSecondarySidebar(activeGroup.name);
            } else if (this.state.isBubbleView) {
                // If in bubble view but not in a specific group, go to empty state
                this.showEmptyStateSidebar();
            } else {
                // In list view, simply hide the sidebar
                this.dom.secSidebar.style.display = 'none';
            }
        };

        const phoneHtml = contact.phone ? `
        <div class="bc-sec-single-row">
            <div class="bc-sec-single-label">Phone</div>
            <div class="bc-sec-single-value">${contact.phone}</div>
        </div>` : '';

        const emailHtml = contact.email ? `
        <div class="bc-sec-single-row">
            <div class="bc-sec-single-label">Email</div>
            <div class="bc-sec-single-value">${contact.email}</div>
        </div>` : '';

        const notesSection = contact.notes ? `
        <div class="bc-sec-single-row" style="border-bottom: none; background: rgba(250, 163, 26, 0.03); margin: 12px; padding: 16px; border-radius: 12px; border: 1px solid rgba(250, 163, 26, 0.1);">
            <div class="bc-sec-single-label" style="color: #FFA31A; display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Notes
            </div>
            <div class="bc-sec-single-value" style="font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.8); white-space: pre-wrap;">${contact.notes}</div>
        </div>` : '';

        const socialsHtml = this.getSocialsHtml(contact, 28);
        const socialsSection = socialsHtml ? `
        <div class="bc-sec-single-row" style="border-bottom: none;">
            <div class="bc-sec-single-label">Socials & Links</div>
            <div class="bc-sec-card-socials" id="bc-sec-socials-container" style="margin-top: 12px; display: flex; gap: 14px; flex-wrap: wrap;">
                ${socialsHtml}
            </div>
        </div>` : '';

        this.dom.secList.innerHTML = `
        <div class="bc-sec-single-header">
            <div class="bc-sec-single-bubble" style="background: ${contact.color}">${contact.initials}</div>
            <div class="bc-sec-single-name">${contact.first} ${contact.last}</div>
        </div>
        
        ${phoneHtml}
        ${emailHtml}
        ${socialsSection}
        ${notesSection}
    `;

        const socialContainer = this.dom.secList.querySelector('#bc-sec-socials-container');
        if (socialContainer) {
            socialContainer.querySelectorAll('.bc-open-link').forEach(link => {
                link.onclick = (e) => {
                    e.stopPropagation();
                    const url = link.getAttribute('data-url');
                    if (url && window.api) window.api.invoke('security:open-url', url);
                    else if (url) window.open(url, '_blank');
                };
            });
        }

        const editBtn = this.dom.secHeaderAction.querySelector('#bc-sec-btn-edit-contact');
        if (editBtn) {
            editBtn.onclick = () => this.openEditContactModal(contact);
            editBtn.onmouseenter = () => editBtn.style.background = 'rgba(255,255,255,0.12)';
            editBtn.onmouseleave = () => editBtn.style.background = 'rgba(255,255,255,0.06)';
        }
    }

    showEmptyStateSidebar() {
        this.dom.secSidebar.style.display = 'flex';
        this.dom.secHeaderAction.innerHTML = '<h3 style="margin: 0; font-size: 15px; color: var(--bc-text-muted);">Create your bubble groups</h3>';
        this.dom.btnCloseSec.style.display = 'none';

        const pins = this.state.quickPins || [];
        const hasPins = pins.length > 0;

        // Quick Access section (when pins exist) or Welcome section
        let topSection = '';
        if (hasPins) {
            // Quick Access grid
            let pinSlots = '';
            for (let i = 0; i < 4; i++) {
                if (pins[i]) {
                    const p = pins[i];
                    if (p.type === 'group') {
                        // Group pin — bubble with decorative dots beside it
                        pinSlots += `
                            <div class="bc-quick-pin bc-quick-pin-group" data-pin-id="${p.id}" title="${p.name}">
                                <div class="bc-qp-remove" data-remove-id="${p.id}">×</div>
                                <div style="position: relative;">
                                    <div class="bc-qp-bubble bc-qp-group-bubble" style="background: ${p.color};">${p.initials}</div>
                                    <div style="position: absolute; top: -4px; right: -6px; width: 10px; height: 10px; border-radius: 50%; background: ${p.color};"></div>
                                    <div style="position: absolute; top: -10px; right: 2px; width: 6px; height: 6px; border-radius: 50%; background: ${p.color};"></div>
                                </div>
                                <div class="bc-qp-name">${p.name}</div>
                            </div>`;
                    } else {
                        // Contact pin — simple bubble
                        pinSlots += `
                            <div class="bc-quick-pin" data-pin-id="${p.id}" title="${p.name}">
                                <div class="bc-qp-remove" data-remove-id="${p.id}">×</div>
                                <div class="bc-qp-bubble" style="background: ${p.color};">${p.initials}</div>
                                <div class="bc-qp-name">${p.name}</div>
                            </div>`;
                    }
                } else {
                    pinSlots += `
                        <div class="bc-quick-pin-empty">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                            <span>Drag here</span>
                        </div>`;
                }
            }
            topSection = `
                <div style="width: 100%; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bc-accent)" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                        <span style="font-size: 13px; font-weight: 600; color: var(--bc-text-main); text-transform: uppercase; letter-spacing: 0.5px;">Quick Access</span>
                    </div>
                    <div class="bc-quick-access">
                        ${pinSlots}
                    </div>
                </div>

                <button class="bc-btn-add-bubble" id="bc-sec-btn-add-contact" style="width: 100%; padding: 12px; font-size: 15px; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add Bubble</button>
                <button class="bc-btn-create" id="bc-sec-btn-add-group" style="width: 100%; padding: 12px; font-size: 15px; border-radius: 8px; border: none; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;"><svg width="16" height="16" viewBox="-2 -2 28 28" fill="none" stroke="currentColor" stroke-width="2" style="overflow:visible"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"></circle><circle cx="22" cy="4" r="2.5" fill="currentColor" stroke="none"></circle><circle cx="20" cy="20" r="1.8" fill="currentColor" stroke="none"></circle></svg> Create Bubble Group</button>`;
        } else {
            // Welcome content
            topSection = `
                <div style="margin-bottom: 24px; color: var(--bc-accent); opacity: 0.8;">
                    <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="15" cy="15" r="5"></circle><circle cx="9" cy="9" r="4"></circle><circle cx="16" cy="6" r="3"></circle></svg>
                </div>
                <h3 style="color: var(--bc-text-main); font-size: 18px; font-weight: 600; margin-bottom: 12px;">Welcome to Bubbles</h3>
                <p style="color: var(--bc-text-muted); font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
                    Welcome to the physics canvas. Drag and drop floating contacts into groups to perfectly organize your network.
                </p>

                <button class="bc-btn-add-bubble" id="bc-sec-btn-add-contact" style="width: 100%; padding: 12px; font-size: 15px; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add Bubble</button>
                <button class="bc-btn-create" id="bc-sec-btn-add-group" style="width: 100%; padding: 12px; font-size: 15px; border-radius: 8px; border: none; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;"><svg width="16" height="16" viewBox="-2 -2 28 28" fill="none" stroke="currentColor" stroke-width="2" style="overflow:visible"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"></circle><circle cx="22" cy="4" r="2.5" fill="currentColor" stroke="none"></circle><circle cx="20" cy="20" r="1.8" fill="currentColor" stroke="none"></circle></svg> Create Bubble Group</button>

                <div style="display: flex; flex-direction: column; gap: 16px; text-align: left; width: 100%; margin-top: 32px; background: rgba(255, 255, 255, 0.03); padding: 16px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                        <div style="color: var(--bc-accent); font-weight: bold;">1.</div>
                        <div style="color: var(--bc-text-main); font-size: 13px; line-height: 1.4;">Double-click a floating contact to open their details panel.</div>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                        <div style="color: var(--bc-accent); font-weight: bold;">2.</div>
                        <div style="color: var(--bc-text-main); font-size: 13px; line-height: 1.4;">Double-click a core group bubble to update this side panel.</div>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                        <div style="color: var(--bc-accent); font-weight: bold;">3.</div>
                        <div style="color: var(--bc-text-main); font-size: 13px; line-height: 1.4;">Head to <strong style="color: var(--bc-accent); cursor: pointer;" id="bc-welcome-settings-link">Settings</strong> to explore more features and experimental options.</div>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                        <div style="color: var(--bc-accent); font-weight: bold;">4.</div>
                        <div style="color: var(--bc-text-main); font-size: 13px; line-height: 1.4;">Drag any bubble to the sidebar edge to pin it for quick access.</div>
                    </div>
                </div>`;
        }

        this.dom.secList.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px 10px;">
                ${topSection}
            </div>
        `;

        // Bind buttons
        const addContactBtn = this.dom.secList.querySelector('#bc-sec-btn-add-contact');
        if (addContactBtn) addContactBtn.onclick = () => this.openAddContactModal();

        const addGroupBtn = this.dom.secList.querySelector('#bc-sec-btn-add-group');
        if (addGroupBtn) addGroupBtn.onclick = () => this.dom.addGroupBtn.click();

        const settingsLink = this.dom.secList.querySelector('#bc-welcome-settings-link');
        if (settingsLink) settingsLink.onclick = () => { if (this.dom.settingsBtn) this.dom.settingsBtn.click(); };

        // Bind quick pin clicks — open sidebar for that contact/group
        this.dom.secList.querySelectorAll('.bc-quick-pin').forEach(el => {
            const pinId = el.dataset.pinId;
            el.onclick = (e) => {
                if (e.target.closest('.bc-qp-remove')) return; // skip if clicking remove
                const contact = this.state.contacts.find(c => c.id === pinId);
                if (contact) {
                    this.showSingleContactSidebar(contact);
                    return;
                }
                const group = this.state.groups.find(g => g.id === pinId);
                if (group) {
                    this.showSecondarySidebar(group.name);
                }
            };
        });

        // Bind remove buttons
        this.dom.secList.querySelectorAll('.bc-qp-remove').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const removeId = btn.dataset.removeId;
                this.state.quickPins = (this.state.quickPins || []).filter(p => p.id !== removeId);
                this.saveData();
                this.showEmptyStateSidebar();
            };
        });
    }

    renderList() {
        this.dom.contactsContainer.innerHTML = '';
        let filteredContacts = this.state.contacts;
        if (this.state.selectedGroupId !== 'all') {
            const group = this.state.groups.find(g => g.id === this.state.selectedGroupId);
            if (group) filteredContacts = this.state.contacts.filter(c => group.contacts.includes(c.id));
        }

        // Apply search filter
        const q = this.state.searchQuery || '';
        if (q) {
            filteredContacts = filteredContacts.filter(c => {
                const name = `${c.first} ${c.last}`.toLowerCase();
                const initials = (c.initials || '').toLowerCase();
                const phone = (c.phone || '').toLowerCase();
                const email = (c.email || '').toLowerCase();
                return name.includes(q) || initials.includes(q) || phone.includes(q) || email.includes(q);
            });
        }

        if (filteredContacts.length === 0) {
            this.dom.contactsContainer.innerHTML = `<div style="padding: 24px; color: var(--bc-text-muted);">${q ? 'No matching contacts.' : 'No contacts.'}</div>`;
            return;
        }

        filteredContacts.sort((a, b) => (a.first + a.last).localeCompare(b.first + b.last));
        const byLetter = filteredContacts.reduce((acc, c) => {
            const letter = c.first[0]?.toUpperCase() || '?';
            if (!acc[letter]) acc[letter] = [];
            acc[letter].push(c);
            return acc;
        }, {});

        Object.keys(byLetter).sort().forEach(letter => {
            let rows = byLetter[letter].map(c => {
                const color = c.color === 'transparent' ? '#3A3A3E' : c.color;
                const border = c.color === 'transparent' ? '1px solid rgba(255,255,255,0.2)' : 'none';
                return `
                <div class="bc-contact-row" data-id="${c.id}" style="padding: 10px 0;">
                    <div class="bc-col-name">
                        <div class="bc-bubble" style="background: ${color}; border: ${border}; width: 48px; height: 48px; font-size: 16px;">${c.initials}</div>
                        <span style="font-size: 16px; font-weight: 500;">${c.first} ${c.last}</span>
                    </div>
                    <div class="bc-col-phone" style="font-size: 14px; display: flex; align-items: center; gap: 8px;">
                        ${c.phone ? `<span class="bc-copyable" data-copy="${c.phone}" title="Click to copy">${c.phone}</span>` : ''}
                        ${this.state.whatsappCallEnabled && c.phone ? `
                            <div class="bc-btn-whatsapp-call" data-phone="${c.phone}" style="width: 22px; height: 22px; border-radius: 50%; background: #25D366; display: flex; align-items: center; justify-content: center; cursor: pointer;" title="WhatsApp Call">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </div>
                        ` : ''}
                        ${this.state.telegramChatEnabled && c.phone ? `
                            <div class="bc-btn-telegram-chat" data-phone="${c.phone}" style="width: 22px; height: 22px; border-radius: 50%; background: #0088cc; display: flex; align-items: center; justify-content: center; cursor: pointer;" title="Telegram Chat">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4.462 15.598c-.145.206-.419.33-.679.33-.083 0-.166-.013-.248-.04l-3.535-1.144c-.237-.076-.505-.078-.743-.004l-3.536 1.114c-.08-.027-.163-.04-.246-.04-.26 0-.534.124-.679.33l-1.42 2.029-.427-4.444c1.111-1.026 2.361-2.022 3.738-2.98l7.536 5.253-1.42-2.029zm1.038-6.198l-1.056 8.525-4.444-1.42L7.056 9.475l11.111-4.075z"/></svg>
                            </div>
                        ` : ''}
                    </div>
                    <div class="bc-col-email" style="font-size: 14px;">${c.email ? `<span class="bc-copyable" data-copy="${c.email}" title="Click to copy">${c.email}</span>` : ''}</div>
                    <div class="bc-col-socials" style="display: flex; gap: 8px; align-items: center;">
                        ${this.getSocialsHtml(c, 22)}
                    </div>
                </div>
            `;
            }).join('');
            this.dom.contactsContainer.insertAdjacentHTML('beforeend', `<div class="bc-letter-group"><div class="bc-letter">${letter}</div>${rows}</div>`);
        });

        this.dom.contactsContainer.querySelectorAll('.bc-btn-list-edit').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.closest('.bc-contact-row').getAttribute('data-id');
                const contact = this.state.contacts.find(c => c.id == id);
                if (contact) this.openEditContactModal(contact);
            };
        });

        this.dom.contactsContainer.querySelectorAll('.bc-btn-whatsapp-call').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const phone = btn.getAttribute('data-phone').replace(/\D/g, '');
                if (phone) {
                    const url = `https://wa.me/${phone}`;
                    if (window.api) window.api.invoke('security:open-url', url);
                    else window.open(url, '_blank');
                }
            };
        });

        this.dom.contactsContainer.querySelectorAll('.bc-btn-telegram-chat').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const phone = btn.getAttribute('data-phone').replace(/\D/g, '');
                if (phone) {
                    const url = `https://t.me/+${phone}`;
                    if (window.api) window.api.invoke('security:open-url', url);
                    else window.open(url, '_blank');
                }
            };
        });

        this.dom.contactsContainer.querySelectorAll('.bc-open-link').forEach(link => {
            link.onclick = (e) => {
                e.stopPropagation();
                const url = link.getAttribute('data-url');
                if (url) {
                    if (window.api) window.api.invoke('security:open-url', url);
                    else window.open(url, '_blank');
                }
            };
        });

        this.dom.contactsContainer.querySelectorAll('.bc-contact-row').forEach(row => {
            row.onclick = () => {
                const id = row.getAttribute('data-id');
                const contact = this.state.contacts.find(c => c.id == id);
                if (contact) this.showSingleContactSidebar(contact);
            };
        });

        // Click-to-copy for phone & email
        this.dom.contactsContainer.querySelectorAll('.bc-copyable').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                const text = el.getAttribute('data-copy');
                if (!text) return;
                navigator.clipboard.writeText(text).then(() => {
                    const orig = el.textContent;
                    el.textContent = 'Copied!';
                    el.style.color = 'var(--bc-accent)';
                    setTimeout(() => {
                        el.textContent = orig;
                        el.style.color = '';
                    }, 1000);
                });
            };
        });
    }
}

// Standalone Web Boot
document.addEventListener('DOMContentLoaded', async () => {
    const app = new BubbleContactApp();
    await app.init();
    app.bindEventsAndInit();
});
