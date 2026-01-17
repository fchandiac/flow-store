const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://your-api-url.example.com';

export async function sendSale(data) {
  if (!data) {
    throw new Error('No se proporcionaron datos de la venta.');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorPayload = await safeParseJson(response);
      const message = errorPayload?.message || `HTTP ${response.status}`;
      throw new Error(message);
    }

    return await safeParseJson(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : `${error}`;
    throw new Error(`Error al sincronizar la venta: ${message}`);
  }
}

export default {
  sendSale
};

async function safeParseJson(response) {
  try {
    return await response.json();
  } catch (parseError) {
    return null;
  }
}
