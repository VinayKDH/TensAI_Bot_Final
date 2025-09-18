const { CardFactory, MessageFactory } = require("botbuilder");
const feedbackStore = require("./internal/feedbackStore");
const { ApiService } = require("./services/apiService");

class GenericCommandHandler {
  // Match everything and handle in code (including submit actions with value objects)
  triggerPatterns = new RegExp(/.*/);
  
  constructor() {
    this.apiService = new ApiService();
  }

  async handleCommandReceived(context, state) {
    console.log(`App received message: ${context.activity.text}`);

    const text = (context.activity.text || "").trim();

    // If this is an invoke/submit activity for feedback, handle specially
    if (context.activity.value && context.activity.value.__feedback) {
      const fb = context.activity.value.__feedback; // { type: 'up'|'down', module: 'WebGPT' }
      const userId = context.activity.from && context.activity.from.id;
  const entry = await feedbackStore.recordFeedback({ userId, type: fb.type, context: fb });
      return this._createFeedbackCard(fb, entry);
    }

    // Handle WebGPT query submission
    if (context.activity.value && context.activity.value.__webgpt_query) {
      let query = context.activity.value.__webgpt_query;
      
      // If query is empty, get it from the text input field
      if (!query && context.activity.value.user_query) {
        query = context.activity.value.user_query;
      }
      
      if (!query) {
        return MessageFactory.text("Please enter a question or select a suggested prompt.");
      }
      
      const userId = context.activity.from?.id || 'unknown';
      
      try {
        // Call WebGPT API with the user's query
        const apiResponse = await this.apiService.callModuleAPI("WebGPT", {
          message: query,
          action: 'chat',
          query: query
        }, userId);

        // Create response card with WebGPT answer and navigation options
        return this._createWebGPTResponseCard(query, apiResponse);
      } catch (error) {
        console.error('WebGPT API call failed:', error);
        return this._createWebGPTErrorCard(query, error);
      }
    }

    // Handle translation type selection
    if (context.activity.value && context.activity.value.__translation_type) {
      const translationType = context.activity.value.__translation_type;
      console.log("Translation type selected:", translationType);
      
      if (translationType === "text") {
        return this._createLanguageSelectionCard("text");
      } else if (translationType === "document") {
        return this._createLanguageSelectionCard("document");
      }
    }

    // Handle language selection
    if (context.activity.value && (context.activity.value.__language_selection || (context.activity.value.sourceLanguage && context.activity.value.targetLanguage))) {
      const v = context.activity.value;
      const selection = v.__language_selection || {};
      const translationType = selection.translationType || v.translationType;
      const sourceLanguage = v.sourceLanguage;
      const targetLanguage = v.targetLanguage;
      console.log("Language selection:", { translationType, sourceLanguage, targetLanguage });
      
      if (translationType === "text") {
        return this._createTextTranslationInputCard(sourceLanguage, targetLanguage);
      } else if (translationType === "document") {
        return this._createDocumentUploadCard(sourceLanguage, targetLanguage);
      }
    }

    // Handle text translation submission
    if (context.activity.value && (context.activity.value.__text_translation || context.activity.value.textToTranslate)) {
      const v = context.activity.value;
      const text = v.__text_translation?.text || v.textToTranslate;
      const sourceLanguage = v.__text_translation?.sourceLanguage || v.sourceLanguage;
      const targetLanguage = v.__text_translation?.targetLanguage || v.targetLanguage;
      const userId = context.activity.from?.id || 'unknown';
      
      try {
        // Call translation API
        const apiResponse = await this.apiService.callModuleAPI("Translator", {
          message: text,
          action: 'translate',
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
          translationType: 'text'
        }, userId);

        return this._createTranslationResponseCard(text, apiResponse, sourceLanguage, targetLanguage);
      } catch (error) {
        console.error('Translation API call failed:', error);
        return this._createTranslationErrorCard(text, error, sourceLanguage, targetLanguage);
      }
    }

    // Handle document translation submission
    if (context.activity.value && context.activity.value.__document_translation) {
      const v = context.activity.value;
      const sourceLanguage = v.sourceLanguage;
      const targetLanguage = v.targetLanguage;
      
      // For now, use a mock document URL since we removed the input field
      // In production, this would come from the upload process
      const mockDocumentUrl = `https://example.com/uploaded-document-${Date.now()}.pdf`;
      
      const userId = context.activity.from?.id || 'unknown';
      
      try {
        // Call document translation API
        const apiResponse = await this.apiService.callModuleAPI("Translator", {
          message: mockDocumentUrl,
          action: 'translate_document',
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
          translationType: 'document',
          documentUrl: mockDocumentUrl
        }, userId);

        return this._createDocumentTranslationResponseCard(mockDocumentUrl, apiResponse, sourceLanguage, targetLanguage);
      } catch (error) {
        console.error('Document translation API call failed:', error);
        return this._createDocumentTranslationErrorCard(mockDocumentUrl, error, sourceLanguage, targetLanguage);
      }
    }

    // Handle summarizer text submission
    if (context.activity.value && (context.activity.value.__summarizer_text || context.activity.value.textToSummarize)) {
      const v = context.activity.value;
      const text = v.__summarizer_text?.text || v.textToSummarize;
      const userId = context.activity.from?.id || 'unknown';
      try {
        const apiResponse = await this.apiService.callModuleAPI("Summarizer", {
          message: text,
          action: 'summarize',
        }, userId);
        return this._createSummarizerResponseCard(text, apiResponse);
      } catch (error) {
        console.error('Summarizer API call failed:', error);
        return this._createSummarizerErrorCard(text, error);
      }
    }

    // OmniQuest: handle type selection (lock selection to prevent multiple types)
    if (context.activity.value && context.activity.value.__omni_type) {
      const resourceType = context.activity.value.__omni_type; // documents|csv|images|videos|audios
      // Use Teams AI TurnState conversation storage when available
      const getOmni = () => {
        try {
          const existing = state?.conversation?.get('omniQuest');
          if (existing) return existing;
          const fresh = {};
          state?.conversation?.set('omniQuest', fresh);
          return fresh;
        } catch (_) {
          if (!state.omniQuest) state.omniQuest = {};
          return state.omniQuest;
        }
      };
      const omni = getOmni();
      if (omni.locked && omni.resourceType) {
        return this._createOmniQuestAlreadySelectedCard(omni.resourceType);
      }
      omni.resourceType = resourceType;
      omni.locked = true;
      try { state?.conversation?.set('omniQuest', omni); } catch (_) {}
      // Replace the parent options card with the upload card so only a single card is shown
      try {
        const parentId = context.activity.replyToId;
        if (parentId) {
          const uploadCard = this._getOmniQuestUploadCardContent(resourceType);
          await context.updateActivity({ id: parentId, type: 'message', attachments: [CardFactory.adaptiveCard(uploadCard)] });
          return; // Do not send a separate message; updated in-place
        }
      } catch (e) {
        console.log('Failed to update parent options card:', e.message);
      }
      // Fallback: if we couldn't update in-place, send the upload card as a new message
      return this._createOmniQuestUploadCard(resourceType);
    }

    // OmniQuest: handle upload (resource URL provided)
    if (context.activity.value && context.activity.value.__omni_upload) {
      const v = context.activity.value;
      let resourceType = v.resourceType;
      try {
        if (!resourceType) resourceType = state?.conversation?.get('omniQuest')?.resourceType;
      } catch (_) {
        resourceType = resourceType || state?.omniQuest?.resourceType;
      }
      
      // For now, use a mock resource URL since we removed the input field
      // In production, this would come from the upload process
      const mockResourceUrl = `https://example.com/uploaded-${resourceType}-${Date.now()}`;
      
      // After upload, show question input card
      return this._createOmniQuestQuestionCard(resourceType, mockResourceUrl);
    }

    // OmniQuest: handle question
    if (context.activity.value && (context.activity.value.__omni_question || context.activity.value.questionText)) {
      const v = context.activity.value;
      const question = v.__omni_question?.text || v.questionText;
      const resourceUrl = v.__omni_question?.resourceUrl || v.resourceUrl;
      let resourceType = v.__omni_question?.resourceType || v.resourceType;
      try {
        if (!resourceType) resourceType = state?.conversation?.get('omniQuest')?.resourceType;
      } catch (_) {
        resourceType = resourceType || state?.omniQuest?.resourceType;
      }
      const userId = context.activity.from?.id || 'unknown';
      try {
        const apiResponse = await this.apiService.callModuleAPI("OmniQuest", {
          message: question,
          action: 'omniQuest',
          resourceUrl,
          resourceType
        }, userId);
        return this._createOmniQuestAnswerCard(question, apiResponse, resourceType, resourceUrl);
      } catch (error) {
        console.error('OmniQuest API call failed:', error);
        return this._createOmniQuestErrorCard(question, error, resourceType, resourceUrl);
      }
    }

    // OmniQuest: reset selection to allow changing type
    if (context.activity.value && context.activity.value.__omni_reset) {
      try { state?.conversation?.set('omniQuest', {}); } catch (_) { state.omniQuest = {}; }
      // Replace the current card with the options card so previous window is disabled
      try {
        const parentId = context.activity.replyToId;
        if (parentId) {
          const optionsCard = this._getOmniQuestOptionsCardContent();
          await context.updateActivity({ id: parentId, type: 'message', attachments: [CardFactory.adaptiveCard(optionsCard)] });
          return;
        }
      } catch (e) {
        console.log('Failed to update to options card on reset:', e.message);
      }
      return this._createOmniQuestOptionsCard();
    }

    // Media Studio: handle type selection (lock selection to prevent multiple types)
    if (context.activity.value && context.activity.value.__media_type) {
      const generationType = context.activity.value.__media_type; // image_generator|video_generator|audio_generator|image_to_image
      // Use Teams AI TurnState conversation storage when available
      const getMedia = () => {
        try {
          const existing = state?.conversation?.get('mediaStudio');
          if (existing) return existing;
          const fresh = {};
          state?.conversation?.set('mediaStudio', fresh);
          return fresh;
        } catch (_) {
          if (!state.mediaStudio) state.mediaStudio = {};
          return state.mediaStudio;
        }
      };
      const media = getMedia();
      if (media.locked && media.generationType) {
        return this._createMediaStudioAlreadySelectedCard(media.generationType);
      }
      media.generationType = generationType;
      media.locked = true;
      try { state?.conversation?.set('mediaStudio', media); } catch (_) {}
      // Replace the parent options card with the input card so only a single card is shown
      try {
        const parentId = context.activity.replyToId;
        if (parentId) {
          const inputCard = this._getMediaStudioInputCardContent(generationType);
          await context.updateActivity({ id: parentId, type: 'message', attachments: [CardFactory.adaptiveCard(inputCard)] });
          return; // Do not send a separate message; updated in-place
        }
      } catch (e) {
        console.log('Failed to update parent options card:', e.message);
      }
      // Fallback: if we couldn't update in-place, send the input card as a new message
      return this._createMediaStudioInputCard(generationType);
    }

    // Media Studio: handle image upload for Image to Image
    if (context.activity.value && context.activity.value.__media_image_upload) {
      const v = context.activity.value;
      let generationType = v.generationType;
      try {
        if (!generationType) generationType = state?.conversation?.get('mediaStudio')?.generationType;
      } catch (_) {
        generationType = generationType || state?.mediaStudio?.generationType;
      }
      
      // For now, use a mock image URL since we removed the input field
      // In production, this would come from the upload process
      const mockImageUrl = `https://example.com/uploaded-image-${Date.now()}.jpg`;
      
      // Store the image URL and show prompt input card
      try {
        const media = state?.conversation?.get('mediaStudio') || {};
        media.imageUrl = mockImageUrl;
        state?.conversation?.set('mediaStudio', media);
      } catch (_) {
        if (!state.mediaStudio) state.mediaStudio = {};
        state.mediaStudio.imageUrl = mockImageUrl;
      }
      return this._createMediaStudioPromptCard(generationType, mockImageUrl);
    }

    // Media Studio: handle generation request
    if (context.activity.value && (context.activity.value.__media_generate || context.activity.value.promptText)) {
      const v = context.activity.value;
      const prompt = v.__media_generate?.prompt || v.promptText;
      let generationType = v.__media_generate?.generationType || v.generationType;
      let imageUrl = v.__media_generate?.imageUrl || v.imageUrl;
      try {
        if (!generationType) generationType = state?.conversation?.get('mediaStudio')?.generationType;
        if (!imageUrl && generationType === 'image_to_image') imageUrl = state?.conversation?.get('mediaStudio')?.imageUrl;
      } catch (_) {
        generationType = generationType || state?.mediaStudio?.generationType;
        if (!imageUrl && generationType === 'image_to_image') imageUrl = state?.mediaStudio?.imageUrl;
      }
      const userId = context.activity.from?.id || 'unknown';
      try {
        const apiResponse = await this.apiService.callModuleAPI("Media Studio", {
          message: prompt,
          action: 'generate',
          generationType,
          prompt,
          imageUrl
        }, userId);
        return this._createMediaStudioResultCard(prompt, apiResponse, generationType, imageUrl);
      } catch (error) {
        console.error('Media Studio API call failed:', error);
        return this._createMediaStudioErrorCard(prompt, error, generationType, imageUrl);
      }
    }

    // Media Studio: reset selection to allow changing type
    if (context.activity.value && context.activity.value.__media_reset) {
      try { state?.conversation?.set('mediaStudio', {}); } catch (_) { state.mediaStudio = {}; }
      // Replace the current card with the options card so previous window is disabled
      try {
        const parentId = context.activity.replyToId;
        if (parentId) {
          const optionsCard = this._getMediaStudioOptionsCardContent();
          await context.updateActivity({ id: parentId, type: 'message', attachments: [CardFactory.adaptiveCard(optionsCard)] });
          return;
        }
      } catch (e) {
        console.log('Failed to update to options card on reset:', e.message);
      }
      return this._createMediaStudioOptionsCard();
    }

    // Handle filter actions
    if (context.activity.value && context.activity.value.__show_filters) {
      return this._createFilterCard();
    }

    if (context.activity.value && context.activity.value.__enterprise_apps) {
      return this._createEnterpriseAppsCard();
    }

    if (context.activity.value && context.activity.value.__business_apps) {
      return this._createBusinessAppsCard();
    }

    // Handle new module actions
    if (context.activity.value && context.activity.value.__mom_generate) {
      const v = context.activity.value;
      const meetingContent = v.meetingContent;
      const userId = context.activity.from?.id || 'unknown';
      
      if (!meetingContent) {
        return MessageFactory.text("Please provide meeting content to generate minutes.");
      }
      
      try {
        const apiResponse = await this.apiService.callModuleAPI("MoM Generator", {
          message: meetingContent,
          action: 'generate',
          content: meetingContent
        }, userId);
        
        return this._createMoMGeneratorResultCard(meetingContent, apiResponse);
      } catch (error) {
        console.error('MoM Generator API call failed:', error);
        return this._createMoMGeneratorErrorCard(meetingContent, error);
      }
    }

    if (context.activity.value && context.activity.value.__doc_compare) {
      const v = context.activity.value;
      const document1 = v.document1;
      const document2 = v.document2;
      const userId = context.activity.from?.id || 'unknown';
      
      if (!document1 || !document2) {
        return MessageFactory.text("Please provide both documents to compare.");
      }
      
      try {
        const apiResponse = await this.apiService.callModuleAPI("Doc Comparer", {
          message: "Compare documents",
          action: 'compare',
          document1: document1,
          document2: document2
        }, userId);
        
        return this._createDocComparerResultCard(document1, document2, apiResponse);
      } catch (error) {
        console.error('Doc Comparer API call failed:', error);
        return this._createDocComparerErrorCard(document1, document2, error);
      }
    }

    if (context.activity.value && context.activity.value.__effort_estimate) {
      const v = context.activity.value;
      const projectDescription = v.projectDescription;
      const teamSize = v.teamSize;
      const userId = context.activity.from?.id || 'unknown';
      
      if (!projectDescription) {
        return MessageFactory.text("Please provide project description for effort estimation.");
      }
      
      try {
        const apiResponse = await this.apiService.callModuleAPI("Effort Estimator", {
          message: projectDescription,
          action: 'estimate',
          projectDescription: projectDescription,
          teamSize: teamSize
        }, userId);
        
        return this._createEffortEstimatorResultCard(projectDescription, teamSize, apiResponse);
      } catch (error) {
        console.error('Effort Estimator API call failed:', error);
        return this._createEffortEstimatorErrorCard(projectDescription, teamSize, error);
      }
    }

    // Greeting when user says 'hi' / 'hello' or default show menu
    if (text.toLowerCase() === "hi" || text.toLowerCase() === "hello" || text.toLowerCase() === "menu") {
      // Welcome greeting with WebGPT as default
      const greeting = "👋 Welcome to TensAI! I'm your AI-powered assistant. WebGPT is ready to help you with any questions. You can also explore other modules using the + button below.";
      const menuMessage = this._menuCard();
      // Attach greeting text into the same activity so the bot returns a single activity with text + card
      menuMessage.text = greeting;
      return menuMessage;
    }

    if (text.toLowerCase() === "help") {
      return this._createHelpCard();
    }

    // If user types a module name, echo selection and show feedback buttons
    const modules = ["WebGPT", "Media Studio", "Translator", "Summarizer"];
    const found = modules.find((m) => m.toLowerCase() === text.toLowerCase());
    
    // Handle submit actions from Adaptive Cards (they have value but no text)
      if (context.activity.value && context.activity.value.module) {
        const moduleName = context.activity.value.module;
      console.log("Module selected via submit:", moduleName);

      // Handle menu navigation
      if (moduleName === "menu") {
        const menuMessage = this._menuCard();
        menuMessage.text = "👋 Welcome to TensAI! I'm your AI-powered assistant. WebGPT is ready to help you with any questions. You can also explore other modules using the + button below.";
        return menuMessage;
      }

            // Special handling for WebGPT - show query input card
            if (moduleName === "WebGPT") {
              console.log("WebGPT selected - creating query input card");
              return this._createWebGPTQueryCard();
            }

            // Special handling for Translator - show translation options
            if (moduleName === "Translator") {
              console.log("Translator selected - creating translation options card");
              return this._createTranslatorOptionsCard();
            }

            // Special handling for Summarizer - show text input card
            if (moduleName === "Summarizer") {
              console.log("Summarizer selected - creating input card");
              return this._createSummarizerInputCard();
            }

            // Special handling for OmniQuest - show resource type options
            if (moduleName === "OmniQuest") {
              console.log("OmniQuest selected - creating options card");
              return this._createOmniQuestOptionsCard();
            }

            // Special handling for Media Studio - show generation type options
            if (moduleName === "Media Studio") {
              console.log("Media Studio selected - creating options card");
              return this._createMediaStudioOptionsCard();
            }

            // Special handling for new modules
            if (moduleName === "MoM Generator") {
              console.log("MoM Generator selected - creating input card");
              return this._createMoMGeneratorInputCard();
            }

            if (moduleName === "Doc Comparer") {
              console.log("Doc Comparer selected - creating input card");
              return this._createDocComparerInputCard();
            }

            if (moduleName === "Effort Estimator") {
              console.log("Effort Estimator selected - creating input card");
              return this._createEffortEstimatorInputCard();
            }

      // For other modules, call the API directly
      try {
        const userId = context.activity.from?.id || 'unknown';
        const apiResponse = await this.apiService.callModuleAPI(moduleName, {
          message: `User selected ${moduleName}`,
          action: 'initialize'
        }, userId);

        // Create module card with API response
            const card = this._moduleCard(moduleName);
        card.body.push({
          type: "TextBlock",
          text: `✅ ${moduleName} Connected Successfully!`,
          weight: "Bolder",
          color: "Good",
          size: "Medium"
        });

        if (apiResponse.data && apiResponse.data.message) {
          card.body.push({
            type: "TextBlock",
            text: apiResponse.data.message,
            wrap: true,
            size: "Small"
          });
        }

        card.body.push({
          type: "TextBlock",
          text: `API Response received in ${apiResponse.attempt} attempt(s)`,
          size: "Small",
          color: "Accent"
        });

        // Add API-specific feedback
        card.body.push({
          type: "TextBlock",
          text: "**Was this API response helpful?**",
          weight: "Bolder",
          size: "Small",
          spacing: "Medium"
        });

        // Add API feedback buttons
        card.body.push({
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👍 API worked well",
                      data: {
                        __feedback: {
                          type: "up",
                          module: moduleName,
                          interaction: "api_success",
                          attempts: apiResponse.attempt
                        }
                      },
                      style: "positive"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👎 API needs improvement",
                      data: {
                        __feedback: {
                          type: "down",
                          module: moduleName,
                          interaction: "api_success",
                          attempts: apiResponse.attempt
                        }
                      },
                      style: "destructive"
                    }
                  ]
                }
              ]
            }
          ]
        });

            return MessageFactory.attachment(CardFactory.adaptiveCard(card));

      } catch (error) {
        console.error(`${moduleName} API call failed:`, error);
          const card = this._moduleCard(moduleName);
        card.body.push({
          type: "TextBlock",
          text: `❌ ${moduleName} Service Unavailable`,
          color: "Attention",
          weight: "Bolder",
          size: "Medium"
        });
        card.body.push({
          type: "TextBlock",
          text: `Error: ${error.message}`,
          wrap: true,
          size: "Small"
        });
        card.body.push({
          type: "TextBlock",
          text: "The backend service might be unavailable. Please try again later or contact support.",
          wrap: true,
          size: "Small",
          color: "Accent"
        });

        // Add API error feedback
        card.body.push({
          type: "TextBlock",
          text: "**Was this error message helpful?**",
          weight: "Bolder",
          size: "Small",
          spacing: "Medium"
        });

        // Add API error feedback buttons
        card.body.push({
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👍 Error message helpful",
                      data: {
                        __feedback: {
                          type: "up",
                          module: moduleName,
                          interaction: "api_error",
                          error: error.message
                        }
                      },
                      style: "positive"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👎 Error message unclear",
                      data: {
                        __feedback: {
                          type: "down",
                          module: moduleName,
                          interaction: "api_error",
                          error: error.message
                        }
                      },
                      style: "destructive"
                    }
                  ]
                }
              ]
            }
          ]
        });

          return MessageFactory.attachment(CardFactory.adaptiveCard(card));
        }
      }

    if (found) {
      // send a reply with thumbs up/down actions
      const card = this._moduleCard(found);
      return MessageFactory.attachment(CardFactory.adaptiveCard(card));
    }

    // default response
    return `Sorry, command unknown. Type 'menu' to see options.`;
  }

  _menuCard() {
    // ChatGPT-style mobile UI with WebGPT as default
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "default",
          spacing: "None",
          items: [
            {
              type: "TextBlock",
              text: "🤖 TensAI",
              size: "Large",
              weight: "Bolder",
              horizontalAlignment: "Center",
              spacing: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "👋 Welcome! I'm your AI-powered assistant.",
              size: "Medium",
              horizontalAlignment: "Center",
              color: "Accent",
              weight: "Bolder",
              spacing: "Small"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Large",
          items: [
            {
              type: "TextBlock",
              text: "How can I help you today?",
              size: "Medium",
              horizontalAlignment: "Center",
              color: "Default",
              spacing: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "Plan a trip to experience Seoul like a local",
                  data: { __webgpt_query: "Plan a trip to experience Seoul like a local" },
                  style: "default"
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "Quiz me on words to enhance my grammar",
                  data: { __webgpt_query: "Quiz me on words to enhance my grammar" },
                  style: "default"
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "Help me write a professional email",
                  data: { __webgpt_query: "Help me write a professional email" },
                  style: "default"
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "Explain quantum computing in simple terms",
                  data: { __webgpt_query: "Explain quantum computing in simple terms" },
                  style: "default"
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Large",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "+",
                  data: { __show_filters: true },
                  style: "default"
                }
              ],
              horizontalAlignment: "Center"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "Input.Text",
              id: "user_query",
              placeholder: "Ask anything...",
              isMultiline: false
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "Send",
                  data: { __webgpt_query: "" },
                  style: "positive"
                }
              ],
              horizontalAlignment: "Center"
            }
          ]
        }
      ],
      actions: []
    };
    
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createFilterCard() {
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "Choose Application Type",
              size: "Large",
              weight: "Bolder",
              horizontalAlignment: "Center"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "Enterprise Application",
                  data: { __enterprise_apps: true },
                  style: "positive"
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "Business Application",
                  data: { __business_apps: true },
                  style: "positive"
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "← Back",
                  data: { module: "menu" },
                  style: "default"
                }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createEnterpriseAppsCard() {
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "Enterprise Applications",
              size: "Large",
              weight: "Bolder",
              horizontalAlignment: "Center"
            }
          ]
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "🌐 Translator",
                      data: { module: "Translator" },
                      style: "positive"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "🤖 WebGPT",
                      data: { module: "WebGPT" },
                      style: "positive"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "🎨 Media Studio",
                      data: { module: "Media Studio" },
                      style: "positive"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "🔍 OmniQuest",
                      data: { module: "OmniQuest" },
                      style: "positive"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "📝 Summarizer",
                      data: { module: "Summarizer" },
                      style: "positive"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "📋 MoM Generator",
                      data: { module: "MoM Generator" },
                      style: "positive"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "📊 Doc Comparer",
                      data: { module: "Doc Comparer" },
                      style: "positive"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "⏱️ Effort Estimator",
                      data: { module: "Effort Estimator" },
                      style: "positive"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "← Back to Filters",
                  data: { __show_filters: true },
                  style: "default"
                }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createBusinessAppsCard() {
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "Business Applications",
              size: "Large",
              weight: "Bolder",
              horizontalAlignment: "Center"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "Business applications coming soon...",
              horizontalAlignment: "Center",
              color: "Default"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "← Back to Filters",
                  data: { __show_filters: true },
                  style: "default"
                }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createWelcomeCard() {
    // Special welcome card for new users
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 120'%3E%3Cdefs%3E%3ClinearGradient id='welcome' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23007ACC;stop-opacity:1' /%3E%3Cstop offset='50%25' style='stop-color:%2300A4EF;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2300BCF2;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='120' fill='url(%23welcome)'/%3E%3C/svg%3E",
            fillMode: "cover"
          },
          items: [
            {
              type: "TextBlock",
              size: "ExtraLarge",
              weight: "Bolder",
              text: "🎉 Welcome to TensAI!",
              color: "Light",
              horizontalAlignment: "Center"
            },
            {
              type: "TextBlock",
              text: "Your AI-powered productivity companion is ready to assist you",
              color: "Light",
              horizontalAlignment: "Center",
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "👋 **Hello there!** I'm TensAI, your intelligent assistant. I can help you with:",
              wrap: true,
              size: "Medium",
              weight: "Bolder"
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "🤖 **WebGPT**\nSmart conversations",
                      wrap: true,
                      size: "Small"
                    }
                  ]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "🎨 **Media Studio**\nCreate visuals",
                      wrap: true,
                      size: "Small"
                    }
                  ]
                }
              ]
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "🌐 **Translator**\nBreak language barriers",
                      wrap: true,
                      size: "Small"
                    }
                  ]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "📝 **Summarizer**\nExtract key insights",
                      wrap: true,
                      size: "Small"
                    }
                  ]
                }
              ]
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "🔍 **OmniQuest**\nMulti-purpose AI",
                      wrap: true,
                      size: "Small"
                    }
                  ]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "💡 **And more!**\nAlways learning",
                      wrap: true,
                      size: "Small"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "🚀 **Ready to get started?** Choose a module below or type 'help' for assistance:",
              wrap: true,
              size: "Medium",
              weight: "Bolder",
              color: "Accent"
            }
          ]
        }
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "🤖 WebGPT",
          data: { module: "WebGPT" },
          style: "positive"
        },
        {
          type: "Action.Submit",
          title: "🎨 Media Studio",
          data: { module: "Media Studio" },
          style: "positive"
        },
        {
          type: "Action.Submit",
          title: "🔍 OmniQuest",
          data: { module: "OmniQuest" },
          style: "positive"
        },
        {
          type: "Action.Submit",
          title: "🌐 Translator",
          data: { module: "Translator" },
          style: "positive"
        },
        {
          type: "Action.Submit",
          title: "📝 Summarizer",
          data: { module: "Summarizer" },
          style: "positive"
        }
      ]
    };
    
    const message = MessageFactory.attachment(CardFactory.adaptiveCard(card));
    message.text = "👋 Welcome to TensAI! I'm here to help you with various AI-powered tasks. Choose a module below to get started!";
    return message;
  }

  _createHelpCard() {
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='help' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2317A2B8;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2320C997;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23help)'/%3E%3C/svg%3E",
            fillMode: "cover"
          },
          items: [
        {
          type: "TextBlock",
          size: "Large",
          weight: "Bolder",
              text: "❓ Help & Commands",
              color: "Light",
              horizontalAlignment: "Center"
        },
        {
          type: "TextBlock",
              text: "Everything you need to know about TensAI",
              color: "Light",
              horizontalAlignment: "Center",
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "**🎯 Quick Commands:**",
              weight: "Bolder",
              size: "Medium",
              color: "Accent"
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "• **hi** / **hello** / **menu**\nOpen main menu",
          wrap: true,
                      size: "Small"
                    }
                  ]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "• **help**\nShow this help card",
                      wrap: true,
                      size: "Small"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "**🚀 Available Modules:**",
              weight: "Bolder",
              size: "Medium",
              color: "Accent"
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "🤖 **WebGPT**\nAI conversations",
                      wrap: true,
                      size: "Small"
                    }
                  ]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "🎨 **Media Studio**\nCreate visuals",
                      wrap: true,
                      size: "Small"
                    }
                  ]
                }
              ]
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "🌐 **Translator**\nLanguage translation",
                      wrap: true,
                      size: "Small"
                    }
                  ]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "📝 **Summarizer**\nContent summarization",
                      wrap: true,
                      size: "Small"
                    }
                  ]
                }
              ]
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "🔍 **OmniQuest**\nMulti-purpose AI",
                      wrap: true,
                      size: "Small"
                    }
                  ]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "💡 **Type module names**\nDirect access",
                      wrap: true,
                      size: "Small"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "TextBlock",
              text: "💡 **Pro Tip:** You can type any module name directly (e.g., 'WebGPT', 'Translator') to access it quickly!",
              wrap: true,
              size: "Small",
              color: "Accent",
              horizontalAlignment: "Center"
            }
          ]
        }
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "🏠 Back to Main Menu",
          data: { module: "menu" },
          style: "default"
        }
      ]
    };
    
    const message = MessageFactory.attachment(CardFactory.adaptiveCard(card));
    message.text = "Here's how to use TensAI effectively!";
    return message;
  }

  _createFeedbackCard(feedback, entry) {
    const isPositive = feedback.type === 'up';
    const emoji = isPositive ? '👍' : '👎';
    const color = isPositive ? 'Good' : 'Attention';
    
    // Create more specific messages based on interaction type
    let message;
    if (feedback.interaction === 'response') {
      message = isPositive ? 'Thank you! We\'re glad the response was helpful!' : 'Thank you for the feedback. We\'ll work to improve our responses!';
    } else if (feedback.interaction === 'error') {
      message = isPositive ? 'Thank you! We\'re glad the error message was clear!' : 'Thank you for the feedback. We\'ll work to improve our error messages!';
    } else if (feedback.interaction === 'api_success') {
      message = isPositive ? 'Thank you! We\'re glad the API worked well!' : 'Thank you for the feedback. We\'ll work to improve our API responses!';
    } else if (feedback.interaction === 'api_error') {
      message = isPositive ? 'Thank you! We\'re glad the error message was helpful!' : 'Thank you for the feedback. We\'ll work to improve our error handling!';
    } else {
      message = isPositive ? 'Thank you for the positive feedback!' : 'Thank you for your feedback. We\'ll work to improve!';
    }
    
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: isPositive 
              ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 60'%3E%3Cdefs%3E%3ClinearGradient id='positive' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2328A745;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2320C997;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='60' fill='url(%23positive)'/%3E%3C/svg%3E"
              : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 60'%3E%3Cdefs%3E%3ClinearGradient id='negative' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23DC3545;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23E83E8C;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='60' fill='url(%23negative)'/%3E%3C/svg%3E",
            fillMode: "cover"
          },
          items: [
        {
          type: "TextBlock",
          size: "Large",
          weight: "Bolder",
              text: `${emoji} Feedback Received!`,
              color: "Light",
              horizontalAlignment: "Center"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: message,
              weight: "Bolder",
              size: "Medium",
              color: color,
              horizontalAlignment: "Center"
        },
        {
          type: "TextBlock",
              text: `**Module:** ${feedback.module}\n**Interaction:** ${feedback.interaction || 'general'}\n**Feedback ID:** ${entry.id}\n**Time:** ${new Date(entry.ts).toLocaleString()}`,
          wrap: true,
              size: "Small",
              color: "Accent",
              horizontalAlignment: "Center"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "TextBlock",
              text: isPositive 
                ? "🎉 Your feedback helps us improve TensAI for everyone!"
                : "💡 Your feedback is valuable and helps us make TensAI better!",
              wrap: true,
              size: "Small",
              color: "Accent",
              horizontalAlignment: "Center"
            }
          ]
        }
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "🏠 Back to Main Menu",
          data: { module: "menu" },
          style: "default"
        }
      ]
    };
    
    const messageObj = MessageFactory.attachment(CardFactory.adaptiveCard(card));
    messageObj.text = `${emoji} ${message} (ID: ${entry.id})`;
    return messageObj;
  }

  _createApiResponseCard(moduleName, apiResponse) {
    const moduleInfo = this._getModuleInfo(moduleName);
    
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: moduleInfo.gradient,
            fillMode: "cover"
          },
          items: [
        {
          type: "TextBlock",
              size: "Large",
              weight: "Bolder",
              text: `${moduleInfo.icon} ${moduleName}`,
              color: "Light",
              horizontalAlignment: "Center"
            },
            {
              type: "TextBlock",
              text: "✅ Connected Successfully!",
              color: "Light",
              horizontalAlignment: "Center",
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: `🚀 **${moduleName} is ready!**`,
          weight: "Bolder",
          size: "Medium",
              color: "Good"
        },
        {
          type: "TextBlock",
              text: moduleInfo.instructions,
          wrap: true,
              size: "Small",
              color: "Accent"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "TextBlock",
              text: "**API Response:**",
              weight: "Bolder",
              size: "Small"
            },
            {
              type: "TextBlock",
              text: typeof apiResponse.data === 'string' 
                ? apiResponse.data 
                : JSON.stringify(apiResponse.data, null, 2),
              wrap: true,
              size: "Small",
              color: "Accent"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "TextBlock",
              text: `⚡ Response received in ${apiResponse.attempt} attempt(s) • ${new Date(apiResponse.timestamp).toLocaleTimeString()}`,
              size: "Small",
              color: "Accent",
              horizontalAlignment: "Center"
            }
          ]
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👍 Like",
                      data: { __feedback: { type: "up", module: moduleName } },
                      style: "positive"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👎 Dislike",
                      data: { __feedback: { type: "down", module: moduleName } },
                      style: "destructive"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "🏠 Back to Main Menu",
                  data: { module: "menu" },
                  style: "default"
                }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    return card;
  }

  _moduleCard(moduleName) {
    // Get module-specific information
    const moduleInfo = this._getModuleInfo(moduleName);
    
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: moduleInfo.gradient,
            fillMode: "cover"
          },
          items: [
            {
              type: "TextBlock",
              size: "Large",
              weight: "Bolder",
              text: `${moduleInfo.icon} ${moduleName}`,
              color: "Light",
              horizontalAlignment: "Center"
            },
            {
              type: "TextBlock",
              text: moduleInfo.description,
              color: "Light",
              horizontalAlignment: "Center",
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: `✅ **${moduleName} is ready!**`,
              weight: "Bolder",
              size: "Medium",
              color: "Good"
            },
            {
              type: "TextBlock",
              text: moduleInfo.instructions,
              wrap: true,
              size: "Small",
              color: "Accent"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "TextBlock",
              text: "**Quick Actions:**",
              weight: "Bolder",
              size: "Small"
            }
          ]
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
      actions: [
                    {
                      type: "Action.Submit",
                      title: "👍 Like",
                      data: { __feedback: { type: "up", module: moduleName } },
                      style: "positive"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👎 Dislike",
                      data: { __feedback: { type: "down", module: moduleName } },
                      style: "destructive"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "🏠 Back to Main Menu",
                  data: { module: "menu" },
                  style: "default"
                }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    return card;
  }

  _createWebGPTQueryCard() {
    console.log("Creating WebGPT query input card");
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: "🤖 **WebGPT - AI Assistant**",
          weight: "Bolder",
          size: "Large",
          wrap: true
        },
        {
          type: "TextBlock",
          text: "Ask me anything! I'm here to help with your questions, provide information, or have a conversation.",
          wrap: true,
          size: "Medium"
        },
        {
          type: "TextBlock",
          text: "**What would you like to know?**",
          weight: "Bolder",
          size: "Medium",
          wrap: true,
          spacing: "Medium"
        },
        {
          type: "Input.Text",
          id: "userQuery",
          placeholder: "Type your question here...",
          isMultiline: true,
          maxLength: 1000
        }
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "🚀 Ask WebGPT",
          data: { __webgpt_query: "${userQuery}" },
          style: "positive"
        },
        {
          type: "Action.Submit",
          title: "🏠 Back to Menu",
          data: { module: "menu" },
          style: "default"
        }
      ]
    };
    console.log("WebGPT query card created successfully");
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createWebGPTResponseCard(query, apiResponse) {
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "Container",
          backgroundImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='webgpt' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%236F42C1;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%239C27B0;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23webgpt)'/%3E%3C/svg%3E",
          padding: "20px",
          items: [
            {
              type: "TextBlock",
              text: "🤖 **WebGPT Response**",
              weight: "Bolder",
              color: "Light",
              size: "Large",
              wrap: true
            }
          ]
        },
        {
          type: "Container",
          padding: "20px",
          items: [
            {
              type: "TextBlock",
              text: "**Your Question:**",
              weight: "Bolder",
              size: "Medium",
              wrap: true
            },
            {
              type: "TextBlock",
              text: `"${query}"`,
              wrap: true,
              size: "Small",
              color: "Accent",
              style: "italic"
            },
            {
              type: "TextBlock",
              text: "**WebGPT's Answer:**",
              weight: "Bolder",
              size: "Medium",
              wrap: true,
              spacing: "Medium"
            },
            {
              type: "TextBlock",
              text: apiResponse.data?.response || apiResponse.data?.message || "I received your question and processed it successfully!",
              wrap: true,
              size: "Medium"
            },
            {
              type: "TextBlock",
              text: "**Was this response helpful?**",
              weight: "Bolder",
              size: "Small",
              spacing: "Medium"
            }
          ]
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👍 Yes, helpful",
                      data: {
                        __feedback: {
                          type: "up",
                          module: "WebGPT",
                          interaction: "response",
                          query: query
                        }
                      },
                      style: "positive"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👎 Not helpful",
                      data: {
                        __feedback: {
                          type: "down",
                          module: "WebGPT",
                          interaction: "response",
                          query: query
                        }
                      },
                      style: "destructive"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "💬 Ask Another Question",
          data: { module: "WebGPT" },
          style: "positive"
        },
        {
          type: "Action.Submit",
          title: "🏠 Back to Menu",
          data: { module: "menu" },
          style: "default"
        },
        {
          type: "Action.Submit",
          title: "🔄 Change Module",
          data: { module: "menu" },
          style: "default"
        }
      ]
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createWebGPTErrorCard(query, error) {
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "Container",
          backgroundImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='error' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23DC3545;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23E83E8C;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23error)'/%3E%3C/svg%3E",
          padding: "20px",
          items: [
            {
              type: "TextBlock",
              text: "❌ **WebGPT Error**",
              weight: "Bolder",
              color: "Light",
              size: "Large",
              wrap: true
            }
          ]
        },
        {
          type: "Container",
          padding: "20px",
          items: [
            {
              type: "TextBlock",
              text: "**Your Question:**",
              weight: "Bolder",
              size: "Medium",
              wrap: true
            },
            {
              type: "TextBlock",
              text: `"${query}"`,
              wrap: true,
              size: "Small",
              color: "Accent",
              style: "italic"
            },
            {
              type: "TextBlock",
              text: "**Error:**",
              weight: "Bolder",
              size: "Medium",
              wrap: true,
              spacing: "Medium"
            },
            {
              type: "TextBlock",
              text: `Sorry, I couldn't process your question right now. ${error.message}`,
              wrap: true,
              size: "Medium",
              color: "Attention"
            },
            {
              type: "TextBlock",
              text: "Please try again or contact support if the issue persists.",
              wrap: true,
              size: "Small",
              color: "Accent"
            },
            {
              type: "TextBlock",
              text: "**Was this error message helpful?**",
              weight: "Bolder",
              size: "Small",
              spacing: "Medium"
            }
          ]
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👍 Yes, helpful",
                      data: {
                        __feedback: {
                          type: "up",
                          module: "WebGPT",
                          interaction: "error",
                          query: query,
                          error: error.message
                        }
                      },
                      style: "positive"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👎 Not helpful",
                      data: {
                        __feedback: {
                          type: "down",
                          module: "WebGPT",
                          interaction: "error",
                          query: query,
                          error: error.message
                        }
                      },
                      style: "destructive"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "🔄 Try Again",
          data: { module: "WebGPT" },
          style: "positive"
        },
        {
          type: "Action.Submit",
          title: "🏠 Back to Menu",
          data: { module: "menu" },
          style: "default"
        }
      ]
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _getModuleInfo(moduleName) {
    const moduleInfo = {
      "WebGPT": {
        icon: "🤖", // TODO: Replace with actual WebGPT icon
        iconUrl: "https://via.placeholder.com/64x64/6F42C1/FFFFFF?text=WG", // Dummy icon URL
        description: "AI-powered chat and conversation",
        instructions: "Start chatting with our advanced AI assistant. Ask questions, get help, or have a conversation!",
        gradient: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='webgpt' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%236F42C1;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%239C27B0;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23webgpt)'/%3E%3C/svg%3E"
      },
      "Media Studio": {
        icon: "🎨", // TODO: Replace with actual Media Studio icon
        iconUrl: "https://via.placeholder.com/64x64/FF6B35/FFFFFF?text=MS", // Dummy icon URL
        description: "Create stunning visuals with AI",
        instructions: "Generate images, videos, and audio content using our advanced AI media tools.",
        gradient: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='media' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FF6B35;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23F7931E;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23media)'/%3E%3C/svg%3E"
      },
      "Translator": {
        icon: "🌐", // TODO: Replace with actual Translator icon
        iconUrl: "https://via.placeholder.com/64x64/007ACC/FFFFFF?text=TR", // Dummy icon URL
        description: "Break language barriers instantly",
        instructions: "Translate text between multiple languages with high accuracy and context awareness.",
        gradient: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='translate' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23007ACC;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2300A4EF;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23translate)'/%3E%3C/svg%3E"
      },
      "Summarizer": {
        icon: "📝", // TODO: Replace with actual Summarizer icon
        iconUrl: "https://via.placeholder.com/64x64/28A745/FFFFFF?text=SU", // Dummy icon URL
        description: "Extract key insights from content",
        instructions: "Get concise summaries of long documents, articles, or conversations quickly and accurately.",
        gradient: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='summarize' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2328A745;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2320C997;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23summarize)'/%3E%3C/svg%3E"
      },
      "OmniQuest": {
        icon: "🔍", // TODO: Replace with actual OmniQuest icon
        iconUrl: "https://via.placeholder.com/64x64/DC3545/FFFFFF?text=OQ", // Dummy icon URL
        description: "Your multi-purpose AI assistant",
        instructions: "Access a wide range of AI capabilities including research, analysis, and problem-solving.",
        gradient: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='omni' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23DC3545;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23E83E8C;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23omni)'/%3E%3C/svg%3E"
      }
    };
    
    return moduleInfo[moduleName] || {
      icon: "⚡", // TODO: Replace with actual default icon
      iconUrl: "https://via.placeholder.com/64x64/6C757D/FFFFFF?text=AI", // Dummy icon URL
      description: "AI-powered module",
      instructions: "This module is ready to assist you with various tasks.",
      gradient: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='default' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%236C757D;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23495057;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23default)'/%3E%3C/svg%3E"
    };
  }

  // Translation-related card methods
  _createTranslatorOptionsCard() {
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='translate' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23007ACC;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2300A4EF;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23translate)'/%3E%3C/svg%3E",
            fillMode: "cover"
          },
          items: [
            {
              type: "TextBlock",
              size: "Large",
              weight: "Bolder",
              text: "🌐 **Translation Options**",
              color: "Light",
              horizontalAlignment: "Center"
            },
            {
              type: "TextBlock",
              text: "Choose your translation type",
              color: "Light",
              horizontalAlignment: "Center",
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "**What would you like to translate?**",
              weight: "Bolder",
              size: "Medium",
              wrap: true
            },
            {
              type: "TextBlock",
              text: "Select the type of content you want to translate:",
              wrap: true,
              size: "Small",
              color: "Accent"
            }
          ]
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "📝 Text Translation",
                      data: { __translation_type: "text" },
                      style: "positive"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "📄 Document Translation",
                      data: { __translation_type: "document" },
                      style: "positive"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "🏠 Back to Menu",
                  data: { module: "menu" },
                  style: "default"
                }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createLanguageSelectionCard(translationType) {
    const languages = [
      { code: "en", name: "English" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "de", name: "German" },
      { code: "it", name: "Italian" },
      { code: "pt", name: "Portuguese" },
      { code: "ru", name: "Russian" },
      { code: "ja", name: "Japanese" },
      { code: "ko", name: "Korean" },
      { code: "zh", name: "Chinese" },
      { code: "ar", name: "Arabic" },
      { code: "hi", name: "Hindi" }
    ];

    const sourceOptions = languages.map(lang => ({
      title: lang.name,
      value: lang.code
    }));

    const targetOptions = languages.map(lang => ({
      title: lang.name,
      value: lang.code
    }));

    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='language' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23007ACC;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2300A4EF;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23language)'/%3E%3C/svg%3E",
            fillMode: "cover"
          },
          items: [
            {
              type: "TextBlock",
              size: "Large",
              weight: "Bolder",
              text: `🌐 **Language Selection**`,
              color: "Light",
              horizontalAlignment: "Center"
            },
            {
              type: "TextBlock",
              text: `Choose source and target languages for ${translationType} translation`,
              color: "Light",
              horizontalAlignment: "Center",
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "**Select Languages:**",
              weight: "Bolder",
              size: "Medium",
              wrap: true
            }
          ]
        },
        {
          type: "Input.ChoiceSet",
          id: "sourceLanguage",
          label: "Source Language",
          choices: sourceOptions,
          value: "en",
          style: "compact"
        },
        {
          type: "Input.ChoiceSet",
          id: "targetLanguage",
          label: "Target Language",
          choices: targetOptions,
          value: "es",
          style: "compact"
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "🚀 Continue",
                  data: { 
                    __language_selection: {
                      translationType: translationType
                    },
                    translationType: translationType,
                    sourceLanguage: "${sourceLanguage}",
                    targetLanguage: "${targetLanguage}"
                  },
                  style: "positive"
                },
                {
                  type: "Action.Submit",
                  title: "🏠 Back to Menu",
                  data: { module: "menu" },
                  style: "default"
                }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createTextTranslationInputCard(sourceLanguage, targetLanguage) {
    const sourceLangName = this._getLanguageName(sourceLanguage);
    const targetLangName = this._getLanguageName(targetLanguage);

    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='text-translate' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23007ACC;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2300A4EF;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23text-translate)'/%3E%3C/svg%3E",
            fillMode: "cover"
          },
          items: [
            {
              type: "TextBlock",
              size: "Large",
              weight: "Bolder",
              text: "📝 **Text Translation**",
              color: "Light",
              horizontalAlignment: "Center"
            },
            {
              type: "TextBlock",
              text: `${sourceLangName} → ${targetLangName}`,
              color: "Light",
              horizontalAlignment: "Center",
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "**Enter text to translate:**",
              weight: "Bolder",
              size: "Medium",
              wrap: true
            },
            {
              type: "TextBlock",
              text: `Translating from ${sourceLangName} to ${targetLangName}`,
              wrap: true,
              size: "Small",
              color: "Accent"
            }
          ]
        },
        {
          type: "Input.Text",
          id: "textToTranslate",
          placeholder: "Type your text here...",
          isMultiline: true,
          maxLength: 2000
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "🚀 Translate",
                  data: { 
                    __text_translation: {},
                    sourceLanguage: sourceLanguage,
                    targetLanguage: targetLanguage
                  },
                  style: "positive"
                },
                {
                  type: "Action.Submit",
                  title: "🔄 Change Languages",
                  data: { __translation_type: "text" },
                  style: "default"
                },
                {
                  type: "Action.Submit",
                  title: "🏠 Back to Menu",
                  data: { module: "menu" },
                  style: "default"
                }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createDocumentUploadCard(sourceLanguage, targetLanguage) {
    const sourceLangName = this._getLanguageName(sourceLanguage);
    const targetLangName = this._getLanguageName(targetLanguage);

    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='doc-translate' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23007ACC;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2300A4EF;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23doc-translate)'/%3E%3C/svg%3E",
            fillMode: "cover"
          },
          items: [
            {
              type: "TextBlock",
              size: "Large",
              weight: "Bolder",
              text: "📄 **Document Translation**",
              color: "Light",
              horizontalAlignment: "Center"
            },
            {
              type: "TextBlock",
              text: `${sourceLangName} → ${targetLangName}`,
              color: "Light",
              horizontalAlignment: "Center",
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: "**Upload your document:**",
              weight: "Bolder",
              size: "Medium",
              wrap: true
            },
            {
              type: "TextBlock",
              text: `Supported formats: PDF, DOC, DOCX, TXT, RTF\nMaximum file size: 10MB`,
              wrap: true,
              size: "Small",
              color: "Accent"
            }
          ]
        },
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.OpenUrl",
              title: "📂 Open Upload Window",
              url: (process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3978') + '/upload?type=document',
              style: "default"
            }
          ]
        },
        {
          type: "TextBlock",
          text: "After uploading, you'll be automatically returned to continue with your translation.",
          wrap: true,
          size: "Small",
          color: "Accent",
          spacing: "Medium"
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "📤 Upload & Translate",
                  data: { 
                    __document_translation: {},
                    sourceLanguage: sourceLanguage,
                    targetLanguage: targetLanguage
                  },
                  style: "positive"
                },
                {
                  type: "Action.Submit",
                  title: "🔄 Change Languages",
                  data: { __translation_type: "document" },
                  style: "default"
                },
                {
                  type: "Action.Submit",
                  title: "🏠 Back to Menu",
                  data: { module: "menu" },
                  style: "default"
                }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createTranslationResponseCard(originalText, apiResponse, sourceLanguage, targetLanguage) {
    const sourceLangName = this._getLanguageName(sourceLanguage);
    const targetLangName = this._getLanguageName(targetLanguage);

    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='success' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2328A745;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2320C997;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23success)'/%3E%3C/svg%3E",
            fillMode: "cover"
          },
          items: [
            {
              type: "TextBlock",
              size: "Large",
              weight: "Bolder",
              text: "✅ **Translation Complete**",
              color: "Light",
              horizontalAlignment: "Center"
            },
            {
              type: "TextBlock",
              text: `${sourceLangName} → ${targetLangName}`,
              color: "Light",
              horizontalAlignment: "Center",
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: `**Original (${sourceLangName}):**`,
              weight: "Bolder",
              size: "Medium",
              wrap: true
            },
            {
              type: "TextBlock",
              text: `"${originalText}"`,
              wrap: true,
              size: "Small",
              color: "Accent",
              style: "italic"
            },
            {
              type: "TextBlock",
              text: `**Translation (${targetLangName}):**`,
              weight: "Bolder",
              size: "Medium",
              wrap: true,
              spacing: "Medium"
            },
            {
              type: "TextBlock",
              text: apiResponse.data?.translation || apiResponse.data?.message || "Translation completed successfully!",
              wrap: true,
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "TextBlock",
              text: "**Was this translation helpful?**",
              weight: "Bolder",
              size: "Small",
              spacing: "Medium"
            }
          ]
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👍 Yes, helpful",
                      data: {
                        __feedback: {
                          type: "up",
                          module: "Translator",
                          interaction: "translation",
                          sourceLanguage: sourceLanguage,
                          targetLanguage: targetLanguage
                        }
                      },
                      style: "positive"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👎 Not helpful",
                      data: {
                        __feedback: {
                          type: "down",
                          module: "Translator",
                          interaction: "translation",
                          sourceLanguage: sourceLanguage,
                          targetLanguage: targetLanguage
                        }
                      },
                      style: "destructive"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "🔄 Translate More",
                  data: { __translation_type: "text" },
                  style: "positive"
                },
                {
                  type: "Action.Submit",
                  title: "🏠 Back to Menu",
                  data: { module: "menu" },
                  style: "default"
                }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createTranslationErrorCard(originalText, error, sourceLanguage, targetLanguage) {
    const sourceLangName = this._getLanguageName(sourceLanguage);
    const targetLangName = this._getLanguageName(targetLanguage);

    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='error' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23DC3545;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23E83E8C;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23error)'/%3E%3C/svg%3E",
            fillMode: "cover"
          },
          items: [
            {
              type: "TextBlock",
              size: "Large",
              weight: "Bolder",
              text: "❌ **Translation Error**",
              color: "Light",
              horizontalAlignment: "Center"
            },
            {
              type: "TextBlock",
              text: `${sourceLangName} → ${targetLangName}`,
              color: "Light",
              horizontalAlignment: "Center",
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: `**Original Text (${sourceLangName}):**`,
              weight: "Bolder",
              size: "Medium",
              wrap: true
            },
            {
              type: "TextBlock",
              text: `"${originalText}"`,
              wrap: true,
              size: "Small",
              color: "Accent",
              style: "italic"
            },
            {
              type: "TextBlock",
              text: "**Error:**",
              weight: "Bolder",
              size: "Medium",
              wrap: true,
              spacing: "Medium"
            },
            {
              type: "TextBlock",
              text: `Sorry, I couldn't translate your text right now. ${error.message}`,
              wrap: true,
              size: "Medium",
              color: "Attention"
            },
            {
              type: "TextBlock",
              text: "Please try again or contact support if the issue persists.",
              wrap: true,
              size: "Small",
              color: "Accent"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "🔄 Try Again",
                  data: { __translation_type: "text" },
                  style: "positive"
                },
                {
                  type: "Action.Submit",
                  title: "🏠 Back to Menu",
                  data: { module: "menu" },
                  style: "default"
                }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createDocumentTranslationResponseCard(documentUrl, apiResponse, sourceLanguage, targetLanguage) {
    const sourceLangName = this._getLanguageName(sourceLanguage);
    const targetLangName = this._getLanguageName(targetLanguage);

    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='success' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2328A745;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2320C997;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23success)'/%3E%3C/svg%3E",
            fillMode: "cover"
          },
          items: [
            {
              type: "TextBlock",
              size: "Large",
              weight: "Bolder",
              text: "✅ **Document Translation Complete**",
              color: "Light",
              horizontalAlignment: "Center"
            },
            {
              type: "TextBlock",
              text: `${sourceLangName} → ${targetLangName}`,
              color: "Light",
              horizontalAlignment: "Center",
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: `**Original Document (${sourceLangName}):**`,
              weight: "Bolder",
              size: "Medium",
              wrap: true
            },
            {
              type: "TextBlock",
              text: documentUrl,
              wrap: true,
              size: "Small",
              color: "Accent",
              style: "italic"
            },
            {
              type: "TextBlock",
              text: `**Translated Document (${targetLangName}):**`,
              weight: "Bolder",
              size: "Medium",
              wrap: true,
              spacing: "Medium"
            },
            {
              type: "TextBlock",
              text: "Your document has been successfully translated!",
              wrap: true,
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.OpenUrl",
                  title: "📥 Download Translated Document",
                  url: apiResponse.data?.downloadUrl || apiResponse.data?.translatedDocumentUrl || "#",
                  style: "positive"
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "TextBlock",
              text: "**Was this translation helpful?**",
              weight: "Bolder",
              size: "Small",
              spacing: "Medium"
            }
          ]
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👍 Yes, helpful",
                      data: {
                        __feedback: {
                          type: "up",
                          module: "Translator",
                          interaction: "document_translation",
                          sourceLanguage: sourceLanguage,
                          targetLanguage: targetLanguage
                        }
                      },
                      style: "positive"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "ActionSet",
                  actions: [
                    {
                      type: "Action.Submit",
                      title: "👎 Not helpful",
                      data: {
                        __feedback: {
                          type: "down",
                          module: "Translator",
                          interaction: "document_translation",
                          sourceLanguage: sourceLanguage,
                          targetLanguage: targetLanguage
                        }
                      },
                      style: "destructive"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "🔄 Translate Another Document",
                  data: { __translation_type: "document" },
                  style: "positive"
                },
                {
                  type: "Action.Submit",
                  title: "🏠 Back to Menu",
                  data: { module: "menu" },
                  style: "default"
                }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createDocumentTranslationErrorCard(documentUrl, error, sourceLanguage, targetLanguage) {
    const sourceLangName = this._getLanguageName(sourceLanguage);
    const targetLangName = this._getLanguageName(targetLanguage);

    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='error' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23DC3545;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23E83E8C;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23error)'/%3E%3C/svg%3E",
            fillMode: "cover"
          },
          items: [
            {
              type: "TextBlock",
              size: "Large",
              weight: "Bolder",
              text: "❌ **Document Translation Error**",
              color: "Light",
              horizontalAlignment: "Center"
            },
            {
              type: "TextBlock",
              text: `${sourceLangName} → ${targetLangName}`,
              color: "Light",
              horizontalAlignment: "Center",
              size: "Medium"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "TextBlock",
              text: `**Document URL (${sourceLangName}):**`,
              weight: "Bolder",
              size: "Medium",
              wrap: true
            },
            {
              type: "TextBlock",
              text: documentUrl,
              wrap: true,
              size: "Small",
              color: "Accent",
              style: "italic"
            },
            {
              type: "TextBlock",
              text: "**Error:**",
              weight: "Bolder",
              size: "Medium",
              wrap: true,
              spacing: "Medium"
            },
            {
              type: "TextBlock",
              text: `Sorry, I couldn't translate your document right now. ${error.message}`,
              wrap: true,
              size: "Medium",
              color: "Attention"
            },
            {
              type: "TextBlock",
              text: "Please check the document URL and try again, or contact support if the issue persists.",
              wrap: true,
              size: "Small",
              color: "Accent"
            }
          ]
        },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "ActionSet",
              actions: [
                {
                  type: "Action.Submit",
                  title: "🔄 Try Again",
                  data: { __translation_type: "document" },
                  style: "positive"
                },
                {
                  type: "Action.Submit",
                  title: "🏠 Back to Menu",
                  data: { module: "menu" },
                  style: "default"
                }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _getLanguageName(languageCode) {
    const languages = {
      "en": "English",
      "es": "Spanish",
      "fr": "French",
      "de": "German",
      "it": "Italian",
      "pt": "Portuguese",
      "ru": "Russian",
      "ja": "Japanese",
      "ko": "Korean",
      "zh": "Chinese",
      "ar": "Arabic",
      "hi": "Hindi"
    };
    return languages[languageCode] || languageCode;
  }

  _createSummarizerInputCard() {
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "Container",
          style: "emphasis",
          backgroundImage: {
            url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='summarize' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2328A745;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2320C997;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23summarize)'/%3E%3C/svg%3E",
            fillMode: "cover"
          },
          items: [
            { type: "TextBlock", size: "Large", weight: "Bolder", text: "📝 **Summarizer**", color: "Light", horizontalAlignment: "Center" },
            { type: "TextBlock", text: "Enter text to summarize", color: "Light", horizontalAlignment: "Center", size: "Medium" }
          ]
        },
        { type: "TextBlock", text: "**Paste your text below:**", weight: "Bolder", size: "Medium", wrap: true },
        { type: "Input.Text", id: "textToSummarize", isMultiline: true, maxLength: 8000, placeholder: "Paste or type text..." },
        {
          type: "Container",
          spacing: "Small",
          items: [
            {
              type: "ActionSet",
              actions: [
                { type: "Action.Submit", title: "🚀 Summarize", data: { __summarizer_text: {} }, style: "positive" },
                { type: "Action.Submit", title: "⚙️ Configure (coming soon)", data: { __summarizer_config: true }, style: "default" },
                { type: "Action.Submit", title: "🏠 Back to Menu", data: { module: "menu" }, style: "default" }
              ]
            }
          ]
        }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createSummarizerResponseCard(inputText, apiResponse) {
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "Container", style: "emphasis", backgroundImage: { url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='success' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2328A745;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2320C997;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23success)'/%3E%3C/svg%3E", fillMode: "cover" }, items: [ { type: "TextBlock", size: "Large", weight: "Bolder", text: "✅ **Summary**", color: "Light", horizontalAlignment: "Center" } ] },
        { type: "TextBlock", text: "**Original:**", weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: `"${inputText}"`, wrap: true, size: "Small", color: "Accent", style: "italic" },
        { type: "TextBlock", text: "**Summary:**", weight: "Bolder", size: "Medium", spacing: "Medium" },
        { type: "TextBlock", text: apiResponse.data?.summary || apiResponse.data?.message || "Summary generated successfully!", wrap: true, size: "Medium" }
      ],
      actions: [
        { type: "Action.Submit", title: "📝 Summarize More", data: { module: "Summarizer" }, style: "positive" },
        { type: "Action.Submit", title: "🏠 Back to Menu", data: { module: "menu" }, style: "default" }
      ]
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createSummarizerErrorCard(inputText, error) {
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "Container", style: "emphasis", backgroundImage: { url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='error' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23DC3545;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23E83E8C;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23error)'/%3E%3C/svg%3E", fillMode: "cover" }, items: [ { type: "TextBlock", size: "Large", weight: "Bolder", text: "❌ **Summarizer Error**", color: "Light", horizontalAlignment: "Center" } ] },
        { type: "TextBlock", text: "**Original:**", weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: `"${inputText}"`, wrap: true, size: "Small", color: "Accent", style: "italic" },
        { type: "TextBlock", text: "**Error:**", weight: "Bolder", size: "Medium", spacing: "Medium" },
        { type: "TextBlock", text: `Sorry, I couldn't summarize your text. ${error.message}`, wrap: true, size: "Medium", color: "Attention" }
      ],
      actions: [
        { type: "Action.Submit", title: "🔄 Try Again", data: { module: "Summarizer" }, style: "positive" },
        { type: "Action.Submit", title: "🏠 Back to Menu", data: { module: "menu" }, style: "default" }
      ]
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createOmniQuestOptionsCard() {
    const types = [
      { key: 'documents', title: '📄 Documents' },
      { key: 'csv', title: '📊 CSV' },
      { key: 'images', title: '🖼️ Images' },
      { key: 'videos', title: '🎬 Videos' },
      { key: 'audios', title: '🎧 Audios' },
    ];
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "Container", style: "emphasis", backgroundImage: { url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='omni' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23007ACC;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2300A4EF;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23omni)'/%3E%3C/svg%3E", fillMode: "cover" }, items: [ { type: "TextBlock", size: "Large", weight: "Bolder", text: "🔍 **OmniQuest (RAG)**", color: "Light", horizontalAlignment: "Center" }, { type: "TextBlock", text: "Choose a resource type to upload", color: "Light", horizontalAlignment: "Center", size: "Medium" } ] },
        { type: "TextBlock", text: "**Select resource type:**", weight: "Bolder", size: "Medium" },
        { type: "ColumnSet", columns: types.slice(0,2).map(t => ({ type: 'Column', width: 'stretch', items: [ { type: 'ActionSet', actions: [ { type: 'Action.Submit', title: t.title, data: { __omni_type: t.key }, style: 'positive' } ] } ] } )) },
        { type: "ColumnSet", columns: types.slice(2,4).map(t => ({ type: 'Column', width: 'stretch', items: [ { type: 'ActionSet', actions: [ { type: 'Action.Submit', title: t.title, data: { __omni_type: t.key }, style: 'positive' } ] } ] } )) },
        { type: "ActionSet", actions: [ { type: 'Action.Submit', title: types[4].title, data: { __omni_type: types[4].key }, style: 'positive' } ] },
        { type: "ActionSet", actions: [ { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' } ] }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  // Raw content builder for options card used when replacing in-place
  _getOmniQuestOptionsCardContent() {
    const types = [
      { key: 'documents', title: '📄 Documents' },
      { key: 'csv', title: '📊 CSV' },
      { key: 'images', title: '🖼️ Images' },
      { key: 'videos', title: '🎬 Videos' },
      { key: 'audios', title: '🎧 Audios' },
    ];
    return {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "Container", style: "emphasis", backgroundImage: { url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='omni' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23007ACC;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2300A4EF;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23omni)'/%3E%3C/svg%3E", fillMode: "cover" }, items: [ { type: "TextBlock", size: "Large", weight: "Bolder", text: "🔍 **OmniQuest (RAG)**", color: "Light", horizontalAlignment: "Center" }, { type: "TextBlock", text: "Choose a resource type to upload", color: "Light", horizontalAlignment: "Center", size: "Medium" } ] },
        { type: "TextBlock", text: "**Select resource type:**", weight: "Bolder", size: "Medium" },
        { type: "ColumnSet", columns: types.slice(0,2).map(t => ({ type: 'Column', width: 'stretch', items: [ { type: 'ActionSet', actions: [ { type: 'Action.Submit', title: t.title, data: { __omni_type: t.key }, style: 'positive' } ] } ] } )) },
        { type: "ColumnSet", columns: types.slice(2,4).map(t => ({ type: 'Column', width: 'stretch', items: [ { type: 'ActionSet', actions: [ { type: 'Action.Submit', title: t.title, data: { __omni_type: t.key }, style: 'positive' } ] } ] } )) },
        { type: "ActionSet", actions: [ { type: 'Action.Submit', title: types[4].title, data: { __omni_type: types[4].key }, style: 'positive' } ] },
        { type: "ActionSet", actions: [ { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' } ] }
      ],
      actions: []
    };
  }

  _createOmniQuestUploadCard(resourceType) {
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "TextBlock", text: `**Upload ${resourceType} to build knowledge:**`, weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: "Selection locked to prevent multiple uploads across types.", wrap: true, size: "Small", color: "Accent" },
        { type: "ActionSet", actions: [ { type: 'Action.OpenUrl', title: '📂 Open Upload Window', url: (process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3978') + '/upload?type=document' } ] },
        { type: "TextBlock", text: "After uploading, you'll be automatically returned to continue with your questions.", wrap: true, size: "Small", color: "Accent", spacing: "Medium" },
        { type: "ActionSet", actions: [ { type: 'Action.Submit', title: '✅ Continue', data: { __omni_upload: {}, resourceType: resourceType }, style: 'positive' }, { type: 'Action.Submit', title: '♻️ Change Type', data: { __omni_reset: true }, style: 'default' }, { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' } ] }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  // Raw content builder used when replacing the options card in-place
  _getOmniQuestUploadCardContent(resourceType) {
    return {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "TextBlock", text: `**Upload ${resourceType} to build knowledge:**`, weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: "Selection locked to prevent multiple uploads across types.", wrap: true, size: "Small", color: "Accent" },
        { type: "ActionSet", actions: [ { type: 'Action.OpenUrl', title: '📂 Open Upload Window', url: (process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3978') + '/upload?type=document' } ] },
        { type: "TextBlock", text: "After uploading, you'll be automatically returned to continue with your questions.", wrap: true, size: "Small", color: "Accent", spacing: "Medium" },
        { type: "ActionSet", actions: [ { type: 'Action.Submit', title: '✅ Continue', data: { __omni_upload: {}, resourceType: resourceType }, style: 'positive' }, { type: 'Action.Submit', title: '♻️ Change Type', data: { __omni_reset: true }, style: 'default' }, { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' } ] }
      ],
      actions: []
    };
  }

  _createOmniQuestQuestionCard(resourceType, resourceUrl) {
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "TextBlock", text: `**Ask questions about your ${resourceType}:**`, weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: `${resourceUrl || ''}`, wrap: true, size: "Small", color: "Accent", style: "italic" },
        { type: "Input.Text", id: "questionText", isMultiline: true, maxLength: 4000, placeholder: "Ask a question..." },
        { type: "ActionSet", actions: [ { type: 'Action.Submit', title: '🔎 Ask', data: { __omni_question: {}, resourceType, resourceUrl }, style: 'positive' }, { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' } ] }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createOmniQuestAnswerCard(question, apiResponse, resourceType, resourceUrl) {
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "TextBlock", text: "**Question:**", weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: `"${question}"`, wrap: true, size: "Small", color: "Accent", style: "italic" },
        { type: "TextBlock", text: "**Answer:**", weight: "Bolder", size: "Medium", spacing: "Medium" },
        { type: "TextBlock", text: apiResponse.data?.answer || apiResponse.data?.message || "Answer generated successfully!", wrap: true, size: "Medium" }
      ],
      actions: [
        { type: 'Action.Submit', title: '❓ Ask Another', data: { __omni_upload: {}, resourceType, resourceUrl }, style: 'positive' },
        { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' }
      ]
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createOmniQuestErrorCard(question, error, resourceType, resourceUrl) {
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "TextBlock", text: "**Question:**", weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: `"${question}"`, wrap: true, size: "Small", color: "Accent", style: "italic" },
        { type: "TextBlock", text: "**Error:**", weight: "Bolder", size: "Medium", spacing: "Medium" },
        { type: "TextBlock", text: `Sorry, I couldn't retrieve an answer. ${error.message}`, wrap: true, size: "Medium", color: "Attention" }
      ],
      actions: [
        { type: 'Action.Submit', title: '🔄 Try Again', data: { __omni_upload: {}, resourceType, resourceUrl }, style: 'positive' },
        { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' }
      ]
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createOmniQuestAlreadySelectedCard(resourceType) {
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "TextBlock", text: "**OmniQuest type already selected**", weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: `Current selection: ${resourceType}. To change, click 'Change Type'.`, wrap: true, size: "Small", color: "Accent" }
      ],
      actions: [
        { type: 'Action.Submit', title: '📂 Open Upload', data: { __omni_upload: {}, resourceType }, style: 'default' },
        { type: 'Action.Submit', title: '♻️ Change Type', data: { __omni_reset: true }, style: 'default' },
        { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' }
      ]
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  // Build a locked variant of the OmniQuest type selection card to replace the original message
  _buildOmniQuestTypeSelectionLockedCard(resourceType) {
    return {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "Container", style: "emphasis", backgroundImage: { url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='omni' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23007ACC;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2300A4EF;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23omni)'/%3E%3C/svg%3E", fillMode: "cover" }, items: [ { type: "TextBlock", size: "Large", weight: "Bolder", text: "🔒 OmniQuest Type Locked", color: "Light", horizontalAlignment: "Center" } ] },
        { type: "TextBlock", text: `You selected: ${resourceType}. Further type changes are disabled.`, wrap: true, size: "Medium" },
        { type: "TextBlock", text: "You can proceed to upload your resource or change the type.", wrap: true, size: "Small", color: "Accent" }
      ],
      actions: [
        { type: 'Action.Submit', title: '📂 Open Upload', data: { __omni_upload: {}, resourceType }, style: 'positive' },
        { type: 'Action.Submit', title: '♻️ Change Type', data: { __omni_reset: true }, style: 'default' },
        { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' }
      ]
    };
  }

  // Media Studio Methods
  _createMediaStudioOptionsCard() {
    const types = [
      { key: 'image_generator', title: '🎨 Image Generator' },
      { key: 'video_generator', title: '🎬 Video Generator' },
      { key: 'audio_generator', title: '🎵 Audio Generator' },
      { key: 'image_to_image', title: '🔄 Image to Image' }
    ];
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "Container", style: "emphasis", backgroundImage: { url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='media' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FF6B6B;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23FF8E53;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23media)'/%3E%3C/svg%3E", fillMode: "cover" }, items: [ { type: "TextBlock", size: "Large", weight: "Bolder", text: "🎨 **Media Studio**", color: "Light", horizontalAlignment: "Center" }, { type: "TextBlock", text: "Choose a generation type", color: "Light", horizontalAlignment: "Center", size: "Medium" } ] },
        { type: "TextBlock", text: "**Select generation type:**", weight: "Bolder", size: "Medium" },
        { type: "ColumnSet", columns: types.slice(0,2).map(t => ({ type: 'Column', width: 'stretch', items: [ { type: 'ActionSet', actions: [ { type: 'Action.Submit', title: t.title, data: { __media_type: t.key }, style: 'positive' } ] } ] } )) },
        { type: "ColumnSet", columns: types.slice(2,4).map(t => ({ type: 'Column', width: 'stretch', items: [ { type: 'ActionSet', actions: [ { type: 'Action.Submit', title: t.title, data: { __media_type: t.key }, style: 'positive' } ] } ] } )) },
        { type: "ActionSet", actions: [ { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' } ] }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createMediaStudioInputCard(generationType) {
    const typeNames = {
      'image_generator': 'Image Generator',
      'video_generator': 'Video Generator', 
      'audio_generator': 'Audio Generator',
      'image_to_image': 'Image to Image'
    };
    const typeName = typeNames[generationType] || generationType;
    
    // Special handling for Image to Image - show upload first
    if (generationType === 'image_to_image') {
      const card = {
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          { type: "TextBlock", text: `**${typeName}**`, weight: "Bolder", size: "Medium" },
          { type: "TextBlock", text: "Selection locked to prevent multiple generation types.", wrap: true, size: "Small", color: "Accent" },
          { type: "TextBlock", text: "**Step 1: Upload your source image**", weight: "Bolder", size: "Medium", spacing: "Medium" },
          { type: "ActionSet", actions: [ { type: 'Action.OpenUrl', title: '📂 Upload Image', url: (process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3978') + '/upload?type=image' } ] },
          { type: "TextBlock", text: "After uploading, you'll be automatically returned to continue with your prompt.", wrap: true, size: "Small", color: "Accent", spacing: "Medium" },
          { type: "ActionSet", actions: [ { type: 'Action.Submit', title: '➡️ Continue to Prompt', data: { __media_image_upload: true, generationType: generationType }, style: 'positive' }, { type: 'Action.Submit', title: '♻️ Change Type', data: { __media_reset: true }, style: 'default' }, { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' } ] }
        ],
        actions: []
      };
      return MessageFactory.attachment(CardFactory.adaptiveCard(card));
    }
    
    // Regular prompt input for other generation types
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "TextBlock", text: `**${typeName}**`, weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: "Selection locked to prevent multiple generation types.", wrap: true, size: "Small", color: "Accent" },
        { type: "Input.Text", id: "promptText", isMultiline: true, maxLength: 2000, placeholder: `Enter your prompt for ${typeName.toLowerCase()}...`, label: "Prompt" },
        { type: "ActionSet", actions: [ { type: 'Action.Submit', title: '🎨 Generate', data: { __media_generate: {}, generationType: generationType }, style: 'positive' }, { type: 'Action.Submit', title: '♻️ Change Type', data: { __media_reset: true }, style: 'default' }, { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' } ] }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createMediaStudioPromptCard(generationType, imageUrl) {
    const typeNames = {
      'image_generator': 'Image Generator',
      'video_generator': 'Video Generator',
      'audio_generator': 'Audio Generator',
      'image_to_image': 'Image to Image'
    };
    const typeName = typeNames[generationType] || generationType;
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "TextBlock", text: `**${typeName}**`, weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: "**Step 2: Enter your prompt**", weight: "Bolder", size: "Medium", spacing: "Medium" },
        ...(imageUrl ? [{ type: "TextBlock", text: `**Source Image:** ${imageUrl}`, wrap: true, size: "Small", color: "Accent", style: "italic" }] : []),
        { type: "Input.Text", id: "promptText", isMultiline: true, maxLength: 2000, placeholder: `Enter your prompt for ${typeName.toLowerCase()}...`, label: "Prompt" },
        { type: "ActionSet", actions: [ { type: 'Action.Submit', title: '🎨 Generate', data: { __media_generate: {}, generationType: generationType, imageUrl: imageUrl }, style: 'positive' }, { type: 'Action.Submit', title: '♻️ Change Type', data: { __media_reset: true }, style: 'default' }, { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' } ] }
      ],
      actions: []
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createMediaStudioResultCard(prompt, apiResponse, generationType, imageUrl) {
    const typeNames = {
      'image_generator': 'Image Generator',
      'video_generator': 'Video Generator',
      'audio_generator': 'Audio Generator', 
      'image_to_image': 'Image to Image'
    };
    const typeName = typeNames[generationType] || generationType;
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "TextBlock", text: "**Generation Complete!**", weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: `**Prompt:** "${prompt}"`, wrap: true, size: "Small", color: "Accent", style: "italic" },
        ...(imageUrl ? [{ type: "TextBlock", text: `**Source Image:** ${imageUrl}`, wrap: true, size: "Small", color: "Accent", style: "italic" }] : []),
        { type: "TextBlock", text: "**Result:**", weight: "Bolder", size: "Medium", spacing: "Medium" },
        { type: "TextBlock", text: apiResponse.data?.result || apiResponse.data?.message || "Media generated successfully!", wrap: true, size: "Medium" }
      ],
      actions: [
        { type: 'Action.Submit', title: '🎨 Generate Another', data: { __media_reset: true }, style: 'positive' },
        { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' }
      ]
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createMediaStudioErrorCard(prompt, error, generationType, imageUrl) {
    const typeNames = {
      'image_generator': 'Image Generator',
      'video_generator': 'Video Generator',
      'audio_generator': 'Audio Generator',
      'image_to_image': 'Image to Image'
    };
    const typeName = typeNames[generationType] || generationType;
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "TextBlock", text: "**Generation Failed**", weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: `**Prompt:** "${prompt}"`, wrap: true, size: "Small", color: "Accent", style: "italic" },
        ...(imageUrl ? [{ type: "TextBlock", text: `**Source Image:** ${imageUrl}`, wrap: true, size: "Small", color: "Accent", style: "italic" }] : []),
        { type: "TextBlock", text: "**Error:**", weight: "Bolder", size: "Medium", spacing: "Medium" },
        { type: "TextBlock", text: `Sorry, I couldn't generate your ${typeName.toLowerCase()}. ${error.message}`, wrap: true, size: "Medium", color: "Attention" }
      ],
      actions: [
        { type: 'Action.Submit', title: '🔄 Try Again', data: { __media_reset: true }, style: 'positive' },
        { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' }
      ]
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createMediaStudioAlreadySelectedCard(generationType) {
    const typeNames = {
      'image_generator': 'Image Generator',
      'video_generator': 'Video Generator',
      'audio_generator': 'Audio Generator',
      'image_to_image': 'Image to Image'
    };
    const typeName = typeNames[generationType] || generationType;
    const card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "TextBlock", text: "**Media Studio type already selected**", weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: `Current selection: ${typeName}. To change, click 'Change Type'.`, wrap: true, size: "Small", color: "Accent" }
      ],
      actions: [
        { type: 'Action.Submit', title: '🎨 Start Generating', data: { __media_reset: true }, style: 'default' },
        { type: 'Action.Submit', title: '♻️ Change Type', data: { __media_reset: true }, style: 'default' },
        { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' }
      ]
    };
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  // Raw content builders for Media Studio cards used when replacing in-place
  _getMediaStudioOptionsCardContent() {
    const types = [
      { key: 'image_generator', title: '🎨 Image Generator' },
      { key: 'video_generator', title: '🎬 Video Generator' },
      { key: 'audio_generator', title: '🎵 Audio Generator' },
      { key: 'image_to_image', title: '🔄 Image to Image' }
    ];
    return {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "Container", style: "emphasis", backgroundImage: { url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='media' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FF6B6B;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23FF8E53;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23media)'/%3E%3C/svg%3E", fillMode: "cover" }, items: [ { type: "TextBlock", size: "Large", weight: "Bolder", text: "🎨 **Media Studio**", color: "Light", horizontalAlignment: "Center" }, { type: "TextBlock", text: "Choose a generation type", color: "Light", horizontalAlignment: "Center", size: "Medium" } ] },
        { type: "TextBlock", text: "**Select generation type:**", weight: "Bolder", size: "Medium" },
        { type: "ColumnSet", columns: types.slice(0,2).map(t => ({ type: 'Column', width: 'stretch', items: [ { type: 'ActionSet', actions: [ { type: 'Action.Submit', title: t.title, data: { __media_type: t.key }, style: 'positive' } ] } ] } )) },
        { type: "ColumnSet", columns: types.slice(2,4).map(t => ({ type: 'Column', width: 'stretch', items: [ { type: 'ActionSet', actions: [ { type: 'Action.Submit', title: t.title, data: { __media_type: t.key }, style: 'positive' } ] } ] } )) },
        { type: "ActionSet", actions: [ { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' } ] }
      ],
      actions: []
    };
  }

  _getMediaStudioInputCardContent(generationType) {
    const typeNames = {
      'image_generator': 'Image Generator',
      'video_generator': 'Video Generator',
      'audio_generator': 'Audio Generator',
      'image_to_image': 'Image to Image'
    };
    const typeName = typeNames[generationType] || generationType;
    
    // Special handling for Image to Image - show upload first
    if (generationType === 'image_to_image') {
      return {
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          { type: "TextBlock", text: `**${typeName}**`, weight: "Bolder", size: "Medium" },
          { type: "TextBlock", text: "Selection locked to prevent multiple generation types.", wrap: true, size: "Small", color: "Accent" },
          { type: "TextBlock", text: "**Step 1: Upload your source image**", weight: "Bolder", size: "Medium", spacing: "Medium" },
          { type: "ActionSet", actions: [ { type: 'Action.OpenUrl', title: '📂 Upload Image', url: (process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3978') + '/upload?type=image' } ] },
          { type: "TextBlock", text: "After uploading, you'll be automatically returned to continue with your prompt.", wrap: true, size: "Small", color: "Accent", spacing: "Medium" },
          { type: "ActionSet", actions: [ { type: 'Action.Submit', title: '➡️ Continue to Prompt', data: { __media_image_upload: true, generationType: generationType }, style: 'positive' }, { type: 'Action.Submit', title: '♻️ Change Type', data: { __media_reset: true }, style: 'default' }, { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' } ] }
        ],
        actions: []
      };
    }
    
    // Regular prompt input for other generation types
    return {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        { type: "TextBlock", text: `**${typeName}**`, weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: "Selection locked to prevent multiple generation types.", wrap: true, size: "Small", color: "Accent" },
        { type: "Input.Text", id: "promptText", isMultiline: true, maxLength: 2000, placeholder: `Enter your prompt for ${typeName.toLowerCase()}...`, label: "Prompt" },
        { type: "ActionSet", actions: [ { type: 'Action.Submit', title: '🎨 Generate', data: { __media_generate: {}, generationType: generationType }, style: 'positive' }, { type: 'Action.Submit', title: '♻️ Change Type', data: { __media_reset: true }, style: 'default' }, { type: 'Action.Submit', title: '🏠 Back to Menu', data: { module: 'menu' }, style: 'default' } ] }
      ],
      actions: []
    };
  }
  _createMoMGeneratorInputCard() {
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: "📋 MoM Generator",
          size: "Large",
          weight: "Bolder",
          horizontalAlignment: "Center"
        },
        {
          type: "TextBlock",
          text: "Generate meeting minutes from your meeting notes or transcript.",
          wrap: true,
          horizontalAlignment: "Center",
          color: "Default"
        },
        {
          type: "Input.Text",
          id: "meetingContent",
          isMultiline: true,
          maxLength: 5000,
          placeholder: "Paste your meeting notes, transcript, or key points here...",
          label: "Meeting Content"
        },
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.Submit",
              title: "📋 Generate MoM",
              data: { __mom_generate: true },
              style: "positive"
            },
            {
              type: "Action.Submit",
              title: "🏠 Back to Menu",
              data: { module: "menu" },
              style: "default"
            }
          ]
        }
      ],
      actions: []
    };
    
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createDocComparerInputCard() {
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: "📊 Doc Comparer",
          size: "Large",
          weight: "Bolder",
          horizontalAlignment: "Center"
        },
        {
          type: "TextBlock",
          text: "Compare two documents and identify differences, similarities, and key changes.",
          wrap: true,
          horizontalAlignment: "Center",
          color: "Default"
        },
        {
          type: "Input.Text",
          id: "document1",
          isMultiline: true,
          maxLength: 5000,
          placeholder: "Paste the first document content here...",
          label: "Document 1"
        },
        {
          type: "Input.Text",
          id: "document2",
          isMultiline: true,
          maxLength: 5000,
          placeholder: "Paste the second document content here...",
          label: "Document 2"
        },
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.Submit",
              title: "📊 Compare Documents",
              data: { __doc_compare: true },
              style: "positive"
            },
            {
              type: "Action.Submit",
              title: "🏠 Back to Menu",
              data: { module: "menu" },
              style: "default"
            }
          ]
        }
      ],
      actions: []
    };
    
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createEffortEstimatorInputCard() {
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: "⏱️ Effort Estimator",
          size: "Large",
          weight: "Bolder",
          horizontalAlignment: "Center"
        },
        {
          type: "TextBlock",
          text: "Estimate effort and time required for your project tasks and features.",
          wrap: true,
          horizontalAlignment: "Center",
          color: "Default"
        },
        {
          type: "Input.Text",
          id: "projectDescription",
          isMultiline: true,
          maxLength: 3000,
          placeholder: "Describe your project, features, or tasks that need effort estimation...",
          label: "Project Description"
        },
        {
          type: "Input.Text",
          id: "teamSize",
          placeholder: "e.g., 3 developers, 1 designer",
          label: "Team Size (optional)"
        },
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.Submit",
              title: "⏱️ Estimate Effort",
              data: { __effort_estimate: true },
              style: "positive"
            },
            {
              type: "Action.Submit",
              title: "🏠 Back to Menu",
              data: { module: "menu" },
              style: "default"
            }
          ]
        }
      ],
      actions: []
    };
    
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createMoMGeneratorResultCard(meetingContent, apiResponse) {
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: "📋 Meeting Minutes Generated",
          size: "Large",
          weight: "Bolder",
          horizontalAlignment: "Center"
        },
        {
          type: "TextBlock",
          text: apiResponse.message || apiResponse.result || "Meeting minutes generated successfully!",
          wrap: true,
          spacing: "Medium"
        },
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.Submit",
              title: "📋 Generate Another",
              data: { module: "MoM Generator" },
              style: "positive"
            },
            {
              type: "Action.Submit",
              title: "🏠 Back to Menu",
              data: { module: "menu" },
              style: "default"
            }
          ]
        }
      ],
      actions: []
    };
    
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createMoMGeneratorErrorCard(meetingContent, error) {
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: "❌ Error Generating Meeting Minutes",
          size: "Large",
          weight: "Bolder",
          color: "Attention",
          horizontalAlignment: "Center"
        },
        {
          type: "TextBlock",
          text: `Failed to generate meeting minutes: ${error.message || error}`,
          wrap: true,
          color: "Attention",
          spacing: "Medium"
        },
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.Submit",
              title: "🔄 Try Again",
              data: { module: "MoM Generator" },
              style: "positive"
            },
            {
              type: "Action.Submit",
              title: "🏠 Back to Menu",
              data: { module: "menu" },
              style: "default"
            }
          ]
        }
      ],
      actions: []
    };
    
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createDocComparerResultCard(document1, document2, apiResponse) {
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: "📊 Document Comparison Results",
          size: "Large",
          weight: "Bolder",
          horizontalAlignment: "Center"
        },
        {
          type: "TextBlock",
          text: apiResponse.message || apiResponse.result || "Document comparison completed successfully!",
          wrap: true,
          spacing: "Medium"
        },
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.Submit",
              title: "📊 Compare Another",
              data: { module: "Doc Comparer" },
              style: "positive"
            },
            {
              type: "Action.Submit",
              title: "🏠 Back to Menu",
              data: { module: "menu" },
              style: "default"
            }
          ]
        }
      ],
      actions: []
    };
    
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createDocComparerErrorCard(document1, document2, error) {
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: "❌ Error Comparing Documents",
          size: "Large",
          weight: "Bolder",
          color: "Attention",
          horizontalAlignment: "Center"
        },
        {
          type: "TextBlock",
          text: `Failed to compare documents: ${error.message || error}`,
          wrap: true,
          color: "Attention",
          spacing: "Medium"
        },
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.Submit",
              title: "🔄 Try Again",
              data: { module: "Doc Comparer" },
              style: "positive"
            },
            {
              type: "Action.Submit",
              title: "🏠 Back to Menu",
              data: { module: "menu" },
              style: "default"
            }
          ]
        }
      ],
      actions: []
    };
    
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createEffortEstimatorResultCard(projectDescription, teamSize, apiResponse) {
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: "⏱️ Effort Estimation Results",
          size: "Large",
          weight: "Bolder",
          horizontalAlignment: "Center"
        },
        {
          type: "TextBlock",
          text: apiResponse.message || apiResponse.result || "Effort estimation completed successfully!",
          wrap: true,
          spacing: "Medium"
        },
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.Submit",
              title: "⏱️ Estimate Another",
              data: { module: "Effort Estimator" },
              style: "positive"
            },
            {
              type: "Action.Submit",
              title: "🏠 Back to Menu",
              data: { module: "menu" },
              style: "default"
            }
          ]
        }
      ],
      actions: []
    };
    
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }

  _createEffortEstimatorErrorCard(projectDescription, teamSize, error) {
    const card = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: "❌ Error Estimating Effort",
          size: "Large",
          weight: "Bolder",
          color: "Attention",
          horizontalAlignment: "Center"
        },
        {
          type: "TextBlock",
          text: `Failed to estimate effort: ${error.message || error}`,
          wrap: true,
          color: "Attention",
          spacing: "Medium"
        },
        {
          type: "ActionSet",
          actions: [
            {
              type: "Action.Submit",
              title: "🔄 Try Again",
              data: { module: "Effort Estimator" },
              style: "positive"
            },
            {
              type: "Action.Submit",
              title: "🏠 Back to Menu",
              data: { module: "menu" },
              style: "default"
            }
          ]
        }
      ],
      actions: []
    };
    
    return MessageFactory.attachment(CardFactory.adaptiveCard(card));
  }
}

module.exports = {
  GenericCommandHandler,
};
