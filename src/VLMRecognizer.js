export class VLMRecognizer {
  constructor(apiKey) {
    this.apiKey = apiKey; // kept for validation check only; actual injection is done server-side via vite proxy
    // Route via Hugging Face Router's OpenAI-compatible Chat Completions API
    this.apiUrl = `https://router.huggingface.co/v1/chat/completions`;
    this.modelId = `Qwen/Qwen3-VL-8B-Instruct`;
    this.isReady = !!this.apiKey && !this.apiKey.includes('your_token_here');

    if (!this.isReady) {
      console.warn('[VLM] HF API Key missing or placeholder. Open .env and set VITE_HF_API_KEY=hf_...');
    } else {
      console.log('[VLM] VLMRecognizer initialized with Hugging Face ViLT VQA (via Router)');
    }
  }

  async classify(base64Image, activeWords, callback) {
    if (!this.isReady) {
      console.error('[VLM] Cannot classify without a valid API key');
      if (callback) callback({ error: 'No API key' });
      return;
    }

    // Ensure we keep the full data URI (OpenAI format needs data:image/...;base64,...)
    // Build the question from the active words currently spawned in-game
    const question = `Which of these words best describes this sketch: ${activeWords.join(', ')}? Respond with ONLY the single matching word, nothing else.`;
    console.log('[VLM] Question sent:', question);

    const payload = {
      model: this.modelId,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: question },
            {
              type: "image_url",
              image_url: { url: base64Image }
            }
          ]
        }
      ],
      max_tokens: 20
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 503) {
        // Model is loading — HF cold-start
        console.log('[VLM] Model loading (503). Retrying in 5 seconds...');
        setTimeout(() => this.classify(base64Image, activeWords, callback), 5000);
        return;
      }

      const rawText = await response.text();
      console.log('[VLM] Raw response status:', response.status, '| body:', rawText.slice(0, 200));

      if (!response.ok) {
        console.error(`[VLM] HTTP error ${response.status}:`, rawText);
        if (callback) callback({ error: `HTTP ${response.status}: ${rawText}` });
        return;
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.error('[VLM] JSON parse failed:', parseErr, rawText);
        if (callback) callback({ error: 'Invalid JSON response' });
        return;
      }

      // OpenAI payload returns: { choices: [{ message: { content: "apple" } }] }
      let predictedWord = 'unknown';

      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        predictedWord = data.choices[0].message.content.trim().toLowerCase();
      } else if (Array.isArray(data) && data.length > 0 && data[0].answer) { // fallback for legacy
        predictedWord = data[0].answer.trim().toLowerCase();
      } else if (typeof data === 'string') {
        predictedWord = data.trim().toLowerCase();
      } else if (data.answer) {
        predictedWord = data.answer.trim().toLowerCase();
      }

      // Remove punctuation that the model might add (like "apple." or "apple!")
      predictedWord = predictedWord.replace(/[.,!?]$/g, '');

      console.log('[VLM] Predicted:', predictedWord);

      // Try fuzzy-matching: see if the predicted word is contained in or contains an active word
      // This handles cases where the model says "an apple" and the word is "apple"
      let matchedWord = predictedWord;
      for (const w of activeWords) {
        if (predictedWord.includes(w.toLowerCase()) || w.toLowerCase().includes(predictedWord)) {
          matchedWord = w.toLowerCase();
          break;
        }
      }

      if (callback) callback({ topLabels: [matchedWord] });

    } catch (err) {
      console.error('[VLM] Fetch exception:', err);
      if (callback) callback({ error: err.toString() });
    }
  }
}
