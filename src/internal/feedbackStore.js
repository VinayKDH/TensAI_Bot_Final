const fs = require("fs");
const path = require("path");

const STORE_FILE = path.join(__dirname, "..", "feedback_store.json");

// If Cosmos config exists, use Cosmos DB
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DB_ID = process.env.COSMOS_DB_DATABASE_ID || "feedbackdb";
const COSMOS_CONTAINER_ID = process.env.COSMOS_DB_CONTAINER_ID || "feedback";

let cosmosClient;
let cosmosContainer;

async function _initCosmos() {
  if (!COSMOS_ENDPOINT || !COSMOS_KEY) return false;
  try {
    const { CosmosClient } = require("@azure/cosmos");
    cosmosClient = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY });
    const { database } = await cosmosClient.databases.createIfNotExists({ id: COSMOS_DB_ID });
    const { container } = await database.containers.createIfNotExists({ id: COSMOS_CONTAINER_ID });
    cosmosContainer = container;
    return true;
  } catch (e) {
    console.error("Failed to initialize Cosmos DB client", e);
    cosmosClient = null;
    cosmosContainer = null;
    return false;
  }
}

function _loadFile() {
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    return [];
  }
}

function _saveFile(data) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed writing feedback store", e);
  }
}

async function recordFeedback({ userId, type, context }) {
  const entry = { id: Date.now().toString(), userId, type, context, ts: new Date().toISOString() };
  // Try Cosmos first
  if (COSMOS_ENDPOINT && COSMOS_KEY) {
    try {
      if (!cosmosContainer) await _initCosmos();
      if (cosmosContainer) {
        await cosmosContainer.items.create(entry);
        return entry;
      }
    } catch (e) {
      console.error("Cosmos write failed, falling back to file", e);
    }
  }

  // Fallback to file
  const all = _loadFile();
  all.push(entry);
  _saveFile(all);
  return entry;
}

async function listFeedback() {
  if (COSMOS_ENDPOINT && COSMOS_KEY) {
    try {
      if (!cosmosContainer) await _initCosmos();
      if (cosmosContainer) {
        const querySpec = { query: "SELECT * FROM c ORDER BY c.ts DESC" };
        const { resources } = await cosmosContainer.items.query(querySpec).fetchAll();
        return resources;
      }
    } catch (e) {
      console.error("Cosmos read failed, falling back to file", e);
    }
  }
  return _loadFile();
}

module.exports = { recordFeedback, listFeedback };
