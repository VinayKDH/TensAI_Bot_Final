const feedbackStore = require("./internal/feedbackStore");

class AdminCommandHandler {
  triggerPatterns = "admin";

  async handleCommandReceived(context, state) {
    const text = (context.activity.text || "").trim();
    // simple admin command: admin getFeedback
    if (text === "admin getFeedback") {
      // simple env-protected admin access: check ADMIN_USER_ID
      const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
      const fromId = context.activity.from && context.activity.from.id;
      if (ADMIN_USER_ID && ADMIN_USER_ID !== fromId) {
        return "Unauthorized: admin command restricted.";
      }

      const items = await feedbackStore.listFeedback();
      if (!items || items.length === 0) return "No feedback recorded.";
      // return a compact summary
      return items.slice(0, 20).map((it) => `${it.ts} ${it.userId || "?"} ${it.type} ${JSON.stringify(it.context)}`).join("\n\n");
    }

    return "Unknown admin command. Try 'admin getFeedback'";
  }
}

module.exports = { AdminCommandHandler };
