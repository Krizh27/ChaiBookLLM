const API_BASE = '/api';

export const api = {
    async getNotebooks() {
        const response = await fetch(`${API_BASE}/notebooks`);
        if (!response.ok) throw new Error('Failed to fetch notebooks');
        return response.json();
    },

    async createNotebook(name) {
        const response = await fetch(`${API_BASE}/notebooks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!response.ok) throw new Error('Failed to create notebook');
        return response.json();
    },

    async updateNotebook(id, name) {
        const response = await fetch(`${API_BASE}/notebooks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!response.ok) throw new Error('Failed to update notebook');
        return response.json();
    },

    async deleteNotebook(id) {
        const response = await fetch(`${API_BASE}/notebooks/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete notebook');
        return response.json();
    },

    async getSources(notebookId) {
        const response = await fetch(`${API_BASE}/notebooks/${notebookId}/sources`);
        if (!response.ok) throw new Error('Failed to fetch sources');
        return response.json();
    },

    async uploadSource(notebookId, file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE}/notebooks/${notebookId}/sources`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error('Failed to upload source');
        return response.json();
    },
    
    async uploadUrl(notebookId, url) {
        const response = await fetch(`${API_BASE}/notebooks/${notebookId}/sources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        if (!response.ok) throw new Error('Failed to upload URL');
        return response.json();
    },

    async deleteSource(notebookId, sourceId) {
        const response = await fetch(`${API_BASE}/notebooks/${notebookId}/sources/${sourceId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete source');
        return response.json();
    },

    async getChatHistory(notebookId) {
        const response = await fetch(`${API_BASE}/notebooks/${notebookId}/chat`);
        if (!response.ok) throw new Error('Failed to fetch chat history');
        return response.json();
    },

    async askQuestion(notebookId, message) {
        return this.askQuestionStream(notebookId, message);
    },

    async askQuestionStream(notebookId, message, onToken = null, onMetadata = null) {
        const response = await fetch(`${API_BASE}/notebooks/${notebookId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        if (!response.ok) throw new Error('Failed to fetch answer stream');
        
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const res = await response.json();
            if (onMetadata && res.citations) onMetadata(res.citations);
            if (onToken && res.answer) onToken(res.answer, res.answer);
            return res;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let answer = '';
        let citations = [];
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep remainder
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr) continue;
                    try {
                        const data = JSON.parse(jsonStr);
                        if (data.type === 'metadata') {
                            citations = data.citations || [];
                            if (onMetadata) onMetadata(citations);
                        } else if (data.type === 'token') {
                            answer += data.token;
                            if (onToken) onToken(data.token, answer);
                        } else if (data.type === 'done') {
                            if (data.answer !== undefined) answer = data.answer;
                            if (data.citations) citations = data.citations;
                        } else if (data.type === 'error') {
                            throw new Error(data.error || 'Stream error');
                        }
                    } catch (err) {
                        console.error("Error parsing SSE line:", line, err);
                    }
                }
            }
        }
        return { answer, citations };
    }
};
