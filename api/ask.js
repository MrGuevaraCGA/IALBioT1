// api/ask.js

export const config = {
  maxDuration: 60, // seconds
};

const API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req, res) {
  // --- CORS ---
  const origin = req.headers.origin || "";

  if (
    origin.includes("github.io") ||
    origin.includes("vercel.app") ||
    origin.startsWith("http://localhost")
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Requested-With, Accept"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!API_KEY) {
    return res
      .status(500)
      .json({ error: "Missing GEMINI_API_KEY environment variable" });
  }

  try {
    const { prompt, systemInstruction } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing 'prompt' string in body" });
    }

    const payload = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    if (systemInstruction && typeof systemInstruction === "string") {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errorText);
      return res.status(500).json({ error: "Gemini API error", details: errorText });
    }

    const result = await geminiRes.json();

    const reply =
      result.candidates &&
      result.candidates[0] &&
      result.candidates[0].content &&
      Array.isArray(result.candidates[0].content.parts)
        ? result.candidates[0].content.parts
            .map((p) => p.text || "")
            .join(" ")
            .trim()
        : "";

    return res.status(200).json({ reply: reply || "(No response text from model)" });
  } catch (err) {
    console.error("Server error:", err);
    return res
      .status(500)
      .json({ error: "Failed to process request", details: err.message });
  }
}
