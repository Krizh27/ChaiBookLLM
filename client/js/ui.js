import { state } from './state.js';
import { api } from './api.js';

const elements = {
    notebookList: document.getElementById('notebook-list'),
    newNotebookBtn: document.getElementById('new-notebook-btn'),
    mainContent: document.getElementById('main-content'),
    currentNotebookTitle: document.getElementById('current-notebook-title'),
    renameNotebookBtn: document.getElementById('rename-notebook-btn'),
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
    modalClose: document.getElementById('modal-close'),
    modalTypeIcon: document.getElementById('modal-type-icon'),
    modalTypeBadge: document.getElementById('modal-type-badge'),
    modalChunkBadge: document.getElementById('modal-chunk-badge'),
    modalExternalLink: document.getElementById('modal-external-link'),
    modalContentContainer: document.getElementById('modal-content-container'),
    // Workspace Navigation & Study Hub Elements
    tabChat: document.getElementById('tab-chat'),
    tabStudyHub: document.getElementById('tab-study-hub'),
    tabRoadmap: document.getElementById('tab-roadmap'),
    viewChat: document.getElementById('view-chat'),
    viewStudy: document.getElementById('view-study'),
    viewRoadmap: document.getElementById('view-roadmap'),
    studySummariesGrid: document.getElementById('study-summaries-grid'),
    studyQuestionsList: document.getElementById('study-questions-list'),
    studyFlashcardsGrid: document.getElementById('study-flashcards-grid'),
    shuffleCardsBtn: document.getElementById('shuffle-cards-btn'),
    // Roadmap Elements
    roadmapTopic: document.getElementById('roadmap-topic'),
    roadmapKnowledge: document.getElementById('roadmap-knowledge'),
    generateRoadmapBtn: document.getElementById('generate-roadmap-btn'),
    roadmapEmptyState: document.getElementById('roadmap-empty-state'),
    roadmapContent: document.getElementById('roadmap-content'),
    roadmapHeaderTitle: document.getElementById('roadmap-header-title'),
    roadmapHeaderSummary: document.getElementById('roadmap-header-summary'),
    roadmapStepsList: document.getElementById('roadmap-steps-list')
};

