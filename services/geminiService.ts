import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage, GeminiConfig } from "../types";

const SYSTEM_INSTRUCTION = `You are an expert tutor and research assistant designed to help users learn complex topics using the "Heptabase" methodology. 
Your goal is not just to give answers, but to foster deep understanding.
1. When asked to summarize, focus on the "mental structure" of the content: main ideas, arguments, and how they build on each other.
2. When asked to explain, use analogies and concrete examples.
3. If the user shares a specific text, treat it as the primary source truth.
4. You are capable of "Thinking" deeply about complex connections. Use this ability to find subtle relationships in the text.`;

export const generateAIResponse = async (
  history: ChatMessage[],
  context: string,
  userPrompt: string,
  useThinking: boolean = false
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Select model based on complexity requirement
  const modelName = useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const config: GeminiConfig = {
    temperature: useThinking ? 0.7 : 0.9, // Lower temp for reasoning
  };

  // Add thinking budget if using the pro model for deep tasks
  if (useThinking) {
    config.thinkingBudget = 32768; 
  }

  // Construct the prompt with context
  const fullPrompt = `
  CONTEXT FROM WHITEBOARD:
  ${context}
  
  ---
  USER QUESTION:
  ${userPrompt}
  `;

  // We are using single-turn generation here for simplicity in this specific "Ask about this" context, 
  // but in a full chat implementation, we would pass history. 
  // For this specific architecture, we append history to the prompt contextually or use chat sessions.
  // Here we will use a fresh generateContent for the specific query to ensure it sees the *current* whiteboard context.
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: useThinking ? { thinkingBudget: config.thinkingBudget } : undefined,
      },
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating response. Please check your API key and try again.";
  }
};

export const suggestSplitPoints = async (fullText: string): Promise<string[]> => {
    // Helper to ask AI how to split a long text into logical "Cards"
    const apiKey = process.env.API_KEY;
    if (!apiKey) return [fullText];

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze the following text and split it into logical sections (e.g., Introduction, Chapter 1, Chapter 2). 
        Return ONLY a JSON array of strings, where each string is a section of text. 
        Do not change the text content, just chunk it. 
        Text: ${fullText.substring(0, 10000)}... (truncated for brevity)` // processing full text might hit limits in this demo
    });

    // Fallback if JSON parsing fails or text is too short
    return [fullText];
}

export const translateContent = async (text: string, targetLang: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return text;

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate the following text into ${targetLang}. 
      Maintain the original meaning, academic tone, and formatting (paragraphs/lists).
      Do not add explanations, just return the translated text.
      
      Text to translate:
      ${text.substring(0, 15000)}` // Limit to avoid context window issues in one go if huge
    });
    return response.text || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text; // Fallback to original on error
  }
};