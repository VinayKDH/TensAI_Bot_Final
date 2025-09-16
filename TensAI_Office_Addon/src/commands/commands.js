/* 
 * TensAI Office Add-in Commands
 * Handles ribbon command functionality
 */

// Initialize Office Add-in
Office.onReady((info) => {
    console.log('TensAI Commands loaded for:', info.host);
});

// Command functions
function showTaskpane() {
    Office.addin.showAsTaskpane();
}

function insertText() {
    const text = "Hello from TensAI!";
    
    if (Office.context.host === Office.HostType.Word) {
        Word.run(async (context) => {
            context.document.body.insertText(text, Word.InsertLocation.end);
            await context.sync();
        });
    } else if (Office.context.host === Office.HostType.Excel) {
        Excel.run(async (context) => {
            const range = context.workbook.getSelectedRange();
            range.values = [[text]];
            await context.sync();
        });
    } else if (Office.context.host === Office.HostType.PowerPoint) {
        Office.context.document.setSelectedDataAsync(text, {
            coercionType: Office.CoercionType.Text
        });
    } else if (Office.context.host === Office.HostType.Outlook) {
        Office.context.mailbox.item.body.setSelectedDataAsync(text, {
            coercionType: Office.CoercionType.Text
        });
    }
}

// Export functions for global access
window.showTaskpane = showTaskpane;
window.insertText = insertText;