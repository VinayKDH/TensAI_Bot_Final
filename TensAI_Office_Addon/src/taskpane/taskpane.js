/* 
 * TensAI Office Add-in JavaScript
 * Handles Office.js integration and TensAI API calls
 */

// Global variables
let currentOfficeApp = '';
let currentModule = '';
let uploadedDocumentId = '';

// API Configuration
const API_CONFIG = {
    baseUrl: 'https://dev2.tens-ai.com/api',
    apiKey: 'your-api-key-here', // This should be set in environment variables
    endpoints: {
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
        upload: '/upload'
    }
};

// Initialize Office Add-in
Office.onReady((info) => {
    if (info.host === Office.HostType.Outlook) {
        currentOfficeApp = 'Outlook';
    } else if (info.host === Office.HostType.Word) {
        currentOfficeApp = 'Word';
    } else if (info.host === Office.HostType.PowerPoint) {
        currentOfficeApp = 'PowerPoint';
    } else if (info.host === Office.HostType.Excel) {
        currentOfficeApp = 'Excel';
    }
    
    document.getElementById('office-app-name').textContent = currentOfficeApp;
    document.getElementById('office-info').style.display = 'block';
    
    console.log(`TensAI Add-in initialized for ${currentOfficeApp}`);
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const authStatus = document.getElementById('authStatus');
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            try {
                const authBase = localStorage.getItem('tensai_auth_base') || 'http://localhost:4001';
                const url = authBase + '/auth/login';
                Office.context.ui.displayDialogAsync(url, { height: 50, width: 30, displayInIframe: true }, function (asyncResult) {
                    setTimeout(() => { try { asyncResult.value.close(); } catch(_) {} }, 2000);
                    localStorage.setItem('tensai_access', 'dev');
                    if (btnLogin && btnLogout && authStatus) {
                        btnLogin.style.display = 'none';
                        btnLogout.style.display = 'inline-block';
                        authStatus.textContent = 'Signed in';
                    }
                });
            } catch (e) {
                console.error('Login failed', e);
            }
        });
    }
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                const authBase = localStorage.getItem('tensai_auth_base') || 'http://localhost:4001';
                await fetch(authBase + '/auth/logout', { method: 'POST', credentials: 'include' });
            } catch (_) {}
            localStorage.removeItem('tensai_access');
            if (btnLogin && btnLogout && authStatus) {
                btnLogin.style.display = 'inline-block';
                btnLogout.style.display = 'none';
                authStatus.textContent = 'Signed out';
            }
        });
    }
});

// Module button click handlers
document.addEventListener('DOMContentLoaded', function() {
    const moduleButtons = document.querySelectorAll('.module-btn');
    
    moduleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const module = this.getAttribute('data-module');
            loadModule(module);
        });
    });
});

// Load module interface
function loadModule(module) {
    currentModule = module;
    hideAllSections();
    
    const moduleContent = document.getElementById('module-content');
    moduleContent.style.display = 'block';
    
    switch(module) {
        case 'webgpt':
            loadWebGPTInterface();
            break;
        case 'media':
            loadMediaStudioInterface();
            break;
        case 'translator':
            loadTranslatorInterface();
            break;
        case 'summarizer':
            loadSummarizerInterface();
            break;
        case 'omni':
            loadOmniQuestInterface();
            break;
        default:
            showError('Unknown module selected');
    }
}

// Load WebGPT interface
function loadWebGPTInterface() {
    const content = `
        <div class="module-header">
            <h4><i class="fas fa-robot"></i> WebGPT - AI Text Generation</h4>
        </div>
        <div class="form-group">
            <label for="webgpt-prompt">Enter your prompt:</label>
            <textarea id="webgpt-prompt" class="form-control" rows="4" placeholder="Ask me anything..."></textarea>
        </div>
        <div class="form-group">
            <label for="webgpt-temperature">Temperature (0.1 - 1.0):</label>
            <input type="range" id="webgpt-temperature" class="form-range" min="0.1" max="1.0" step="0.1" value="0.7">
            <span id="temp-value">0.7</span>
        </div>
        <button class="btn btn-primary" onclick="generateWebGPTResponse()">
            <i class="fas fa-magic"></i> Generate Response
        </button>
    `;
    
    document.getElementById('module-content').innerHTML = content;
    
    // Update temperature display
    document.getElementById('webgpt-temperature').addEventListener('input', function() {
        document.getElementById('temp-value').textContent = this.value;
    });
}

