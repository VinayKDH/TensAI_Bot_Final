/* 
 * TensAI Browser Extension Popup JavaScript
 * Handles popup interface and API interactions
 */

// Global variables
let currentTab = null;
let selectedText = '';
let apiConfig = {
    baseUrl: 'https://dev2.tens-ai.com/api',
    apiKey: null
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await initializePopup();
    setupEventListeners();
    loadSettings();
});

// Initialize popup functionality
async function initializePopup() {
    try {
        // Get current tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTab = tabs[0];
        
        // Get selected text from current tab
        const results = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            function: getSelectedText
        });
        
        if (results && results[0] && results[0].result) {
            selectedText = results[0].result;
            updateQuickActions();
        }
        
        // Load API configuration
        const settings = await chrome.storage.sync.get(['apiKey', 'baseUrl']);
        if (settings.apiKey) {
            apiConfig.apiKey = settings.apiKey;
        }
        if (settings.baseUrl) {
            apiConfig.baseUrl = settings.baseUrl;
        }
        
        updateStatusIndicator();
    } catch (error) {
        console.error('Error initializing popup:', error);
        showError('Failed to initialize extension');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });
    
    // Quick actions
    document.getElementById('translate-selected').addEventListener('click', () => {
        if (selectedText) {
            quickTranslate(selectedText);
        } else {
            showError('Please select text on the page first');
        }
    });
    
    document.getElementById('summarize-selected').addEventListener('click', () => {
        if (selectedText) {
            quickSummarize(selectedText);
        } else {
            showError('Please select text on the page first');
        }
    });
    
    document.getElementById('generate-text').addEventListener('click', () => {
        switchTab('webgpt');
    });
    
    document.getElementById('analyze-page').addEventListener('click', () => {
        switchTab('omni');
    });
    
    // Module actions
    document.getElementById('generate-webgpt').addEventListener('click', generateWebGPT);
    document.getElementById('generate-media').addEventListener('click', generateMedia);
    document.getElementById('translate-text').addEventListener('click', translateText);
    document.getElementById('summarize-text').addEventListener('click', summarizeText);
    document.getElementById('analyze-page-content').addEventListener('click', analyzePage);
    
    // Temperature slider
    document.getElementById('webgpt-temperature').addEventListener('input', (e) => {
        document.getElementById('temp-value').textContent = e.target.value;
    });
    
    // Results actions
    document.getElementById('close-results').addEventListener('click', hideResults);
    document.getElementById('copy-result').addEventListener('click', copyResult);
    document.getElementById('insert-result').addEventListener('click', insertResult);
    
    // Footer actions
    document.getElementById('open-options').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
    document.getElementById('open-help').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://docs.tens-ai.com' });
    });
}

// Switch between module tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.module-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-content`).classList.add('active');
}

// Get selected text from page
function getSelectedText() {
    return window.getSelection().toString().trim();
}

// Update quick actions based on selected text
function updateQuickActions() {
    const hasSelection = selectedText.length > 0;
    const translateBtn = document.getElementById('translate-selected');
    const summarizeBtn = document.getElementById('summarize-selected');
    
    translateBtn.disabled = !hasSelection;
    summarizeBtn.disabled = !hasSelection;
    
    if (hasSelection) {
        translateBtn.title = `Translate: "${selectedText.substring(0, 50)}..."`;
        summarizeBtn.title = `Summarize: "${selectedText.substring(0, 50)}..."`;
    } else {
        translateBtn.title = 'Select text on the page to translate';
        summarizeBtn.title = 'Select text on the page to summarize';
    }
}

// Update status indicator
function updateStatusIndicator() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (apiConfig.apiKey) {
        statusDot.style.background = '#4CAF50';
        statusText.textContent = 'Ready';
    } else {
        statusDot.style.background = '#FF9800';
        statusText.textContent = 'Setup Required';
    }
}

