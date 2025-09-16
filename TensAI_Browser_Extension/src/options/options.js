/* 
 * TensAI Browser Extension Options Page JavaScript
 * Handles settings management and API configuration
 */

// Global variables
let settings = {
    apiKey: '',
    baseUrl: 'https://dev2.tens-ai.com/api',
    defaultLanguage: 'es',
    defaultTemperature: 0.7,
    autoTranslate: false,
    showNotifications: true,
    sendAnalytics: true,
    storeHistory: true
};

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupEventListeners();
    populateForm();
});

// Load settings from storage
async function loadSettings() {
    try {
        const storedSettings = await chrome.storage.sync.get([
            'apiKey',
            'baseUrl',
            'defaultLanguage',
            'defaultTemperature',
            'autoTranslate',
            'showNotifications',
            'sendAnalytics',
            'storeHistory'
        ]);
        
        // Merge with defaults
        settings = { ...settings, ...storedSettings };
        
        console.log('Settings loaded:', settings);
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatusMessage('Error loading settings', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Form submission
    document.getElementById('settings-form').addEventListener('submit', handleFormSubmit);
    
    // Temperature slider
    document.getElementById('default-temperature').addEventListener('input', (e) => {
        document.getElementById('temp-display').textContent = e.target.value;
    });
    
    // Test connection button
    document.getElementById('test-connection').addEventListener('click', testConnection);
    
    // Clear data button
    document.getElementById('clear-data').addEventListener('click', clearAllData);
    
    // Real-time validation
    document.getElementById('api-key').addEventListener('input', validateApiKey);
    document.getElementById('base-url').addEventListener('input', validateBaseUrl);
}

// Populate form with current settings
function populateForm() {
    document.getElementById('api-key').value = settings.apiKey || '';
    document.getElementById('base-url').value = settings.baseUrl || 'https://dev2.tens-ai.com/api';
    document.getElementById('default-language').value = settings.defaultLanguage || 'es';
    document.getElementById('default-temperature').value = settings.defaultTemperature || 0.7;
    document.getElementById('temp-display').textContent = settings.defaultTemperature || 0.7;
    document.getElementById('auto-translate').checked = settings.autoTranslate || false;
    document.getElementById('show-notifications').checked = settings.showNotifications !== false;
    document.getElementById('send-analytics').checked = settings.sendAnalytics !== false;
    document.getElementById('store-history').checked = settings.storeHistory !== false;
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    try {
        // Collect form data
        const formData = {
            apiKey: document.getElementById('api-key').value.trim(),
            baseUrl: document.getElementById('base-url').value.trim(),
            defaultLanguage: document.getElementById('default-language').value,
            defaultTemperature: parseFloat(document.getElementById('default-temperature').value),
            autoTranslate: document.getElementById('auto-translate').checked,
            showNotifications: document.getElementById('show-notifications').checked,
            sendAnalytics: document.getElementById('send-analytics').checked,
            storeHistory: document.getElementById('store-history').checked
        };
        
        // Validate required fields
        if (!formData.apiKey) {
            showStatusMessage('API key is required', 'error');
            return;
        }
        
        if (!formData.baseUrl) {
            showStatusMessage('Base URL is required', 'error');
            return;
        }
        
        // Validate URL format
        try {
            new URL(formData.baseUrl);
        } catch (error) {
            showStatusMessage('Please enter a valid URL', 'error');
            return;
        }
        
        // Save settings
        await chrome.storage.sync.set(formData);
        
        // Update global settings
        settings = { ...settings, ...formData };
        
        showStatusMessage('Settings saved successfully!', 'success');
        
        // Notify background script of settings change
        chrome.runtime.sendMessage({
            action: 'updateSettings',
            settings: formData
        });
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatusMessage('Error saving settings', 'error');
    }
}

// Test API connection
async function testConnection() {
    const apiKey = document.getElementById('api-key').value.trim();
    const baseUrl = document.getElementById('base-url').value.trim();
    
    if (!apiKey) {
        showStatusMessage('Please enter an API key first', 'error');
        return;
    }
    
    if (!baseUrl) {
        showStatusMessage('Please enter a base URL first', 'error');
        return;
    }
    
    try {
        showStatusMessage('Testing connection...', 'info');
        
        const response = await fetch(`${baseUrl}/health`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showStatusMessage('Connection successful!', 'success');
        } else {
            showStatusMessage(`Connection failed: ${response.status} ${response.statusText}`, 'error');
        }
        
    } catch (error) {
        console.error('Connection test error:', error);
        showStatusMessage(`Connection failed: ${error.message}`, 'error');
    }
}

// Clear all data
async function clearAllData() {
    if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Clear sync storage
        await chrome.storage.sync.clear();
        
        // Clear local storage
        await chrome.storage.local.clear();
        
        // Reset form to defaults
        settings = {
            apiKey: '',
            baseUrl: 'https://dev2.tens-ai.com/api',
            defaultLanguage: 'es',
            defaultTemperature: 0.7,
            autoTranslate: false,
            showNotifications: true,
            sendAnalytics: true,
            storeHistory: true
        };
        
        populateForm();
        
        showStatusMessage('All data cleared successfully', 'success');
        
    } catch (error) {
        console.error('Error clearing data:', error);
        showStatusMessage('Error clearing data', 'error');
    }
}

// Validate API key
function validateApiKey(event) {
    const apiKey = event.target.value.trim();
    const isValid = apiKey.length > 0;
    
    if (isValid) {
        event.target.style.borderColor = '#4CAF50';
    } else {
        event.target.style.borderColor = '#e9ecef';
    }
}

// Validate base URL
function validateBaseUrl(event) {
    const url = event.target.value.trim();
    
    try {
        if (url) {
            new URL(url);
            event.target.style.borderColor = '#4CAF50';
        } else {
            event.target.style.borderColor = '#e9ecef';
        }
    } catch (error) {
        event.target.style.borderColor = '#f44336';
    }
}

// Show status message
function showStatusMessage(message, type = 'info') {
    const statusElement = document.getElementById('status-message');
    
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

// Handle keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // Ctrl+S to save
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        document.getElementById('settings-form').dispatchEvent(new Event('submit'));
    }
    
    // Ctrl+T to test connection
    if (event.ctrlKey && event.key === 't') {
        event.preventDefault();
        testConnection();
    }
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Page became visible, reload settings
        loadSettings().then(() => {
            populateForm();
        });
    }
});

// Handle storage changes from other parts of the extension
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        // Update settings object
        Object.keys(changes).forEach(key => {
            settings[key] = changes[key].newValue;
        });
        
        // Update form if it's visible
        if (!document.hidden) {
            populateForm();
        }
    }
});

// Export settings for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadSettings,
        saveSettings: handleFormSubmit,
        testConnection,
        clearAllData
    };
}
