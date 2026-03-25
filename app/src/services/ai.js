import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const analyzeEmotionalTrends = async (moods) => {
  if (!moods || moods.length === 0) return { alert: false, message: "" };
  
  const prompt = `
    Analyze the following recent check-ins for a user:
    ${JSON.stringify(moods)}
    
    If the trend shows a decline (e.g., three 😞 in a row, or a consistent drop in emoji_score), trigger an alert flag.
    Return ONLY a JSON object with the following structure:
    {"alert": true/false, "explanation": "Brief reason"}
  `;
  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    // parse JSON from markdown
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if(jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { alert: false, explanation: "Could not parse analysis." };
  } catch (err) {
    console.error("Gemini Error:", err);
    return { alert: false, explanation: "Error during analysis." };
  }
};

export const suggestSupportiveMessage = async (context) => {
  const prompt = `
    A user wants to check in on friends in their wellness circle.
    Context: ${context}
    Write a short, supportive, calming message (max 2 sentences) they can send to these friends.
    Example for missing: "Hey, haven't seen you check in today. Thinking of you!"
    Example for struggling: "I noticed things have been heavy lately, want to grab a coffee?"
    Do not include any quotes around the final message.
  `;
  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("Gemini Error:", err);
    return "Hey, I've been thinking about you. Let's catch up soon.";
  }
};
