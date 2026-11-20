// dailyPixelEngine.js
// Core micro-journaling -> emotion mapping -> pixel art synthesis engine for Daily Pixel

class DailyPixelEngine {
  constructor({ geminiApiKey = process.env.GEMINI_API_KEY || "" } = {}) {
    this.geminiApiKey = geminiApiKey;
    this.entries = [];
  }

  // 1. Detect emotional tone & color palette from user text + optional mood input
  analyzeEmotion(journalText, selectedMood = "") {
    const text = `${selectedMood} ${journalText}`.toLowerCase();

    const moodProfiles = [
      {
        emotion: "joyful_calm",
        keywords: ["happy", "joy", "peace", "calm", "good", "grateful", "smile", "sun"],
        palette: ["#FFE66D", "#4ECDC4", "#FF6B6B", "#F7FFF7"],
        styleHint: "warm sunlit pixel art, soft pastel sky, gentle breeze",
      },
      {
        emotion: "reflective_melancholy",
        keywords: ["sad", "tired", "lonely", "rain", "quiet", "miss", "slow", "thought"],
        palette: ["#2B2D42", "#8D99AE", "#5C677D", "#A8DADC"],
        styleHint: "moody twilight pixel art, soft rain reflections, minimalist lantern light",
      },
      {
        emotion: "energetic_inspired",
        keywords: ["excited", "idea", "build", "create", "energy", "fast", "win", "start"],
        palette: ["#FF595E", "#FFCA3A", "#1982C4", "#6A4C93"],
        styleHint: "vibrant retro arcade pixel art, dynamic shapes, crisp high-contrast highlights",
      },
    ];

    for (const profile of moodProfiles) {
      if (profile.keywords.some((word) => text.includes(word))) {
        return profile;
      }
    }

    return {
      emotion: "everyday_mindful",
      keywords: [],
      palette: ["#3D5A80", "#98C1D9", "#E0FBFC", "#EE6C4D"],
      styleHint: "clean 32x32 cozy pixel art scene, balanced daylight, subtle detail",
    };
  }

  // 2. Build structured prompt for Gemini / generative model
  buildPixelArtPrompt(journalText, moodProfile) {
    const cleanText = String(journalText || "").trim().replace(/\s+/g, " ");
    return {
      prompt: `Create a pixel art illustration representing this daily journal entry: "${cleanText}". Aesthetic: ${moodProfile.styleHint}. Color palette: ${moodProfile.palette.join(", ")}. Crisp pixel edges, no blur, no text watermark.`,
      emotion: moodProfile.emotion,
      palette: moodProfile.palette,
    };
  }

  // 3. Generate deterministic fallback pixel matrix (works offline without API key)
  generateFallbackPixelGrid(seedText, palette, size = 8) {
    let hash = 2166136261;
    for (let i = 0; i < seedText.length; i++) {
      hash ^= seedText.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    const grid = [];
    for (let row = 0; row < size; row++) {
      const currentRow = [];
      for (let col = 0; col < size; col++) {
        // Mirror horizontally for balanced pixel-art symmetry
        const mirrorCol = col < size / 2 ? col : size - 1 - col;
        const mix = (hash >>> ((row + mirrorCol) % 24)) + row * 31 + mirrorCol * 17;
        const colorIndex = Math.abs(mix) % palette.length;
        currentRow.push(palette[colorIndex]);
      }
      grid.push(currentRow);
    }
    return grid;
  }

  // 4. Optional live Gemini API call with automatic local fallback
  async synthesizeDailyPixel({ journalText, mood = "", date = new Date().toISOString().slice(0, 10) }) {
    if (!journalText || !String(journalText).trim()) {
      throw new Error("Journal text is required to create a Daily Pixel entry.");
    }

    const moodProfile = this.analyzeEmotion(journalText, mood);
    const promptData = this.buildPixelArtPrompt(journalText, moodProfile);

    let generationMode = "local_fallback";
    let apiResponse = null;

    if (this.geminiApiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(this.geminiApiKey)}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Refine this into a concise pixel-art art-direction brief in JSON with keys "scene_title" and "refined_prompt": ${promptData.prompt}`,
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Gemini API HTTP ${response.status}`);
        }

        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        apiResponse = { rawText: candidateText };
        generationMode = "gemini_api_assisted";
      } catch (err) {
        console.warn(`[DailyPixel] Falling back to local generator: ${err.message}`);
      }
    }

    const fallbackGrid = this.generateFallbackPixelGrid(
      `${date}-${journalText}-${moodProfile.emotion}`,
      moodProfile.palette,
      8
    );

    const entry = {
      id: `pixel_${Date.now()}`,
      date,
      journalText: String(journalText).trim(),
      emotion: moodProfile.emotion,
      palette: moodProfile.palette,
      prompt: promptData.prompt,
      generationMode,
      aiBrief: apiResponse,
      previewGrid: fallbackGrid,
      createdAt: new Date().toISOString(),
    };

    this.entries.push(entry);
    return entry;
  }

  getEntries() {
    return this.entries;
  }
}

// Example run
if (typeof require !== "undefined" && require.main === module) {
  (async () => {
    const engine = new DailyPixelEngine();
    const result = await engine.synthesizeDailyPixel({
      journalText: "Finished my project tasks today and watched the quiet evening sky.",
      mood: "calm and grateful",
      date: "2026-11-20",
    });
    console.log(JSON.stringify(result, null, 2));
  })();
}

module.exports = { DailyPixelEngine };
