import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();

// Rate limiting storage
const rateLimit = new Map<string, number[]>();

// Rate limit configuration
const MAX_REQUESTS_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

/**
 * Clean up old rate limit entries
 */
function cleanupRateLimit(ip: string) {
  const now = Date.now();
  const requests = rateLimit.get(ip) || [];
  const validRequests = requests.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  if (validRequests.length > 0) {
    rateLimit.set(ip, validRequests);
  } else {
    rateLimit.delete(ip);
  }
}

/**
 * Check if IP is rate limited
 */
function isRateLimited(ip: string): boolean {
  cleanupRateLimit(ip);
  const requests = rateLimit.get(ip) || [];
  return requests.length >= MAX_REQUESTS_PER_MINUTE;
}

/**
 * Record request for rate limiting
 */
function recordRequest(ip: string) {
  const requests = rateLimit.get(ip) || [];
  requests.push(Date.now());
  rateLimit.set(ip, requests);
}

/**
 * Together AI proxy endpoint
 */
export const aiProxy = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Get client IP
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";

    // Rate limiting
    if (isRateLimited(ip as string)) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    // Validate request body
    const { model, messages, max_tokens, temperature } = req.body;

    if (!model || !messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid request format" });
      return;
    }

    // Basic validation for messages
    if (messages.length === 0 || messages.length > 10) {
      res.status(400).json({ error: "Invalid message count" });
      return;
    }

    // Limit message content length
    for (const message of messages) {
      if (!message.role || !message.content) {
        res.status(400).json({ error: "Invalid message format" });
        return;
      }
      if (message.content.length > 5000) {
        res.status(400).json({ error: "Message content too long" });
        return;
      }
    }

    // Get API key from environment
    const apiKey = functions.config().together?.api_key;
    if (!apiKey) {
      console.error("Together AI API key not configured");
      res.status(500).json({ error: "Service configuration error" });
      return;
    }

    // Record request for rate limiting
    recordRequest(ip as string);

    // Forward request to Together AI
    const response = await axios.post(
      "https://api.together.xyz/v1/chat/completions",
      {
        model,
        messages,
        max_tokens: Math.min(max_tokens || 300, 500), // Cap at 500
        temperature: Math.min(Math.max(temperature || 0.7, 0), 1),
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 second timeout
      }
    );

    // Return response
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error in AI proxy:", error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Together AI API error
        res.status(error.response.status).json({
          error: "AI service error",
          details: error.response.data,
        });
      } else if (error.code === "ECONNABORTED") {
        res.status(504).json({ error: "Request timeout" });
      } else {
        res.status(503).json({ error: "Service temporarily unavailable" });
      }
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
