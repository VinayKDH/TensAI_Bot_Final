const { MemoryStorage } = require("botbuilder");
const { Application } = require("@microsoft/teams-ai");
const { GenericCommandHandler } = require("./genericCommandHandler");

// Define storage and application
const storage = new MemoryStorage();
const app = new Application({
  storage,
});

// Handle conversation updates (when user joins)
app.activity("conversationUpdate", async (context, state) => {
  // Check if members were added to the conversation
  if (context.activity.membersAdded && context.activity.membersAdded.length > 0) {
    // Check if the bot itself was added (to avoid greeting itself)
    const botId = context.activity.recipient.id;
    const membersAdded = context.activity.membersAdded.filter(member => member.id !== botId);
    
    if (membersAdded.length > 0) {
      console.log(`New members added to conversation: ${membersAdded.map(m => m.name).join(', ')}`);
      
      // Send beautiful welcome message with menu
      const genericHandler = new GenericCommandHandler();
      const welcomeMessage = genericHandler._createWelcomeCard();
      
      await context.sendActivity(welcomeMessage);
    }
  }
});

module.exports.app = app;
