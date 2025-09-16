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
});

// Module button click handlers
document.addEventListener('DOMContentLoaded', function() {
    const moduleButtons = document.querySelectorAll('.module-btn');
    moduleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const module = this.getAttribute('data-module');
            showModule(module);
        });
    });
});

// Show specific module
function showModule(module) {
    currentModule = module;
    
    // Hide main menu
    document.getElementById('main-menu').style.display = 'none';
    
    // Show module content
    document.getElementById('module-content').style.display = 'block';
    
    // Hide all module panels
    const panels = document.querySelectorAll('.module-panel');
    panels.forEach(panel => panel.style.display = 'none');
    
    // Show selected module panel
    const selectedPanel = document.getElementById(`${module}-content`);
    if (selectedPanel) {
        selectedPanel.style.display = 'block';
        selectedPanel.classList.add('fade-in');
    }
}

// Show main menu
function showMainMenu() {
    document.getElementById('module-content').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
    currentModule = '';
}

// WebGPT Functions
async function processWebGPT() {
    const query = document.getElementById('webgpt-query').value.trim();
    if (!query) {
        showError('Please enter a question');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await callTensAIAPI('webgpt', {
            query: query,
            temperature: 0.7,
            history: []
        });
        
        showWebGPTResult(response.response || response.answer || 'No response received');
    } catch (error) {
        showError(`WebGPT Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function showWebGPTResult(result) {
    const resultDiv = document.getElementById('webgpt-result');
    resultDiv.innerHTML = `
        <h6><i class="fas fa-robot text-primary me-2"></i>WebGPT Response:</h6>
        <p>${result}</p>
        <button class="btn btn-sm btn-outline-primary" onclick="insertTextIntoDocument('${result.replace(/'/g, "\\'")}')">
            <i class="fas fa-plus me-1"></i>Insert into Document
        </button>
    `;
    resultDiv.style.display = 'block';
}

// Media Studio Functions
function showMediaType(type) {
    const contentDiv = document.getElementById('media-type-content');
    let content = '';
    
    switch(type) {
        case 'image':
            content = `
                <div class="mb-3">
                    <label class="form-label">Image Prompt:</label>
                    <textarea class="form-control" id="image-prompt" rows="3" placeholder="Describe the image you want to generate..."></textarea>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="form-label">Size:</label>
                        <select class="form-select" id="image-size">
                            <option value="1024x1024">1024x1024</option>
                            <option value="1024x1792">1024x1792</option>
                            <option value="1792x1024">1792x1024</option>
                        </select>
                    </div>
                    <div class="col-6">
                        <label class="form-label">Quality:</label>
                        <select class="form-select" id="image-quality">
                            <option value="standard">Standard</option>
                            <option value="hd">HD</option>
                        </select>
                    </div>
                </div>
                <button class="btn btn-primary w-100" onclick="generateImage()">
                    <i class="fas fa-magic me-2"></i>Generate Image
                </button>
            `;
            break;
            
        case 'video':
            content = `
                <div class="mb-3">
                    <label class="form-label">Video Prompt:</label>
                    <textarea class="form-control" id="video-prompt" rows="3" placeholder="Describe the video you want to generate..."></textarea>
                </div>
                <button class="btn btn-success w-100" onclick="generateVideo()">
                    <i class="fas fa-video me-2"></i>Generate Video
                </button>
            `;
            break;
            
        case 'audio':
            content = `
                <div class="mb-3">
                    <label class="form-label">Audio Prompt:</label>
                    <textarea class="form-control" id="audio-prompt" rows="3" placeholder="Describe the audio you want to generate..."></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">Voice:</label>
                    <select class="form-select" id="audio-voice">
                        <option value="alloy">Alloy</option>
                        <option value="echo">Echo</option>
                        <option value="fable">Fable</option>
                        <option value="onyx">Onyx</option>
                        <option value="nova">Nova</option>
                        <option value="shimmer">Shimmer</option>
                    </select>
                </div>
                <button class="btn btn-warning w-100" onclick="generateAudio()">
                    <i class="fas fa-music me-2"></i>Generate Audio
                </button>
            `;
            break;
            
        case 'image2image':
            content = `
                <div class="mb-3">
                    <label class="form-label">Upload Base Image:</label>
                    <input type="file" class="form-control" id="base-image" accept="image/*">
                </div>
                <div class="mb-3">
                    <label class="form-label">Edit Prompt:</label>
                    <textarea class="form-control" id="edit-prompt" rows="3" placeholder="Describe how you want to edit the image..."></textarea>
                </div>
                <button class="btn btn-info w-100" onclick="editImage()">
                    <i class="fas fa-edit me-2"></i>Edit Image
                </button>
            `;
            break;
    }
    
    contentDiv.innerHTML = content;
}

async function generateImage() {
    const prompt = document.getElementById('image-prompt').value.trim();
    const size = document.getElementById('image-size').value;
    const quality = document.getElementById('image-quality').value;
    
    if (!prompt) {
        showError('Please enter an image prompt');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await callTensAIAPI('media.image', {
            prompt: prompt,
            size: size,
            quality: quality,
            number_of_images: 1
        });
        
        showMediaResult('Image Generated Successfully!', response.image_url || response.url);
    } catch (error) {
        showError(`Image Generation Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

async function generateVideo() {
    const prompt = document.getElementById('video-prompt').value.trim();
    
    if (!prompt) {
        showError('Please enter a video prompt');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await callTensAIAPI('media.video', {
            prompt: prompt
        });
        
        showMediaResult('Video Generation Started!', response.video_url || response.url);
    } catch (error) {
        showError(`Video Generation Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

async function generateAudio() {
    const prompt = document.getElementById('audio-prompt').value.trim();
    const voice = document.getElementById('audio-voice').value;
    
    if (!prompt) {
        showError('Please enter an audio prompt');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await callTensAIAPI('media.audio', {
            prompt: prompt,
            voice: voice
        });
        
        showMediaResult('Audio Generated Successfully!', response.audio_url || response.url);
    } catch (error) {
        showError(`Audio Generation Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

async function editImage() {
    const fileInput = document.getElementById('base-image');
    const prompt = document.getElementById('edit-prompt').value.trim();
    
    if (!fileInput.files[0]) {
        showError('Please select a base image');
        return;
    }
    
    if (!prompt) {
        showError('Please enter an edit prompt');
        return;
    }
    
    showLoading(true);
    
    try {
        // First upload the image
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('feature_type', 'image2image');
        
        const uploadResponse = await uploadFile(formData);
        
        // Then edit the image
        const response = await callTensAIAPI('media.image2image', {
            prompt: prompt,
            imageUrl: uploadResponse.url
        });
        
        showMediaResult('Image Edited Successfully!', response.image_url || response.url);
    } catch (error) {
        showError(`Image Edit Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function showMediaResult(title, url) {
    const resultDiv = document.getElementById('media-type-content');
    resultDiv.innerHTML += `
        <div class="alert alert-success mt-3">
            <h6><i class="fas fa-check-circle me-2"></i>${title}</h6>
            <p class="mb-2">Media URL: <a href="${url}" target="_blank">${url}</a></p>
            <button class="btn btn-sm btn-outline-success" onclick="insertMediaIntoDocument('${url}')">
                <i class="fas fa-plus me-1"></i>Insert into Document
            </button>
        </div>
    `;
}

// Translator Functions
async function translateSelectedText() {
    const targetLanguage = document.getElementById('target-language').value;
    
    try {
        const selectedText = await getSelectedText();
        if (!selectedText) {
            showError('Please select some text in your document first');
            return;
        }
        
        showLoading(true);
        
        const response = await callTensAIAPI('translator', {
            text: selectedText,
            target_language: targetLanguage
        });
        
        showTranslatorResult(selectedText, response.translated_text || response.translation);
    } catch (error) {
        showError(`Translation Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function showTranslatorResult(originalText, translatedText) {
    const resultDiv = document.getElementById('translator-result');
    resultDiv.innerHTML = `
        <h6><i class="fas fa-language text-warning me-2"></i>Translation Result:</h6>
        <div class="mb-2">
            <strong>Original:</strong> ${originalText}
        </div>
        <div class="mb-3">
            <strong>Translated:</strong> ${translatedText}
        </div>
        <button class="btn btn-sm btn-outline-warning" onclick="replaceSelectedText('${translatedText.replace(/'/g, "\\'")}')">
            <i class="fas fa-exchange-alt me-1"></i>Replace Selected Text
        </button>
    `;
    resultDiv.style.display = 'block';
}

// Summarizer Functions
async function summarizeSelectedText() {
    try {
        const selectedText = await getSelectedText();
        if (!selectedText) {
            showError('Please select some text in your document first');
            return;
        }
        
        showLoading(true);
        
        const response = await callTensAIAPI('summarizer', {
            text: selectedText
        });
        
        showSummarizerResult(selectedText, response.summary || response.summarized_text);
    } catch (error) {
        showError(`Summarization Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function showSummarizerResult(originalText, summary) {
    const resultDiv = document.getElementById('summarizer-result');
    resultDiv.innerHTML = `
        <h6><i class="fas fa-file-text text-info me-2"></i>Summary:</h6>
        <div class="mb-2">
            <strong>Original Length:</strong> ${originalText.length} characters
        </div>
        <div class="mb-3">
            <strong>Summary:</strong> ${summary}
        </div>
        <button class="btn btn-sm btn-outline-info" onclick="insertTextIntoDocument('${summary.replace(/'/g, "\\'")}')">
            <i class="fas fa-plus me-1"></i>Insert Summary
        </button>
    `;
    resultDiv.style.display = 'block';
}

// OmniQuest Functions
async function uploadDocument() {
    const fileInput = document.getElementById('omni-file');
    if (!fileInput.files[0]) {
        showError('Please select a document to upload');
        return;
    }
    
    showLoading(true);
    
    try {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('feature_type', 'omni');
        
        const response = await uploadFile(formData);
        uploadedDocumentId = response.document_id || response.id;
        
        showOmniUploadStatus('Document uploaded successfully! You can now ask questions.', 'success');
        document.getElementById('omni-qa-section').style.display = 'block';
    } catch (error) {
        showOmniUploadStatus(`Upload Error: ${error.message}`, 'danger');
    } finally {
        showLoading(false);
    }
}

function showOmniUploadStatus(message, type) {
    const statusDiv = document.getElementById('omni-upload-status');
    statusDiv.className = `alert alert-${type}`;
    statusDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>${message}`;
    statusDiv.style.display = 'block';
}

async function askQuestion() {
    const question = document.getElementById('omni-question').value.trim();
    if (!question) {
        showError('Please enter a question');
        return;
    }
    
    if (!uploadedDocumentId) {
        showError('Please upload a document first');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await callTensAIAPI('omni', {
            question: question,
            document_id: uploadedDocumentId
        });
        
        showOmniAnswer(question, response.answer || response.response);
    } catch (error) {
        showError(`OmniQuest Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function showOmniAnswer(question, answer) {
    const resultDiv = document.getElementById('omni-answer');
    resultDiv.innerHTML = `
        <h6><i class="fas fa-brain text-secondary me-2"></i>Answer:</h6>
        <div class="mb-2">
            <strong>Question:</strong> ${question}
        </div>
        <div class="mb-3">
            <strong>Answer:</strong> ${answer}
        </div>
        <button class="btn btn-sm btn-outline-secondary" onclick="insertTextIntoDocument('${answer.replace(/'/g, "\\'")}')">
            <i class="fas fa-plus me-1"></i>Insert Answer
        </button>
    `;
    resultDiv.style.display = 'block';
}

// Office.js Integration Functions
async function getSelectedText() {
    return new Promise((resolve, reject) => {
        if (currentOfficeApp === 'Word') {
            Word.run(async (context) => {
                const selection = context.document.getSelection();
                selection.load('text');
                await context.sync();
                resolve(selection.text);
            }).catch(reject);
        } else if (currentOfficeApp === 'PowerPoint') {
            Office.context.document.getSelectedDataAsync(Office.CoercionType.Text, (result) => {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                    resolve(result.value);
                } else {
                    reject(new Error('Failed to get selected text'));
                }
            });
        } else if (currentOfficeApp === 'Excel') {
            Excel.run(async (context) => {
                const selection = context.workbook.getSelectedRange();
                selection.load('text');
                await context.sync();
                resolve(selection.text);
            }).catch(reject);
        } else if (currentOfficeApp === 'Outlook') {
            // For Outlook, we'll work with the compose body
            Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result) => {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                    resolve(result.value);
                } else {
                    reject(new Error('Failed to get email body'));
                }
            });
        } else {
            reject(new Error('Unsupported Office application'));
        }
    });
}

async function insertTextIntoDocument(text) {
    try {
        if (currentOfficeApp === 'Word') {
            Word.run(async (context) => {
                const selection = context.document.getSelection();
                selection.insertText(text, Word.InsertLocation.end);
                await context.sync();
            });
        } else if (currentOfficeApp === 'PowerPoint') {
            Office.context.document.setSelectedDataAsync(text, {
                coercionType: Office.CoercionType.Text
            });
        } else if (currentOfficeApp === 'Excel') {
            Excel.run(async (context) => {
                const selection = context.workbook.getSelectedRange();
                selection.values = [[text]];
                await context.sync();
            });
        } else if (currentOfficeApp === 'Outlook') {
            Office.context.mailbox.item.body.setSelectedDataAsync(text, {
                coercionType: Office.CoercionType.Text
            });
        }
        
        showSuccess('Text inserted successfully!');
    } catch (error) {
        showError(`Failed to insert text: ${error.message}`);
    }
}

async function replaceSelectedText(text) {
    try {
        if (currentOfficeApp === 'Word') {
            Word.run(async (context) => {
                const selection = context.document.getSelection();
                selection.insertText(text, Word.InsertLocation.replace);
                await context.sync();
            });
        } else if (currentOfficeApp === 'PowerPoint') {
            Office.context.document.setSelectedDataAsync(text, {
                coercionType: Office.CoercionType.Text
            });
        } else if (currentOfficeApp === 'Excel') {
            Excel.run(async (context) => {
                const selection = context.workbook.getSelectedRange();
                selection.values = [[text]];
                await context.sync();
            });
        } else if (currentOfficeApp === 'Outlook') {
            Office.context.mailbox.item.body.setSelectedDataAsync(text, {
                coercionType: Office.CoercionType.Text
            });
        }
        
        showSuccess('Text replaced successfully!');
    } catch (error) {
        showError(`Failed to replace text: ${error.message}`);
    }
}

async function insertMediaIntoDocument(url) {
    try {
        if (currentOfficeApp === 'Word') {
            Word.run(async (context) => {
                const selection = context.document.getSelection();
                selection.insertInlinePictureFromBase64(url, Word.InsertLocation.end);
                await context.sync();
            });
        } else if (currentOfficeApp === 'PowerPoint') {
            // For PowerPoint, we'll insert as a link for now
            Office.context.document.setSelectedDataAsync(`[Media: ${url}]`, {
                coercionType: Office.CoercionType.Text
            });
        } else if (currentOfficeApp === 'Excel') {
            Excel.run(async (context) => {
                const selection = context.workbook.getSelectedRange();
                selection.values = [[url]];
                await context.sync();
            });
        } else if (currentOfficeApp === 'Outlook') {
            Office.context.mailbox.item.body.setSelectedDataAsync(`[Media: ${url}]`, {
                coercionType: Office.CoercionType.Text
            });
        }
        
        showSuccess('Media reference inserted successfully!');
    } catch (error) {
        showError(`Failed to insert media: ${error.message}`);
    }
}

// API Functions
async function callTensAIAPI(endpoint, data) {
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints[endpoint]}`;
    
    const response = await axios.post(url, data, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.apiKey}`
        },
        timeout: 30000
    });
    
    return response.data;
}

async function uploadFile(formData) {
    const response = await axios.post(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.upload}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${API_CONFIG.apiKey}`
        },
        timeout: 60000
    });
    
    return response.data;
}

// UI Helper Functions
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('error-alert');
    document.getElementById('error-message').textContent = message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    // Create a temporary success alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.container-fluid').firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}
