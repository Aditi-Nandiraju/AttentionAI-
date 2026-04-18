import { GoogleGenAI, Type } from "@google/genai";
import { ClipMetadata } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeVideo(videoBase64: string, mimeType: string): Promise<ClipMetadata[]> {
  const prompt = `
    Analyze this long-form video and identify exactly the most impactful "Golden Nuggets" or "Viral Moments".
    For each moment:
    1. Identify the start and end timestamps.
    2. Provide a catchy "Hook Headline" to attract viewers.
    3. Explain the reasoning behind picking this moment (e.g., emotional peak, profound insight, high energy).
    4. Estimate the speaker's typical horizontal position in the frame (0.0 to 1.0, where 0.0 is far left, 0.5 is center, 1.0 is far right) so we can smart-crop to vertical.

    Focus on identifying clips that are 30-60 seconds long.
    Return only a JSON object with a "clips" array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: videoBase64,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clips: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  start_time_seconds: { type: Type.NUMBER },
                  end_time_seconds: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING },
                  hook: { type: Type.STRING },
                  speaker_position_x_float: { type: Type.NUMBER }
                },
                required: ["start_time_seconds", "end_time_seconds", "reasoning", "hook", "speaker_position_x_float"]
              }
            }
          },
          required: ["clips"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    return (data.clips || []).map((c: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      startTime: c.start_time_seconds,
      endTime: c.end_time_seconds,
      reasoning: c.reasoning,
      hookHeadline: c.hook,
      speakerPosition: c.speaker_position_x_float
    }));
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });
}
