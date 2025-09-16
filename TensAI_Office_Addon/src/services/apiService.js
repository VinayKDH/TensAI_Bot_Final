/**
 * TensAI API Service for Office Add-in
 * Handles all API communications with TensAI backend services
 */

class TensAIAPIService {
    constructor() {
        this.baseUrl = 'https://dev2.tens-ai.com/api';
        this.apiKey = 'your-api-key-here'; // Should be set from environment variables
        this.timeout = 30000;
        
        this.endpoints = {
            webgpt: '/webchat',
            translator: '/translate',
            summarizer: '/summarize',
            media: {
                image: '/generate-image',
                video: '/generate-video',
                audio: '/audiogen',
                image2image: '/edit-image'
            },
            omni: '/omniQuest',
            upload: '/upload',
            status: '/status'
        };
    }

    /**
     * Make HTTP request to TensAI API
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} API response
     */
    async makeRequest(endpoint, data = {}, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                ...options.headers
            },
            timeout: this.timeout,
            ...options
        };

        if (data && Object.keys(data).length > 0) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API Request failed:', error);
            throw new Error(`API request failed: ${error.message}`);
        }
    }

    /**
     * Upload file to TensAI
     * @param {FormData} formData - File data
     * @returns {Promise<Object>} Upload response
     */
    async uploadFile(formData) {
        const url = `${this.baseUrl}${this.endpoints.upload}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: formData,
                timeout: 60000
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('File upload failed:', error);
            throw new Error(`File upload failed: ${error.message}`);
        }
    }

    /**
     * WebGPT API call
     * @param {string} query - User query
     * @param {number} temperature - Response temperature
     * @param {Array} history - Conversation history
     * @returns {Promise<Object>} WebGPT response
     */
    async callWebGPT(query, temperature = 0.7, history = []) {
        return await this.makeRequest(this.endpoints.webgpt, {
            query,
            temperature,
            history
        });
    }

    /**
     * Translation API call
     * @param {string} text - Text to translate
     * @param {string} targetLanguage - Target language code
     * @param {string} sourceLanguage - Source language code (optional)
     * @returns {Promise<Object>} Translation response
     */
    async translateText(text, targetLanguage, sourceLanguage = 'auto') {
        return await this.makeRequest(this.endpoints.translator, {
            text,
            target_language: targetLanguage,
            source_language: sourceLanguage
        });
    }

    /**
     * Summarization API call
     * @param {string} text - Text to summarize
     * @param {number} maxLength - Maximum summary length
     * @returns {Promise<Object>} Summary response
     */
    async summarizeText(text, maxLength = 150) {
        return await this.makeRequest(this.endpoints.summarizer, {
            text,
            max_length: maxLength
        });
    }

    /**
     * Image generation API call
     * @param {string} prompt - Image generation prompt
     * @param {string} size - Image size
     * @param {string} quality - Image quality
     * @param {number} numberOfImages - Number of images to generate
     * @returns {Promise<Object>} Image generation response
     */
    async generateImage(prompt, size = '1024x1024', quality = 'standard', numberOfImages = 1) {
        return await this.makeRequest(this.endpoints.media.image, {
            prompt,
            size,
            quality,
            number_of_images: numberOfImages
        });
    }

    /**
     * Video generation API call
     * @param {string} prompt - Video generation prompt
     * @param {number} duration - Video duration in seconds
     * @returns {Promise<Object>} Video generation response
     */
    async generateVideo(prompt, duration = 10) {
        return await this.makeRequest(this.endpoints.media.video, {
            prompt,
            duration
        });
    }

    /**
     * Audio generation API call
     * @param {string} prompt - Audio generation prompt
     * @param {string} voice - Voice type
     * @param {string} language - Language code
     * @returns {Promise<Object>} Audio generation response
     */
    async generateAudio(prompt, voice = 'alloy', language = 'en') {
        return await this.makeRequest(this.endpoints.media.audio, {
            prompt,
            voice,
            language
        });
    }

    /**
     * Image to Image editing API call
     * @param {string} prompt - Edit prompt
     * @param {string} imageUrl - Base image URL
     * @param {string} operationType - Type of operation
     * @returns {Promise<Object>} Image edit response
     */
    async editImage(prompt, imageUrl, operationType = 'edit') {
        return await this.makeRequest(this.endpoints.media.image2image, {
            prompt,
            imageUrl,
            operation_type: operationType
        });
    }

    /**
     * OmniQuest document Q&A API call
     * @param {string} question - User question
     * @param {string} documentId - Document ID
     * @param {number} topK - Number of top results
     * @returns {Promise<Object>} OmniQuest response
     */
    async askOmniQuest(question, documentId, topK = 5) {
        return await this.makeRequest(this.endpoints.omni, {
            question,
            document_id: documentId,
            top_k: topK
        });
    }

    /**
     * Check job status
     * @param {string} jobId - Job ID
     * @returns {Promise<Object>} Status response
     */
    async checkStatus(jobId) {
        return await this.makeRequest(`${this.endpoints.status}/${jobId}`);
    }

    /**
     * Set API configuration
     * @param {Object} config - Configuration object
     */
    setConfig(config) {
        if (config.baseUrl) this.baseUrl = config.baseUrl;
        if (config.apiKey) this.apiKey = config.apiKey;
        if (config.timeout) this.timeout = config.timeout;
    }

    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return {
            baseUrl: this.baseUrl,
            apiKey: this.apiKey ? '***' : null,
            timeout: this.timeout
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TensAIAPIService;
} else {
    window.TensAIAPIService = TensAIAPIService;
}
