import { GoogleGenAI, Type } from "@google/genai";

// Initialize lazily to avoid top-level crashes if API Key is missing
const getAiClient = () => {
  try {
    // @ts-ignore - Vite replaces process.env.API_KEY with the string value
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("Google GenAI API Key is missing.");
      return null;
    }
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Failed to initialize Google GenAI client:", e);
    return null;
  }
};

interface GeneratedTask {
  title: string;
  description: string;
  frequency: string;
}

export const generateChecklistForRole = async (roleName: string): Promise<GeneratedTask[]> => {
  try {
    const ai = getAiClient();
    if (!ai) {
      // Simulate a small delay to make UI feel responsive even if failing
      await new Promise(r => setTimeout(r, 500)); 
      return [];
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a checklist of 5 essential tasks for a "${roleName}" in a business environment. Mix daily and weekly tasks. The language must be Spanish.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "Short title of the task",
              },
              description: {
                type: Type.STRING,
                description: "Brief description of what needs to be done",
              },
              frequency: {
                type: Type.STRING,
                enum: ["DAILY", "WEEKLY"],
                description: "Frequency of the task",
              },
            },
            required: ["title", "frequency"],
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    
    return JSON.parse(jsonText) as GeneratedTask[];
  } catch (error) {
    console.error("Error generating tasks:", error);
    return [];
  }
};