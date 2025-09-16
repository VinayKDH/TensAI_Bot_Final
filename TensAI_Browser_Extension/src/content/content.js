/* 
 * TensAI Browser Extension Content Script
 * Handles page interaction and text selection
 */

// Global variables
let tensAIOverlay = null;
let selectedText = '';
let selectionRange = null;

// Initialize content script
(function() {
    'use strict';
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeContentScript);
    } else {
        initializeContentScript();
    }
})();

// Initialize content script functionality
function initializeContentScript() {
    console.log('TensAI Content Script initialized');
    
    // Listen for text selection
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keyup', handleTextSelection);
    
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Add context menu for selected text
    createContextMenu();
    
    // Add floating action button
    createFloatingButton();
}

// Handle text selection
function handleTextSelection(event) {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text && text.length > 0) {
        selectedText = text;
        selectionRange = selection.getRangeAt(0);
        
        // Show floating action button
        showFloatingButton(event);
        
        // Store selection for popup
        chrome.storage.local.set({ selectedText: text });
    } else {
        selectedText = '';
        selectionRange = null;
        hideFloatingButton();
    }
}

// Handle messages from popup/background
function handleMessage(request, sender, sendResponse) {
    switch (request.action) {
        case 'getSelectedText':
            sendResponse({ text: selectedText });
            break;
            
        case 'getPageContent':
            sendResponse({
                title: document.title,
                url: window.location.href,
                text: document.body.innerText.substring(0, 5000),
                html: document.body.innerHTML.substring(0, 10000)
            });
            break;
            
        case 'insertText':
            insertTextAtSelection(request.text);
            sendResponse({ success: true });
            break;
            
        case 'replaceSelectedText':
            replaceSelectedText(request.text);
            sendResponse({ success: true });
            break;
            
        case 'showOverlay':
            showTensAIOverlay(request.data);
            sendResponse({ success: true });
            break;
            
        case 'hideOverlay':
            hideTensAIOverlay();
            sendResponse({ success: true });
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
}

// Create context menu for selected text
function createContextMenu() {
    // Remove existing context menu items
    chrome.runtime.sendMessage({ action: 'removeContextMenus' });
    
    // Add context menu items
    chrome.runtime.sendMessage({
        action: 'createContextMenus',
        items: [
            {
                id: 'tensai-translate',
                title: 'Translate with TensAI',
                contexts: ['selection']
            },
            {
                id: 'tensai-summarize',
                title: 'Summarize with TensAI',
                contexts: ['selection']
            },
            {
                id: 'tensai-explain',
                title: 'Explain with TensAI',
                contexts: ['selection']
            }
        ]
    });
}

// Create floating action button
function createFloatingButton() {
    const button = document.createElement('div');
    button.id = 'tensai-floating-button';
    button.innerHTML = `
        <div class="tensai-fab">
            <div class="tensai-fab-icon">🤖</div>
            <div class="tensai-fab-menu">
                <button class="tensai-fab-item" data-action="translate">
                    <span class="icon">🌍</span>
                    <span class="label">Translate</span>
                </button>
                <button class="tensai-fab-item" data-action="summarize">
                    <span class="icon">📝</span>
                    <span class="label">Summarize</span>
                </button>
                <button class="tensai-fab-item" data-action="explain">
                    <span class="icon">💡</span>
                    <span class="label">Explain</span>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(button);
    
    // Add event listeners
    button.addEventListener('click', handleFloatingButtonClick);
    
    // Initially hidden
    button.style.display = 'none';
}

// Show floating action button
function showFloatingButton(event) {
    const button = document.getElementById('tensai-floating-button');
    if (button && selectedText) {
        button.style.display = 'block';
        
        // Position near selection
        const rect = selectionRange.getBoundingClientRect();
        button.style.left = (rect.right + 10) + 'px';
        button.style.top = (rect.top - 10) + 'px';
    }
}

// Hide floating action button
function hideFloatingButton() {
    const button = document.getElementById('tensai-floating-button');
    if (button) {
        button.style.display = 'none';
    }
}

// Handle floating button click
function handleFloatingButtonClick(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    
    if (action && selectedText) {
        switch (action) {
            case 'translate':
                quickAction('translate', selectedText);
                break;
            case 'summarize':
                quickAction('summarize', selectedText);
                break;
            case 'explain':
                quickAction('explain', selectedText);
                break;
        }
    }
}

// Quick action handler
async function quickAction(action, text) {
    try {
        // Send message to background script
        const response = await chrome.runtime.sendMessage({
            action: 'quickAction',
            type: action,
            text: text
        });
        
        if (response.success) {
            showNotification(`${action} completed`, 'success');
        } else {
            showNotification(`Failed to ${action}`, 'error');
        }
    } catch (error) {
        console.error('Quick action error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Insert text at current selection
function insertTextAtSelection(text) {
    if (selectionRange) {
        selectionRange.deleteContents();
        selectionRange.insertNode(document.createTextNode(text));
        selectionRange.collapse(false);
        
        // Clear selection
        window.getSelection().removeAllRanges();
    }
}

// Replace selected text
function replaceSelectedText(text) {
    if (selectionRange) {
        selectionRange.deleteContents();
        selectionRange.insertNode(document.createTextNode(text));
        selectionRange.collapse(false);
        
        // Clear selection
        window.getSelection().removeAllRanges();
    }
}

// Show TensAI overlay
function showTensAIOverlay(data) {
    if (tensAIOverlay) {
        hideTensAIOverlay();
    }
    
    tensAIOverlay = document.createElement('div');
    tensAIOverlay.id = 'tensai-overlay';
    tensAIOverlay.innerHTML = `
        <div class="tensai-overlay-content">
            <div class="tensai-overlay-header">
                <h3>TensAI Result</h3>
                <button class="tensai-overlay-close">×</button>
            </div>
            <div class="tensai-overlay-body">
                ${data.content}
            </div>
            <div class="tensai-overlay-actions">
                <button class="tensai-btn tensai-btn-primary" id="tensai-copy">Copy</button>
                <button class="tensai-btn tensai-btn-secondary" id="tensai-insert">Insert</button>
                <button class="tensai-btn tensai-btn-secondary" id="tensai-close">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(tensAIOverlay);
    
    // Add event listeners
    tensAIOverlay.querySelector('.tensai-overlay-close').addEventListener('click', hideTensAIOverlay);
    tensAIOverlay.querySelector('#tensai-close').addEventListener('click', hideTensAIOverlay);
    tensAIOverlay.querySelector('#tensai-copy').addEventListener('click', () => {
        copyToClipboard(data.content);
    });
    tensAIOverlay.querySelector('#tensai-insert').addEventListener('click', () => {
        insertTextAtSelection(data.content);
        hideTensAIOverlay();
    });
    
    // Close on outside click
    tensAIOverlay.addEventListener('click', (e) => {
        if (e.target === tensAIOverlay) {
            hideTensAIOverlay();
        }
    });
}

// Hide TensAI overlay
function hideTensAIOverlay() {
    if (tensAIOverlay) {
        document.body.removeChild(tensAIOverlay);
        tensAIOverlay = null;
    }
}

// Copy text to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showNotification('Failed to copy', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `tensai-notification tensai-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            document.body.removeChild(notification);
        }
    }, 3000);
}

// Handle keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // Ctrl+Shift+T for quick translate
    if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        if (selectedText) {
            quickAction('translate', selectedText);
        }
    }
    
    // Ctrl+Shift+S for quick summarize
    if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        if (selectedText) {
            quickAction('summarize', selectedText);
        }
    }
    
    // Ctrl+Shift+E for quick explain
    if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        if (selectedText) {
            quickAction('explain', selectedText);
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (tensAIOverlay) {
        hideTensAIOverlay();
    }
    hideFloatingButton();
});
