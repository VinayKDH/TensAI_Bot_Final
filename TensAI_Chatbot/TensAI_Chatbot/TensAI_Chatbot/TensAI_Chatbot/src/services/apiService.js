/**
 * API Service for TensAI Bot
 * Handles all external API calls to various TensAI modules
 */

let fetch;
try {
  // prefer global fetch (Node 18+), else try node-fetch if installed
  fetch = global.fetch || require("node-fetch");
} catch (e) {
  fetch = null;
}

class ApiService {
  constructor() {
    this.baseUrl = process.env.TENSAI_BASE_URL || 'http://localhost:5000';
    this.endpoints = {
      WebGPT: {
        url: `${this.baseUrl}/api/webchat`,
        method: 'POST',
        timeout: 15000,
        retries: 2
      },
      "Media Studio": {
        imageGeneration: `${this.baseUrl}/api/generate-image`,
        audioGeneration: `${this.baseUrl}/api/audiogen`,
        videoGeneration: `${this.baseUrl}/api/generate-video`,
        videoStatus: `${this.baseUrl}/api/video-status`,
        imageEdit: `${this.baseUrl}/api/edit-image`,
        upload: `${this.baseUrl}/api/upload`,
        method: 'POST',
        timeout: 30000, // Media generation might take longer
        retries: 1
      },
      Translator: {
        text: `${this.baseUrl}/api/translate`,
        document: `${this.baseUrl}/api/docTranslator`,
        upload: `${this.baseUrl}/api/upload`,
        method: 'POST',
        timeout: 10000,
        retries: 2
      },
      Summarizer: {
        url: `${this.baseUrl}/api/webchat`,
        method: 'POST',
        timeout: 20000,
        retries: 2
      },
      OmniQuest: {
        query: `${this.baseUrl}/api/omniQuest`,
        upload: `${this.baseUrl}/api/upload`,
        status: `${this.baseUrl}/api/status`,
        method: 'POST',
        timeout: 15000,
        retries: 2
      }
    };
  }

