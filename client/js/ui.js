import { state } from './state.js';
import { api } from './api.js';

const elements = {
    notebookList: document.getElementById('notebook-list'),
    newNotebookBtn: document.getElementById('new-notebook-btn'),
    mainContent: document.getElementById('main-content'),
    currentNotebookTitle: document.getElementById('current-notebook-title'),
    addSourceBtn: document.getElementById('add-source-btn'),
    addUrlBtn: document.getElementById('add-url-btn'),
    fileUpload: document.getElementById('file-upload'),
    sourceList: document.getElementById('source-list'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    citationModal: document.getElementById('citation-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalContent: document.getElementById('modal-content'),
    modalClose: document.getElementById('modal-close')
};

export const ui = {
    pollingInterval: null,

    init() {
        elements.newNotebookBtn.addEventListener('click', async () => {
            const name = prompt('Enter notebook name:');
            if (name && name.trim()) {
                try {
                    const newNotebook = await api.createNotebook(name.trim());
                    state.addNotebook(newNotebook);
                    state.setCurrentNotebook(newNotebook.id);
                } catch (error) {
                    alert('Error creating notebook');
                }
            }
        });

        elements.modalClose.addEventListener('click', () => {
            elements.citationModal.classList.add('hidden');
        });
        
        // Close modal when clicking outside
        elements.citationModal.addEventListener('click', (e) => {
            if (e.target === elements.citationModal) {
                elements.citationModal.classList.add('hidden');
            }
        });

        elements.sendBtn.addEventListener('click', () => this.handleChatSubmit());
        elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleChatSubmit();
        });

        elements.addSourceBtn.addEventListener('click', () => {
            elements.fileUpload.click();
        });

        elements.addUrlBtn.addEventListener('click', async () => {
            const url = prompt('Enter website or YouTube URL:');
            const currentNotebookId = state.currentNotebookId;
            if (url && url.trim() && currentNotebookId) {
                try {
                    const newSource = await api.uploadUrl(currentNotebookId, url.trim());
                    state.addSource(newSource);
                } catch (error) {
                    alert('Error adding URL');
                }
            }
        });

        elements.fileUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const currentNotebookId = state.currentNotebookId;
            
            if (file && currentNotebookId) {
                try {
                    // Optimistically add uploading state?
                    const newSource = await api.uploadSource(currentNotebookId, file);
                    state.addSource(newSource);
                } catch (error) {
                    alert('Error uploading file');
                } finally {
                    elements.fileUpload.value = ''; // Reset input
                }
            }
        });

        // Subscribe to state changes to re-render UI
        state.subscribe(async () => {
            this.renderSidebar();
            await this.renderMainArea();
        });
    },

    renderSidebar() {
        elements.notebookList.innerHTML = '';
        
        if (state.notebooks.length === 0) {
            elements.notebookList.innerHTML = '<p class="text-gray-400 text-sm p-4">No notebooks yet.</p>';
            return;
        }

        state.notebooks.forEach(notebook => {
            const li = document.createElement('li');
            const isActive = state.currentNotebookId === notebook.id;
            
            li.className = `flex justify-between items-center p-3 cursor-pointer hover:bg-gray-700 transition-colors ${isActive ? 'bg-gray-700 border-l-4 border-blue-500' : ''}`;
            
            const span = document.createElement('span');
            span.textContent = notebook.name;
            span.className = 'truncate flex-1';
            span.addEventListener('click', () => {
                // Changing notebook triggers fetch in renderMainArea
                state.setCurrentNotebook(notebook.id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.className = 'text-gray-400 hover:text-red-500 font-bold ml-2 px-2';
            deleteBtn.title = 'Delete Notebook';
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`Delete notebook "${notebook.name}"?`)) {
                    try {
                        await api.deleteNotebook(notebook.id);
                        state.removeNotebook(notebook.id);
                    } catch (error) {
                        alert('Error deleting notebook');
                    }
                }
            });

            li.appendChild(span);
            li.appendChild(deleteBtn);
            elements.notebookList.appendChild(li);
        });
    },

    async renderMainArea() {
        const current = state.getCurrentNotebook();
        if (current) {
            elements.currentNotebookTitle.textContent = current.name;
            elements.mainContent.classList.remove('hidden');
            
            // Enable chat input
            elements.chatInput.disabled = false;
            elements.sendBtn.disabled = false;
            
            try {
                const sources = await api.getSources(current.id);
                this.renderSources(sources);
                this.startSourcePolling(current.id);
            } catch (error) {
                console.error("Failed to load sources");
            }
        } else {
            elements.mainContent.classList.add('hidden');
            if (this.pollingInterval) clearInterval(this.pollingInterval);
        }
    },

    startSourcePolling(notebookId) {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        
        this.pollingInterval = setInterval(async () => {
            const current = state.getCurrentNotebook();
            if (!current || current.id !== notebookId) {
                clearInterval(this.pollingInterval);
                return;
            }
            
            // Check if any source in state needs polling
            const hasPending = state.sources.some(s => s.indexing_status === 'pending' || s.indexing_status === 'processing');
            if (hasPending) {
                try {
                    const sources = await api.getSources(current.id);
                    // Just update DOM silently to avoid infinite state loop
                    state.sources = sources;
                    this.renderSources(sources);
                } catch (e) {
                    console.error("Polling error");
                }
            } else {
                // No pending sources, stop polling
                clearInterval(this.pollingInterval);
            }
        }, 3000);
    },

    renderSources(sources) {
        elements.sourceList.innerHTML = '';
        if (sources.length === 0) {
            elements.sourceList.innerHTML = '<li class="text-gray-400 text-sm italic">No sources uploaded yet.</li>';
            return;
        }

        sources.forEach(source => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center p-3 bg-white border border-gray-200 rounded shadow-sm';
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'font-medium truncate flex-1';
            titleSpan.textContent = source.title;

            const statusBadge = document.createElement('span');
            statusBadge.className = `ml-2 text-xs px-2 py-1 rounded-full font-semibold ${
                source.indexing_status === 'ready' ? 'bg-green-100 text-green-800' :
                source.indexing_status === 'error' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
            }`;
            statusBadge.textContent = source.indexing_status;

            const delBtn = document.createElement('button');
            delBtn.className = 'ml-4 text-red-500 hover:text-red-700 font-bold';
            delBtn.textContent = '×';
            delBtn.addEventListener('click', async () => {
                if(confirm(`Delete ${source.title}?`)) {
                    await api.deleteSource(state.currentNotebookId, source.id);
                    // refresh
                    this.renderMainArea();
                }
            });

            li.appendChild(titleSpan);
            li.appendChild(statusBadge);
            li.appendChild(delBtn);
            elements.sourceList.appendChild(li);
        });
    },

    async handleChatSubmit() {
        const message = elements.chatInput.value.trim();
        const notebookId = state.currentNotebookId;
        
        if (!message || !notebookId) return;

        // Clear input and disable while waiting
        elements.chatInput.value = '';
        elements.chatInput.disabled = true;
        elements.sendBtn.disabled = true;

        // Render user message
        this.renderMessage('user', message);

        try {
            // Render loading indicator
            const loadingId = this.renderMessage('assistant', 'Thinking...', true);
            
            const response = await api.askQuestion(notebookId, message);
            
            // Replace loading message with real answer
            this.updateMessage(loadingId, response.answer, response.citations);
            
        } catch (error) {
            console.error(error);
            this.renderMessage('assistant', 'Sorry, I encountered an error while processing your request.');
        } finally {
            elements.chatInput.disabled = false;
            elements.sendBtn.disabled = false;
            elements.chatInput.focus();
        }
    },

    renderMessage(role, content, isLoading = false) {
        const id = 'msg-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
        
        const bubble = document.createElement('div');
        bubble.className = `max-w-[80%] rounded-xl p-3 ${
            role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
        } ${isLoading ? 'animate-pulse' : ''}`;
        
        bubble.innerHTML = this.formatContent(content);
        
        div.appendChild(bubble);
        elements.chatMessages.appendChild(div);
        
        // Remove empty state message if it exists
        const emptyState = elements.chatMessages.querySelector('.text-center.text-gray-400');
        if (emptyState) emptyState.remove();

        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        return id;
    },

    updateMessage(id, content, citations) {
        const div = document.getElementById(id);
        if (!div) return;
        
        const bubble = div.querySelector('div');
        bubble.classList.remove('animate-pulse');
        
        let formattedContent = this.formatContent(content);
        
        // Parse citations [1], [2] into clickable chips
        if (citations && citations.length > 0) {
            formattedContent = formattedContent.replace(/\[(\d+)\]/g, (match, num) => {
                const citation = citations.find(c => c.citation_id === parseInt(num));
                if (citation) {
                    return `<button class="citation-chip inline-flex items-center justify-center w-5 h-5 ml-1 text-xs font-bold text-blue-800 bg-blue-100 rounded-full hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" title="${citation.source_title}" data-title="${citation.source_title}" data-text="${encodeURIComponent(citation.text_snippet)}">${num}</button>`;
                }
                return match;
            });
        }
        
        bubble.innerHTML = formattedContent;
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

        // Attach event listeners to chips
        const chips = bubble.querySelectorAll('.citation-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const title = e.target.getAttribute('data-title');
                const text = decodeURIComponent(e.target.getAttribute('data-text'));
                
                elements.modalTitle.textContent = title;
                elements.modalContent.textContent = text;
                elements.citationModal.classList.remove('hidden');
            });
        });
    },

    formatContent(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }
};
