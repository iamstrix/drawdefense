# draw defense 🎨 🛡️

**draw defense** is a fast-paced, VLM-powered arcade game where your sketches are your shield. Defend your base by drawing symbols that match incoming word-entities, neutralized by a cutting-edge Vision Language Model (VLM) for real-time recognition.

<img width="309" height="312" alt="cat" src="https://github.com/user-attachments/assets/e564b96f-c0b1-49f9-bd09-8d185d468857" />


## 🌟 Key Features

- **Semantic Defense**: No rigid gesture patterns—the game uses **Groq-powered Llama 4 Scout** to understand your sketches, whether crude or detailed.
- **Dynamic VFX**: High-octane square particle explosions with grayscale fallout and fading entity effects.
- **Duo-Game Modes**: 
    - **Story Mode**: Progress through stages with increasing vocabulary complexity and spawning intensity.
    - **Endless Mode**: Test your speed as the interval drops and the vocabulary expands into chaos.
- **Galaxy Theme**: Toggle between a clean minimalist look and a high-contrast dark space aesthetic with glowing cyan trails.
- **AI-Enhanced UI**: Features like **Click-Clear** for developers to test physics and **VLM-Response Measurements** for performance monitoring.

---

## 🛠️ Tech Stack

- **Framework**: [Vite](https://vitejs.dev/)
- **Core**: Vanilla JavaScript (ES6+), HTML5 Canvas
- **Logic**: Delta-time based game loop (60FPS optimization)
- **AI Backend**: [Groq API](https://groq.com/) (Llama-4-Scout)
- **Styling**: Vanilla CSS (CSS Variables)

---

## 🚀 Installation & Setup

### 1. Clone & Install
```bash
git clone https://github.com/iamstrix/drawdefense.git
cd drawdefense
npm install
```

### 2. API Key Configuration 🔑
This game requires a Vision AI key from **Groq** to perform real-time image classification.

1.  Create a file named `.env` in the root directory.
2.  Get your API key from the [Groq Console](https://console.groq.com/keys).
3.  Add it to the file like this:
    ```env
    VITE_GROQ_API_KEY=your_gsk_key_here
    ```
    *(Note: The game securely routes through a Vite proxy `/api/groq` to inject these headers.)*

### 3. Run Locally
```bash
npm run dev
```
Open `http://localhost:5173` to start playing.

---

## 🎮 How to Play

1.  **Incoming Enemies**: Enemies will spawn from the perimeter of the screen, each carrying a word above its head.
2.  **Cast your Sketch**: Draw the object represented by that word on the **right-hand drawing board**.
3.  **Wait for Analysis**: The VLM will analyze your drawing. If it matches an active enemy, they will be eliminated in a particle explosion.
4.  **Manage Health**: If an enemy reaches the central Cat Base, you lose health. Clear the stage by destroying all target words!

### Pro-Tips:
- **Pencil Ready**: The AI analyzes your sketch ~800ms after you finish a stroke (Pointer Up).
- **Galaxy Mode**: Toggle the theme in the top corner to reduce eye strain and change the "glow" of your brush.
- **Speed Matters**: In later stages, prioritize enemies closer to the center regardless of word length.

---

## 🧪 Developer Debugging

- **Auto-Clear**: Available in Story Mode to jump stages and test UI transitions.
- **Click-Clear**: Toggle this on via the button in the bottom-left to clear enemies by clicking them—perfect for testing explosion physics and particle range without drawing.

---

## 📜 License

MIT License - feel free to build upon and remix this semantic drawing engine!
