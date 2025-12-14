// Llama a tu propia API en Vercel, manteniendo la clave segura
export const generateChecklistForRole = async (roleName: string) => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: roleName }),
    });

    if (!response.ok) {
      throw new Error('Error generando tareas con IA');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error en servicio IA:", error);
    return [];
  }
};