// Quick translate selected text
async function quickTranslate(text) {
    if (!apiConfig.apiKey) {
        showError('Please configure API key in settings');
        return;
    }
    
    showLoading();
    
    try {
        const response = await callAPI('/translate', {
            query: text,
            target_language: 'es' // Default to Spanish
        });
        
        showResults(`
            <div class="translation-result">
                <strong>Original:</strong> ${text}<br><br>
                <strong>Translated:</strong> ${response.translation || response.result || 'Translation not available'}
            </div>
        `);
    } catch (error) {
        showError('Translation failed: ' + error.message);
    }
}

// Quick summarize selected text
async function quickSummarize(text) {
    if (!apiConfig.apiKey) {
        showError('Please configure API key in settings');
        return;
    }
    
    showLoading();
    
    try {
        const response = await callAPI('/webchat', {
            query: `Summarize the following text: ${text}`,
            temperature: 0.5
        });
        
        showResults(`
            <div class="summary-result">
                <strong>Summary:</strong><br>
                ${response.response || response.result || 'Summary not available'}
            </div>
        `);
    } catch (error) {
        showError('Summarization failed: ' + error.message);
    }
}

// Generate WebGPT response
async function generateWebGPT() {
    const prompt = document.getElementById('webgpt-prompt').value.trim();
    const temperature = document.getElementById('webgpt-temperature').value;
    
    if (!prompt) {
        showError('Please enter a prompt');
        return;
    }
    
    if (!apiConfig.apiKey) {
        showError('Please configure API key in settings');
        return;
    }
    
    showLoading();
    
    try {
        const response = await callAPI('/webchat', {
            query: prompt,
            temperature: parseFloat(temperature)
        });
        
        showResults(`
            <div class="webgpt-result">
                <strong>Generated Response:</strong><br>
                ${response.response || response.result || 'No response received'}
            </div>
        `);
    } catch (error) {
        showError('Generation failed: ' + error.message);
    }
}

// Generate media
async function generateMedia() {
    const prompt = document.getElementById('media-prompt').value.trim();
    const mediaType = document.querySelector('input[name="media-type"]:checked').value;
    
    if (!prompt) {
        showError('Please enter a description');
        return;
    }
    
    if (!apiConfig.apiKey) {
        showError('Please configure API key in settings');
        return;
    }
    
    showLoading();
    
    try {
        let endpoint = '/generate-image';
        if (mediaType === 'video') endpoint = '/generate-video';
        if (mediaType === 'audio') endpoint = '/audiogen';
        
        const response = await callAPI(endpoint, {
            prompt: prompt,
            model: 'default'
        });
        
        let resultHtml = `<strong>Generated ${mediaType}:</strong><br>`;
        
        if (mediaType === 'image') {
            resultHtml += `<img src="${response.imageUrl || response.url}" style="max-width: 100%; height: auto; border-radius: 6px; margin-top: 10px;">`;
        } else if (mediaType === 'video') {
            resultHtml += `<video controls style="max-width: 100%; height: auto; border-radius: 6px; margin-top: 10px;">
                <source src="${response.videoUrl || response.url}" type="video/mp4">
            </video>`;
        } else if (mediaType === 'audio') {
            resultHtml += `<audio controls style="width: 100%; margin-top: 10px;">
                <source src="${response.audioUrl || response.url}" type="audio/mpeg">
            </audio>`;
        }
        
        showResults(resultHtml);
    } catch (error) {
        showError('Media generation failed: ' + error.message);
    }
}

// Translate text
async function translateText() {
    const text = document.getElementById('translation-text').value.trim();
    const targetLanguage = document.getElementById('target-language').value;
    
    if (!text) {
        showError('Please enter text to translate');
        return;
    }
    
    if (!apiConfig.apiKey) {
        showError('Please configure API key in settings');
        return;
    }
    
    showLoading();
    
    try {
        const response = await callAPI('/translate', {
            query: text,
            target_language: targetLanguage
        });
        
        showResults(`
            <div class="translation-result">
                <strong>Original:</strong> ${text}<br><br>
                <strong>Translated:</strong> ${response.translation || response.result || 'Translation not available'}
            </div>
        `);
    } catch (error) {
        showError('Translation failed: ' + error.message);
    }
}

