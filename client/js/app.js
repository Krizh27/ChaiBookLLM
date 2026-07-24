import { api } from './api.js';
import { state } from './state.js';
import { ui } from './ui.js';

async function initApp() {
    try {
        console.log('Initializing application...');
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
