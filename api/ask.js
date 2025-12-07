import { GoogleGenerativeAI } from "@google/generative-ai";

// SWITCH TO NODEJS RUNTIME (Fixes the build error)
export const config = {
  maxDuration: 60, // Allow up to 60 seconds for the AI to think
};

const API_KEY = process.env.GEMINI_API_KEY;

const ALLOWED_ORIGINS = [
  "https://educadug.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  // Add your Vercel URL here once you have it
];

export default async function handler(request, response) {
  // --- CORS HANDLING ---
  // In Node.js serverless, we use the 'response' object differently
  const origin = request.headers.origin;
  
  // Set CORS headers
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', origin || '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle Preflight Options
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!API_KEY) {
      throw new Error("Missing GEMINI_API_KEY environment variable");
    }

    const { prompt, context, mode } = request.body; // In Node.js, body is already parsed
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // Configure model
    const modelConfig = { model: "gemini-2.5-flash-preview-09-2025" };
    if (mode === 'json') {
      modelConfig.generationConfig = { responseMimeType: "application/json" };
    }

    const model = genAI.getModel(modelConfig);

    const systemInstruction = `
      You are an expert Biology Tutor for A-Level students.
      Current Context: ${context || "General Biology"}
      
      Instructions:
      1. Be concise and engaging.
      2. If mode is 'json', output ONLY valid JSON.
      3. If the user asks for a 'Healthy Swap', explain the biochemical benefit.
      4. If the user asks for a 'Doctor's Report', use medical terminology.
    `;

    const fullPrompt = `${systemInstruction}\n\nUser Query: ${prompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const aiResponse = await result.response;
    const text = aiResponse.text();

    return response.status(200).json({ reply: text });

  } catch (error) {
    console.error("API Error:", error);
    return response.status(500).json({ error: "Failed to process request", details: error.message });
  }
}
