// services/geminiService.js
const axios = require("axios");

async function extractLocation(description) {
  const prompt = `Extract the location from this disaster description: "${description}". Only return the location name.`;

  const response = await axios.post(
    "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",
    {
      contents: [{ parts: [{ text: prompt }] }]
    },
    {
      params: { key: process.env.GEMINI_API_KEY }
    }
  );

  const output = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return output?.trim();
}

module.exports = { extractLocation };