  /**
   * Call a specific module's API
   * @param {string} moduleName - Name of the module
   * @param {object} userInput - User input data
   * @param {string} userId - User ID for tracking
   * @returns {Promise<object>} API response
   */
  async callModuleAPI(moduleName, userInput = {}, userId = null) {
    const endpoint = this.endpoints[moduleName];
    
    if (!endpoint) {
      throw new Error(`No API endpoint configured for module: ${moduleName}`);
    }

    if (!fetch) {
      throw new Error('Fetch API not available in this runtime');
    }

    // Build request body based on module and action
    let requestBody;
    let endpointUrl;
    
    if (moduleName === "WebGPT" && userInput.action === 'chat') {
      // WebGPT API: /api/webchat
      endpointUrl = endpoint.url;
      requestBody = {
        query: userInput.query || userInput.message,
        temperature: 0.7,
        history: userInput.history || []
      };
    } else if (moduleName === "Translator" && userInput.action === 'translate') {
      // Text Translation API: /api/translate
      endpointUrl = endpoint.text;
      requestBody = {
        query: userInput.message,
        target_language: userInput.targetLanguage
      };
    } else if (moduleName === "Translator" && userInput.action === 'translate_document') {
      // Document Translation API: /api/docTranslator
      endpointUrl = endpoint.document;
      requestBody = {
        toLanguage: userInput.targetLanguage,
        filename: userInput.filename || 'document.pdf'
      };
    } else if (moduleName === "Summarizer" && userInput.action === 'summarize') {
      // Summarizer uses same API as WebGPT: /api/webchat
      endpointUrl = endpoint.url;
      requestBody = {
        query: userInput.message,
        temperature: 0.7,
        history: []
      };
    } else if (moduleName === "OmniQuest" && userInput.action === 'query_resource') {
      // OmniQuest API: /api/omniQuest
      endpointUrl = endpoint.query;
      requestBody = {
        query: userInput.query,
        file_names: userInput.file_names || [],
        top_k: 3,
        temperature: 0.5,
        feature_type: userInput.feature_type || 'omniquest_docs',
        history: userInput.history || []
      };
    } else if (moduleName === "Media Studio" && userInput.action === 'generate') {
      const generationType = userInput.generationType;
      
      if (generationType === 'image_generator') {
        // Image Generation API: /api/generate-image
        endpointUrl = endpoint.imageGeneration;
        requestBody = {
          model: userInput.model || 'dall-e-3',
          prompt: userInput.prompt,
          size: userInput.size || '1024x1024',
          number_of_images: 1,
          quality: 'high',
          addons: userInput.addons || ''
        };
      } else if (generationType === 'audio_generator') {
        // Audio Generation API: /api/audiogen
        endpointUrl = endpoint.audioGeneration;
        requestBody = {
          model: userInput.model || 'tts-1',
          prompt: userInput.prompt,
          language: userInput.language || 'en',
          voice: userInput.voice || 'alloy',
          negative_prompt: userInput.negative_prompt || ''
        };
      } else if (generationType === 'video_generator') {
        // Video Generation API: /api/generate-video
        endpointUrl = endpoint.videoGeneration;
        requestBody = {
          model: userInput.model || 'runway-gen2',
          prompt: userInput.prompt
        };
      } else if (generationType === 'image_to_image') {
        // Image Editing API: /api/edit-image
        endpointUrl = endpoint.imageEdit;
        requestBody = {
          model: userInput.model || 'dall-e-2',
          prompt: userInput.prompt,
          imagename: userInput.imageName || 'uploaded_image.jpg',
          size: userInput.size || '1024x1024',
          quality: userInput.quality || 'standard',
          operation_type: 'edit'
        };
      }
    } else {
      // Default fallback
      endpointUrl = endpoint.url || endpoint.query || endpoint.text;
      requestBody = {
        query: userInput.message || `User selected ${moduleName}`,
        temperature: 0.7,
        history: []
      };
    }

    console.log(`[API Service] Calling ${moduleName} API: ${endpointUrl}`);
    console.log(`[API Service] Request body:`, JSON.stringify(requestBody, null, 2));

    let lastError;
    
    // Retry logic
    for (let attempt = 1; attempt <= endpoint.retries + 1; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

        const response = await fetch(endpointUrl, {
          method: endpoint.method,
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "TensAI-Bot/1.0",
            "X-Request-ID": `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        let responseData;

        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { 
            message: responseText,
            rawResponse: true 
          };
        }

        console.log(`[API Service] ${moduleName} API response received (attempt ${attempt})`);
        
        return {
          success: true,
          data: responseData,
          module: moduleName,
          attempt: attempt,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        lastError = error;
        console.error(`[API Service] ${moduleName} API attempt ${attempt} failed:`, error.message);
        
        if (attempt <= endpoint.retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`[API Service] Retrying ${moduleName} API in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw new Error(`All ${endpoint.retries + 1} attempts failed. Last error: ${lastError.message}`);
  }

  /**
   * Get default action for a module
   * @param {string} moduleName 
   * @returns {string}
   */
  _getDefaultAction(moduleName) {
    const actions = {
      WebGPT: 'getChats',
      "Media Studio": 'generateImage',
      Translator: 'translate',
      Summarizer: 'summarize',
      OmniQuest: 'omniQuest'
    };
    return actions[moduleName] || 'process';
  }

  /**
   * Check if a module's API is available
   * @param {string} moduleName 
   * @returns {Promise<boolean>}
   */
  async checkModuleHealth(moduleName) {
    const endpoint = this.endpoints[moduleName];
    
    if (!endpoint) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          "User-Agent": "TensAI-Bot/1.0"
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log(`[API Service] Health check failed for ${moduleName}:`, error.message);
      return false;
    }
  }

  /**
   * Get all available modules
   * @returns {Array<string>}
   */
  getAvailableModules() {
    return Object.keys(this.endpoints);
  }

  /**
   * Get module configuration
   * @param {string} moduleName 
   * @returns {object|null}
   */
  getModuleConfig(moduleName) {
    return this.endpoints[moduleName] || null;
  }

  /**
   * Upload file for OmniQuest or Media Studio
   * @param {string} moduleName - Module name
   * @param {object} fileData - File data
   * @param {string} featureType - Feature type for upload
   * @returns {Promise<object>} Upload response
   */
  async uploadFile(moduleName, fileData, featureType) {
    const endpoint = this.endpoints[moduleName];
    
    if (!endpoint || !endpoint.upload) {
      throw new Error(`Upload not supported for module: ${moduleName}`);
    }

    const requestBody = {
      files: fileData,
      feature_type: featureType
    };

    console.log(`[API Service] Uploading file for ${moduleName}: ${endpoint.upload}`);
    console.log(`[API Service] Upload request:`, JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch(endpoint.upload, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TensAI-Bot/1.0"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      return {
        success: true,
        data: responseData,
        module: moduleName,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API Service] Upload failed for ${moduleName}:`, error.message);
      throw error;
    }
  }

  /**
   * Check OmniQuest job status
   * @param {string} jobId - Job ID to check
   * @returns {Promise<object>} Status response
   */
  async checkOmniQuestStatus(jobId) {
    const endpoint = this.endpoints.OmniQuest;
    const statusUrl = `${endpoint.status}/${jobId}`;

    console.log(`[API Service] Checking OmniQuest status: ${statusUrl}`);

    try {
      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          "User-Agent": "TensAI-Bot/1.0",
          "job_id": jobId
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      return {
        success: true,
        data: responseData,
        module: 'OmniQuest',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API Service] Status check failed for OmniQuest:`, error.message);
      throw error;
    }
  }

  /**
   * Check Media Studio video generation status
   * @param {string} operationId - Operation ID to check
   * @returns {Promise<object>} Status response
   */
  async checkVideoStatus(operationId) {
    const endpoint = this.endpoints["Media Studio"];

    console.log(`[API Service] Checking video status: ${endpoint.videoStatus}`);

    try {
      const response = await fetch(endpoint.videoStatus, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TensAI-Bot/1.0"
        },
        body: JSON.stringify({
          operation_id: operationId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      return {
        success: true,
        data: responseData,
        module: 'Media Studio',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API Service] Video status check failed:`, error.message);
      throw error;
    }
  }
}

module.exports = {
  ApiService
};
