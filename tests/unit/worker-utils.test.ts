import { describe, it, expect } from 'vitest';
import { extractAndParseRecipeJson, buildGemmaPrompt } from '../../src/workers/inference.worker';

describe('Web Worker Inference Utilities', () => {
  describe('extractAndParseRecipeJson', () => {
    it('parses pure JSON string without markdown', () => {
      const raw = '{"title": "Simple Fried Rice", "cook_time_minutes": 10}';
      const parsed = extractAndParseRecipeJson(raw) as { title: string; cook_time_minutes: number };
      expect(parsed.title).toBe('Simple Fried Rice');
      expect(parsed.cook_time_minutes).toBe(10);
    });

    it('strips markdown code fences ```json ... ```', () => {
      const raw = `Here is your sloth recipe:
\`\`\`json
{
  "title": "Egg Toast",
  "cook_time_minutes": 5
}
\`\`\`
Enjoy your meal!`;
      const parsed = extractAndParseRecipeJson(raw) as { title: string; cook_time_minutes: number };
      expect(parsed.title).toBe('Egg Toast');
      expect(parsed.cook_time_minutes).toBe(5);
    });

    it('handles extra leading and trailing conversational text without fences', () => {
      const raw = 'Sure! Here is the output: {"title": "Aglio e Olio", "cook_time_minutes": 12} Hope you like it.';
      const parsed = extractAndParseRecipeJson(raw) as { title: string; cook_time_minutes: number };
      expect(parsed.title).toBe('Aglio e Olio');
    });

    it('throws error when no valid JSON is present', () => {
      expect(() => extractAndParseRecipeJson('Just plain conversational text without braces')).toThrow();
    });
  });

  describe('buildGemmaPrompt', () => {
    it('constructs prompt with ingredients and urgency items', () => {
      const prompt = buildGemmaPrompt(['Eggs', 'Rice'], ['Eggs']);
      expect(prompt).toContain('Available Pantry Items: Eggs, Rice');
      expect(prompt).toContain('PRIORITY (Must Use Soon): Eggs');
      expect(prompt).toContain('<bos><start_of_turn>user');
      expect(prompt).toContain('<start_of_turn>model');
    });

    it('omits urgency section if no urgency items provided', () => {
      const prompt = buildGemmaPrompt(['Pasta', 'Garlic'], []);
      expect(prompt).toContain('Available Pantry Items: Pasta, Garlic');
      expect(prompt).not.toContain('PRIORITY (Must Use Soon)');
    });
  });
});
