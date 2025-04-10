document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const pads = document.querySelectorAll(".color-pad");
  const startButton = document.getElementById("start-button");
  const resetGameButton = document.getElementById("reset-game-button"); // New Button
  const levelDisplay = document.getElementById("current-level");
  const highScoreDisplay = document.getElementById("high-score");
  const messageArea = document.getElementById("message");
  const gameContainer = document.querySelector(".game-container"); // Used for class toggle
  const body = document.body;

  // Settings Modal Elements
  const settingsButton = document.getElementById("settings-button");
  const settingsModal = document.getElementById("settings-modal");
  const settingsInfo = document.getElementById("settings-info"); // Info message area
  const gameModeSelect = document.getElementById("game-mode");
  const difficultySelect = document.getElementById("difficulty");
  const themeSelect = document.getElementById("theme-select");
  const soundToggleButton = document.getElementById("sound-toggle");
  const soundStatus = document.getElementById("sound-status");
  const statsGamesPlayed = document.getElementById("stats-games-played");
  const statsAvgScore = document.getElementById("stats-avg-score");
  const resetStatsButton = document.getElementById("reset-stats-button");
  const settingsApplyButton = document.getElementById("settings-apply-button"); // New
  const settingsCancelButton = document.getElementById(
    "settings-cancel-button"
  ); // New
  const modeDisplay = document.getElementById("game-mode-display");

  // --- Game Constants ---
  const colors = ["green", "red", "yellow", "blue"];
  const DIFFICULTIES = {
    easy: { startSpeed: 800, speedDecrement: 30, levelThreshold: 6 },
    medium: { startSpeed: 650, speedDecrement: 40, levelThreshold: 5 },
    hard: { startSpeed: 500, speedDecrement: 50, levelThreshold: 4 },
  };
  const DEFAULT_SETTINGS = {
    // Store defaults for easy reset/comparison
    mode: "classic",
    difficulty: "medium",
    soundEnabled: true,
    theme: "default",
    stats: { gamesPlayed: 0, totalScore: 0, highScores: {} },
  };

  // --- Game State ---
  let sequence = [];
  let playerSequence = [];
  let level = 0;
  let gameInProgress = false;
  let playerTurn = false;
  let currentSpeed = 800;
  let settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); // Deep copy defaults initially
  let pendingSettings = {}; // Store changes made in modal before applying
  let sequenceTimeoutId = null; // Store timeout ID for sequence playback

  // --- Audio Setup ---
  let audioContext;
  const audioBuffers = {};
  const soundFiles = {
    /* (Keep soundFiles as before) */ green: "sounds/click1.wav",
    red: "sounds/click2.wav",
    yellow: "sounds/click3.wav",
    blue: "sounds/click4.wav",
    error: "sounds/error.wav",
    levelup: "sounds/levelup.wav",
  };

  // --- Audio Functions (initAudio, loadSound, loadSounds, playSound, _playSoundInternal) ---
  // (Keep these functions exactly as in the previous version, ensuring error handling and context resuming)
  function initAudio() {
    /* ... same as before ... */
    if (audioContext) return; // Already initialized
    try {
      console.log("Initializing Audio Context...");
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") {
        audioContext
          .resume()
          .then(() => console.log("AudioContext resumed during init."));
      }
      loadSounds();
    } catch (e) {
      console.warn("Web Audio API not supported.");
      settings.soundEnabled = false;
      updateSoundToggleUI();
    }
  }
  async function loadSound(name, url) {
    /* ... same as before ... */
    if (!audioContext || audioBuffers[name]) return;
    try {
      console.log(`Fetching sound: ${name} from ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for ${url}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      console.log(`Decoding sound: ${name}`);
      if (audioContext.decodeAudioData.length === 1) {
        audioBuffers[name] = await audioContext.decodeAudioData(arrayBuffer);
      } else {
        await new Promise((resolve, reject) => {
          audioContext.decodeAudioData(arrayBuffer, resolve, reject);
        }).then((buffer) => {
          audioBuffers[name] = buffer;
        });
      }
      console.log(`Sound loaded successfully: ${name}`);
    } catch (error) {
      console.error(`Error loading sound ${name} from ${url}:`, error);
    }
  }
  async function loadSounds() {
    /* ... same as before ... */
    if (!audioContext) return;
    console.log("Loading all sounds...");
    const loadPromises = Object.entries(soundFiles).map(([name, url]) =>
      loadSound(name, url)
    );
    try {
      await Promise.all(loadPromises);
      console.log("All sounds initiated loading.");
    } catch (error) {
      console.error("Error during sound loading process:", error);
    }
  }
  function playSound(name) {
    /* ... same as before ... */
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().then(() => {
        console.log("AudioContext resumed on play request.");
        _playSoundInternal(name);
      });
    } else {
      _playSoundInternal(name);
    }
  }
  function _playSoundInternal(name) {
    /* ... same as before ... */
    if (!settings.soundEnabled || !audioContext || !audioBuffers[name]) {
      return;
    }
    try {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffers[name];
      source.connect(audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error(`Error playing sound ${name}:`, error);
    }
  }

  // --- Settings and LocalStorage ---

  function saveSettings() {
    try {
      localStorage.setItem("chromaRecallSettings", JSON.stringify(settings));
      console.log("Settings saved:", settings);
    } catch (e) {
      console.error("Could not save settings to localStorage:", e);
    }
  }

  function loadSettings() {
    const savedSettings = localStorage.getItem("chromaRecallSettings");
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        // Deep merge loaded settings with defaults to ensure all keys/structure exist
        settings = mergeDeep(
          JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
          parsedSettings
        );
        console.log("Settings loaded:", settings);
      } catch (e) {
        console.error(
          "Could not parse settings from localStorage, using defaults:",
          e
        );
        settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); // Fallback to defaults on error
        saveSettings(); // Save the defaults if loading failed
      }
    } else {
      console.log("No saved settings found, using defaults.");
      settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); // Use defaults if nothing saved
      // Optionally save defaults on first load: saveSettings();
    }
    applySettings(); // Apply loaded/default settings to the UI
  }

  // Helper for deep merging settings objects
  function isObject(item) {
    return item && typeof item === "object" && !Array.isArray(item);
  }
  function mergeDeep(target, ...sources) {
    sources.forEach((source) => {
      Object.keys(source).forEach((key) => {
        const targetValue = target[key];
        const sourceValue = source[key];
        if (isObject(targetValue) && isObject(sourceValue)) {
          mergeDeep(targetValue, sourceValue);
        } else {
          target[key] = sourceValue;
        }
      });
    });
    return target;
  }

  function applySettings(applyLive = true) {
    // Apply theme (always live)
    body.dataset.theme = settings.theme;
    if (applyLive) themeSelect.value = settings.theme;

    // Apply sound setting (always live)
    if (applyLive) updateSoundToggleUI();
    if (settings.soundEnabled && !audioContext) {
      initAudio();
    }

    // Apply mode and difficulty (only affects UI display & next game)
    if (applyLive) {
      gameModeSelect.value = settings.mode;
      difficultySelect.value = settings.difficulty;
    }
    updateModeDisplay(); // Update header text
    updateHighScoreDisplay(); // Update based on current settings

    // Apply stats (always live)
    if (applyLive) updateStatsDisplay();
  }

  function updateSoundToggleUI() {
    const isEnabled = pendingSettings.soundEnabled ?? settings.soundEnabled; // Use pending if exists
    soundToggleButton.setAttribute("aria-pressed", isEnabled);
    soundStatus.textContent = isEnabled ? "On" : "Off";
  }

  function updateModeDisplay() {
    let modeText =
      settings.mode.charAt(0).toUpperCase() + settings.mode.slice(1);
    if (settings.mode === "speed") modeText = "Speed Frenzy";
    let difficultyText =
      settings.difficulty.charAt(0).toUpperCase() +
      settings.difficulty.slice(1);
    modeDisplay.textContent = `${modeText} Mode (${difficultyText})`;
  }

  function updateHighScoreDisplay() {
    const key = `${settings.mode}_${settings.difficulty}`;
    const highScore = settings.stats.highScores[key] || 0;
    highScoreDisplay.textContent = highScore;
  }

  function updateStatsDisplay() {
    statsGamesPlayed.textContent = settings.stats.gamesPlayed || 0;
    const totalScore = settings.stats.totalScore || 0;
    const gamesPlayed = settings.stats.gamesPlayed || 0;
    const avg = gamesPlayed > 0 ? (totalScore / gamesPlayed).toFixed(1) : "0.0";
    statsAvgScore.textContent = avg;
  }

  function resetStats() {
    if (
      confirm(
        "Are you sure you want to reset all statistics and high scores? This cannot be undone."
      )
    ) {
      settings.stats = { gamesPlayed: 0, totalScore: 0, highScores: {} };
      saveSettings();
      updateStatsDisplay();
      updateHighScoreDisplay();
      console.log("Stats reset.");
      // Provide feedback in settings modal
      settingsInfo.textContent = "Statistics have been reset.";
      setTimeout(() => {
        settingsInfo.textContent = "";
      }, 3000);
    }
  }

  // --- Settings Modal Logic ---

  function openSettingsModal() {
    console.log("Opening settings modal...");
    // Reset pending settings
    pendingSettings = {};
    // Populate modal inputs with current settings
    gameModeSelect.value = settings.mode;
    difficultySelect.value = settings.difficulty;
    themeSelect.value = settings.theme;
    updateSoundToggleUI(); // Reflects current actual sound setting

    // Disable Mode/Difficulty if game is in progress
    const disableGameSettings = gameInProgress;
    gameModeSelect.disabled = disableGameSettings;
    difficultySelect.disabled = disableGameSettings;

    if (disableGameSettings) {
      settingsInfo.textContent =
        "Mode & Difficulty can't be changed during a game.";
    } else {
      settingsInfo.textContent = ""; // Clear any previous message
    }

    settingsModal.setAttribute("aria-hidden", "false");
  }

  function closeSettingsModal() {
    settingsModal.setAttribute("aria-hidden", "true");
    pendingSettings = {}; // Discard pending changes on close/cancel
    settingsInfo.textContent = ""; // Clear info message
    // Re-enable selects in case they were disabled
    gameModeSelect.disabled = false;
    difficultySelect.disabled = false;
  }

  function applyPendingSettings() {
    console.log("Applying pending settings:", pendingSettings);
    let changesApplied = false;
    let requiresRestart = false;

    // Apply Theme (Live)
    if (
      pendingSettings.theme !== undefined &&
      pendingSettings.theme !== settings.theme
    ) {
      settings.theme = pendingSettings.theme;
      body.dataset.theme = settings.theme; // Apply live
      changesApplied = true;
    }

    // Apply Sound (Live)
    if (
      pendingSettings.soundEnabled !== undefined &&
      pendingSettings.soundEnabled !== settings.soundEnabled
    ) {
      settings.soundEnabled = pendingSettings.soundEnabled;
      updateSoundToggleUI(); // Update button state immediately
      if (settings.soundEnabled && !audioContext) initAudio(); // Init if turning on
      changesApplied = true;
    }

    // Apply Mode (Next Game)
    if (
      pendingSettings.mode !== undefined &&
      pendingSettings.mode !== settings.mode
    ) {
      settings.mode = pendingSettings.mode;
      changesApplied = true;
      requiresRestart = true; // Indicate change affects next game
    }

    // Apply Difficulty (Next Game)
    if (
      pendingSettings.difficulty !== undefined &&
      pendingSettings.difficulty !== settings.difficulty
    ) {
      settings.difficulty = pendingSettings.difficulty;
      changesApplied = true;
      requiresRestart = true; // Indicate change affects next game
    }

    if (changesApplied) {
      saveSettings();
      applySettings(false); // Update non-live parts like mode display, high score
      // Optionally show feedback message
      if (requiresRestart) {
        messageArea.textContent =
          "Mode/Difficulty changes will apply on the next game.";
        messageArea.className = "message-area success"; // Use success style
        // Clear message after a delay if game not running
        setTimeout(() => {
          if (!gameInProgress) messageArea.textContent = "";
        }, 3000);
      }
    }
    closeSettingsModal();
  }

  // --- Core Game Logic ---

  function startGame() {
    console.log(
      `Starting game: Mode=${settings.mode}, Difficulty=${settings.difficulty}`
    );
    if (settings.soundEnabled && !audioContext) initAudio();
    if (audioContext && audioContext.state === "suspended") {
      audioContext
        .resume()
        .then(() => {
          console.log("AudioContext resumed on start click.");
          _continueStartGame();
        })
        .catch((err) => {
          console.error("Failed to resume AC:", err);
          _continueStartGame();
        });
    } else {
      _continueStartGame();
    }
  }

  function _continueStartGame() {
    level = 0;
    sequence.length = 0;
    playerSequence.length = 0;
    messageArea.textContent = "";
    messageArea.className = "message-area";
    startButton.disabled = true; // Start button disabled during game
    startButton.classList.remove("pulse-on-load");
    gameContainer.classList.add("game-in-progress"); // Shows Reset btn, hides Start btn
    gameInProgress = true;
    playerTurn = false;
    disablePads();

    currentSpeed = DIFFICULTIES[settings.difficulty].startSpeed;
    console.log("Initial speed set to:", currentSpeed);

    updateLevelDisplay(false);
    levelDisplay.textContent = "0";
    updateHighScoreDisplay();

    sequenceTimeoutId = setTimeout(nextLevel, 1200); // Start first level after delay
  }

  function nextLevel() {
    if (!gameInProgress) return;

    clearTimeout(sequenceTimeoutId); // Clear any pending timeout

    if (level === 0) {
      settings.stats.gamesPlayed++;
      saveSettings();
      updateStatsDisplay();
    }

    console.log("Next level:", level + 1);
    playerSequence = [];
    playerTurn = false;
    disablePads();
    level++;
    updateLevelDisplay(true);
    messageArea.textContent = `Level ${level}`;
    messageArea.classList.remove("error", "success");
    // startButton.textContent = 'Watch Carefully'; // Button is hidden now

    const randomColorIndex = Math.floor(Math.random() * colors.length);
    sequence.push(colors[randomColorIndex]);
    console.log("Current Sequence:", sequence.join(", "));

    const { speedDecrement, levelThreshold } =
      DIFFICULTIES[settings.difficulty];
    if (level > 1 && (level - 1) % levelThreshold === 0 && currentSpeed > 250) {
      currentSpeed = Math.max(250, currentSpeed - speedDecrement);
      console.log(
        `Speed increased to: ${currentSpeed}ms after level ${level - 1}`
      );
    }

    playSequence();
  }

  function playSequence() {
    if (!gameInProgress) return;
    console.log("Playing sequence...");
    let delay = 0;
    let localSequenceTimeoutIds = []; // Store timeouts for this specific playback

    disablePads(); // Ensure pads are disabled during playback

    sequence.forEach((color, index) => {
      let timeoutId = setTimeout(() => {
        if (!gameInProgress) return;
        flashPad(color);
      }, delay);
      localSequenceTimeoutIds.push(timeoutId); // Track this timeout
      delay += currentSpeed;
    });

    // Set timeout for player's turn
    let playerTurnTimeoutId = setTimeout(() => {
      if (!gameInProgress) return;
      startPlayerTurn();
    }, delay + currentSpeed * 0.2);
    localSequenceTimeoutIds.push(playerTurnTimeoutId); // Track this too

    // Store the array of IDs globally to potentially clear them on reset/game over
    sequenceTimeoutId = localSequenceTimeoutIds;
  }

  function flashPad(color) {
    const pad = document.getElementById(color);
    if (!pad) return;

    pad.classList.add("active");
    playSound(color);

    setTimeout(() => {
      if (pad) pad.classList.remove("active");
    }, currentSpeed * 0.6);
  }

  function startPlayerTurn() {
    if (!gameInProgress) return;
    console.log("Player's turn.");
    playerTurn = true;
    enablePads();
    messageArea.textContent =
      settings.mode === "reverse" ? "Repeat in REVERSE!" : "Your Turn!";
  }

  function handlePlayerInput(event) {
    if (
      !playerTurn ||
      !gameInProgress ||
      !event.target.classList.contains("color-pad") ||
      event.target.classList.contains("disabled")
    ) {
      return;
    }
    const clickedColor = event.target.dataset.color;
    if (!clickedColor) return;

    console.log("Player clicked:", clickedColor);
    flashPad(clickedColor);
    playerSequence.push(clickedColor);
    const currentStepIndex = playerSequence.length - 1;

    let correctColor;
    if (settings.mode === "reverse") {
      const reverseIndex = sequence.length - 1 - currentStepIndex;
      correctColor = sequence[reverseIndex];
    } else {
      correctColor = sequence[currentStepIndex];
    }

    if (clickedColor !== correctColor) {
      gameOver(`Wrong pad!`); // Simplified message
      playSound("error");
      return;
    }

    if (playerSequence.length === sequence.length) {
      console.log("Level complete!");
      playSound("levelup");
      playerTurn = false;
      disablePads();
      messageArea.textContent = "Correct!";
      messageArea.classList.add("success");
      // Clear previous sequence timeouts before starting next level
      clearSequenceTimeouts();
      sequenceTimeoutId = setTimeout(nextLevel, 1000);
    }
  }

  function clearSequenceTimeouts() {
    if (Array.isArray(sequenceTimeoutId)) {
      sequenceTimeoutId.forEach((id) => clearTimeout(id));
      console.log("Cleared sequence/player turn timeouts.");
    } else if (sequenceTimeoutId) {
      clearTimeout(sequenceTimeoutId); // Handle single timeout ID case (e.g., initial start)
      console.log("Cleared single timeout.");
    }
    sequenceTimeoutId = null;
  }

  function gameOver(reason) {
    console.log("Game Over:", reason);
    const finalScore = level > 0 ? level - 1 : 0;

    gameInProgress = false; // Stop game logic immediately
    playerTurn = false;
    clearSequenceTimeouts(); // Crucial: Stop any pending flashes or player turn starts
    disablePads(); // Ensure pads stay disabled

    messageArea.textContent = `${reason} Score: ${finalScore}`;
    messageArea.classList.add("error");
    startButton.disabled = false; // Enable start button
    startButton.textContent = "Play Again?";
    startButton.classList.add("pulse-on-load");
    gameContainer.classList.remove("game-in-progress"); // Hides Reset btn, shows Start btn

    // Stats update (only if game wasn't manually reset before level 1 finished)
    if (reason !== "Game Reset" || finalScore > 0) {
      // Don't record score 0 for manual resets
      settings.stats.totalScore += finalScore;

      const key = `${settings.mode}_${settings.difficulty}`;
      const currentHighScore = settings.stats.highScores[key] || 0;
      if (finalScore > currentHighScore) {
        settings.stats.highScores[key] = finalScore;
        console.log(`New high score for ${key}: ${finalScore}`);
        messageArea.textContent = `Game Over! New High Score: ${finalScore}!`;
        updateHighScoreDisplay();
      }
      saveSettings();
      updateStatsDisplay();
    } else {
      messageArea.textContent = `Game Reset!`; // Specific message for manual reset
    }

    level = 0; // Reset level for next game
    // Don't reset levelDisplay text immediately
  }

  // --- Helper Functions ---

  function updateLevelDisplay(bounce = false) {
    /* ... same as before ... */
    levelDisplay.textContent = level;
    if (bounce && level > 0) {
      levelDisplay.classList.remove("bounce");
      void levelDisplay.offsetWidth;
      levelDisplay.classList.add("bounce");
    }
  }
  levelDisplay.addEventListener("animationend", () => {
    levelDisplay.classList.remove("bounce");
  }); // Keep reliable bounce removal

  function disablePads() {
    pads.forEach((pad) => pad.classList.add("disabled"));
  }
  function enablePads() {
    pads.forEach((pad) => pad.classList.remove("disabled"));
  }

  // --- Event Listeners ---

  startButton.addEventListener("click", () => {
    if (!gameInProgress) startGame();
  });
  resetGameButton.addEventListener("click", () => {
    if (gameInProgress) gameOver("Game Reset");
  });

  pads.forEach((pad) => {
    pad.addEventListener("click", handlePlayerInput);
    /* Keep touch feedback as before */ pad.addEventListener(
      "touchstart",
      (e) => {
        if (
          playerTurn &&
          gameInProgress &&
          e.target.classList.contains("color-pad") &&
          !e.target.classList.contains("disabled")
        ) {
          e.target.classList.add("active");
        }
      },
      { passive: true }
    );
    pad.addEventListener("touchend", (e) => {
      if (e.target.classList.contains("color-pad")) {
        setTimeout(() => e.target.classList.remove("active"), 100);
      }
    });
  });

  // Settings Modal Interactions
  settingsButton.addEventListener("click", openSettingsModal);
  settingsCancelButton.addEventListener("click", closeSettingsModal);
  settingsApplyButton.addEventListener("click", applyPendingSettings);
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  }); // Close on backdrop click

  // Settings Input Listeners (Store in pendingSettings)
  gameModeSelect.addEventListener("change", (e) => {
    pendingSettings.mode = e.target.value;
  });
  difficultySelect.addEventListener("change", (e) => {
    pendingSettings.difficulty = e.target.value;
  });
  themeSelect.addEventListener("change", (e) => {
    pendingSettings.theme = e.target.value;
  });
  soundToggleButton.addEventListener("click", () => {
    // Toggle the *pending* state first
    const currentPendingValue =
      pendingSettings.soundEnabled ?? settings.soundEnabled;
    pendingSettings.soundEnabled = !currentPendingValue;
    updateSoundToggleUI();
  });

  // Reset Stats Button Listener
  resetStatsButton.addEventListener("click", resetStats); // No check for gameInProgress needed here

  // --- Initial Setup ---
  console.log("Initializing Chroma Recall Pro...");
  loadSettings();
  disablePads();
});
