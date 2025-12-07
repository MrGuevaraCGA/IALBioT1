import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge',
};

const API_KEY = process.env.GEMINI_API_KEY;

// Add your Vercel URL here once deployed for security
const ALLOWED_ORIGINS = [
  "https://educadug.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500", 
  // "https://your-project-name.vercel.app" 
];

export default async function handler(request) {
  // CORS Configuration
  const origin = request.headers.get('origin');
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle Preflight Requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!API_KEY) throw new Error("Missing GEMINI_API_KEY environment variable");

    const { prompt, context, mode } = await request.json();
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // Select Model
    // We use the flash model for low latency responses
    const modelConfig = { model: "gemini-2.5-flash-preview-09-2025" };
    
    // Enforce JSON output if requested (Vital for the Quiz feature)
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
      3. If the user asks for a 'Healthy Swap', explain the biochemical benefit (e.g., lowering LDL).
      4. If the user asks for a 'Doctor's Report', use medical terminology (endothelium, atherosclerosis) but keep it understandable.
    `;

    const fullPrompt = `${systemInstruction}\n\nUser Query: ${prompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({ reply: text }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to process request", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
