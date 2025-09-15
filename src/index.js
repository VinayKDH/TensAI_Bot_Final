// Create HTTP server.
const express = require("express");
const { GenericCommandHandler } = require("./genericCommandHandler");
const { HelloWorldCommandHandler } = require("./helloworldCommandHandler");
const { adapter } = require("./internal/initialize");
const { app } = require("./teamsBot");

// This template uses `express` to serve HTTP responses.
// Create express application.
const expressApp = express();
expressApp.use(express.json());

const server = expressApp.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot Started, ${expressApp.name} listening to`, server.address());
});

// Simple upload page to open a file selection window (for document translation and image upload)
const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3978';
expressApp.get('/upload', (req, res) => {
  const returnUrl = req.query.return || 'teams://';
  const uploadType = req.query.type || 'document';
  const title = uploadType === 'image' ? 'Upload an image' : 'Upload a document to translate';
  const accept = uploadType === 'image' ? 'image/*' : '.pdf,.doc,.docx,.txt,.rtf';
  const hint = uploadType === 'image' ? 'Select an image from your computer to upload. Supported: JPG, PNG, GIF, WebP (max 10 MB).' : 'Select a file from your computer to upload. Supported: PDF, DOC, DOCX, TXT, RTF (max 10 MB).';
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TensAI ${uploadType === 'image' ? 'Image' : 'Document'} Upload</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; background: #f8f9fa; }
      .card { max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 6px 24px rgba(0,0,0,0.06); background: white; }
      h1 { margin-top: 0; font-size: 20px; color: #333; }
      .hint { color: #6c757d; font-size: 13px; line-height: 1.4; }
      .row { margin-top: 16px; }
      .btn { background: #0d6efd; color: #fff; border: 0; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; }
      .btn:disabled { opacity: .6; cursor: not-allowed; }
      .btn.success { background: #198754; }
      .link { margin-left: 12px; color: #6c757d; text-decoration: none; }
      .link:hover { color: #0d6efd; }
      .file-input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
      .status { margin-top: 12px; padding: 8px; border-radius: 4px; }
      .status.success { background: #d1edff; color: #0c5460; border: 1px solid #b8daff; }
      .status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      <p class="hint">${hint}</p>
      <div class="row">
        <input id="file" type="file" accept="${accept}" class="file-input" />
      </div>
      <div class="row">
        <button id="uploadBtn" class="btn" disabled>Upload</button>
        <a class="link" href="#" onclick="window.close(); return false;">Close</a>
      </div>
      <div id="status" class="status" style="display: none;"></div>
    </div>
    <script>
      const fileInput = document.getElementById('file');
      const btn = document.getElementById('uploadBtn');
      const status = document.getElementById('status');
      const uploadType = '${uploadType}';
      const returnUrl = '${returnUrl}';
      
      fileInput.addEventListener('change', () => { 
        btn.disabled = !fileInput.files.length; 
        status.style.display = 'none';
      });
      
      btn.addEventListener('click', async () => {
        if (!fileInput.files.length) return;
        
        const file = fileInput.files[0];
        btn.disabled = true;
        btn.textContent = 'Uploading...';
        status.style.display = 'block';
        status.className = 'status';
        status.textContent = 'Uploading file...';
        
        try {
          // Simulate file upload - in production, this would POST to your backend
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Generate a mock file URL (in production, this would come from your backend)
          const mockFileUrl = \`https://example.com/uploads/\${Date.now()}_\${file.name}\`;
          
          // Show success message
          status.className = 'status success';
          status.textContent = \`Upload successful! File: \${file.name}\`;
          btn.textContent = 'Return to Bot';
          btn.className = 'btn success';
          
          // Auto-return to bot after 2 seconds
          setTimeout(() => {
            // In a real implementation, you would send the file URL back to the bot
            // For now, we'll just close the window
            window.close();
          }, 2000);
          
        } catch (error) {
          status.className = 'status error';
          status.textContent = 'Upload failed. Please try again.';
          btn.disabled = false;
          btn.textContent = 'Upload';
        }
      });
    </script>
  </body>
</html>`);
});

