export class SketchRecognizer {
  constructor(onReady) {
    this.classifier = null;
    this.isReady = false;
    
    console.log('[Telemetry] SketchRecognizer constructor called');
    // Check if ml5 is loaded
    if (window.ml5) {
      console.log('[Telemetry] ml5 found immediately');
      this.init(onReady);
    } else {
      console.log('[Telemetry] Waiting for ml5 to load via window load event');
      // If ml5 is not immediately ready, wait for it
      window.addEventListener('load', () => {
        console.log('[Telemetry] Window loaded, checking for ml5...');
        if (window.ml5) this.init(onReady);
      });
    }
  }

  async init(onReady) {
    console.log('[Telemetry] Initializing DoodleNet model...');
    document.getElementById('predictionOutput').innerText = 'Loading ML Model...';
    // Load DoodleNet using async/await pattern handling ml5.js Promise structures
    try {
      this.classifier = await window.ml5.imageClassifier('DoodleNet');
      console.log('[Telemetry] DoodleNet model loaded successfully.', Object.keys(this.classifier || {}));
      this.isReady = true;
      document.getElementById('predictionOutput').innerText = 'Pencil ready...';
      if (onReady) onReady();
    } catch(err) {
      console.error('[Telemetry] Error during initialization:', err);
      document.getElementById('predictionOutput').innerText = 'Error loading model';
    }
  }

  classify(canvas, callback) {
    console.log('[Telemetry] Classify requested...');
    if (!this.isReady) {
      console.log('[Telemetry] Model not ready yet');
      return;
    }
    
    try {
      // In newer ml5 or some versions, the callback might just be (results) or it uses promises
      const result = this.classifier.classify(canvas, (arg1, arg2) => {
        console.log('[Telemetry] Classify callback fired', arg1, arg2);
        
        let error, results;
        // Handle varying callback signatures between ml5 versions
        if (arg1 instanceof Error || (arg1 && arg1.message)) {
          error = arg1; results = arg2;
        } else if (arg2 instanceof Error || (arg2 && arg2.message)) {
          error = arg2; results = arg1;
        } else if (Array.isArray(arg1) && arg1.length > 0 && arg1[0].label) {
          results = arg1; error = arg2;
        } else if (Array.isArray(arg2) && arg2.length > 0 && arg2[0].label) {
          results = arg2; error = arg1;
        }

        if (error) {
          console.error('[Telemetry] Classify error:', error);
          document.getElementById('predictionOutput').innerText = 'Error classifying';
          return;
        }

        if (results && results.length > 0) {
          console.log('[Telemetry] Valid results produced', results);
          if (callback) callback(results.slice(0, 3));
        } else {
          console.log('[Telemetry] Unexpected result format');
        }
      });
      
      // If it returned a Promise and didn't fire callback instantly:
      if (result && result.then) {
        console.log('[Telemetry] Classify returned a Promise');
        result.then(results => {
           console.log('[Telemetry] Classify Promise resolved', results);
           if (callback && Array.isArray(results)) callback(results.slice(0, 3));
        }).catch(err => {
           console.error('[Telemetry] Classify Promise rejected', err);
        });
      }
    } catch(err) {
      console.error('[Telemetry] Exception during classify call:', err);
    }
  }
}