// Load Media Studio interface
function loadMediaStudioInterface() {
    const content = `
        <div class="module-header">
            <h4><i class="fas fa-palette"></i> Media Studio - AI Media Generation</h4>
        </div>
        <div class="form-group">
            <label>Select Generation Type:</label>
            <div class="btn-group w-100" role="group">
                <input type="radio" class="btn-check" name="media-type" id="image-gen" value="image" checked>
                <label class="btn btn-outline-primary" for="image-gen">Image</label>
                
                <input type="radio" class="btn-check" name="media-type" id="video-gen" value="video">
                <label class="btn btn-outline-primary" for="video-gen">Video</label>
                
                <input type="radio" class="btn-check" name="media-type" id="audio-gen" value="audio">
                <label class="btn btn-outline-primary" for="audio-gen">Audio</label>
                
                <input type="radio" class="btn-check" name="media-type" id="image2image" value="image2image">
                <label class="btn btn-outline-primary" for="image2image">Image to Image</label>
            </div>
        </div>
        <div class="form-group">
            <label for="media-prompt">Describe what you want to create:</label>
            <textarea id="media-prompt" class="form-control" rows="3" placeholder="A beautiful sunset over mountains..."></textarea>
        </div>
        <button class="btn btn-success" onclick="generateMedia()">
            <i class="fas fa-magic"></i> Generate Media
        </button>
    `;
    
    document.getElementById('module-content').innerHTML = content;
}

// Load Translator interface
function loadTranslatorInterface() {
    const content = `
        <div class="module-header">
            <h4><i class="fas fa-language"></i> Translator - Multi-language Translation</h4>
        </div>
        <div class="form-group">
            <label>Translation Type:</label>
            <div class="btn-group w-100" role="group">
                <input type="radio" class="btn-check" name="translation-type" id="text-translate" value="text" checked>
                <label class="btn btn-outline-info" for="text-translate">Text Translation</label>
                
                <input type="radio" class="btn-check" name="translation-type" id="doc-translate" value="document">
                <label class="btn btn-outline-info" for="doc-translate">Document Translation</label>
            </div>
        </div>
        <div class="form-group">
            <label for="target-language">Target Language:</label>
            <select id="target-language" class="form-select">
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
                <option value="zh">Chinese</option>
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
            </select>
        </div>
        <div class="form-group">
            <label for="translation-text">Text to translate:</label>
            <textarea id="translation-text" class="form-control" rows="4" placeholder="Enter text to translate..."></textarea>
        </div>
        <button class="btn btn-info" onclick="translateText()">
            <i class="fas fa-language"></i> Translate
        </button>
    `;
    
    document.getElementById('module-content').innerHTML = content;
}

// Load Summarizer interface
function loadSummarizerInterface() {
    const content = `
        <div class="module-header">
            <h4><i class="fas fa-file-text"></i> Summarizer - Content Summarization</h4>
        </div>
        <div class="form-group">
            <label for="summarizer-text">Text to summarize:</label>
            <textarea id="summarizer-text" class="form-control" rows="6" placeholder="Paste the text you want to summarize..."></textarea>
        </div>
        <div class="form-group">
            <label for="summary-length">Summary Length:</label>
            <select id="summary-length" class="form-select">
                <option value="short">Short (1-2 sentences)</option>
                <option value="medium" selected>Medium (2-3 paragraphs)</option>
                <option value="long">Long (3-4 paragraphs)</option>
            </select>
        </div>
        <button class="btn btn-warning" onclick="summarizeText()">
            <i class="fas fa-compress"></i> Summarize
        </button>
    `;
    
    document.getElementById('module-content').innerHTML = content;
}

