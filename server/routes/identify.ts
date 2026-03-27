import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const SYSTEM_PROMPT = `You are a gym equipment expert and personal trainer. When given an image of gym equipment or a machine, identify it and respond ONLY with valid JSON in this exact format:
{
  "machine_name": "Lat Pulldown Machine",
  "muscles": ["Latissimus Dorsi", "Biceps", "Rear Deltoids"],
  "form_tips": ["Keep your chest up and lean back slightly", "Pull the bar to your upper chest, not behind your neck", "Control the weight on the way back up"],
  "suggested_sets": 3,
  "suggested_reps_min": 8,
  "suggested_reps_max": 12,
  "difficulty": "beginner"
}
If you cannot identify any gym equipment in the image, return: { "error": "No gym equipment detected" }`;

router.post('/', async (req: Request, res: Response) => {
  try {
    const { image, machineName } = req.body;

    if (!image && !machineName) {
      return res.status(400).json({ error: 'Either image or machineName is required' });
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    let response;

    if (image) {
      // Vision-based identification
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const mediaTypeMatch = image.match(/^data:(image\/\w+);base64,/);
      const mediaType = (mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg') as
        | 'image/jpeg'
        | 'image/png'
        | 'image/gif'
        | 'image/webp';

      response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 16000,
        thinking: {
          type: 'enabled',
          budget_tokens: 10000,
        },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: 'Please identify this gym equipment and provide the JSON response.',
              },
            ],
          },
        ],
      });
    } else {
      // Text-only fallback
      response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 16000,
        thinking: {
          type: 'enabled',
          budget_tokens: 10000,
        },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `I'm looking for information about this gym equipment: "${machineName}". Please provide the JSON response as if you identified it.`,
          },
        ],
      });
    }

    // Extract text content from response (skip thinking blocks)
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return res.status(500).json({ error: 'No text response from AI' });
    }

    // Parse JSON from response
    const text = textContent.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Invalid JSON response from AI' });
    }

    const machineData = JSON.parse(jsonMatch[0]);
    return res.json(machineData);
  } catch (error) {
    console.error('Identify error:', error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to identify equipment' });
  }
});

export default router;
