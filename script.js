document.addEventListener('DOMContentLoaded', () => {
    const pads = document.querySelectorAll('.color-pad');
    const startButton = document.getElementById('start-button');
    const levelDisplay = document.getElementById('current-level');
    const highScoreDisplay = document.getElementById('high-score');
    const messageArea = document.getElementById('message');

    const colors = ['green', 'red', 'yellow', 'blue'];
    const sequence = [];
    let playerSequence = [];
    let level = 0;
    let highScore = localStorage.getItem('chromaRecallHighScore') || 0;
    let gameInProgress = false;
    let playerTurn = false;
    let sequenceSpeed = 800; // Initial speed (milliseconds)

    // --- Core Game Logic ---

    function startGame() {
        console.log("Starting game...");
        level = 0;
        sequence.length = 0; // Clear the sequence array
        playerSequence.length = 0; // Clear player sequence
        messageArea.textContent = '';
        messageArea.classList.remove('error');
        startButton.disabled = true; // Disable start button during game
        startButton.textContent = 'Watch Carefully!';
        gameInProgress = true;
        playerTurn = false;
        disablePads(); // Disable pads initially
        updateLevelDisplay();
        updateHighScoreDisplay(); // Ensure high score is shown at start
        setTimeout(nextLevel, 1000); // Start first level after a short delay
    }

    function nextLevel() {
        console.log("Next level:", level + 1);
        playerSequence = []; // Reset player input for the new level
        playerTurn = false;
        disablePads();
        level++;
        updateLevelDisplay();
        messageArea.textContent = `Level ${level}`;
        messageArea.classList.remove('error');
        startButton.textContent = 'Watch Carefully!';


        // Add a new random color to the sequence
        const randomColorIndex = Math.floor(Math.random() * colors.length);
        sequence.push(colors[randomColorIndex]);
        console.log("Current Sequence:", sequence);

        // Adjust speed slightly (optional, makes it harder)
        if (level > 5 && sequenceSpeed > 400) {
            sequenceSpeed -= 50; // Decrease delay, making it faster
        } else if (level > 10 && sequenceSpeed > 250) {
             sequenceSpeed -= 30;
        }

        // Play the sequence visually
        playSequence();
    }

    function playSequence() {
        console.log("Playing sequence...");
        let i = 0;
        const intervalId = setInterval(() => {
            if (i < sequence.length) {
                flashPad(sequence[i]);
                i++;
            } else {
                clearInterval(intervalId);
                console.log("Sequence finished playing.");
                // Allow player input after sequence finishes
                startPlayerTurn();
            }
        }, sequenceSpeed); // Use dynamic speed
    }

    function flashPad(color) {
        console.log("Flashing:", color);
        const pad = document.getElementById(color);
        pad.classList.add('active');
        // Optional: Add sound effect here later if desired
        // playSound(color);
        setTimeout(() => {
            pad.classList.remove('active');
        }, sequenceSpeed * 0.6); // Light duration is shorter than interval
    }

    function startPlayerTurn() {
        console.log("Player's turn.");
        playerTurn = true;
        enablePads();
        messageArea.textContent = 'Your Turn!';
        startButton.textContent = 'Repeat the Sequence'; // Less distracting text
    }

    function handlePlayerInput(event) {
        if (!playerTurn || !gameInProgress) {
            console.log("Ignoring click: Not player's turn or game not in progress.");
            return;
        }

        const clickedColor = event.target.id;
        console.log("Player clicked:", clickedColor);

        // Provide immediate visual feedback
        flashPad(clickedColor); // Reuse flash for feedback

        playerSequence.push(clickedColor);

        // Check if the clicked color is correct for the current step
        const currentStepIndex = playerSequence.length - 1;
        if (playerSequence[currentStepIndex] !== sequence[currentStepIndex]) {
            gameOver("Wrong sequence!");
            return;
        }

        // Check if the player has completed the sequence for this level
        if (playerSequence.length === sequence.length) {
            console.log("Level complete!");
            playerTurn = false; // Temporarily disable pads between levels
            disablePads();
            messageArea.textContent = 'Correct!';
             // Add a slight delay before starting the next level's sequence
            setTimeout(nextLevel, 1000);
        }
         // Otherwise, wait for the next player input in the sequence
    }

    function gameOver(reason) {
        console.log("Game Over:", reason);
        gameInProgress = false;
        playerTurn = false;
        disablePads();
        messageArea.textContent = `Game Over! ${reason} You reached level ${level}.`;
        messageArea.classList.add('error');
        startButton.disabled = false;
        startButton.textContent = 'Play Again?';
        sequenceSpeed = 800; // Reset speed for next game

        // Update High Score if needed
        // The score is the last completed level, which is level - 1
        const finalScore = level > 0 ? level -1 : 0;
        if (finalScore > highScore) {
            highScore = finalScore;
            localStorage.setItem('chromaRecallHighScore', highScore);
            updateHighScoreDisplay();
             messageArea.textContent = `Game Over! New High Score: ${highScore}!`;
        } else {
             messageArea.textContent = `Game Over! Score: ${finalScore}. Try again!`;
        }

        // Reset level display to 0 for clarity before next game
        level = 0;
        updateLevelDisplay();
    }

    // --- Helper Functions ---

    function updateLevelDisplay() {
        levelDisplay.textContent = level;
    }

    function updateHighScoreDisplay() {
        highScoreDisplay.textContent = highScore;
    }

    function disablePads() {
        pads.forEach(pad => pad.classList.add('disabled'));
    }

    function enablePads() {
         pads.forEach(pad => pad.classList.remove('disabled'));
    }

    // --- Event Listeners ---

    startButton.addEventListener('click', startGame);

    pads.forEach(pad => {
        pad.addEventListener('click', handlePlayerInput);
        // Add touchstart for better mobile responsiveness (optional, handles quick taps)
        // pad.addEventListener('touchstart', (e) => {
        //     if (playerTurn && gameInProgress) {
        //         e.preventDefault(); // Prevent potential double event (click)
        //         handlePlayerInput(e);
        //     }
        // }, { passive: false });
    });

    // --- Initial Setup ---
    updateHighScoreDisplay(); // Load high score on page load
    disablePads(); // Pads should be disabled initially

}); // End DOMContentLoaded