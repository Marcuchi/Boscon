import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface GeneratedTask {
  title: string;
  description: string;
  frequency: string;
}

export const generateChecklistForRole = async (roleName: string): Promise<GeneratedTask[]> => {
  try {
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