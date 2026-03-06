const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.0-flash-exp-image-generation';

const STORAGE_KEY = 'pixelart-gemini-api-key';

export function getStoredApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

export function storeApiKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key);
}

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: GeminiPart[];
    };
  }>;
  error?: { message: string };
}

export async function generatePixelArt(
  apiKey: string,
  prompt: string,
  referenceImageBase64?: string
): Promise<string> {
  const parts: GeminiPart[] = [];

  if (referenceImageBase64) {
    parts.push({
      inline_data: {
        mime_type: 'image/png',
        data: referenceImageBase64,
      },
    });
    parts.push({
      text: `Transform this image into pixel art style. ${prompt}`,
    });
  } else {
    parts.push({
      text: `Generate pixel art: ${prompt}. Use a clean pixel art style with clear outlines, limited color palette, and no anti-aliasing. The image should look like a retro game sprite or tile.`,
    });
  }

  const response = await fetch(
    `${API_BASE}/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error('No response from Gemini');
  }

  const imagePart = candidate.content.parts.find((p) => p.inline_data);
  if (!imagePart?.inline_data) {
    throw new Error(
      'No image in response. The model may have returned text only: ' +
        candidate.content.parts.map((p) => p.text).join(' ')
    );
  }

  return imagePart.inline_data.data;
}

export function base64ToImageData(base64: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = () => reject(new Error('Failed to decode generated image'));
    img.src = `data:image/png;base64,${base64}`;
  });
}
