/**
 * Office.js Integration Utilities
 * Provides helper functions for interacting with different Office applications
 */

class OfficeUtils {
    constructor() {
        this.currentApp = this.detectOfficeApp();
    }

    /**
     * Detect the current Office application
     * @returns {string} Office application name
     */
    detectOfficeApp() {
        if (typeof Office !== 'undefined') {
            if (Office.context.host === Office.HostType.Outlook) {
                return 'Outlook';
            } else if (Office.context.host === Office.HostType.Word) {
                return 'Word';
            } else if (Office.context.host === Office.HostType.PowerPoint) {
                return 'PowerPoint';
            } else if (Office.context.host === Office.HostType.Excel) {
                return 'Excel';
            }
        }
        return 'Unknown';
    }

    /**
     * Get selected text from the current Office application
     * @returns {Promise<string>} Selected text
     */
    async getSelectedText() {
        return new Promise((resolve, reject) => {
            try {
                switch (this.currentApp) {
                    case 'Word':
                        this.getWordSelectedText(resolve, reject);
                        break;
                    case 'PowerPoint':
                        this.getPowerPointSelectedText(resolve, reject);
                        break;
                    case 'Excel':
                        this.getExcelSelectedText(resolve, reject);
                        break;
                    case 'Outlook':
                        this.getOutlookSelectedText(resolve, reject);
                        break;
                    default:
                        reject(new Error('Unsupported Office application'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get selected text from Word
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    getWordSelectedText(resolve, reject) {
        Word.run(async (context) => {
            try {
                const selection = context.document.getSelection();
                selection.load('text');
                await context.sync();
                resolve(selection.text || '');
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get selected text from PowerPoint
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    getPowerPointSelectedText(resolve, reject) {
        Office.context.document.getSelectedDataAsync(Office.CoercionType.Text, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                resolve(result.value || '');
            } else {
                reject(new Error('Failed to get selected text from PowerPoint'));
            }
        });
    }

    /**
     * Get selected text from Excel
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    getExcelSelectedText(resolve, reject) {
        Excel.run(async (context) => {
            try {
                const selection = context.workbook.getSelectedRange();
                selection.load('text');
                await context.sync();
                resolve(selection.text || '');
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get selected text from Outlook
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    getOutlookSelectedText(resolve, reject) {
        Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                resolve(result.value || '');
            } else {
                reject(new Error('Failed to get email body from Outlook'));
            }
        });
    }

    /**
     * Insert text into the current Office application
     * @param {string} text - Text to insert
     * @param {string} location - Insert location (end, start, replace)
     * @returns {Promise<void>}
     */
    async insertText(text, location = 'end') {
        return new Promise((resolve, reject) => {
            try {
                switch (this.currentApp) {
                    case 'Word':
                        this.insertWordText(text, location, resolve, reject);
                        break;
                    case 'PowerPoint':
                        this.insertPowerPointText(text, resolve, reject);
                        break;
                    case 'Excel':
                        this.insertExcelText(text, resolve, reject);
                        break;
                    case 'Outlook':
                        this.insertOutlookText(text, resolve, reject);
                        break;
                    default:
                        reject(new Error('Unsupported Office application'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Insert text into Word
     * @param {string} text - Text to insert
     * @param {string} location - Insert location
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    insertWordText(text, location, resolve, reject) {
        Word.run(async (context) => {
            try {
                const selection = context.document.getSelection();
                const insertLocation = location === 'replace' ? Word.InsertLocation.replace : 
                                     location === 'start' ? Word.InsertLocation.start : 
                                     Word.InsertLocation.end;
                selection.insertText(text, insertLocation);
                await context.sync();
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Insert text into PowerPoint
     * @param {string} text - Text to insert
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    insertPowerPointText(text, resolve, reject) {
        Office.context.document.setSelectedDataAsync(text, {
            coercionType: Office.CoercionType.Text
        }, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                resolve();
            } else {
                reject(new Error('Failed to insert text into PowerPoint'));
            }
        });
    }

    /**
     * Insert text into Excel
     * @param {string} text - Text to insert
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    insertExcelText(text, resolve, reject) {
        Excel.run(async (context) => {
            try {
                const selection = context.workbook.getSelectedRange();
                selection.values = [[text]];
                await context.sync();
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Insert text into Outlook
     * @param {string} text - Text to insert
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    insertOutlookText(text, resolve, reject) {
        Office.context.mailbox.item.body.setSelectedDataAsync(text, {
            coercionType: Office.CoercionType.Text
        }, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                resolve();
            } else {
                reject(new Error('Failed to insert text into Outlook'));
            }
        });
    }

    /**
     * Insert image into the current Office application
     * @param {string} imageUrl - Image URL or base64 data
     * @returns {Promise<void>}
     */
    async insertImage(imageUrl) {
        return new Promise((resolve, reject) => {
            try {
                switch (this.currentApp) {
                    case 'Word':
                        this.insertWordImage(imageUrl, resolve, reject);
                        break;
                    case 'PowerPoint':
                        this.insertPowerPointImage(imageUrl, resolve, reject);
                        break;
                    case 'Excel':
                        this.insertExcelImage(imageUrl, resolve, reject);
                        break;
                    case 'Outlook':
                        this.insertOutlookImage(imageUrl, resolve, reject);
                        break;
                    default:
                        reject(new Error('Unsupported Office application'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Insert image into Word
     * @param {string} imageUrl - Image URL or base64 data
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    insertWordImage(imageUrl, resolve, reject) {
        Word.run(async (context) => {
            try {
                const selection = context.document.getSelection();
                selection.insertInlinePictureFromBase64(imageUrl, Word.InsertLocation.end);
                await context.sync();
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Insert image into PowerPoint
     * @param {string} imageUrl - Image URL
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    insertPowerPointImage(imageUrl, resolve, reject) {
        // For PowerPoint, we'll insert as a link for now
        const imageLink = `[Image: ${imageUrl}]`;
        Office.context.document.setSelectedDataAsync(imageLink, {
            coercionType: Office.CoercionType.Text
        }, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                resolve();
            } else {
                reject(new Error('Failed to insert image into PowerPoint'));
            }
        });
    }

    /**
     * Insert image into Excel
     * @param {string} imageUrl - Image URL
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    insertExcelImage(imageUrl, resolve, reject) {
        Excel.run(async (context) => {
            try {
                const selection = context.workbook.getSelectedRange();
                selection.values = [[imageUrl]];
                await context.sync();
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Insert image into Outlook
     * @param {string} imageUrl - Image URL
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    insertOutlookImage(imageUrl, resolve, reject) {
        const imageLink = `[Image: ${imageUrl}]`;
        Office.context.mailbox.item.body.setSelectedDataAsync(imageLink, {
            coercionType: Office.CoercionType.Text
        }, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                resolve();
            } else {
                reject(new Error('Failed to insert image into Outlook'));
            }
        });
    }

    /**
     * Get document content (for summarization)
     * @returns {Promise<string>} Document content
     */
    async getDocumentContent() {
        return new Promise((resolve, reject) => {
            try {
                switch (this.currentApp) {
                    case 'Word':
                        this.getWordDocumentContent(resolve, reject);
                        break;
                    case 'PowerPoint':
                        this.getPowerPointDocumentContent(resolve, reject);
                        break;
                    case 'Excel':
                        this.getExcelDocumentContent(resolve, reject);
                        break;
                    case 'Outlook':
                        this.getOutlookDocumentContent(resolve, reject);
                        break;
                    default:
                        reject(new Error('Unsupported Office application'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get Word document content
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    getWordDocumentContent(resolve, reject) {
        Word.run(async (context) => {
            try {
                const body = context.document.body;
                body.load('text');
                await context.sync();
                resolve(body.text || '');
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get PowerPoint document content
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    getPowerPointDocumentContent(resolve, reject) {
        Office.context.document.getFileAsync(Office.FileType.Text, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                const file = result.value;
                const slice = file.getSliceAsync(0, (sliceResult) => {
                    if (sliceResult.status === Office.AsyncResultStatus.Succeeded) {
                        const data = sliceResult.value.data;
                        resolve(data || '');
                    } else {
                        reject(new Error('Failed to read PowerPoint content'));
                    }
                });
            } else {
                reject(new Error('Failed to get PowerPoint file'));
            }
        });
    }

    /**
     * Get Excel document content
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    getExcelDocumentContent(resolve, reject) {
        Excel.run(async (context) => {
            try {
                const worksheet = context.workbook.worksheets.getActiveWorksheet();
                const usedRange = worksheet.getUsedRange();
                usedRange.load('values');
                await context.sync();
                
                const values = usedRange.values;
                const text = values.map(row => row.join('\t')).join('\n');
                resolve(text || '');
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get Outlook document content
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    getOutlookDocumentContent(resolve, reject) {
        Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                resolve(result.value || '');
            } else {
                reject(new Error('Failed to get Outlook content'));
            }
        });
    }

    /**
     * Check if Office.js is available
     * @returns {boolean} True if Office.js is available
     */
    isOfficeAvailable() {
        return typeof Office !== 'undefined';
    }

    /**
     * Get current Office application info
     * @returns {Object} Office application information
     */
    getOfficeInfo() {
        if (!this.isOfficeAvailable()) {
            return { app: 'Unknown', version: 'Unknown' };
        }

        return {
            app: this.currentApp,
            version: Office.context.requirements ? Office.context.requirements.apiSet : 'Unknown',
            platform: Office.context.platform || 'Unknown'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfficeUtils;
} else {
    window.OfficeUtils = OfficeUtils;
}
