/* 
 * TensAI Browser Extension Background Script
 * Handles context menus, API calls, and cross-extension communication
 */

// Global variables
let contextMenuIds = [];
let apiConfig = {
    baseUrl: 'https://dev2.tens-ai.com/api',
    apiKey: null
};

// Initialize background script
chrome.runtime.onInstalled.addListener(initializeExtension);
chrome.runtime.onStartup.addListener(initializeExtension);

// Initialize extension
async function initializeExtension() {
    console.log('TensAI Browser Extension initialized');
    
    // Load settings
    await loadSettings();
    
    // Create context menus
    createContextMenus();
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts();
}

// Load settings from storage
async function loadSettings() {
    try {
        const settings = await chrome.storage.sync.get(['apiKey', 'baseUrl']);
        
        if (settings.apiKey) {
            apiConfig.apiKey = settings.apiKey;
        }
        if (settings.baseUrl) {
            apiConfig.baseUrl = settings.baseUrl;
        }
        
        console.log('Settings loaded:', { hasApiKey: !!apiConfig.apiKey, baseUrl: apiConfig.baseUrl });
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Create context menus
function createContextMenus() {
    // Remove existing context menus
    contextMenuIds.forEach(id => {
        chrome.contextMenus.remove(id);
    });
    contextMenuIds = [];
    
    // Create parent menu
    const parentId = chrome.contextMenus.create({
        id: 'tensai-parent',
        title: 'TensAI',
        contexts: ['selection']
    });
    contextMenuIds.push(parentId);
    
    // Create submenu items
    const menuItems = [
        {
            id: 'tensai-translate',
            title: 'Translate',
            contexts: ['selection'],
            parentId: parentId
        },
        {
            id: 'tensai-summarize',
            title: 'Summarize',
            contexts: ['selection'],
            parentId: parentId
        },
        {
            id: 'tensai-explain',
            title: 'Explain',
            contexts: ['selection'],
            parentId: parentId
        },
        {
            id: 'tensai-improve',
            title: 'Improve Writing',
            contexts: ['selection'],
            parentId: parentId
        }
    ];
    
    menuItems.forEach(item => {
        const id = chrome.contextMenus.create(item);
        contextMenuIds.push(id);
    });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const selectedText = info.selectionText;
    
    if (!selectedText) {
        showNotification('No text selected', 'error');
        return;
    }
    
    switch (info.menuItemId) {
        case 'tensai-translate':
            await handleQuickAction('translate', selectedText, tab);
            break;
        case 'tensai-summarize':
            await handleQuickAction('summarize', selectedText, tab);
            break;
        case 'tensai-explain':
            await handleQuickAction('explain', selectedText, tab);
            break;
        case 'tensai-improve':
            await handleQuickAction('improve', selectedText, tab);
            break;
    }
});

// Handle quick actions
async function handleQuickAction(action, text, tab) {
    if (!apiConfig.apiKey) {
        showNotification('Please configure API key in extension settings', 'error');
        return;
    }
    
    try {
        showNotification(`Processing ${action}...`, 'info');
        
        let response;
        switch (action) {
            case 'translate':
                response = await callAPI('/translate', {
                    query: text,
                    target_language: 'es' // Default to Spanish
                });
                break;
            case 'summarize':
                response = await callAPI('/webchat', {
                    query: `Summarize the following text: ${text}`,
                    temperature: 0.5
                });
                break;
            case 'explain':
                response = await callAPI('/webchat', {
                    query: `Explain the following text in simple terms: ${text}`,
                    temperature: 0.3
                });
                break;
            case 'improve':
                response = await callAPI('/webchat', {
                    query: `Improve the following text for clarity and grammar: ${text}`,
                    temperature: 0.4
                });
                break;
        }
        
        // Send result to content script
        await chrome.tabs.sendMessage(tab.id, {
            action: 'showOverlay',
            data: {
                content: response.response || response.result || response.translation || 'No result available',
                type: action
            }
        });
        
        showNotification(`${action} completed`, 'success');
        
    } catch (error) {
        console.error(`${action} error:`, error);
        showNotification(`Failed to ${action}: ${error.message}`, 'error');
    }
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'quickAction':
            handleQuickAction(request.type, request.text, sender.tab)
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep message channel open for async response
            
        case 'callAPI':
            callAPI(request.endpoint, request.data)
                .then(response => sendResponse({ success: true, data: response }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
            
        case 'getSettings':
            sendResponse({ 
                success: true, 
                data: { 
                    apiKey: apiConfig.apiKey, 
                    baseUrl: apiConfig.baseUrl 
                } 
            });
            break;
            
        case 'updateSettings':
            updateSettings(request.settings)
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});

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

// Update settings
async function updateSettings(settings) {
    try {
        await chrome.storage.sync.set(settings);
        
        if (settings.apiKey) {
            apiConfig.apiKey = settings.apiKey;
        }
        if (settings.baseUrl) {
            apiConfig.baseUrl = settings.baseUrl;
        }
        
        console.log('Settings updated:', settings);
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    // Keyboard shortcuts are handled in the manifest.json commands section
    // This function can be used for additional keyboard shortcut logic
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        
        if (!tab) return;
        
        // Get selected text from the active tab
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: getSelectedText
        });
        
        const selectedText = results[0]?.result;
        
        if (!selectedText) {
            showNotification('No text selected', 'error');
            return;
        }
        
        switch (command) {
            case 'open-popup':
                // This is handled by the browser
                break;
            case 'quick-translate':
                await handleQuickAction('translate', selectedText, tab);
                break;
            case 'quick-summarize':
                await handleQuickAction('summarize', selectedText, tab);
                break;
        }
    } catch (error) {
        console.error('Keyboard shortcut error:', error);
        showNotification('Keyboard shortcut failed', 'error');
    }
});

