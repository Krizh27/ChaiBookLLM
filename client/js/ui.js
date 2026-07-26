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
    modalClose: document.getElementById('modal-close'),
    // Workspace Navigation & Study Hub Elements
    tabChat: document.getElementById('tab-chat'),
    tabStudyHub: document.getElementById('tab-study-hub'),
    viewChat: document.getElementById('view-chat'),
    viewStudy: document.getElementById('view-study'),
    studySummariesGrid: document.getElementById('study-summaries-grid'),
    studyQuestionsList: document.getElementById('study-questions-list'),
    studyFlashcardsGrid: document.getElementById('study-flashcards-grid'),
    shuffleCardsBtn: document.getElementById('shuffle-cards-btn')
};

export const ui = {
    pollingInterval: null,

    init() {
        elements.newNotebookBtn.addEventListener('click', async () => {
            const name = prompt('Enter notebook name:');
            if (name && name.trim()) {
                try {
                    const newNotebook = await api.createNotebook(name.trim());
                    // Use unified addition and selection to prevent firing asynchronous renders on the old notebook
                    state.addAndSelectNotebook(newNotebook);
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
                    this.updateInputState(true, "Reading and parsing URL source...");
                    const newSource = await api.uploadUrl(currentNotebookId, url.trim());
                    state.addSource(newSource);
                } catch (error) {
                    alert('Error adding URL');
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
                } catch (error) {
                    alert('Error uploading file');
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
        if (!elements.viewChat || !elements.viewStudy) return;

        if (tabName === 'chat') {
            elements.viewChat.classList.remove('hidden');
            elements.viewStudy.classList.add('hidden');
            
            elements.tabChat.className = "workspace-tab px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/30 font-heading";
            elements.tabStudyHub.className = "workspace-tab px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all duration-200 flex items-center gap-2 font-heading";
        } else {
            elements.viewStudy.classList.remove('hidden');
            elements.viewChat.classList.add('hidden');
            
            elements.tabStudyHub.className = "workspace-tab px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30 font-heading";
            elements.tabChat.className = "workspace-tab px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all duration-200 flex items-center gap-2 font-heading";
        }
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

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.className = 'text-slate-500 hover:text-red-400 font-bold ml-2 px-2 py-0.5 rounded text-lg leading-none transition duration-150';
            deleteBtn.title = 'Delete Notebook';
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`Delete notebook "${notebook.name}" and all associated vectors?`)) {
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

            const delBtn = document.createElement('button');
            delBtn.className = 'ml-3 text-slate-400 hover:text-red-600 font-extrabold text-lg leading-none px-1 transition duration-150';
            delBtn.textContent = '×';
            delBtn.title = 'Delete source and vectors';
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if(confirm(`Delete source "${source.title}" and remove its Qdrant vectors?`)) {
                    await api.deleteSource(state.currentNotebookId, source.id);
                    this.renderMainArea();
                }
            });

            li.appendChild(titleSpan);
            li.appendChild(statusBadge);
            li.appendChild(delBtn);
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
            const response = await api.askQuestion(notebookId, message);
            this.updateMessage(loadingId, response.answer, response.citations);
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
                    return `<button class="citation-chip inline-flex items-center justify-center px-2 py-0.5 ml-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs transition" title="${citation.source_title}" data-title="${citation.source_title}" data-text="${encodeURIComponent(citation.text_snippet)}">Ref [${num}]</button>`;
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
    }
};

