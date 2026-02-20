/**
 * Bubble Contact - App Entry
 */

import BubbleEngine from './bubble_engine.js';

export default class BubbleContactApp {
    constructor(sdk) {
        this.sdk = sdk;

        // Default Application State
        const defaultState = {
            contacts: [
                { id: 1, first: "Blake", last: "Torres", phone: "+1 555 020 3040", email: "blake.t@example.com", initials: "BT", color: "var(--bc-color-a)" },
                { id: 2, first: "Casey", last: "Kim", phone: "+1 555 030 4050", email: "casey.k@example.com", initials: "CK", color: "var(--bc-color-b)" },
                { id: 3, first: "Dana", last: "Okafor", phone: "+44 7700 900001", email: "dana.o@example.com", initials: "DO", color: "var(--bc-color-c)" },
                { id: 4, first: "Eli", last: "Nash", phone: "+1 555 050 6070", email: "eli.n@example.com", initials: "EN", color: "var(--bc-color-d)" },
                { id: 5, first: "Faye", last: "Luo", phone: "+1 555 060 7080", email: "faye.l@example.com", initials: "FL", color: "var(--bc-color-e)" }
            ],
            groups: [
                { id: 'all', name: 'All Contacts', contacts: [], isDefault: true },
                { id: 'g_studio_os', name: 'Studio OS', contacts: [1, 2, 3] }
            ]
        };

        let savedData = null;
        try {
            const raw = localStorage.getItem('bc_app_data');
            if (raw) savedData = JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse local storage', e);
        }

        this.state = {
            ...(savedData || defaultState),
            selectedGroupId: 'all',
            isBubbleView: false,
            renderedGroupId: null, // tracks which group is currently rendered on canvas; null = nothing rendered
            positions: savedData?.positions || {}
        };
    }

    saveData() {
        const dataToSave = {
            contacts: this.state.contacts,
            groups: this.state.groups,
            positions: this.state.positions
        };
        localStorage.setItem('bc_app_data', JSON.stringify(dataToSave));
    }

    flushPositions() {
        if (this.engine) {
            const live = this.engine.getPositions();
            const liveCount = Object.keys(live).length;
            console.log('[BC] flushPositions: engine has', liveCount, 'bubbles, live positions:', JSON.stringify(live));
            // Only merge positions that actually exist in the live engine
            // Never overwrite good saved positions with zeros from a cleared/empty engine
            for (const [id, pos] of Object.entries(live)) {
                if (pos.x !== 0 || pos.y !== 0) {
                    this.state.positions[id] = pos;
                }
            }
            console.log('[BC] flushPositions: merged state.positions now has', Object.keys(this.state.positions).length, 'entries');
            this.saveData();
        }
    }