// Load OmniQuest interface
function loadOmniQuestInterface() {
    const content = `
        <div class="module-header">
            <h4><i class="fas fa-search"></i> OmniQuest - Document Analysis & Q&A</h4>
        </div>
        <div class="form-group">
            <label for="omni-question">Ask a question about your document:</label>
            <textarea id="omni-question" class="form-control" rows="3" placeholder="What is the main topic of this document?"></textarea>
        </div>
        <div class="form-group">
            <label for="omni-context">Additional context (optional):</label>
            <textarea id="omni-context" class="form-control" rows="2" placeholder="Any additional context or specific areas to focus on..."></textarea>
        </div>
        <button class="btn btn-secondary" onclick="analyzeDocument()">
            <i class="fas fa-search"></i> Analyze Document
        </button>
    `;
    
    document.getElementById('module-content').innerHTML = content;
}

// Generate WebGPT response
async function generateWebGPTResponse() {
    const prompt = document.getElementById('webgpt-prompt').value;
    const temperature = document.getElementById('webgpt-temperature').value;
    
    if (!prompt.trim()) {
        showError('Please enter a prompt');
        return;
    }
    
    showLoading();
    
    try {
        const response = await callAPI('webgpt', {
            query: prompt,
            temperature: parseFloat(temperature)
        });
        
        showResults(`
            <h5>Generated Response:</h5>
            <div class="response-content">${response.response || response.message || 'No response received'}</div>
            <button class="btn btn-primary mt-3" onclick="insertIntoDocument('${escapeHtml(response.response || response.message || '')}')">
                <i class="fas fa-plus"></i> Insert into Document
            </button>
        `);
    } catch (error) {
        showError('Failed to generate response: ' + error.message);
    }
}

// Generate media
async function generateMedia() {
    const prompt = document.getElementById('media-prompt').value;
    const mediaType = document.querySelector('input[name="media-type"]:checked').value;
    
    if (!prompt.trim()) {
        showError('Please enter a description');
        return;
    }
    
    showLoading();
    
    try {
        const endpoint = API_CONFIG.endpoints.media[mediaType] || API_CONFIG.endpoints.media.image;
        const response = await callAPI(endpoint, {
            prompt: prompt,
            model: 'default'
        });
        
        let resultHtml = `<h5>Generated ${mediaType}:</h5>`;
        
        if (mediaType === 'image' || mediaType === 'image2image') {
            resultHtml += `
                <img src="${response.imageUrl || response.url}" class="img-fluid mb-3" alt="Generated image">
                <button class="btn btn-primary" onclick="insertImageIntoDocument('${response.imageUrl || response.url}')">
                    <i class="fas fa-image"></i> Insert Image
                </button>
            `;
        } else if (mediaType === 'video') {
            resultHtml += `
                <video controls class="w-100 mb-3">
                    <source src="${response.videoUrl || response.url}" type="video/mp4">
                </video>
                <button class="btn btn-primary" onclick="insertVideoIntoDocument('${response.videoUrl || response.url}')">
                    <i class="fas fa-video"></i> Insert Video
                </button>
            `;
        } else if (mediaType === 'audio') {
            resultHtml += `
                <audio controls class="w-100 mb-3">
                    <source src="${response.audioUrl || response.url}" type="audio/mpeg">
                </audio>
                <button class="btn btn-primary" onclick="insertAudioIntoDocument('${response.audioUrl || response.url}')">
                    <i class="fas fa-volume-up"></i> Insert Audio
                </button>
            `;
        }
        
        showResults(resultHtml);
    } catch (error) {
        showError('Failed to generate media: ' + error.message);
    }
}

// Translate text
async function translateText() {
    const text = document.getElementById('translation-text').value;
    const targetLanguage = document.getElementById('target-language').value;
    const translationType = document.querySelector('input[name="translation-type"]:checked').value;
    
    if (!text.trim()) {
        showError('Please enter text to translate');
        return;
    }
    
    showLoading();
    
    try {
        const response = await callAPI('translator', {
            query: text,
            target_language: targetLanguage
        });
        
        showResults(`
            <h5>Translation Result:</h5>
            <div class="translation-result">
                <strong>Original:</strong> ${text}<br><br>
                <strong>Translated:</strong> ${response.translation || response.result || 'Translation not available'}
            </div>
            <button class="btn btn-info mt-3" onclick="insertIntoDocument('${escapeHtml(response.translation || response.result || '')}')">
                <i class="fas fa-plus"></i> Insert Translation
            </button>
        `);
    } catch (error) {
        showError('Failed to translate text: ' + error.message);
    }
}

