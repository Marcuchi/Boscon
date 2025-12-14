import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  runtime: 'edge', // Hace que la función sea muy rápida
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { role } = await req.json();

    if (!process.env.API_KEY) {
        throw new Error("API_KEY no configurada en Vercel");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Genera una lista de 5 tareas de limpieza y mantenimiento realistas y detalladas para un empleado con el puesto de: "${role}". 
    Las tareas pueden ser diarias o semanales.
    Devuelve solo JSON limpio.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              frequency: { type: Type.STRING, enum: ["DAILY", "WEEKLY"] }
            }
          }
        }
      }
    });

    return new Response(response.text, {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}