    async open() {
        const content = document.createElement('div');
        this.content = content;
        content.className = 'bubble-contact-app';

        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './style.css';
        document.head.appendChild(link);

        const bubbleLink = document.createElement('link');
        bubbleLink.rel = 'stylesheet';
        bubbleLink.href = './bubble.css';
        document.head.appendChild(bubbleLink);

        // Sidebar and Layout
        const sidebar = `
            <div class="bc-sidebar">
                <div class="bc-header">
                    <svg class="bc-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="15" cy="15" r="5"></circle><circle cx="9" cy="9" r="4"></circle><circle cx="16" cy="6" r="3"></circle></svg>
                    <h2>Bubbles</h2>
                </div>
                
                <div class="bc-search-container">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; opacity: 0.5;">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" placeholder="Search contacts...">
                </div>

                <div class="bc-groups" id="bc-sidebar-groups">
                    <!-- Injected by renderSidebar() -->
                </div>

                <div style="flex-grow: 1;"></div>
                <div class="bc-sidebar-footer">
                    <button class="bc-footer-btn" title="Export Backup" id="bc-btn-export">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    </button>
                    <button class="bc-footer-btn" title="Import Backup" id="bc-btn-import">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                    <button class="bc-footer-btn" title="Settings" id="bc-btn-settings">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    </button>
                </div>
            </div>
        `;

        const mainArea = `
            <div class="bc-main">
                <div class="bc-main-header">
                    <h1 class="bc-main-title" id="bc-main-title">All contacts</h1>
                    <div class="bc-actions">
                        <button title="Bubble View" id="bc-toggle-bubble">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="15" cy="15" r="5"></circle><circle cx="9" cy="9" r="4"></circle><circle cx="16" cy="6" r="3"></circle></svg>
                        </button>
                        <button class="bc-btn-primary" id="bc-btn-add-group">+</button>
                    </div>
                </div>

                <div class="bc-view-container">
                    <div class="bc-list-view" id="bc-list-view">
                        <div class="bc-list-header">
                            <div>NAME</div>
                            <div>PHONE</div>
                            <div>EMAIL</div>
                            <div>SOCIALS</div>
                        </div>
                        
                        <div class="bc-contacts-container" id="bc-contacts-container">
                            <!-- Injected by renderList() -->
                        </div>
                    </div>
                    
                    <div class="bc-secondary-sidebar" id="bc-secondary-sidebar" style="display: none;">
                        <div class="bc-sec-header">
                            <h3 id="bc-sec-title">Group Name</h3>
                            <div style="display: flex; gap: 8px;">
                                <button id="bc-btn-close-sec">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                                <button id="bc-btn-home-sec" title="Show All Contacts">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                </button>
                            </div>
                        </div>
                        <div class="bc-sec-content" id="bc-sec-list">
                            <!-- Injected contact cards -->
                        </div>
                    </div>

                    <div class="bc-bubble-view" id="bc-bubble-view" style="display: none;">
                        <!-- Deep Purple Canvas for Bubble Nodes -->
                    </div>
                </div>
            </div>
        `;

        const modalArea = `
            <div class="bc-modal-overlay" id="bc-add-group-modal" style="display: none;">
                <div class="bc-modal">
                    <h3 class="bc-modal-title" id="bc-group-modal-title" style="margin: 0; font-size: 18px;">New Group</h3>
                    <input type="text" class="bc-modal-input" placeholder="Group Name e.g. Family" id="bc-group-name-input">
                    
                    <h3 class="bc-modal-title" style="margin-top: 8px;">Theme Color</h3>
                    <div class="bc-color-picker" id="bc-color-picker">
                        <div class="bc-color-swatch selected" data-color="#4c1d95" style="background: var(--bc-color-d)"></div>
                        <div class="bc-color-swatch" data-color="#2E81FF" style="background: var(--bc-color-a)"></div>
                        <div class="bc-color-swatch" data-color="#00D348" style="background: var(--bc-color-b)"></div>
                        <div class="bc-color-swatch" data-color="#FFA31A" style="background: var(--bc-color-c)"></div>
                        <div class="bc-color-swatch" data-color="#FF4757" style="background: var(--bc-color-e)"></div>
                        <div class="bc-color-swatch" data-color="#000000" style="background: #FFFFFF"></div>
                    </div>

                    <h3 class="bc-modal-title bc-group-edit-only" style="margin-top: 8px; display: none;">Group Members</h3>
                    <div class="bc-group-edit-only" id="bc-group-members-list" style="display: none; max-height: 180px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px; flex-direction: column; gap: 6px; border: 1px solid rgba(255,255,255,0.05);">
                        <!-- Checkboxes injected here -->
                    </div>

                    <div class="bc-modal-actions" style="margin-top: 4px; display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <button class="bc-btn-cancel bc-group-edit-only" id="bc-btn-delete-group" style="display: none; color: #111; background: #fff; padding: 6px; border-radius: 4px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                        <div style="display: flex; gap: 12px; margin-left: auto;">
                            <button class="bc-btn-cancel" id="bc-btn-cancel-group">Cancel</button>
                            <button class="bc-btn-create" id="bc-btn-create-group">Create</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bc-modal-overlay" id="bc-add-contact-modal" style="display: none; z-index: 1000;">
                <div class="bc-modal" style="width: 440px; gap: 12px; padding: 20px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div id="bc-new-contact-avatar" style="width: 52px; height: 52px; border-radius: 50%; background: var(--bc-color-a); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: white;">?</div>
                        <h3 class="bc-modal-title" id="bc-contact-modal-title" style="margin: 0; font-size: 18px;">New Contact</h3>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div style="position: relative;">
                            <svg style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--bc-text-muted); pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            <input type="text" class="bc-modal-input" placeholder="First Name" id="bc-contact-first" style="width: 100%; box-sizing: border-box; padding-left: 34px;">
                        </div>
                        <div style="position: relative;">
                            <input type="text" class="bc-modal-input" placeholder="Last Name" id="bc-contact-last" style="width: 100%; box-sizing: border-box;">
                        </div>
                    </div>
                    
                    <div style="position: relative;">
                        <svg style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--bc-text-muted); pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <input type="text" class="bc-modal-input" placeholder="Phone Number" id="bc-contact-phone" style="width: 100%; box-sizing: border-box; padding-left: 34px;">
                    </div>
                    
                    <div style="position: relative;">
                        <svg style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--bc-text-muted); pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        <input type="text" class="bc-modal-input" placeholder="Email Address" id="bc-contact-email" style="width: 100%; box-sizing: border-box; padding-left: 34px;">
                    </div>
                    
                    <h4 style="margin: 4px 0 0 0; font-size: 13px; color: var(--bc-text-muted);">Social Links</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div style="position: relative;">
                            <svg style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--bc-text-muted); pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                            <input type="text" class="bc-modal-input" placeholder="Twitter URL" id="bc-contact-twitter" style="width: 100%; box-sizing: border-box; padding-left: 34px;">
                        </div>
                        <div style="position: relative;">
                            <svg style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--bc-text-muted); pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                            <input type="text" class="bc-modal-input" placeholder="LinkedIn URL" id="bc-contact-linkedin" style="width: 100%; box-sizing: border-box; padding-left: 34px;">
                        </div>
                        <div style="position: relative;">
                            <svg style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--bc-text-muted); pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                            <input type="text" class="bc-modal-input" placeholder="Instagram URL" id="bc-contact-instagram" style="width: 100%; box-sizing: border-box; padding-left: 34px;">
                        </div>
                        <div style="position: relative;">
                            <svg style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--bc-text-muted); pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                            <input type="text" class="bc-modal-input" placeholder="YouTube URL" id="bc-contact-youtube" style="width: 100%; box-sizing: border-box; padding-left: 34px;">
                        </div>
                        <div style="position: relative;">
                            <svg style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--bc-text-muted); pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            <input type="text" class="bc-modal-input" placeholder="WhatsApp Number" id="bc-contact-whatsapp" style="width: 100%; box-sizing: border-box; padding-left: 34px;">
                        </div>
                        <div style="position: relative;">
                            <svg style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--bc-text-muted); pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            <input type="text" class="bc-modal-input" placeholder="Website URL" id="bc-contact-url" style="width: 100%; box-sizing: border-box; padding-left: 34px;">
                        </div>
                    </div>

                    <div class="bc-modal-actions" style="margin-top: 4px; display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <button class="bc-btn-cancel" id="bc-btn-delete-contact" style="display: none; color: #111; background: #fff; padding: 6px; border-radius: 4px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                        <div style="display: flex; gap: 12px; margin-left: auto;">
                            <button class="bc-btn-cancel" id="bc-btn-cancel-contact">Cancel</button>
                            <button class="bc-btn-create" id="bc-btn-create-contact" style="background: #3A69F0;">Add Contact</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        content.innerHTML = sidebar + mainArea + modalArea;

        this.bindEventsAndInit();

        await this.sdk.ui.openWindow({
            content: content,
            title: "Bubble Contact",
            width: 1400,
            height: 850
        });
    }

    bindEventsAndInit() {
        const c = this.content;
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
            colorSwatches: c.querySelectorAll('.bc-color-swatch'),
            exportBtn: c.querySelector('#bc-btn-export'),
            importBtn: c.querySelector('#bc-btn-import'),
            settingsBtn: c.querySelector('#bc-btn-settings'),
            secSidebar: c.querySelector('#bc-secondary-sidebar'),
            secTitle: c.querySelector('#bc-sec-title'),
            secList: c.querySelector('#bc-sec-list'),
            btnCloseSec: c.querySelector('#bc-btn-close-sec'),
            btnHomeSec: c.querySelector('#bc-btn-home-sec'),

            // New Contact Modal Elements
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
                url: c.querySelector('#bc-contact-url')
            }
        };

        // Initialize Engine with a callback to handle merges
        this.engine = new BubbleEngine(this.dom.bubbleView, (groupName, contact) => {
            const group = this.state.groups.find(g => g.name === groupName);
            if (group && !group.contacts.includes(contact.id)) {
                // Update our system state
                group.contacts.push(contact.id);
                this.saveData();

                // Trigger UI refresh
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
            // Check logic to determine if we should allow overlap visuals/merging
            const group = this.state.groups.find(g => g.name === groupName);
            return group ? group.contacts.includes(contactId) : false;
        }, (groupName) => {
            this.openEditGroupModal(groupName);
        }, (type, id, x, y) => {
            this.state.positions[id] = { x, y };
            this.saveData();
        });

        // Setup Home Button for sidebar
        this.dom.btnHomeSec.onclick = () => {
            const defaultGroupDiv = this.dom.sidebarGroups.firstChild;
            if (defaultGroupDiv) defaultGroupDiv.click();
        };

        // Default Close Secondary Sidebar Behavior
        this.dom.btnCloseSec.onclick = () => {
            this.dom.secSidebar.style.display = 'none';
        };

        // View Toggling
        this.dom.toggleBubble.onclick = () => {
            this.state.isBubbleView = !this.state.isBubbleView;
            if (this.state.isBubbleView) {
                this.dom.listView.style.display = 'none';
                this.dom.bubbleView.style.display = 'flex';
                this.dom.toggleBubble.style.background = 'var(--bc-accent)';
                this.dom.mainTitle.textContent = 'Bubble Groups';

                const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
                if (!activeGroup || activeGroup.isDefault) {
                    this.showEmptyStateSidebar();
                } else {
                    this.showSecondarySidebar(activeGroup.name);
                }

                // Only rebuild if the canvas doesn't already match the current group selection
                if (this.state.renderedGroupId !== this.state.selectedGroupId) {
                    this.flushPositions();
                    this.engine.clear();
                    this.state.renderedGroupId = this.state.selectedGroupId;
                    const ag = this.state.groups.find(g => g.id === this.state.selectedGroupId);
                    if (!ag || ag.isDefault) {
                        this.engine.scatterContacts(this.state.contacts, this.state.positions);
                        const customGroups = this.state.groups.filter(g => !g.isDefault);
                        customGroups.forEach(g => {
                            const gc = this.state.contacts.filter(c => g.contacts.includes(c.id));
                            const pos = this.state.positions[g.id];
                            this.engine.addGroupBubble(g.name, g.id, gc, g.color, false, pos?.x, pos?.y);
                        });
                    } else {
                        const gc = this.state.contacts.filter(c => ag.contacts.includes(c.id));
                        this.engine.scatterContacts(gc, this.state.positions);
                        const pos = this.state.positions[ag.id];
                        this.engine.addGroupBubble(ag.name, ag.id, gc, ag.color, true, pos?.x, pos?.y);
                    }
                }
                // else: canvas already shows the right group — just showing it again, no rebuild needed
            } else {
                // Flush live positions before hiding so they survive the next show
                this.flushPositions();
                this.dom.listView.style.display = 'flex';
                this.dom.bubbleView.style.display = 'none';
                this.dom.secSidebar.style.display = 'none';
                this.dom.toggleBubble.style.background = 'rgba(255, 255, 255, 0.1)';

                // Restore heading logic based on selection
                const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
                this.dom.mainTitle.textContent = activeGroup && !activeGroup.isDefault ? activeGroup.name + ' contacts' : 'All contacts';
            }
        };

        // Modal Color Selection Logic
        this.selectedGroupColor = '#4c1d95'; // Default color
        this.dom.colorSwatches.forEach(swatch => {
            swatch.onclick = () => {
                this.dom.colorSwatches.forEach(s => s.classList.remove('selected'));
                swatch.classList.add('selected');
                this.selectedGroupColor = swatch.getAttribute('data-color') === '#000000' ? '#FFFFFF' : swatch.getAttribute('data-color');
            };
        });

        this.dom.addGroupBtn.onclick = () => {
            if (this.state.selectedGroupId && this.state.selectedGroupId !== 'all') {
                const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
                if (activeGroup && !activeGroup.isDefault) {
                    this.openEditGroupModal(activeGroup.name);
                    return;
                }
            }

            this.editingGroupId = null;
            this.dom.groupModalTitle.textContent = "New Group";
            this.dom.modalCreate.textContent = "Create";

            const editNodes = this.dom.modalOverlay.querySelectorAll('.bc-group-edit-only');
            editNodes.forEach(n => n.style.display = 'none');

            this.dom.modalOverlay.style.display = 'flex';
            this.dom.modalInput.value = '';
            this.dom.modalInput.focus();

            // Reset color selection
            this.dom.colorSwatches.forEach(s => s.classList.remove('selected'));
            this.dom.colorSwatches[0].classList.add('selected');
            this.selectedGroupColor = '#4c1d95';
        };

        this.openEditGroupModal = (groupName) => {
            const group = this.state.groups.find(g => g.name === groupName);
            if (!group || group.isDefault) return;

            this.editingGroupId = group.id;
            this.dom.groupModalTitle.textContent = "Edit Group";
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
                this.selectedGroupColor = '#4c1d95';
            }

            // Populate Checkboxes
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

            let wasNewGroup = false;

            if (this.editingGroupId) {
                const group = this.state.groups.find(g => g.id === this.editingGroupId);
                if (group) {
                    group.name = val;
                    group.color = this.selectedGroupColor;

                    const checkedBoxes = Array.from(this.dom.groupMembersList.querySelectorAll('.bc-group-member-checkbox:checked'));
                    group.contacts = checkedBoxes.map(cb => isNaN(cb.value) ? cb.value : Number(cb.value));

                    if (this.state.selectedGroupId === group.id) {
                        this.dom.mainTitle.textContent = group.name + ' contacts';
                        this.showSecondarySidebar(group.name);
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
                    const group = this.state.groups[this.state.groups.length - 1]; // Newly added group
                    this.engine.addGroupBubble(val, group.id, [], this.selectedGroupColor, false);
                } else {
                    // Flush live positions BEFORE clearing so they survive the rebuild
                    this.flushPositions();
                    this.engine.clear();
                    this.state.renderedGroupId = this.state.selectedGroupId;
                    if (activeGroup && activeGroup.isDefault) {
                        this.engine.scatterContacts(this.state.contacts, this.state.positions);
                        const customGroups = this.state.groups.filter(g => !g.isDefault);
                        customGroups.forEach(g => {
                            const gc = this.state.contacts.filter(c => g.contacts.includes(c.id));
                            const pos = this.state.positions[g.id];
                            this.engine.addGroupBubble(g.name, g.id, gc, g.color, false, pos?.x, pos?.y);
                        });
                    } else if (activeGroup) {
                        const gc = this.state.contacts.filter(c => activeGroup.contacts.includes(c.id));
                        this.engine.scatterContacts(gc, this.state.positions);
                        const pos = this.state.positions[activeGroup.id];
                        this.engine.addGroupBubble(activeGroup.name, activeGroup.id, gc, activeGroup.color, true, pos?.x, pos?.y);
                    }
                }
            } else {
                this.renderList();
            }
        };

        this.dom.groupModalDelete.onclick = () => {
            if (!this.editingGroupId) return;
            if (confirm("Are you sure you want to delete this group? The contacts will not be deleted.")) {
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
                    const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
                    this.flushPositions();
                    this.engine.clear();
                    this.state.renderedGroupId = this.state.selectedGroupId;
                    if (activeGroup && activeGroup.isDefault) {
                        this.engine.scatterContacts(this.state.contacts, this.state.positions);
                        const customGroups = this.state.groups.filter(g => !g.isDefault);
                        customGroups.forEach(g => {
                            const gc = this.state.contacts.filter(c => g.contacts.includes(c.id));
                            const pos = this.state.positions[g.id];
                            this.engine.addGroupBubble(g.name, g.id, gc, g.color, false, pos?.x, pos?.y);
                        });
                        this.showEmptyStateSidebar();
                    }
                }
            }
        };

        // --- Contact Modal Logic ---
        this.contactColors = ['#2E81FF', '#00D348', '#FFA31A', '#6C5CE7', '#FF4757'];

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
            const first = this.dom.contactInputs.first.value.trim();
            const last = this.dom.contactInputs.last.value.trim();

            if (!first && !last) {
                alert("Please enter a name for the contact.");
                return;
            }

            if (this.editingContactId) {
                // UPDATE Existing
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
                }
            } else {
                // CREATE New
                const newContact = {
                    id: 'c' + Date.now() + Math.floor(Math.random() * 1000),
                    first: first || '',
                    last: last || '',
                    initials: ((first.charAt(0) || '') + (last.charAt(0) || '')).toUpperCase() || '?',
                    phone: this.dom.contactInputs.phone.value.trim(),
                    email: this.dom.contactInputs.email.value.trim(),
                    color: this.selectedContactColor || this.contactColors[0],
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

                // Drop onto Canvas if in Bubble View
                if (this.state.isBubbleView) {
                    const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);
                    if (activeGroup && activeGroup.isDefault) {
                        const rect = this.dom.bubbleView.getBoundingClientRect();
                        const x = (rect.width || 800) / 2 + (Math.random() - 0.5) * 50;
                        const y = 80 + (Math.random() * 50);
                        this.engine.addContactBubble(newContact, x, y);
                        this.state.positions[newContact.id] = { x, y };
                    }
                }
            }

            const preEditId = this.editingContactId;
            this.saveData();
            this.dom.contactModalOverlay.style.display = 'none';
            this.editingContactId = null;

            // Trigger full refresh
            this.renderSidebar();
            this.renderList();

            if (this.state.isBubbleView) {
                const activeGroup = this.state.groups.find(g => g.id === this.state.selectedGroupId);

                if (preEditId) {
                    // Only EDIT path needs a full rebuild
                    this.flushPositions();
                    this.engine.clear();
                    this.state.renderedGroupId = this.state.selectedGroupId;
                    if (activeGroup && activeGroup.isDefault) {
                        this.engine.scatterContacts(this.state.contacts, this.state.positions);
                        const customGroups = this.state.groups.filter(g => !g.isDefault);
                        customGroups.forEach(g => {
                            const gc = this.state.contacts.filter(c => g.contacts.includes(c.id));
                            const pos = this.state.positions[g.id];
                            this.engine.addGroupBubble(g.name, g.id, gc, g.color, false, pos?.x, pos?.y);
                        });
                    } else if (activeGroup) {
                        const gc = this.state.contacts.filter(c => activeGroup.contacts.includes(c.id));
                        this.engine.scatterContacts(gc, this.state.positions);
                        const pos = this.state.positions[activeGroup.id];
                        this.engine.addGroupBubble(activeGroup.name, activeGroup.id, gc, activeGroup.color, true, pos?.x, pos?.y);
                    }
                } else {
                    // CREATE path: surgical add already happened above, nothing to rebuild
                }

                this.showSingleContactSidebar(this.state.contacts.find(c => c.id === preEditId) || this.state.contacts[this.state.contacts.length - 1]);
            } else {
                this.showSingleContactSidebar(this.state.contacts.find(c => c.id === preEditId) || this.state.contacts[this.state.contacts.length - 1]);
            }
        };

        this.dom.contactModalDelete.onclick = () => {
            if (!this.editingContactId) return;
            if (confirm("Are you sure you want to delete this contact?")) {
                // Remove from contacts
                this.state.contacts = this.state.contacts.filter(c => c.id !== this.editingContactId);
                delete this.state.positions[this.editingContactId];
                // Remove from all groups
                this.state.groups.forEach(g => {
                    if (g.contacts.includes(this.editingContactId)) {
                        g.contacts = g.contacts.filter(id => id !== this.editingContactId);
                    }
                });

                this.saveData();
                this.dom.contactModalOverlay.style.display = 'none';
                this.editingContactId = null;

                // Go Home/Default instead of vanishing - this also forces refresh
                this.dom.btnHomeSec.onclick();

                if (!this.state.isBubbleView) {
                    this.dom.secSidebar.style.display = 'none';
                }
            }
        };

        // Import / Export backup
        if (this.dom.exportBtn) {
            this.dom.exportBtn.onclick = () => {
                const dataStr = JSON.stringify({
                    contacts: this.state.contacts,
                    groups: this.state.groups
                }, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bubble_contacts_backup_${new Date().getTime()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
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
                            if (data && data.contacts && data.groups) {
                                this.state.contacts = data.contacts;
                                this.state.groups = data.groups;
                                this.saveData();

                                // Reset views
                                this.state.renderedGroupId = null;
                                this.state.selectedGroupId = 'all';
                                this.flushPositions();
                                this.engine.clear();
                                this.renderSidebar();
                                this.renderList();

                                // Rerender bubbles if we're in bubble view
                                if (this.state.isBubbleView) {
                                    this.state.renderedGroupId = 'all';
                                    setTimeout(() => {
                                        const customGroups = this.state.groups.filter(g => !g.isDefault);
                                        this.engine.scatterContacts(this.state.contacts, this.state.positions);
                                        customGroups.forEach(g => {
                                            const gc = this.state.contacts.filter(c => g.contacts.includes(c.id));
                                            const pos = this.state.positions[g.id];
                                            this.engine.addGroupBubble(g.name, g.id, gc, g.color, false, pos?.x, pos?.y);
                                        });
                                    }, 50);
                                }
                            }
                        } catch (err) {
                            console.error('Failed to parse backup JSON', err);
                        }
                    };
                    reader.readAsText(file);
                };
                input.click();
            };
        }

        // Complete Initial Rendering
        this.renderSidebar();
        this.renderList();

        // Set initial Add Button state for 'All Contacts'
        this.dom.addGroupBtn.innerHTML = '+<span style="font-size: 13px; margin-left: 6px;">New Group</span>';
        this.dom.addGroupBtn.title = 'Add New Group';
    }

    renderSidebar() {
        this.dom.sidebarGroups.innerHTML = '';
        this.state.groups.forEach(group => {
            const div = document.createElement('div');
            div.className = `bc-group-item ${this.state.selectedGroupId === group.id ? 'active' : ''}`;

            const count = group.isDefault ? this.state.contacts.length : group.contacts.length;

            if (group.isDefault) {
                div.innerHTML = `<span>${group.name}</span>`;
            } else {
                div.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${group.color || 'var(--bc-accent)'}; flex-shrink: 0;"></div>
                        <span>${group.name}</span>
                    </div>
                    <span class="bc-count">${count}</span>
                `;
            }