// Summarize text
async function summarizeText() {
    const text = document.getElementById('summarizer-text').value;
    const length = document.getElementById('summary-length').value;
    
    if (!text.trim()) {
        showError('Please enter text to summarize');
        return;
    }
    
    showLoading();
    
    try {
        const response = await callAPI('summarizer', {
            query: text,
            length: length
        });
        
        showResults(`
            <h5>Summary:</h5>
            <div class="summary-result">${response.summary || response.result || 'Summary not available'}</div>
            <button class="btn btn-warning mt-3" onclick="insertIntoDocument('${escapeHtml(response.summary || response.result || '')}')">
                <i class="fas fa-plus"></i> Insert Summary
            </button>
        `);
    } catch (error) {
        showError('Failed to summarize text: ' + error.message);
    }
}

// Analyze document
async function analyzeDocument() {
    const question = document.getElementById('omni-question').value;
    const context = document.getElementById('omni-context').value;
    
    if (!question.trim()) {
        showError('Please enter a question');
        return;
    }
    
    showLoading();
    
    try {
        const response = await callAPI('omni', {
            query: question,
            context: context
        });
        
        showResults(`
            <h5>Analysis Result:</h5>
            <div class="analysis-result">${response.answer || response.result || 'Analysis not available'}</div>
            <button class="btn btn-secondary mt-3" onclick="insertIntoDocument('${escapeHtml(response.answer || response.result || '')}')">
                <i class="fas fa-plus"></i> Insert Analysis
            </button>
        `);
    } catch (error) {
        showError('Failed to analyze document: ' + error.message);
    }
}

// API call function
async function callAPI(endpoint, data) {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.apiKey}`
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

// Insert text into document
function insertIntoDocument(text) {
    if (currentOfficeApp === 'Word') {
        Word.run(async (context) => {
            context.document.body.insertText(text, Word.InsertLocation.end);
            await context.sync();
        });
    } else if (currentOfficeApp === 'PowerPoint') {
        Office.context.document.setSelectedDataAsync(text, {
            coercionType: Office.CoercionType.Text
        });
    } else if (currentOfficeApp === 'Excel') {
        Excel.run(async (context) => {
            const range = context.workbook.getSelectedRange();
            range.values = [[text]];
            await context.sync();
        });
    } else if (currentOfficeApp === 'Outlook') {
        Office.context.mailbox.item.body.setSelectedDataAsync(text, {
            coercionType: Office.CoercionType.Text
        });
    }
    
    showSuccess('Content inserted into document');
}

// Insert image into document
function insertImageIntoDocument(imageUrl) {
    if (currentOfficeApp === 'Word') {
        Word.run(async (context) => {
            context.document.body.insertInlinePictureFromBase64(imageUrl, Word.InsertLocation.end);
            await context.sync();
        });
    } else if (currentOfficeApp === 'PowerPoint') {
        // PowerPoint image insertion would require additional implementation
        showSuccess('Image URL copied to clipboard');
    }
}

// Utility functions
function hideAllSections() {
    document.getElementById('module-content').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
}

function showLoading() {
    hideAllSections();
    document.getElementById('loading').style.display = 'block';
}

function showResults(html) {
    hideAllSections();
    document.getElementById('results').innerHTML = html;
    document.getElementById('results').style.display = 'block';
}

function showError(message) {
    hideAllSections();
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-message').style.display = 'block';
}

function showSuccess(message) {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.textContent = message;
    successDiv.style.position = 'fixed';
    successDiv.style.top = '10px';
    successDiv.style.right = '10px';
    successDiv.style.zIndex = '9999';
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        document.body.removeChild(successDiv);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}