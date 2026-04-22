# draw defense 🎨 🛡️

**draw defense** is a fast-paced, VLM-powered arcade game where your sketches are your weapons. Defend your central cat base by drawing objects that match incoming enemies, interpreted by a cutting-edge Vision Language Model (VLM) redundant system.

<img width="309" height="312" alt="cat" src="https://github.com/user-attachments/assets/e564b96f-c0b1-49f9-bd09-8d185d468857" />

## 🌟 Key Features

- **Redundant VLM Intelligence**: Uses a dual-provider system with **Groq (Llama 4 Scout)** as the primary backend and **Hugging Face (Qwen 3 VL)** as an automatic fallback.
- **Custom Mode Setup**: A new sandbox mode where you define the target vocabulary pool via a custom setup GUI, testing the VLM's semantic range with any words you can imagine.
- **Freeze Ability & Cold Enemies**: Collect charges from rare blue-aura "Cold Enemies" to trigger a **10s Time Stasis**. Projectiles fire and hold mid-air during the freeze, leading to a massive synchronized impact.
- **Sketch Projectiles**: Your drawings don't just clear enemies—they become ammo. Matches are fired from the cat base with physical impact logic.
- **Universal Settings Modal**: A centralized hub to configure **Redundant VLM Providers**, **Galaxy Mode**, and custom **Clear Hotkeys**.
- **Interactive Menu Background**: Leave your mark on the main menu—doodles now feature bouncing physics and reflection logic.
- **Cinematic Story Menu**: High-polish stage selection featuring looping enemy and UFO marquees that frame your progress.

---

## 🛠️ Tech Stack

- **Framework**: [Vite](https://vitejs.dev/)
- **Core**: Vanilla JavaScript (ES6+), HTML5 Canvas
- **Logic**: Delta-time based game loop (60FPS optimization)
- **AI Backends**: [Groq API](https://groq.com/) & [Hugging Face Router](https://huggingface.co/)
- **Styling**: Vanilla CSS (CSS Variables) with Backdrop Blur effects

---

## 🚀 Installation & Setup

### 1. Clone & Install
```bash
git clone https://github.com/iamstrix/drawdefense.git
cd drawdefense
npm install
```

### 2. API Key Configuration 🔑
This game leverages dual-provider Vision AI. For the best experience, configure both:

1.  Create a file named `.env` in the root directory.
2.  Add your keys:
    ```env
    VITE_GROQ_API_KEY=your_gsk_key_here
    VITE_HF_API_KEY=your_hf_token_here
    ```
    *Note: The game routes Groq through a secure Vite proxy and Qwen through the HF Router.*

### 3. Run Locally
```bash
npm run dev
```
Open `http://localhost:5173` to start playing.

---

## 🎮 How to Play

1.  **Incoming Enemies**: Enemies will spawn from the perimeter of the screen, each carrying a word above its head.
2.  **Cast your Sketch**: Draw the object represented by that word on the **right-hand drawing board**.
3.  **Fire Projectiles**: Once analyzed, your sketch will be fired as a projectile. The enemy is cleared only upon physical impact.
4.  **Manage Health**: If an enemy reaches the central Cat Base, you lose health. Clear the stage by destroying all target words!

### Pro-Tips:
- **Global Clear**: Use your configured hotkey (default **'C'**) to instantly wipe both the game board and the menu doodles.
- **Priority Target**: If two enemies share a name, the one closest to your base (the oldest spawn) will be targeted first.
- **Manual Override**: Change your preferred VLM provider in the settings modal if you find one model more "forgiving" of your artistic style.

---

## 🧪 Developer Debugging
Access the secret developer command via the **Settings (Gear)** icon:
- **Unlock All**: Instantly unlock all Story Mode stages.
- **Auto-Clear**: Force a stage-win to test UI transitions.
- **Click-Clear (Dev Projectiles)**: Fire special 'dev' text projectiles at enemies by clicking them—useful for testing physics and impact VFX.

---

## 📜 License

MIT License - feel free to build upon and remix this semantic drawing engine!