// Get selected text function (injected into page)
function getSelectedText() {
    return window.getSelection().toString().trim();
}

// Show notification
function showNotification(message, type = 'info') {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icons/icon-48.png',
        title: 'TensAI',
        message: message
    });
}

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // Inject content script if needed
        injectContentScript(tabId);
    }
});

// Inject content script
async function injectContentScript(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['src/content/content.js']
        });
        
        await chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['src/content/content.css']
        });
    } catch (error) {
        // Ignore errors for restricted pages (chrome://, etc.)
        console.log('Could not inject content script:', error.message);
    }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // This is handled by the popup, but we can add additional logic here if needed
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        if (changes.apiKey) {
            apiConfig.apiKey = changes.apiKey.newValue;
        }
        if (changes.baseUrl) {
            apiConfig.baseUrl = changes.baseUrl.newValue;
        }
    }
});

// Handle installation/update
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // First time installation
        chrome.tabs.create({ url: 'src/options/options.html' });
        showNotification('Welcome to TensAI! Please configure your API key.', 'info');
    } else if (details.reason === 'update') {
        // Extension updated
        showNotification('TensAI has been updated!', 'info');
    }
});

// Handle uninstall
chrome.runtime.onSuspend.addListener(() => {
    console.log('TensAI Browser Extension suspended');
});

// Error handling
chrome.runtime.onStartup.addListener(() => {
    console.log('TensAI Browser Extension started');
});

// Handle alarms (for periodic tasks)
chrome.alarms.onAlarm.addListener((alarm) => {
    switch (alarm.name) {
        case 'checkApiStatus':
            checkApiStatus();
            break;
    }
});

// Check API status
async function checkApiStatus() {
    try {
        if (apiConfig.apiKey) {
            const response = await fetch(`${apiConfig.baseUrl}/health`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiConfig.apiKey}`
                }
            });
            
            if (!response.ok) {
                showNotification('API connection issue detected', 'error');
            }
        }
    } catch (error) {
        console.error('API status check failed:', error);
    }
}

// Set up periodic API status check
chrome.alarms.create('checkApiStatus', { periodInMinutes: 30 });
