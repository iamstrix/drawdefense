export class SettingsManager {
  constructor() {
    this.isMultiStrokeMode = false;
    this.eraseHotkey = 'KeyR';
    this.eraseHotkeyLabel = 'R';
    
    this.loadSettings();
  }

  loadSettings() {
    const saved = localStorage.getItem('drawDefenseSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.isMultiStrokeMode !== undefined) this.isMultiStrokeMode = parsed.isMultiStrokeMode;
        if (parsed.eraseHotkey) this.eraseHotkey = parsed.eraseHotkey;
        if (parsed.eraseHotkeyLabel) this.eraseHotkeyLabel = parsed.eraseHotkeyLabel;
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
  }

  saveSettings() {
    const settings = {
      isMultiStrokeMode: this.isMultiStrokeMode,
      eraseHotkey: this.eraseHotkey,
      eraseHotkeyLabel: this.eraseHotkeyLabel
    };
    localStorage.setItem('drawDefenseSettings', JSON.stringify(settings));
    window.dispatchEvent(new Event('settingsChanged'));
  }

  toggleMultiStroke() {
    this.isMultiStrokeMode = !this.isMultiStrokeMode;
    this.saveSettings();
  }

  setEraseHotkey(code, label) {
    this.eraseHotkey = code;
    this.eraseHotkeyLabel = label;
    this.saveSettings();
  }
}

// Export a singleton instance
export const settings = new SettingsManager();
