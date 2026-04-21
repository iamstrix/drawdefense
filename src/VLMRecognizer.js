export class VLMRecognizer {
  constructor({ groqKey, hfKey }) {
    this.keys = {
      groq: groqKey,
      hf: hfKey
    };
    this.currentProvider = 'groq';
    this.isReady = !!(this.keys.groq || this.keys.hf);

    this.providers = {
      groq: {
        name: 'Groq',
        apiUrl: `/api/groq/openai/v1/chat/completions`,
        modelId: `meta-llama/llama-4-scout-17b-16e-instruct`,
        key: this.keys.groq
      },
      qwen: {
        name: 'Qwen (HF)',
        apiUrl: `https://router.huggingface.co/v1/chat/completions`,
        modelId: `Qwen/Qwen3-VL-8B-Instruct`,
        key: this.keys.hf
      }
    };

    console.log('[VLM] Redundant VLM System Initialized. Primary:', this.currentProvider);
  }

  setProvider(providerId) {
    if (this.providers[providerId]) {
      this.currentProvider = providerId;
      console.log(`[VLM] Provider switched to: ${this.providers[providerId].name}`);
    }
  }

  async classify(base64Image, activeWords, callback, isFallback = false) {
    const providerId = this.currentProvider;
    const config = this.providers[providerId];

    if (!config.key) {
      console.warn(`[VLM] Key missing for ${config.name}. Attempting fallback...`);
      return this.fallback(base64Image, activeWords, callback);
    }

    const question = providerId === 'groq' 
      ? `Target words: ${activeWords.join(', ')}. Rule: If the image reasonably resembles a target, output ONLY that exact word. If unrecognizable, output ONLY 'none'`
      : `Which of these words best describes this sketch: ${activeWords.join(', ')}? Respond with ONLY the single matching word.`;

    console.log(`[VLM] [${config.name}] Classifying...`);

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.key}`
        },
        body: JSON.stringify({
          model: config.modelId,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: question },
              { type: "image_url", image_url: { url: base64Image } }
            ]
          }],
          max_tokens: 20
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      let predictedWord = 'unknown';

      if (data.choices && data.choices[0]?.message) {
        predictedWord = data.choices[0].message.content.trim().toLowerCase();
      }

      predictedWord = predictedWord.replace(/[.,!?]$/g, '');
      console.log(`[VLM] [${config.name}] Result:`, predictedWord);

      // Fuzzy Match
      let matchedWord = predictedWord;
      for (const w of activeWords) {
        if (predictedWord.includes(w.toLowerCase()) || w.toLowerCase().includes(predictedWord)) {
          matchedWord = w.toLowerCase();
          break;
        }
      }

      if (callback) callback({ topLabels: [matchedWord] });

    } catch (err) {
      console.error(`[VLM] [${config.name}] Failed:`, err);
      
      // FALLBACK LOGIC
      if (!isFallback) {
        console.warn(`[VLM] Primary provider failed. Falling back to Qwen...`);
        return this.fallback(base64Image, activeWords, callback);
      } else {
        if (callback) callback({ error: 'All providers failed' });
      }
    }
  }

  async fallback(base64Image, activeWords, callback) {
    // If we were on groq, try qwen. If already on qwen, we are out of luck.
    const fallbackProvider = (this.currentProvider === 'groq') ? 'qwen' : 'groq';
    
    // Temporarily switch provider to Qwen for this call
    const originalProvider = this.currentProvider;
    this.currentProvider = fallbackProvider;
    
    await this.classify(base64Image, activeWords, callback, true);
    
    // Restore original preference
    this.currentProvider = originalProvider;
  }
}