            div.onclick = () => {
                if (this.state.selectedGroupId === group.id && this.state.isBubbleView) {
                    // Selection didn't change, but we might want to refresh the inspector
                    if (group.isDefault) {
                        this.showEmptyStateSidebar();
                    } else {
                        this.showSecondarySidebar(group.name);
                    }
                    return;
                }

                this.state.selectedGroupId = group.id;

                if (group.isDefault) {
                    this.dom.addGroupBtn.innerHTML = '+<span style="font-size: 13px; margin-left: 6px;">New Group</span>';
                    this.dom.addGroupBtn.title = 'Add New Group';
                } else {
                    this.dom.addGroupBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M16 21v-2a4 4 0 0 0-4-4H5c-2.2 0-4 1.8-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="17" y1="11" x2="23" y2="11"></line></svg><span style="font-size: 13px; margin-left: 6px; vertical-align: middle;">Manage Members</span>';
                    this.dom.addGroupBtn.title = 'Manage Group Members';
                }

                // If switching groups, update the List view title
                if (!this.state.isBubbleView) {
                    this.dom.mainTitle.textContent = group.isDefault ? 'All contacts' : group.name + ' contacts';
                } else {
                    // Update and show the Inspector Sidebar when in Bubble View
                    if (!group.isDefault) {
                        this.showSecondarySidebar(group.name);
                    } else {
                        this.showEmptyStateSidebar();
                    }

                    // Refresh Bubble View Canvas
                    this.flushPositions();
                    this.engine.clear();
                    this.state.renderedGroupId = group.id;

                    // Debug: log position state during rebuild
                    console.log('[BC] Sidebar switch → group:', group.name, 'positions:', JSON.stringify(this.state.positions));

                    if (group.isDefault) {
                        // "All Contacts": Render all contacts and all custom groups
                        this.engine.scatterContacts(this.state.contacts, this.state.positions, true);
                        const customGroups = this.state.groups.filter(g => !g.isDefault);
                        customGroups.forEach(g => {
                            const gc = this.state.contacts.filter(c => g.contacts.includes(c.id));
                            const pos = this.state.positions[g.id];
                            this.engine.addGroupBubble(g.name, g.id, gc, g.color, false, pos?.x, pos?.y, true);
                        });
                    } else {
                        // Specific Group: Render the specific group bubble and scatter only its members
                        const groupContacts = this.state.contacts.filter(c => group.contacts.includes(c.id));
                        this.engine.scatterContacts(groupContacts, this.state.positions, true);
                        const pos = this.state.positions[group.id];
                        this.engine.addGroupBubble(group.name, group.id, groupContacts, group.color, true, pos?.x, pos?.y, true);
                    }
                }

                this.renderSidebar(); // re-render to update the visual 'active' class
                this.renderList();    // dynamically filter the List UI
            };
            this.dom.sidebarGroups.appendChild(div);
        });
    }

    showSecondarySidebar(groupName) {
        const group = this.state.groups.find(g => g.name === groupName);
        if (!group) return;

        this.dom.secSidebar.style.display = 'flex';
        this.dom.secTitle.textContent = group.name;

        // Handle Back/Close/Home Button logic based on view
        this.dom.btnCloseSec.style.display = 'flex';
        this.dom.btnHomeSec.style.display = 'flex';
        if (this.state.isBubbleView) {
            this.dom.btnCloseSec.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>';
            this.dom.btnCloseSec.title = "Back to Canvas";
            this.dom.btnCloseSec.onclick = () => this.showEmptyStateSidebar();
        } else {
            this.dom.btnCloseSec.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            this.dom.btnCloseSec.title = "Close";
            this.dom.btnCloseSec.onclick = () => { this.dom.secSidebar.style.display = 'none'; };
        }

        let filteredContacts = this.state.contacts;
        if (!group.isDefault) {
            filteredContacts = this.state.contacts.filter(c => group.contacts.includes(c.id));
        }

        const actionsHtml = `
            <div style="margin-top: 24px; text-align: center; padding-bottom: 20px;">
                <button class="bc-btn-create" id="bc-sec-btn-manage-group-sb" style="width: 100%; padding: 12px; font-size: 15px; border-radius: 8px;">
                    Manage Members & Edit Group
                </button>
            </div>
        `;

        if (filteredContacts.length === 0) {
            this.dom.secList.innerHTML = '<div style="color: var(--bc-text-muted); font-size: 13px;">No contacts in this group yet.</div>' + actionsHtml;
            const btn = this.dom.secList.querySelector('#bc-sec-btn-manage-group-sb');
            if (btn) btn.onclick = () => this.openEditGroupModal(group.name);
            return;
        }

        const cardsHtml = filteredContacts.map(c => `
            <div class="bc-sec-card">
                <div class="bc-sec-card-header">
                    <div class="bc-bubble" style="background: ${c.color}">${c.initials}</div>
                    <div class="bc-sec-card-name">${c.first} ${c.last}</div>
                </div>
                <div class="bc-sec-card-info">
                    <div>${c.phone}</div>
                    <div>${c.email}</div>
                    <div class="bc-sec-card-socials">
                        <div class="bc-social-icon" title="Twitter"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg></div>
                        <div class="bc-social-icon" title="LinkedIn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg></div>
                        <div class="bc-social-icon" title="Website"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg></div>
                    </div>
                </div>
            </div>
        `).join('');

        this.dom.secList.innerHTML = cardsHtml + actionsHtml;
        const btn = this.dom.secList.querySelector('#bc-sec-btn-manage-group-sb');
        if (btn) btn.onclick = () => this.openEditGroupModal(group.name);
    }

    showSingleContactSidebar(contact) {
        this.dom.secSidebar.style.display = 'flex';
        this.dom.secTitle.textContent = 'Contact Details';

        // Handle Back/Close/Home Button logic based on view
        this.dom.btnCloseSec.style.display = 'flex';
        this.dom.btnHomeSec.style.display = 'flex';
        if (this.state.isBubbleView) {
            this.dom.btnCloseSec.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>';
            this.dom.btnCloseSec.title = "Back to Canvas";
            this.dom.btnCloseSec.onclick = () => this.showEmptyStateSidebar();
        } else {
            this.dom.btnCloseSec.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            this.dom.btnCloseSec.title = "Close";
            this.dom.btnCloseSec.onclick = () => { this.dom.secSidebar.style.display = 'none'; };
        }

        const singleHtml = `
            <div class="bc-sec-single-header">
                <div class="bc-sec-single-bubble" style="background: ${contact.color}">${contact.initials}</div>
                <div class="bc-sec-single-name">${contact.first} ${contact.last}</div>
            </div>
            
            <div class="bc-sec-single-row">
                <div class="bc-sec-single-label">Phone Number</div>
                <div class="bc-sec-single-value">${contact.phone}</div>
            </div>

            <div class="bc-sec-single-row">
                <div class="bc-sec-single-label">Email Address</div>
                <div class="bc-sec-single-value">${contact.email}</div>
            </div>

            <div class="bc-sec-single-row" style="border-bottom: none;">
                <div class="bc-sec-single-label">Socials & Links</div>
                <div class="bc-sec-card-socials" id="bc-dynamic-socials" style="margin-top: 12px; transform: scale(1.2); transform-origin: left center;">
                    <!-- dynamically injected -->
                </div>
            </div>

            <div style="padding: 24px; padding-top: 0;">
                <button class="bc-btn-edit" id="bc-sec-btn-edit-contact">EDIT</button>
            </div>
        `;

        this.dom.secList.innerHTML = singleHtml;

        // Dynamic Social Inject
        const socialContainer = this.dom.secList.querySelector('#bc-dynamic-socials');
        if (socialContainer && contact.socials) {
            const activeSocials = Object.entries(contact.socials)
                .filter(([k, v]) => v && v.trim() !== '')
                .map(([k, v]) => {
                    let icon = '';
                    if (k === 'twitter') icon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>';
                    else if (k === 'linkedin') icon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>';
                    else if (k === 'instagram') icon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>';
                    else if (k === 'youtube') icon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>';
                    else if (k === 'whatsapp') icon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
                    else if (k === 'url') icon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';

                    const tooltip = k.charAt(0).toUpperCase() + k.slice(1);
                    // Format Links safely
                    let href = v;
                    if (k === 'whatsapp' && !href.startsWith('http')) {
                        href = 'https://wa.me/' + href.replace(/\D/g, '');
                    } else if (k === 'twitter' && !href.startsWith('http')) {
                        href = 'https://twitter.com/' + href.replace('@', '');
                    } else if (k === 'instagram' && !href.startsWith('http')) {
                        href = 'https://instagram.com/' + href.replace('@', '');
                    } else if (k === 'youtube' && !href.startsWith('http')) {
                        href = 'https://youtube.com/' + href.replace('@', '');
                    } else if (!href.startsWith('http')) {
                        href = 'https://' + href;
                    }

                    return `<div class="bc-social-icon bc-open-link" style="cursor: pointer; transition: transform 0.1s, color 0.1s;" title="${tooltip}" data-url="${href}">${icon}</div>`;
                }).join('');

            socialContainer.innerHTML = activeSocials || '<span style="color: var(--bc-text-muted); font-size: 13px;">None provided</span>';

            // Bind Links
            const links = socialContainer.querySelectorAll('.bc-open-link');
            links.forEach(l => {
                l.onmouseenter = () => { l.style.transform = 'scale(1.1)'; l.style.color = 'white'; };
                l.onmouseleave = () => { l.style.transform = 'scale(1)'; l.style.color = 'var(--bc-text-muted)'; };
                l.onclick = () => {
                    const url = l.getAttribute('data-url');
                    try {
                        if (this.sdk.shell && this.sdk.shell.openExternal) {
                            this.sdk.shell.openExternal(url);
                        } else {
                            window.open(url, '_blank');
                        }
                    } catch (err) {
                        window.open(url, '_blank');
                    }
                };
            });
        }

        // Bind Edit Button
        const editBtn = this.dom.secList.querySelector('#bc-sec-btn-edit-contact');
        if (editBtn) {
            editBtn.onclick = () => {
                this.editingContactId = contact.id;

                // Set UI state to EDIT mode
                this.dom.contactModalTitle.textContent = "Edit Contact";
                this.dom.contactModalCreate.textContent = "UPDATE / SAVE";
                this.dom.contactModalDelete.style.display = 'flex';

                // Populate existing values
                this.selectedContactColor = contact.color;
                this.dom.contactAvatar.style.background = this.selectedContactColor;
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

                this.dom.contactModalOverlay.style.display = 'flex';
            };
        }
    }

    showEmptyStateSidebar() {
        this.dom.secSidebar.style.display = 'flex';
        this.dom.secTitle.textContent = 'Organize';

        // Hide close/back button and home button since this is the root canvas view
        this.dom.btnCloseSec.style.display = 'none';
        this.dom.btnHomeSec.style.display = 'none';

        const isGroup = this.state.selectedGroupId && this.state.selectedGroupId !== 'all';

        const emptyHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px 10px;">
                <div style="margin-bottom: 24px; color: var(--bc-accent); opacity: 0.8;">
                    <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="15" cy="15" r="5"></circle><circle cx="9" cy="9" r="4"></circle><circle cx="16" cy="6" r="3"></circle></svg>
                </div>
                <h3 style="color: var(--bc-text-main); font-size: 18px; font-weight: 600; margin-bottom: 12px;">Welcome to Contacts</h3>
                <p style="color: var(--bc-text-muted); font-size: 14px; line-height: 1.5; margin-bottom: 32px;">
                    Welcome to the physics canvas. Drag and drop floating contacts into groups to perfectly organize your network.
                </p>

                <div style="display: flex; flex-direction: column; gap: 16px; text-align: left; width: 100%; margin-bottom: 40px; background: rgba(255, 255, 255, 0.03); padding: 16px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                        <div style="color: var(--bc-accent); font-weight: bold;">1.</div>
                        <div style="color: var(--bc-text-main); font-size: 13px; line-height: 1.4;">Double-click a floating contact to open their details panel.</div>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                        <div style="color: var(--bc-accent); font-weight: bold;">2.</div>
                        <div style="color: var(--bc-text-main); font-size: 13px; line-height: 1.4;">Double-click a core group bubble to update this side panel.</div>
                    </div>
                </div>

                ${isGroup ? `
                <button class="bc-btn-create" id="bc-sec-btn-manage-group" style="width: 100%; padding: 12px; font-size: 15px; border-radius: 8px;">Manage Group</button>
                ` : `
                <button class="bc-btn-create" id="bc-sec-btn-add-group" style="width: 100%; padding: 12px; font-size: 15px; border-radius: 8px;">+ Add New Group</button>
                `}
                <button id="bc-sec-btn-add-contact" style="width: 100%; padding: 12px; font-size: 15px; border-radius: 8px; margin-top: 12px; background: rgba(255, 255, 255, 0.05); color: var(--bc-text-main); border: 1px solid rgba(255, 255, 255, 0.1); cursor: pointer; transition: background 0.2s;">+ Add New Contact</button>
            </div>
        `;

        this.dom.secList.innerHTML = emptyHtml;

        // Add simple hover effect logic for secondary button
        const addContactBtn = this.dom.secList.querySelector('#bc-sec-btn-add-contact');
        if (addContactBtn) {
            addContactBtn.onmouseenter = () => addContactBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            addContactBtn.onmouseleave = () => addContactBtn.style.background = 'rgba(255, 255, 255, 0.05)';
            addContactBtn.onclick = () => {
                this.editingContactId = null;

                // Set UI state back to Add mode
                this.dom.contactModalTitle.textContent = "New Contact";
                this.dom.contactModalCreate.textContent = "Add Contact";
                this.dom.contactModalDelete.style.display = 'none';

                this.dom.contactModalOverlay.style.display = 'flex';

                // Pick random color and set UI
                this.selectedContactColor = this.contactColors[Math.floor(Math.random() * this.contactColors.length)];
                this.dom.contactAvatar.style.background = this.selectedContactColor;

                // Clear state
                Object.values(this.dom.contactInputs).forEach(input => input.value = '');
                this.dom.contactAvatar.textContent = '?';

                // Focus first input
                setTimeout(() => this.dom.contactInputs.first.focus(), 50);
            };
        }

        // Bind the button to the Header Button Action
        const addGroupBtn = this.dom.secList.querySelector('#bc-sec-btn-add-group');
        if (addGroupBtn) addGroupBtn.onclick = () => { this.dom.addGroupBtn.click(); };

        const manageGroupBtn = this.dom.secList.querySelector('#bc-sec-btn-manage-group');
        if (manageGroupBtn) manageGroupBtn.onclick = () => { this.dom.addGroupBtn.click(); };
    }

    renderList() {
        this.dom.contactsContainer.innerHTML = '';

        let filteredContacts = this.state.contacts;

        // Filter against selected logic group
        if (this.state.selectedGroupId !== 'all') {
            const group = this.state.groups.find(g => g.id === this.state.selectedGroupId);
            if (group) {
                filteredContacts = this.state.contacts.filter(c => group.contacts.includes(c.id));
            }
        }

        if (filteredContacts.length === 0) {
            this.dom.contactsContainer.innerHTML = '<div style="padding: 24px 8px; color: var(--bc-text-muted);">No contacts in this group yet. Toggle to Bubble View to merge contacts, or create a new group!</div>';
            return;
        }

        // Group contacts by letter for clean list view representation
        const byLetter = filteredContacts.reduce((acc, c) => {
            const letter = c.first[0].toUpperCase();
            if (!acc[letter]) acc[letter] = [];
            acc[letter].push(c);
            return acc;
        }, {});

        // Build list elements
        for (const [letter, contactsArr] of Object.entries(byLetter)) {
            let rows = contactsArr.map(c => `
                <div class="bc-contact-row" data-id="${c.id}">
                    <div class="bc-col-name">
                        <div class="bc-bubble" style="background: ${c.color}">${c.initials}</div>
                        <span>${c.first} ${c.last}</span>
                    </div>
                    <div class="bc-col-phone">${c.phone}</div>
                    <div class="bc-col-email">${c.email}</div>
                    <div class="bc-col-socials"><div class="bc-social-dot"></div></div>
                </div>
            `).join('');

            const groupHtml = `
                <div class="bc-letter-group">
                    <div class="bc-letter">${letter}</div>
                    ${rows}
                </div>
            `;
            this.dom.contactsContainer.insertAdjacentHTML('beforeend', groupHtml);
        }
    }
}