// Listen for user to say 'helloWorld'
const helloworldCommandHandler = new HelloWorldCommandHandler();
app.message(helloworldCommandHandler.triggerPatterns, async (context, state) => {
  const reply = await helloworldCommandHandler.handleCommandReceived(context, state);
  await sendReply(context, reply);
});

const genericCommandHandler = new GenericCommandHandler();

// Handle text messages
app.message(genericCommandHandler.triggerPatterns, async (context, state) => {
  console.log("GenericCommandHandler received message:", context.activity.text, "value:", context.activity.value);
  // Guard: if this is an Adaptive Card submit (value contains known keys), let the submit handler process it to avoid duplicates
  const v = context.activity.value;
  if (v && (v.module || v.__webgpt_query || v.__feedback || v.__translation_type || v.__language_selection || v.__text_translation || v.textToTranslate || v.__document_translation || v.__summarizer_text || v.textToSummarize || v.__summarizer_config || v.__omni_type || v.__omni_upload || v.__omni_question || v.questionText || v.__omni_reset || v.__media_type || v.__media_generate || v.promptText || v.__media_reset || v.__media_image_upload)) {
    return; // Skip here; will be handled by app.activity("message") below
  }
  const reply = await genericCommandHandler.handleCommandReceived(context, state);
  await sendReply(context, reply);
});

// Handle submit actions from Adaptive Cards
app.activity("message", async (context, state) => {
  // Check if this is a submit action from an Adaptive Card
  const v = context.activity.value;
  if (
    v && (
      v.module ||
      v.__webgpt_query ||
      v.__feedback ||
      v.__translation_type ||
      v.__language_selection ||
      v.__text_translation || v?.textToTranslate ||
      v.__document_translation ||
      v.__summarizer_text || v?.textToSummarize || v.__summarizer_config ||
      v.__omni_type || v.__omni_upload || v.__omni_question || v?.questionText || v.__omni_reset ||
      v.__media_type || v.__media_generate || v?.promptText || v.__media_reset || v.__media_image_upload
    )
  ) {
    console.log("Submit action detected in activity handler:", context.activity.value);
    const reply = await genericCommandHandler.handleCommandReceived(context, state);
    await sendReply(context, reply);
  }
});

async function sendReply(context, reply) {
  if (!reply) return;
  // Log outgoing reply for debugging
  // attach a small request id to help correlate UI and server logs
  const requestId = `rid_${Date.now() % 100000}`;
  try {
    if (typeof reply === 'string') reply = `${reply} (${requestId})`;
    else if (reply && typeof reply === 'object') reply.traceId = requestId;
  } catch (e) {}
  console.log('Outgoing reply:', JSON.stringify(reply, null, 2));

  // If handler returned an array of activities/strings, send each
  if (Array.isArray(reply)) {
    for (const r of reply) {
      if (!r) continue;
      if (typeof r === 'string') {
        await context.sendActivity(r);
      } else {
        await context.sendActivity(r);
      }
    }
    return;
  }

  // Single string or activity
  if (typeof reply === 'string') {
    await context.sendActivity(reply);
  } else {
    await context.sendActivity(reply);
  }
}

// Register an API endpoint with `express`. Teams sends messages to your application
// through this endpoint.
//
// The Microsoft 365 Agents Toolkit bot registration configures the bot with `/api/messages` as the
// Bot Framework endpoint. If you customize this route, update the Bot registration
// in `infra/botRegistration/azurebot.bicep`.
expressApp.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, async (context) => {
    // Log incoming activity for debugging
    try {
      console.log('Incoming activity:', JSON.stringify(context.activity, null, 2));
      if (context.activity.value && context.activity.value.module) {
        console.log("SUBMIT ACTION DETECTED - Module:", context.activity.value.module);
      }
    } catch (e) {}
    await app.run(context);
  });
});