export const ui = {
    pollingInterval: null,

    showToast(message, type = 'error') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        const isError = type === 'error';
        toast.className = `pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-md border text-sm font-semibold transition-all duration-300 transform translate-y-2 opacity-0 ${
            isError 
                ? 'bg-red-950/95 border-red-700/80 text-red-100 shadow-red-900/40' 
                : 'bg-emerald-950/95 border-emerald-700/80 text-emerald-100 shadow-emerald-900/40'
        }`;
        
        toast.innerHTML = `
            <span class="text-xl shrink-0">${isError ? '⚠️' : '✅'}</span>
            <span class="flex-1 leading-snug">${message}</span>
            <button class="text-slate-400 hover:text-white ml-2 text-lg font-bold leading-none cursor-pointer">&times;</button>
        `;
        
        const closeBtn = toast.querySelector('button');
        closeBtn.addEventListener('click', () => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 200);
        });
        
        container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
        });
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 200);
            }
        }, 5000);
    },

    showDialog({ title, subtitle = '', message, isPrompt = false, defaultValue = '', placeholder = '', icon = '✨', confirmText = 'Confirm', isDanger = false }) {
        return new Promise((resolve) => {
            const dialog = document.getElementById('custom-dialog');
            const iconEl = document.getElementById('dialog-icon');
            const titleEl = document.getElementById('dialog-title');
            const subtitleEl = document.getElementById('dialog-subtitle');
            const messageEl = document.getElementById('dialog-message');
            const inputContainer = document.getElementById('dialog-input-container');
            const inputEl = document.getElementById('dialog-input');
            const btnCancel = document.getElementById('dialog-btn-cancel');
            const btnSubmit = document.getElementById('dialog-btn-submit');
            
            if (!dialog) return resolve(null);
            
            iconEl.textContent = icon;
            titleEl.textContent = title;
            subtitleEl.textContent = subtitle;
            messageEl.textContent = message;
            
            if (isDanger) {
                btnSubmit.className = 'px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-sm shadow-lg shadow-red-500/30 transition-all transform active:scale-95 cursor-pointer';
            } else {
                btnSubmit.className = 'px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95 cursor-pointer';
            }
            btnSubmit.textContent = confirmText;

            if (isPrompt) {
                inputContainer.classList.remove('hidden');
                inputEl.value = defaultValue;
                inputEl.placeholder = placeholder || 'Type here...';
            } else {
                inputContainer.classList.add('hidden');
                inputEl.value = '';
            }

            dialog.classList.remove('hidden');
            if (isPrompt) {
                setTimeout(() => {
                    inputEl.focus();
                    inputEl.select();
                }, 50);
            }

            const cleanup = (result) => {
                dialog.classList.add('hidden');
                btnCancel.removeEventListener('click', onCancel);
                btnSubmit.removeEventListener('click', onSubmit);
                inputEl.removeEventListener('keydown', onKeyDown);
                dialog.removeEventListener('click', onBackdrop);
                resolve(result);
            };

            const onCancel = () => cleanup(isPrompt ? null : false);
            const onSubmit = () => cleanup(isPrompt ? inputEl.value : true);
            const onKeyDown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onSubmit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancel();
                }
            };
            const onBackdrop = (e) => {
                if (e.target === dialog) onCancel();
            };

            btnCancel.addEventListener('click', onCancel);
            btnSubmit.addEventListener('click', onSubmit);
            if (isPrompt) inputEl.addEventListener('keydown', onKeyDown);
            dialog.addEventListener('click', onBackdrop);
        });
    },

    showPrompt({ title, subtitle = 'Interactive Input', message = 'Please provide the details below:', defaultValue = '', placeholder = '', icon = '✏️', confirmText = 'Save' }) {
        return this.showDialog({ title, subtitle, message, isPrompt: true, defaultValue, placeholder, icon, confirmText, isDanger: false });
    },

    showConfirm({ title, subtitle = 'Confirmation Required', message, icon = '⚠️', confirmText = 'Confirm', isDanger = true }) {
        return this.showDialog({ title, subtitle, message, isPrompt: false, icon, confirmText, isDanger });
    },

    init() {
        elements.newNotebookBtn.addEventListener('click', async () => {
            const name = await this.showPrompt({
                title: 'Create New Notebook',
                subtitle: 'Workspace Setup',
                message: 'Give your new research notebook a clear, memorable name:',
                placeholder: 'e.g., Quantum Computing Research',
                icon: '📘',
                confirmText: 'Create'
            });
            if (name && name.trim()) {
                try {
                    const newNotebook = await api.createNotebook(name.trim());
                    // Use unified addition and selection to prevent firing asynchronous renders on the old notebook
                    state.addAndSelectNotebook(newNotebook);
                    this.showToast(`Notebook "${newNotebook.name}" created successfully!`, 'success');
                } catch (error) {
                    this.showToast('Error creating notebook: ' + error.message, 'error');
                }
            }
        });

        if (elements.renameNotebookBtn) {
            elements.renameNotebookBtn.addEventListener('click', async () => {
                const current = state.getCurrentNotebook();
                if (!current) return;
                const newName = await this.showPrompt({
                    title: 'Rename Notebook',
                    subtitle: current.name,
                    message: 'Enter the new title for this research workspace:',
                    defaultValue: current.name,
                    placeholder: 'New notebook title...',
                    icon: '✏️',
                    confirmText: 'Update'
                });
                if (newName && newName.trim() && newName.trim() !== current.name) {
                    try {
                        const updated = await api.updateNotebook(current.id, newName.trim());
                        state.updateNotebook(updated);
                        this.showToast(`Notebook renamed to "${updated.name}"`, 'success');
                    } catch (error) {
                        this.showToast('Failed to rename notebook: ' + (error.message || error), 'error');
                    }
                }
            });
        }

        elements.modalClose.addEventListener('click', () => {
            elements.citationModal.classList.add('hidden');
            if (elements.modalContentContainer) elements.modalContentContainer.innerHTML = '';
        });
        
        // Close modal when clicking outside
        elements.citationModal.addEventListener('click', (e) => {
            if (e.target === elements.citationModal) {
                elements.citationModal.classList.add('hidden');
                if (elements.modalContentContainer) elements.modalContentContainer.innerHTML = '';
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
            const currentNotebookId = state.currentNotebookId;
            if (!currentNotebookId) return;
            const url = await this.showPrompt({
                title: 'Import Web or YouTube Source',
                subtitle: 'Knowledge Expansion',
                message: 'Paste the exact HTTP/HTTPS URL of an article, website, or YouTube video lecture:',
                placeholder: 'https://youtube.com/watch?v=... or https://example.com/article',
                icon: '🌐',
                confirmText: 'Import'
            });
            if (url && url.trim()) {
                try {
                    this.updateInputState(true, "Reading and parsing URL source...");
                    const newSource = await api.uploadUrl(currentNotebookId, url.trim());
                    state.addSource(newSource);
                    this.showToast('URL imported successfully and indexing started!', 'success');
                } catch (error) {
                    this.showToast('Error adding URL: ensure link is valid and accessible', 'error');
                    this.updateInputState();
                }
            }
        });

        elements.fileUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const currentNotebookId = state.currentNotebookId;
            
            if (file && currentNotebookId) {
                try {
                    this.updateInputState(true, "Uploading and indexing document...");
                    const newSource = await api.uploadSource(currentNotebookId, file);
                    state.addSource(newSource);
                    this.showToast(`Uploaded "${file.name}". Processing started!`, 'success');
                } catch (error) {
                    this.showToast('Error uploading file: check format or connection', 'error');
                    this.updateInputState();
                } finally {
                    elements.fileUpload.value = ''; // Reset input
                }
            }
        });

        // Tab Navigation Switchers
        if (elements.tabChat && elements.tabStudyHub) {
            elements.tabChat.addEventListener('click', () => this.switchWorkspaceTab('chat'));
            elements.tabStudyHub.addEventListener('click', () => {
                this.switchWorkspaceTab('study');
                this.renderStudyHub(state.sources || []);
            });
        }
        if (elements.tabRoadmap) {
            elements.tabRoadmap.addEventListener('click', () => {
                this.switchWorkspaceTab('roadmap');
            });
        }

        if (elements.generateRoadmapBtn) {
            elements.generateRoadmapBtn.addEventListener('click', async () => {
                const topic = (elements.roadmapTopic && elements.roadmapTopic.value || '').trim();
                const knowledge = (elements.roadmapKnowledge && elements.roadmapKnowledge.value || '').trim();
                if (!topic) {
                    this.showToast('Please enter a target learning topic to generate your roadmap.', 'error');
                    return;
                }
                const btn = elements.generateRoadmapBtn;
                const origHtml = btn.innerHTML;
                try {
                    btn.innerHTML = '<span>⏳ Analyzing YouTube & Document Sources...</span>';
                    btn.disabled = true;
                    this.showToast('Analyzing RAG video timestamps and source metadata...', 'success');
                    const roadmap = await api.generateRoadmap(state.currentNotebookId, topic, knowledge);
                    this.renderRoadmap(roadmap);
                    this.showToast('🎉 Personalized learning roadmap generated successfully!', 'success');
                } catch (e) {
                    this.showToast(e.message || 'Failed to generate learning roadmap.', 'error');
                } finally {
                    btn.innerHTML = origHtml;
                    btn.disabled = false;
                }
            });
        }

        if (elements.shuffleCardsBtn) {
            elements.shuffleCardsBtn.addEventListener('click', () => {
                this.renderVocabularyCards(state.sources || [], true);
            });
        }

        // Subscribe to state changes to re-render UI
        state.subscribe(async () => {
            this.renderSidebar();
            await this.renderMainArea();
        });
    },

    switchWorkspaceTab(tabName) {
        if (!elements.viewChat || !elements.viewStudy || !elements.viewRoadmap) return;

        elements.viewChat.classList.toggle('hidden', tabName !== 'chat');
        elements.viewStudy.classList.toggle('hidden', tabName !== 'study');
        elements.viewRoadmap.classList.toggle('hidden', tabName !== 'roadmap');

        const baseTabClass = "workspace-tab px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 font-heading ";
        const activeChat = baseTabClass + "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/30";
        const activeStudy = baseTabClass + "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30";
        const activeRoadmap = baseTabClass + "bg-gradient-to-r from-pink-600 to-amber-600 text-white shadow-md shadow-pink-500/30";
        const inactiveClass = baseTabClass + "text-slate-300 hover:text-white hover:bg-slate-700/60";

        if (elements.tabChat) elements.tabChat.className = (tabName === 'chat') ? activeChat : inactiveClass;
        if (elements.tabStudyHub) elements.tabStudyHub.className = (tabName === 'study') ? activeStudy : inactiveClass;
        if (elements.tabRoadmap) elements.tabRoadmap.className = (tabName === 'roadmap') ? activeRoadmap : inactiveClass;
    },

    renderSidebar() {
        elements.notebookList.innerHTML = '';
        
        if (state.notebooks.length === 0) {
            elements.notebookList.innerHTML = '<p class="text-slate-400 text-sm p-4 italic">No notebooks created yet.</p>';
            return;
        }

        state.notebooks.forEach(notebook => {
            const li = document.createElement('li');
            const isActive = state.currentNotebookId === notebook.id;
            
            li.className = `flex justify-between items-center p-3.5 cursor-pointer transition-all duration-200 ${
                isActive 
                    ? 'bg-slate-800/90 border-l-4 border-indigo-500 text-white font-bold shadow-md shadow-black/20' 
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white font-medium'
            }`;
            
            const span = document.createElement('span');
            span.innerHTML = `<span class="mr-2">${isActive ? '📖' : '📘'}</span><span>${notebook.name}</span>`;
            span.className = 'truncate flex-1 text-sm flex items-center';
            span.addEventListener('click', () => {
                state.setCurrentNotebook(notebook.id);
            });

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.className = 'text-slate-400 hover:text-indigo-400 font-normal ml-1 px-1.5 py-0.5 rounded text-xs leading-none transition duration-150 opacity-80 hover:opacity-100';
            editBtn.title = 'Rename Notebook';
            editBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const newName = await ui.showPrompt({
                    title: 'Rename Notebook',
                    subtitle: notebook.name,
                    message: 'Enter a new title for this notebook:',
                    defaultValue: notebook.name,
                    placeholder: 'New name...',
                    icon: '✏️',
                    confirmText: 'Update'
                });
                if (newName && newName.trim() && newName.trim() !== notebook.name) {
                    try {
                        const updated = await api.updateNotebook(notebook.id, newName.trim());
                        state.updateNotebook(updated);
                        ui.showToast(`Notebook renamed to "${updated.name}"`, 'success');
                    } catch (error) {
                        ui.showToast('Failed to rename notebook: ' + (error.message || error), 'error');
                    }
                }
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.className = 'text-slate-500 hover:text-red-400 font-bold ml-1 px-2 py-0.5 rounded text-lg leading-none transition duration-150';
            deleteBtn.title = 'Delete Notebook';
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await ui.showConfirm({
                    title: 'Delete Notebook',
                    subtitle: notebook.name,
                    message: `Are you certain you want to delete "${notebook.name}" and erase all of its indexed Qdrant vectors? This action cannot be undone.`,
                    icon: '🗑️',
                    confirmText: 'Delete Notebook',
                    isDanger: true
                });
                if (confirmed) {
                    try {
                        await api.deleteNotebook(notebook.id);
                        state.removeNotebook(notebook.id);
                        ui.showToast(`Notebook "${notebook.name}" deleted.`, 'success');
                    } catch (error) {
                        ui.showToast('Error deleting notebook: ' + error.message, 'error');
                    }
                }
            });

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'flex items-center gap-0.5 shrink-0';
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);

            li.appendChild(span);
            li.appendChild(actionsDiv);
            elements.notebookList.appendChild(li);
        });
    },

    async renderMainArea() {
        const current = state.getCurrentNotebook();
        if (current) {
            elements.currentNotebookTitle.textContent = current.name;
            elements.mainContent.classList.remove('hidden');
            
            // Default to Chat tab & Instantly reset DOM lists to eliminate visual contamination
            this.switchWorkspaceTab('chat');
            elements.sourceList.innerHTML = '<li class="text-slate-400 text-sm italic p-3 text-center">Loading sources...</li>';
            elements.chatMessages.innerHTML = '<div class="text-center text-slate-400 text-sm py-4">Loading conversation history...</div>';
            
            if (elements.studySummariesGrid) elements.studySummariesGrid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-10 italic bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">Loading document intelligence...</div>';
            if (elements.studyQuestionsList) elements.studyQuestionsList.innerHTML = '<div class="col-span-full text-center text-slate-400 py-10 italic bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">Loading interactive study prompts...</div>';
            if (elements.studyFlashcardsGrid) elements.studyFlashcardsGrid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-10 italic bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">Loading vocabulary flashcards...</div>';
            
            this.updateInputState(true, "Loading notebook details...");
            
            try {
                const sources = await api.getSources(current.id);
                // Guard against async race conditions: if user switched notebooks while network fetch was pending, ignore stale result!
                if (state.currentNotebookId !== current.id) return;

                state.sources = sources;
                this.renderSources(sources);
                this.renderStudyHub(sources);
                this.startSourcePolling(current.id);
                await this.renderChatHistory(current.id);
                
                if (state.currentNotebookId === current.id) {
                    this.updateInputState();
                }
            } catch (error) {
                console.error("Failed to load sources or chat history");
                elements.sourceList.innerHTML = '<li class="text-red-500 text-sm p-2">Failed to load sources.</li>';
                elements.chatMessages.innerHTML = '<div class="text-center text-red-500 text-sm py-4">Failed to load chat history.</div>';
                this.updateInputState();
            }
        } else {
            elements.mainContent.classList.add('hidden');
            if (this.pollingInterval) clearInterval(this.pollingInterval);
        }
    },

    async renderChatHistory(notebookId) {
        elements.chatMessages.innerHTML = '<div class="text-center text-slate-400 text-sm py-4">Loading conversation...</div>';
        try {
            const messages = await api.getChatHistory(notebookId);
            // Guard against async race conditions
            if (state.currentNotebookId !== notebookId) return;

            elements.chatMessages.innerHTML = '';
            
            if (messages.length === 0) {
                elements.chatMessages.innerHTML = `
                    <div class="text-center text-slate-400 my-auto py-12">
                        <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-2xl shadow-sm">💡</div>
                        <p class="font-semibold text-slate-700 font-heading text-lg">Ready to Supercharge your Research!</p>
                        <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1.5 leading-relaxed">Ask any question across your documents. Our intelligent AI router verifies relevant facts and generates inline numeric citations!</p>
                    </div>`;
                return;
            }

            messages.forEach(msg => {
                if (msg.role === 'user') {
                    this.renderMessage('user', msg.content);
                } else {
                    const msgId = this.renderMessage('assistant', msg.content);
                    this.updateMessage(msgId, msg.content, msg.citations);
                }
            });
        } catch (error) {
            console.error("Failed to load chat history", error);
            elements.chatMessages.innerHTML = '<div class="text-center text-red-500 text-sm py-4">Failed to load chat history.</div>';
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
            
            const hasPending = state.sources.some(s => s.indexing_status === 'pending' || s.indexing_status === 'processing');
            if (hasPending) {
                try {
                    const sources = await api.getSources(current.id);
                    state.sources = sources;
                    this.renderSources(sources);
                    this.renderStudyHub(sources);
                } catch (e) {
                    console.error("Polling error");
                }
            } else {
                clearInterval(this.pollingInterval);
            }
        }, 3000);
    },

    renderSources(sources) {
        elements.sourceList.innerHTML = '';
        if (sources.length === 0) {
            elements.sourceList.innerHTML = '<li class="text-slate-400 text-sm italic text-center py-6 bg-white/50 rounded-xl border border-slate-200/60">No sources uploaded yet. Attach a document to get started!</li>';
            return;
        }

        sources.forEach(source => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-sm hover:border-indigo-300 transition duration-150 group';
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'font-semibold text-slate-800 text-sm truncate flex-1 flex items-center gap-2.5';
            
            const icon = source.type === 'pdf' ? '📕' : source.type === 'youtube' ? '📺' : source.type === 'url' ? '🌐' : source.type === 'subtitle' ? '🎞️' : '📄';
            titleSpan.innerHTML = `<span class="text-base">${icon}</span><span class="truncate group-hover:text-indigo-600 transition">${source.title}</span>`;

            const statusBadge = document.createElement('span');
            statusBadge.className = `ml-2 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-2xs ${
                source.indexing_status === 'ready' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                source.indexing_status === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
            }`;
            statusBadge.textContent = source.indexing_status;

            const reindexBtn = document.createElement('button');
            reindexBtn.className = 'ml-2.5 text-slate-400 hover:text-indigo-600 font-normal text-sm leading-none px-1 transition duration-150 opacity-70 hover:opacity-100';
            reindexBtn.textContent = '🔄';
            reindexBtn.title = 'Re-index source (re-generate embeddings & Qdrant vectors)';
            if (source.indexing_status === 'pending' || source.indexing_status === 'processing') {
                reindexBtn.disabled = true;
                reindexBtn.className += ' opacity-30 cursor-not-allowed';
            } else {
                reindexBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        statusBadge.className = 'ml-2 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-2xs bg-amber-100 text-amber-800 border border-amber-200 animate-pulse';
                        statusBadge.textContent = 'processing';
                        reindexBtn.disabled = true;
                        reindexBtn.className = 'ml-2.5 text-slate-400 font-normal text-sm leading-none px-1 opacity-30 cursor-not-allowed';
                        await api.reindexSource(state.currentNotebookId, source.id);
                        source.indexing_status = 'processing';
                        this.startSourcePolling(state.currentNotebookId);
                    } catch (error) {
                        ui.showToast('Error re-indexing source: ' + (error.message || error), 'error');
                        ui.renderMainArea();
                    }
                });
            }

            const delBtn = document.createElement('button');
            delBtn.className = 'ml-2.5 text-slate-400 hover:text-red-600 font-extrabold text-lg leading-none px-1 transition duration-150';
            delBtn.textContent = '×';
            delBtn.title = 'Delete source and vectors';
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await ui.showConfirm({
                    title: 'Remove Knowledge Source',
                    subtitle: source.title,
                    message: `Delete "${source.title}" and erase all of its associated vector embeddings from Qdrant?`,
                    icon: '✖️',
                    confirmText: 'Remove Source',
                    isDanger: true
                });
                if (confirmed) {
                    try {
                        await api.deleteSource(state.currentNotebookId, source.id);
                        ui.showToast(`Removed "${source.title}" from workspace.`, 'success');
                        ui.renderMainArea();
                    } catch (error) {
                        ui.showToast('Error removing source: ' + error.message, 'error');
                    }
                }
            });

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'flex items-center shrink-0';
            actionsDiv.appendChild(statusBadge);
            actionsDiv.appendChild(reindexBtn);
            actionsDiv.appendChild(delBtn);

            li.appendChild(titleSpan);
            li.appendChild(actionsDiv);
            elements.sourceList.appendChild(li);
        });
        this.updateInputState();
    },

    // ==========================================
    // INTERACTIVE STUDY HUB RENDERING ARCHITECTURE
    // ==========================================

    parseMetadata(source) {
        if (!source.metadata) return null;
        try {
            return typeof source.metadata === 'string' ? JSON.parse(source.metadata) : source.metadata;
        } catch (e) {
            return null;
        }
    },

    renderStudyHub(sources) {
        const readySources = sources.filter(s => s.indexing_status === 'ready' && this.parseMetadata(s));
        
        if (readySources.length === 0) {
            const emptyMsg = '<div class="col-span-full text-center text-slate-400 py-10 italic bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">No ready sources with AI metadata yet. Upload a document or finish indexing to experience the Study Hub!</div>';
            if (elements.studySummariesGrid) elements.studySummariesGrid.innerHTML = emptyMsg;
            if (elements.studyQuestionsList) elements.studyQuestionsList.innerHTML = emptyMsg;
            if (elements.studyFlashcardsGrid) elements.studyFlashcardsGrid.innerHTML = emptyMsg;
            return;
        }

        this.renderExecutiveSummaries(readySources);
        this.renderStudyQuestions(readySources);
        this.renderVocabularyCards(readySources, false);
    },

    renderExecutiveSummaries(sources) {
        if (!elements.studySummariesGrid) return;
        elements.studySummariesGrid.innerHTML = '';

        sources.forEach(source => {
            const meta = this.parseMetadata(source) || {};
            const summary = meta.summary || "Summary generation in progress...";
            const topics = meta.main_topics || [];
            const entities = meta.named_entities || [];
            
            const icon = source.type === 'pdf' ? '📕' : source.type === 'youtube' ? '📺' : source.type === 'url' ? '🌐' : source.type === 'subtitle' ? '🎞️' : '📄';
            
            const card = document.createElement('div');
            card.className = 'study-summary-card group';
            
            let topicsHtml = topics.map(t => `<span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold border border-indigo-100">${t}</span>`).join(' ');
            let entitiesHtml = entities.slice(0, 4).map(e => `<span class="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-medium border border-purple-100">🏷️ ${e}</span>`).join(' ');

            card.innerHTML = `
                <div class="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                    <span class="text-xl">${icon}</span>
                    <h5 class="font-bold font-heading text-slate-900 truncate flex-1 text-base group-hover:text-indigo-600 transition">${source.title}</h5>
                    <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded">AI Read</span>
                </div>
                <p class="text-slate-600 text-sm leading-relaxed mb-4 flex-1 font-sans">${summary}</p>
                ${topics.length > 0 ? `<div class="mb-3"><div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Core Themes</div><div class="flex flex-wrap gap-1.5">${topicsHtml}</div></div>` : ''}
                ${entities.length > 0 ? `<div><div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Entities & Tools</div><div class="flex flex-wrap gap-1.5">${entitiesHtml}</div></div>` : ''}
            `;
            
            elements.studySummariesGrid.appendChild(card);
        });
    },

    renderStudyQuestions(sources) {
        if (!elements.studyQuestionsList) return;
        elements.studyQuestionsList.innerHTML = '';

        let generatedQuestions = [];

        sources.forEach(source => {
            const meta = this.parseMetadata(source) || {};
            const topics = meta.main_topics || [];
            const keywords = meta.keywords || [];
            const entities = meta.named_entities || [];

            if (topics.length > 0) {
                generatedQuestions.push({
                    sourceTitle: source.title,
                    question: `Explain the fundamental concepts and architecture of ${topics[0]} as detailed in ${source.title}.`,
                    tag: 'Core Topic Quiz'
                });
            }
            if (keywords.length >= 2) {
                generatedQuestions.push({
                    sourceTitle: source.title,
                    question: `How do the terminology and methodologies surrounding "${keywords[0]}" and "${keywords[1]}" interrelate within ${source.title}?`,
                    tag: 'Deep Synthesis'
                });
            } else if (keywords.length === 1) {
                generatedQuestions.push({
                    sourceTitle: source.title,
                    question: `Provide a detailed discussion on the role and significance of "${keywords[0]}" in ${source.title}.`,
                    tag: 'Concept Exploration'
                });
            }
            if (entities.length > 0) {
                generatedQuestions.push({
                    sourceTitle: source.title,
                    question: `What are the practical insights or viewpoints attributed to ${entities[0]} mentioned in ${source.title}?`,
                    tag: 'Entity Analysis'
                });
            }
            // Add a rigorous citation check prompt
            generatedQuestions.push({
                sourceTitle: source.title,
                question: `Summarize the primary takeaways of ${source.title}, ensuring rigorous numerical citations are attached to every claim.`,
                tag: 'Fact Verification'
            });
        });

        // Slice to display up to 8 impactful study questions
        generatedQuestions.slice(0, 8).forEach(q => {
            const card = document.createElement('div');
            card.className = 'study-question-card group';
            card.title = 'Click to switch to Chat and quiz the AI Assistant immediately!';
            
            card.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 group-hover:bg-purple-600 group-hover:text-white transition">
                    ❓
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-100">${q.tag}</span>
                        <span class="text-xs text-slate-400 truncate">Source: ${q.sourceTitle}</span>
                    </div>
                    <p class="font-medium text-slate-800 text-sm group-hover:text-indigo-900 transition leading-snug">${q.question}</p>
                    <span class="text-[11px] text-purple-600 font-bold opacity-0 group-hover:opacity-100 transition duration-200 flex items-center gap-1 mt-2">
                        <span>✨ Launch RAG AI Inquiry</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </span>
                </div>
            `;

            // Interactive action: clicking injects question into chat and sends it
            card.addEventListener('click', () => {
                this.switchWorkspaceTab('chat');
                elements.chatInput.value = q.question;
                this.handleChatSubmit();
            });

            elements.studyQuestionsList.appendChild(card);
        });
    },

    renderVocabularyCards(sources, shuffle = false) {
        if (!elements.studyFlashcardsGrid) return;
        elements.studyFlashcardsGrid.innerHTML = '';

        let vocabularyItems = [];

        sources.forEach(source => {
            const meta = this.parseMetadata(source) || {};
            const keywords = meta.keywords || [];
            const entities = meta.named_entities || [];

            keywords.forEach(kw => {
                vocabularyItems.push({
                    term: kw,
                    type: 'Keyword Term',
                    sourceTitle: source.title,
                    icon: '💡'
                });
            });

            entities.forEach(ent => {
                vocabularyItems.push({
                    term: ent,
                    type: 'Named Entity',
                    sourceTitle: source.title,
                    icon: '🏷️'
                });
            });
        });

        if (vocabularyItems.length === 0) {
            elements.studyFlashcardsGrid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-10 italic bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">No vocabulary keywords or entities extracted yet.</div>';
            return;
        }

        if (shuffle) {
            vocabularyItems.sort(() => Math.random() - 0.5);
        }

        // Display up to 12 flashcards
        vocabularyItems.slice(0, 12).forEach((item, idx) => {
            const cardWrap = document.createElement('div');
            cardWrap.className = 'flip-card';
            
            cardWrap.innerHTML = `
                <div class="flip-card-inner shadow-md rounded-2xl">
                    <!-- Front of Flashcard -->
                    <div class="flip-card-front text-center p-4">
                        <div class="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full mb-2">
                            <span>${item.icon}</span> ${item.type}
                        </div>
                        <h5 class="text-lg font-extrabold font-heading text-slate-800 my-auto line-clamp-2 px-2">${item.term}</h5>
                        <p class="text-[11px] text-slate-400 mt-auto truncate w-full border-t border-slate-100 pt-2 flex items-center justify-center gap-1">
                            <span>📖 ${item.sourceTitle}</span>
                            <span class="text-indigo-500 font-bold ml-1">Tap to flip 🔄</span>
                        </p>
                    </div>
                    <!-- Back of Flashcard -->
                    <div class="flip-card-back p-4 text-center">
                        <div class="text-xs text-indigo-200 font-bold uppercase tracking-wider mb-1">Interactive Quiz Trigger</div>
                        <p class="text-xs text-slate-200 my-auto leading-relaxed px-1">
                            Want to understand how <strong class="text-emerald-300 font-extrabold">"${item.term}"</strong> functions inside this document?
                        </p>
                        <button class="ai-quiz-btn w-full py-2 px-3 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 mt-auto">
                            <span>⚡ Ask AI to Explain</span>
                        </button>
                    </div>
                </div>
            `;

            // Card flip toggle on click
            cardWrap.addEventListener('click', (e) => {
                if (e.target.closest('.ai-quiz-btn')) return;
                cardWrap.classList.toggle('flipped');
            });

            // Action button on back: Launch RAG query for this specific term!
            const quizBtn = cardWrap.querySelector('.ai-quiz-btn');
            quizBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.switchWorkspaceTab('chat');
                elements.chatInput.value = `Define and clearly explain the concept of "${item.term}" according to ${item.sourceTitle}. Include full citations.`;
                this.handleChatSubmit();
            });

            elements.studyFlashcardsGrid.appendChild(cardWrap);
        });
    },

    // ==========================================
    // CHAT & SUBMISSION LOGIC
    // ==========================================

    async handleChatSubmit() {
        const message = elements.chatInput.value.trim();
        const notebookId = state.currentNotebookId;
        
        if (!message || !notebookId) return;

        elements.chatInput.value = '';
        this.updateInputState(true, "Thinking and retrieving facts...");

        // Render user message
        this.renderMessage('user', message);

        try {
            const loadingId = this.renderMessage('assistant', 'Analyzing sources and routing query...', true);
            let isFirstToken = true;
            let streamCitations = [];

            const response = await api.askQuestionStream(
                notebookId, 
                message,
                (token, fullAnswer) => {
                    if (isFirstToken) {
                        isFirstToken = false;
                        const div = document.getElementById(loadingId);
                        if (div) {
                            const bubble = div.querySelector('div');
                            bubble.classList.remove('animate-pulse', 'text-indigo-500', 'font-semibold');
                        }
                    }
                    this.updateStreamingMessage(loadingId, fullAnswer);
                },
                (citations) => {
                    streamCitations = citations;
                }
            );
            
            this.updateMessage(loadingId, response.answer, response.citations || streamCitations);
        } catch (error) {
            console.error(error);
            this.renderMessage('assistant', 'Sorry, I encountered an error while communicating with the AI server.');
        } finally {
            this.updateInputState();
            if (!elements.chatInput.disabled) {
                elements.chatInput.focus();
            }
        }
    },

    renderMessage(role, content, isLoading = false) {
        const id = 'msg-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
        
        const bubble = document.createElement('div');
        bubble.className = `max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 transition-all ${
            role === 'user' 
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-br-xs shadow-md shadow-indigo-500/15' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-md shadow-slate-200/50 leading-relaxed font-sans'
        } ${isLoading ? 'animate-pulse text-indigo-500 font-semibold' : ''}`;
        
        bubble.innerHTML = this.formatContent(content);
        
        div.appendChild(bubble);
        elements.chatMessages.appendChild(div);
        
        // Remove empty state message if it exists
        const emptyState = elements.chatMessages.querySelector('.text-center.text-slate-400');
        if (emptyState) emptyState.remove();

        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        return id;
    },

    updateMessage(id, content, citations) {
        const div = document.getElementById(id);
        if (!div) return;
        
        const bubble = div.querySelector('div');
        bubble.classList.remove('animate-pulse', 'text-indigo-500', 'font-semibold');
        
        let formattedContent = this.formatContent(content);
        
        // Parse citations [1], [2] into interactive chips
        if (citations && citations.length > 0) {
            formattedContent = formattedContent.replace(/\[(\d+)\]/g, (match, num) => {
                const citation = citations.find(c => c.citation_id === parseInt(num));
                if (citation) {
                    return `<button class="citation-chip inline-flex items-center justify-center px-2 py-0.5 ml-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs transition" title="${citation.source_title}" data-citation="${encodeURIComponent(JSON.stringify(citation))}">Ref [${num}]</button>`;
                }
                return match;
            });
        }
        
        bubble.innerHTML = formattedContent;
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

        // Attach event listeners to citation chips
        const chips = bubble.querySelectorAll('.citation-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const citationData = e.target.getAttribute('data-citation');
                if (citationData) {
                    const citation = JSON.parse(decodeURIComponent(citationData));
                    this.openSourceViewer(citation);
                } else {
                    const title = e.target.getAttribute('data-title');
                    const text = decodeURIComponent(e.target.getAttribute('data-text'));
                    this.openSourceViewer({ source_title: title, text_snippet: text, source_type: 'text' });
                }
            });
        });
    },

    updateStreamingMessage(id, content) {
        const div = document.getElementById(id);
        if (!div) return;
        const bubble = div.querySelector('div');
        bubble.innerHTML = this.formatContent(content) + '<span class="inline-block w-2 h-4 ml-1 bg-indigo-600 animate-pulse align-middle rounded-xs"></span>';
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    },

    async openSourceViewer(citation) {
        if (!elements.citationModal) return;

        // Populate header badges
        elements.modalTitle.textContent = citation.source_title || 'Unknown Source';
        const type = citation.source_type || 'text';
        
        const typeIcons = { pdf: '📕', youtube: '📺', url: '🌐', subtitle: '🎞️', text: '📄' };
        if (elements.modalTypeIcon) elements.modalTypeIcon.textContent = typeIcons[type] || '📄';
        if (elements.modalTypeBadge) elements.modalTypeBadge.textContent = type.toUpperCase();
        if (elements.modalChunkBadge) elements.modalChunkBadge.textContent = `Chunk #${citation.chunk_index !== undefined ? citation.chunk_index + 1 : 'N/A'}`;
        
        // Hide external link by default until set
        if (elements.modalExternalLink) {
            elements.modalExternalLink.classList.add('hidden');
            elements.modalExternalLink.href = '#';
        }

        elements.citationModal.classList.remove('hidden');

        // Clear dynamic container and show loading state
        if (elements.modalContentContainer) {
            elements.modalContentContainer.innerHTML = '<div class="flex-1 flex items-center justify-center p-8 text-slate-500 font-medium italic animate-pulse">Opening source viewer...</div>';
        }

        const urlOrPath = citation.url_or_path || '';
        const snippet = citation.text_snippet || '';

        // 1. PDF HANDLING: Open PDF viewer with search & jump parameters
        if (type === 'pdf' && urlOrPath) {
            const firstWords = snippet.split(/\s+/).slice(0, 8).join(' ');
            const searchParam = encodeURIComponent(firstWords);
            const pdfUrl = `${urlOrPath}#page=1&search=${searchParam}`;

            if (elements.modalExternalLink) {
                elements.modalExternalLink.href = pdfUrl;
                elements.modalExternalLink.classList.remove('hidden');
            }

            elements.modalContentContainer.innerHTML = `
                <div class="bg-indigo-50 border-b border-indigo-100 px-6 py-2.5 text-xs text-indigo-900 flex justify-between items-center shrink-0">
                    <span>💡 <strong>PDF Source Inspector:</strong> Loaded full PDF file. Use browser find or scroll to verify cited text.</span>
                    <span class="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 truncate max-w-[300px]" title="${this.escapeHtml(snippet)}">Snippet: "${this.escapeHtml(snippet.slice(0, 60))}..."</span>
                </div>
                <iframe src="${pdfUrl}" class="w-full flex-1 border-0 bg-slate-200"></iframe>
            `;
            return;
        }

        // 2. YOUTUBE HANDLING: Open video at calculated timestamp
        if (type === 'youtube' && urlOrPath) {
            // Estimate video start seconds from chunk index (~60s per 150-word chunk)
            const chunkIdx = citation.chunk_index || 0;
            const startSecs = chunkIdx * 60;
            
            const match = urlOrPath.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
            const videoId = match ? match[1] : null;

            const youtubeWatchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}&t=${startSecs}s` : urlOrPath;
            if (elements.modalExternalLink) {
                elements.modalExternalLink.href = youtubeWatchUrl;
                elements.modalExternalLink.classList.remove('hidden');
            }

            if (videoId) {
                const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${startSecs}`;
                elements.modalContentContainer.innerHTML = `
                    <div class="bg-red-50 border-b border-red-100 px-6 py-2.5 text-xs text-red-900 flex justify-between items-center shrink-0">
                        <span>🎬 <strong>YouTube Timestamp Inspector:</strong> Jumped to estimated timestamp ~${Math.floor(startSecs / 60)}m ${startSecs % 60}s based on chunk offset.</span>
                        <span class="text-[11px] font-bold text-red-700">Playing chunk #${chunkIdx + 1}</span>
                    </div>
                    <div class="flex-1 flex flex-col items-center justify-center p-4 bg-slate-950 overflow-y-auto">
                        <div class="w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl border border-slate-800 shrink-0">
                            <iframe src="${embedUrl}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                        </div>
                        <div class="mt-4 p-4 bg-slate-900 text-slate-200 text-xs rounded-xl border border-slate-800 w-full max-w-4xl overflow-y-auto max-h-36">
                            <strong class="text-indigo-400 block mb-1 uppercase tracking-wider text-[10px]">Retrieved Transcript Chunk:</strong>
                            <p class="leading-relaxed whitespace-pre-wrap">${this.escapeHtml(snippet)}</p>
                        </div>
                    </div>
                `;
                return;
            }
        }

        // 3. WEBSITE URL HANDLING: Open webpage preview with snippet highlight box & Text Fragment URL
        if (type === 'url' && urlOrPath) {
            const firstWords = snippet.split(/\s+/).slice(0, 8).join(' ');
            const textFragmentUrl = `${urlOrPath}#:~:text=${encodeURIComponent(firstWords)}`;

            if (elements.modalExternalLink) {
                elements.modalExternalLink.href = textFragmentUrl;
                elements.modalExternalLink.classList.remove('hidden');
            }

            elements.modalContentContainer.innerHTML = `
                <div class="bg-indigo-50 border-b border-indigo-200 p-4 shrink-0 shadow-xs">
                    <div class="flex items-center justify-between gap-4 mb-2">
                        <span class="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                            <span>🌐</span> Live Web Source Preview & Reference Snippet
                        </span>
                        <a href="${textFragmentUrl}" target="_blank" class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1 rounded-md shadow-sm transition">↗ Open Full Page with Highlight</a>
                    </div>
                    <div class="p-3 bg-white border border-indigo-100 rounded-lg text-xs text-slate-800 shadow-sm max-h-28 overflow-y-auto">
                        <span class="font-extrabold text-indigo-600 uppercase text-[10px] tracking-wider block mb-1">Cited Snippet from AI Database:</span>
                        <mark class="bg-amber-200 text-slate-900 px-1 py-0.5 rounded font-medium">${this.escapeHtml(snippet)}</mark>
                    </div>
                </div>
                <div class="flex-1 bg-white flex flex-col relative overflow-hidden">
                    <div class="p-2.5 text-center text-[11px] text-slate-500 bg-slate-100 border-b border-slate-200">
                        Note: If the external server restricts embedded frame loading, click "Open Full Page with Highlight" above.
                    </div>
                    <iframe src="${urlOrPath}" class="w-full flex-1 border-0"></iframe>
                </div>
            `;
            return;
        }

        // 4. TEXT / VTT / SRT SUBTITLE HANDLING: Fetch full source file, scroll to chunk & highlight
        if (urlOrPath && (type === 'text' || type === 'subtitle' || urlOrPath.startsWith('/uploads/'))) {
            if (elements.modalExternalLink) {
                elements.modalExternalLink.href = urlOrPath;
                elements.modalExternalLink.classList.remove('hidden');
            }

            try {
                const resp = await fetch(urlOrPath);
                if (resp.ok) {
                    const fullText = await resp.text();
                    const cleanSnippet = snippet.trim();
                    const snippetIdx = fullText.indexOf(cleanSnippet);
                    
                    let highlightedHtml = '';
                    if (snippetIdx !== -1) {
                        const before = this.escapeHtml(fullText.substring(0, snippetIdx));
                        const matched = this.escapeHtml(cleanSnippet);
                        const after = this.escapeHtml(fullText.substring(snippetIdx + cleanSnippet.length));
                        highlightedHtml = `${before}<mark id="cited-chunk-mark" class="bg-amber-300 text-slate-950 font-bold px-1.5 py-1 rounded shadow-md border-2 border-amber-500 animate-pulse">${matched}</mark>${after}`;
                    } else {
                        const first30 = cleanSnippet.slice(0, 30);
                        const approxIdx = fullText.indexOf(first30);
                        if (approxIdx !== -1) {
                            const before = this.escapeHtml(fullText.substring(0, approxIdx));
                            const matched = this.escapeHtml(fullText.substring(approxIdx, approxIdx + cleanSnippet.length));
                            const after = this.escapeHtml(fullText.substring(approxIdx + cleanSnippet.length));
                            highlightedHtml = `${before}<mark id="cited-chunk-mark" class="bg-amber-300 text-slate-950 font-bold px-1.5 py-1 rounded shadow-md border-2 border-amber-500 animate-pulse">${matched}</mark>${after}`;
                        } else {
                            highlightedHtml = `<div class="p-4 mb-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs"><strong class="font-bold block mb-1">Cited Chunk Reference:</strong><mark class="bg-amber-200 px-1 py-0.5 rounded font-mono">${this.escapeHtml(cleanSnippet)}</mark></div>` + this.escapeHtml(fullText);
                        }
                    }

                    elements.modalContentContainer.innerHTML = `
                        <div class="bg-slate-800 border-b border-slate-700 px-6 py-2.5 text-xs text-slate-300 flex justify-between items-center shrink-0">
                            <span>📄 <strong>Document Reader:</strong> Showing full text. Automatically scrolled & highlighted cited passage.</span>
                            <button onclick="document.getElementById('cited-chunk-mark')?.scrollIntoView({ behavior: 'smooth', block: 'center' })" class="bg-slate-700 hover:bg-slate-600 text-white font-bold px-2.5 py-1 rounded text-[11px] shadow transition cursor-pointer">🎯 Jump to Citation</button>
                        </div>
                        <div class="p-6 overflow-y-auto flex-1 text-slate-800 whitespace-pre-wrap leading-relaxed text-sm font-sans bg-white m-4 rounded-xl border border-slate-200 shadow-sm custom-scrollbar">
                            ${highlightedHtml}
                        </div>
                    `;

                    setTimeout(() => {
                        const markElem = document.getElementById('cited-chunk-mark');
                        if (markElem) {
                            markElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 100);
                    return;
                }
            } catch (err) {
                console.error("Failed to fetch static text file:", err);
            }
        }

        // Fallback: Display raw snippet if original file fetch fails
        elements.modalContentContainer.innerHTML = `
            <div class="bg-slate-200 px-6 py-3 text-xs text-slate-700 font-semibold border-b border-slate-300">
                Displaying stored database chunk snippet:
            </div>
            <div id="modal-content" class="p-6 overflow-y-auto flex-1 text-slate-800 whitespace-pre-wrap leading-relaxed text-sm font-sans bg-white m-4 rounded-xl border border-slate-200 shadow-sm custom-scrollbar">
                <mark class="bg-amber-200 text-slate-900 px-2 py-1 rounded block leading-relaxed">${this.escapeHtml(snippet)}</mark>
            </div>
        `;
    },

    escapeHtml(str) {
        return (str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    formatContent(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold font-heading text-slate-900">$1</strong>')
            .replace(/\n/g, '<br>');
    },

    updateInputState(isProcessing = false, placeholderText = null) {
        if (isProcessing) {
            elements.chatInput.disabled = true;
            elements.sendBtn.disabled = true;
            elements.chatInput.placeholder = placeholderText || "Please wait...";
            return;
        }

        const hasPending = state.sources && state.sources.some(s => s.indexing_status === 'pending' || s.indexing_status === 'processing');
        if (hasPending) {
            elements.chatInput.disabled = true;
            elements.sendBtn.disabled = true;
            elements.chatInput.placeholder = "Please wait, uploaded sources are being embedded and indexed...";
        } else {
            elements.chatInput.disabled = false;
            elements.sendBtn.disabled = false;
            elements.chatInput.placeholder = "Ask any question about your uploaded sources...";
        }
    },

    renderRoadmap(roadmap) {
        if (!elements.roadmapEmptyState || !elements.roadmapContent || !elements.roadmapStepsList) return;
        
        elements.roadmapEmptyState.classList.add('hidden');
        elements.roadmapContent.classList.remove('hidden');
        
        if (elements.roadmapHeaderTitle) elements.roadmapHeaderTitle.textContent = roadmap.title || 'Your Personalized Learning Roadmap';
        if (elements.roadmapHeaderSummary) elements.roadmapHeaderSummary.textContent = roadmap.summary || 'Follow these personalized steps to achieve mastery using your uploaded video lectures and sources.';
        
        elements.roadmapStepsList.innerHTML = '';
        const steps = roadmap.steps || [];
        if (steps.length === 0) {
            elements.roadmapStepsList.innerHTML = '<p class="text-slate-400 p-6 italic text-center bg-white rounded-2xl border border-slate-200 shadow-sm">No specific steps generated for this topic.</p>';
            return;
        }

        steps.forEach((step, index) => {
            const card = document.createElement('div');
            card.className = "bg-white hover:bg-slate-50/90 rounded-2xl border border-slate-200/90 p-6 shadow-sm hover:shadow-lg transition-all duration-200 relative group cursor-pointer transform hover:-translate-y-0.5";
            
            const diffColor = step.difficulty === 'Advanced' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                              (step.difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200');

            const prereqs = (step.prerequisites || []).map(p => `<span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200"># ${p}</span>`).join(' ');

            card.innerHTML = `
                <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white font-extrabold text-xs shadow-sm">${step.step_number || (index + 1)}</span>
                            <span class="text-xs font-bold uppercase tracking-wider px-3 py-0.5 rounded-full border ${diffColor}">${step.difficulty || 'Essential'}</span>
                            <span class="text-xs text-slate-500 font-semibold flex items-center gap-1">⏱️ ${step.estimated_duration || '~10 mins'}</span>
                        </div>
                        <h5 class="text-xl font-extrabold font-heading text-slate-900 group-hover:text-indigo-600 transition-colors">${step.topic}</h5>
                        <p class="text-slate-600 text-sm mt-1 leading-relaxed">${step.explanation}</p>
                    </div>
                    <div class="shrink-0 bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 max-w-sm flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md shadow-red-500/20">▶️</div>
                        <div class="overflow-hidden">
                            <span class="text-[10px] uppercase font-extrabold text-indigo-700 block tracking-wider">Recommended Source:</span>
                            <span class="text-xs font-bold text-slate-800 block truncate" title="${step.recommended_video_title || 'Video Lecture'}">${step.recommended_video_title || 'Video Lecture'}</span>
                            <span class="text-xs text-rose-600 font-extrabold flex items-center gap-1 mt-0.5">Start at timestamp: ${step.timestamp_str || '00:00'} ↗</span>
                        </div>
                    </div>
                </div>
                ${step.why_recommended ? `
                <div class="mb-4 bg-slate-50 border-l-4 border-indigo-500 p-3 rounded-r-xl text-xs text-slate-700 font-medium">
                    <strong class="text-slate-900 font-bold">💡 Why this video & section?</strong> ${step.why_recommended}
                </div>` : ''}
                ${prereqs ? `
                <div class="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
                    <span class="text-xs text-slate-400 font-bold uppercase mr-1">Prerequisites:</span>
                    ${prereqs}
                </div>` : ''}
            `;

            card.addEventListener('click', () => {
                let url = step.video_url || '';
                const secs = step.timestamp_seconds || 0;
                if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
                    const separator = url.includes('?') ? '&' : '?';
                    const timestampedUrl = `${url}${separator}t=${secs}s`;
                    window.open(timestampedUrl, '_blank', 'noopener,noreferrer');
                    this.showToast(`▶️ Opening video at timestamp ${step.timestamp_str || secs + 's'}!`, 'success');
                } else if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                } else {
                    this.showToast(`Selected lesson step: ${step.recommended_video_title} (${step.timestamp_str})`, 'success');
                }
            });

            elements.roadmapStepsList.appendChild(card);
        });
    }
};