// Summarize text
async function summarizeText() {
    const text = document.getElementById('summarizer-text').value.trim();
    const length = document.getElementById('summary-length').value;
    
    if (!text) {
        showError('Please enter text to summarize');
        return;
    }
    
    if (!apiConfig.apiKey) {
        showError('Please configure API key in settings');
        return;
    }
    
    showLoading();
    
    try {
        const response = await callAPI('/webchat', {
            query: `Summarize the following text in ${length} format: ${text}`,
            temperature: 0.5
        });
        
        showResults(`
            <div class="summary-result">
                <strong>Summary:</strong><br>
                ${response.response || response.result || 'Summary not available'}
            </div>
        `);
    } catch (error) {
        showError('Summarization failed: ' + error.message);
    }
}

// Analyze page content
async function analyzePage() {
    const question = document.getElementById('omni-question').value.trim();
    const context = document.getElementById('omni-context').value.trim();
    
    if (!question) {
        showError('Please enter a question');
        return;
    }
    
    if (!apiConfig.apiKey) {
        showError('Please configure API key in settings');
        return;
    }
    
    showLoading();
    
    try {
        // Get page content
        const results = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            function: getPageContent
        });
        
        const pageContent = results[0].result;
        
        const response = await callAPI('/omniQuest', {
            query: question,
            context: context,
            page_content: pageContent
        });
        
        showResults(`
            <div class="analysis-result">
                <strong>Analysis Result:</strong><br>
                ${response.answer || response.result || 'Analysis not available'}
            </div>
        `);
    } catch (error) {
        showError('Page analysis failed: ' + error.message);
    }
}

// Get page content
function getPageContent() {
    return {
        title: document.title,
        url: window.location.href,
        text: document.body.innerText.substring(0, 5000), // Limit content
        html: document.body.innerHTML.substring(0, 10000) // Limit HTML
    };
}

// API call function
async function callAPI(endpoint, data) {
    const url = `${apiConfig.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

// Show loading indicator
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

// Hide loading indicator
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Show results
function showResults(html) {
    hideLoading();
    document.getElementById('results-content').innerHTML = html;
    document.getElementById('results').style.display = 'block';
}

// Hide results
function hideResults() {
    document.getElementById('results').style.display = 'none';
}

// Copy result to clipboard
async function copyResult() {
    const resultText = document.getElementById('results-content').innerText;
    try {
        await navigator.clipboard.writeText(resultText);
        showNotification('Result copied to clipboard');
    } catch (error) {
        showError('Failed to copy to clipboard');
    }
}

// Insert result into page
async function insertResult() {
    const resultText = document.getElementById('results-content').innerText;
    
    try {
        await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            function: insertTextAtCursor,
            args: [resultText]
        });
        
        showNotification('Result inserted into page');
    } catch (error) {
        showError('Failed to insert into page');
    }
}

// Insert text at cursor position
function insertTextAtCursor(text) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        // If no selection, append to body
        document.body.appendChild(document.createTextNode(text));
    }
}

// Show error message
function showError(message) {
    hideLoading();
    // Create temporary error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        right: 10px;
        background: #ff4444;
        color: white;
        padding: 10px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        document.body.removeChild(errorDiv);
    }, 3000);
}

// Show notification
function showNotification(message) {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'success-notification';
    notificationDiv.textContent = message;
    notificationDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        padding: 10px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notificationDiv);
    
    setTimeout(() => {
        document.body.removeChild(notificationDiv);
    }, 2000);
}

// Load settings
async function loadSettings() {
    try {
        const settings = await chrome.storage.sync.get(['apiKey', 'baseUrl', 'defaultLanguage']);
        
        if (settings.apiKey) {
            apiConfig.apiKey = settings.apiKey;
        }
        if (settings.baseUrl) {
            apiConfig.baseUrl = settings.baseUrl;
        }
        if (settings.defaultLanguage) {
            document.getElementById('target-language').value = settings.defaultLanguage;
        }
        
        updateStatusIndicator();
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}
