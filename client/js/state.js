export const state = {
    notebooks: [],
    sources: [],
    currentNotebookId: null,
    listeners: [],

    subscribe(listener) {
        this.listeners.push(listener);
    },

    notify() {
        this.listeners.forEach(listener => listener(this));
    },

    setNotebooks(notebooks) {
        this.notebooks = notebooks;
        this.notify();
    },

    setSources(sources) {
        this.sources = sources;
        this.notify();
    },

    addSource(source) {
        this.sources.unshift(source);
        this.notify();
    },

    removeSource(id) {
        this.sources = this.sources.filter(s => s.id !== id);
        this.notify();
    },

    addNotebook(notebook) {
        this.notebooks.unshift(notebook); // Add to top
        this.notify();
    },

    addAndSelectNotebook(notebook) {
        this.notebooks.unshift(notebook);
        this.currentNotebookId = notebook.id;
        this.notify();
    },

    removeNotebook(id) {
        this.notebooks = this.notebooks.filter(n => n.id !== id);
        if (this.currentNotebookId === id) {
            this.currentNotebookId = null;
        }
        this.notify();
    },

    setCurrentNotebook(id) {
        this.currentNotebookId = id;
        this.notify();
    },

    getCurrentNotebook() {
        return this.notebooks.find(n => n.id === this.currentNotebookId);
    }
};
