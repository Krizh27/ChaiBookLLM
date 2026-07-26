import { api } from './api.js';
import { state } from './state.js';
import { ui } from './ui.js';

async function waitForClerk(maxRetries = 40) {
    for (let i = 0; i < maxRetries; i++) {
        if (window.Clerk) return window.Clerk;
        await new Promise(res => setTimeout(res, 100));
    }
    return window.Clerk;
}

async function initApp() {
    try {
        console.log('Initializing application with Clerk Authentication...');
        const Clerk = await waitForClerk();
        
        if (Clerk) {
            await Clerk.load();
            const authModal = document.getElementById('auth-modal');
            const signInContainer = document.getElementById('sign-in-container');
            const userButtonContainer = document.getElementById('user-button-container');
            
            if (!Clerk.user) {
                console.log('User not authenticated. Mounting Sign In...');
                if (authModal) {
                    authModal.classList.remove('hidden');
                    authModal.classList.add('flex');
                }
                Clerk.mountSignIn(signInContainer, {
                    routing: 'virtual'
                });
                return;
            } else {
                console.log('User authenticated:', Clerk.user.id);
                if (authModal) authModal.classList.add('hidden');
                if (userButtonContainer) {
                    Clerk.mountUserButton(userButtonContainer);
                }
            }
        } else {
            console.warn('Clerk SDK not found on window, proceeding without auth UI.');
        }

        ui.init();
        
        const notebooks = await api.getNotebooks();
        state.setNotebooks(notebooks);
        
        if (notebooks.length > 0) {
            state.setCurrentNotebook(notebooks[0].id);
        }
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
}

document.addEventListener('DOMContentLoaded', initApp);
