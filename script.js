// Add debugging
console.log("Game initializing... (Debug version)");

// Game state
let player1Letters = [];
let player2Letters = [];
let currentPlayer = 1; // Track current player
let scores = [0, 0]; // Player 1 and 2 scores
let placedLetters = []; // Track which letters were placed and where
let predefinedWords; // Changed from const to let so it can be reassigned

// Debug functions
function debugLog(message) {
  console.log(`[DEBUG] ${message}`);
}

function toggleSolutions() {
  debugLog("Toggling solution visibility");
  const cells = document.querySelectorAll('.cell');
  
  // Count how many cells have solutions
  let solutionCount = 0;
  
  cells.forEach(cell => {
    const solution = cell.dataset.solution;
    if (solution) {
      solutionCount++;
      // If cell already shows solution, hide it
      if (cell.querySelector('.debug-solution')) {
        const solutionDiv = cell.querySelector('.debug-solution');
        cell.removeChild(solutionDiv);
      } else {
        // Otherwise show the solution
        const solutionDiv = document.createElement('div');
        solutionDiv.className = 'debug-solution';
        solutionDiv.style.position = 'absolute';
        solutionDiv.style.top = '50%';
        solutionDiv.style.left = '50%';
        solutionDiv.style.transform = 'translate(-50%, -50%)';
        solutionDiv.style.color = 'red';
        solutionDiv.style.fontWeight = 'bold';
        solutionDiv.style.fontSize = '16px';
        solutionDiv.style.zIndex = '10';
        solutionDiv.innerText = solution;
        cell.appendChild(solutionDiv);
      }
    }
  });
  
  debugLog(`Found ${solutionCount} cells with solutions`);
  
  // Check if we have complete words
  const horizontalWords = new Set();
  const verticalWords = new Set();
  
  cells.forEach(cell => {
    if (cell.dataset.horizontalWord) {
      horizontalWords.add(cell.dataset.horizontalWord);
    }
    if (cell.dataset.verticalWord) {
      verticalWords.add(cell.dataset.verticalWord);
    }
  });
  
  debugLog(`Found ${horizontalWords.size} horizontal words and ${verticalWords.size} vertical words`);
}

// Helper function to get current player's letters
function getCurrentPlayerLetters() {
  return currentPlayer === 1 ? player1Letters : player2Letters;
}

// Helper function to set current player's letters
function setCurrentPlayerLetters(letters) {
  if (currentPlayer === 1) {
    player1Letters = letters;
  } else {
    player2Letters = letters;
  }
}

function randomLetters() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ";
  let letters = [];
  for (let i = 0; i < 5; i++) {
    letters.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
  }
  return letters;
}

// Add drag and drop functionality
let draggedLetter = "";
let draggedLetterIndex = -1;

function drawGrid() {
  debugLog("Drawing grid");
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  
  // Create a 9x9 grid
  const cells = [];
  
  // Create all cells in the 9x9 grid
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const index = row * 9 + col;
      
      // Create cell
      const div = document.createElement('div');
      div.classList.add('cell');
      div.contentEditable = false; // Disable direct editing
      div.dataset.index = index;
      div.dataset.row = row;
      div.dataset.col = col;
      
      // Skip cells in the last row and last column (they're just spacers)
      if (row === 8 || col === 8) {
        div.style.border = "none";
        div.style.backgroundColor = "transparent";
        grid.appendChild(div);
        cells.push(div);
        continue;
      }
      
      // Add drag and drop event listeners
      div.addEventListener('dragover', (e) => {
        e.preventDefault(); // Allow drop
        debugLog(`Dragover on cell ${index}`);
      });
      
      div.addEventListener('drop', (e) => {
        e.preventDefault();
        debugLog(`Drop on cell ${index}: letter ${draggedLetter}`);
        if (draggedLetter) {
          // Clear existing letter if any
          const existingLetter = div.querySelector('.cell-letter');
          if (existingLetter) {
            div.removeChild(existingLetter);
          }
          
          // Create a new span for the letter
          const letterSpan = document.createElement('span');
          letterSpan.className = 'cell-letter';
          letterSpan.innerText = draggedLetter;
          div.appendChild(letterSpan);
          
          // Track this placement for validation
          placedLetters.push({
            letter: draggedLetter,
            cellIndex: index,
            letterIndex: draggedLetterIndex
          });
          
          // Mark this letter as used in the UI
          const letterElement = document.querySelector(`.letter[data-index="${draggedLetterIndex}"]`);
          if (letterElement) {
            letterElement.style.opacity = "0.5";
            letterElement.setAttribute('draggable', 'false');
            letterElement.style.cursor = 'default';
          }
          
          // Actually remove the letter from player's hand
          const currentLetters = getCurrentPlayerLetters();
          debugLog(`Before removal: ${JSON.stringify(currentLetters)}`);
          if (draggedLetterIndex >= 0 && draggedLetterIndex < currentLetters.length) {
            currentLetters.splice(draggedLetterIndex, 1);
            debugLog(`After removal: ${JSON.stringify(currentLetters)}`);
            setCurrentPlayerLetters(currentLetters);
          }
          
          // Reset drag state
          draggedLetter = "";
          draggedLetterIndex = -1;
        }
      });
      
      grid.appendChild(div);
      cells.push(div);
    }
  }
  
  // Process all predefined words and add them to the grid
  predefinedWords.forEach(({ word, start, direction, hint }) => {
    debugLog(`Processing word: ${word}, start: ${start}, direction: ${direction}`);
    
    // Handle origin point (0,0)
    if (direction === "origin") {
      if (cells[start]) {
        cells[start].style.backgroundColor = "#f0f0f0";
        cells[start].style.border = "2px solid #666";
        cells[start].innerText = word; // "0"
        debugLog(`Set origin at cell ${start}`);
      }
      return;
    }
    
    // Handle X-axis hint cells (top row)
    if (direction === "hint-x") {
      if (cells[start]) {
        cells[start].style.backgroundColor = "#e6f7ff"; // Light blue for hints
        cells[start].style.border = "1px solid #0099cc";
        
        const hintDiv = document.createElement("div");
        hintDiv.className = "hint";
        
        // Add hint text (shortened if needed)
        const shortHint = word.length > 8 ? word.substring(0, 6) + "..." : word;
        hintDiv.innerText = shortHint;
        
        // Add direction arrow
        const arrowSpan = document.createElement("span");
        arrowSpan.className = "direction-arrow";
        arrowSpan.innerText = "↓"; // Down arrow for vertical words
        hintDiv.appendChild(arrowSpan);
        
        cells[start].insertBefore(hintDiv, cells[start].firstChild);
        debugLog(`X-axis hint "${word}" is in column ${start}`);
      }
      return;
    }
    
    // Handle Y-axis hint cells (left column)
    if (direction === "hint-y") {
      if (cells[start]) {
        cells[start].style.backgroundColor = "#e6f7ff"; // Light blue for hints
        cells[start].style.border = "1px solid #0099cc";
        
        const hintDiv = document.createElement("div");
        hintDiv.className = "hint";
        
        // Add hint text (shortened if needed)
        const shortHint = word.length > 8 ? word.substring(0, 6) + "..." : word;
        hintDiv.innerText = shortHint;
        
        // Add direction arrow
        const arrowSpan = document.createElement("span");
        arrowSpan.className = "direction-arrow";
        arrowSpan.innerText = "→"; // Right arrow for horizontal words
        hintDiv.appendChild(arrowSpan);
        
        cells[start].insertBefore(hintDiv, cells[start].firstChild);
        debugLog(`Y-axis hint "${word}" is in row ${Math.floor(start / 7)}`);
      }
      return;
    }
    
    // Get the actual word text for length calculation
    const wordText = typeof word === 'string' ? word : (word.word || '');
    // Use the full word length instead of truncating to 5 characters
    const displayLength = wordText.length;
    
    // Handle regular word cells
    for (let i = 0; i < displayLength; i++) {
      let index = direction === "horizontal" ? start + i : start + i * 9;
      if (cells[index]) {
        // Calculate row and col based on the 9x9 grid structure
        const row = Math.floor(index / 9);
        const col = index % 9;
        
        debugLog(`Word: ${word.word}, Letter ${i}, Index: ${index}, Row: ${row}, Col: ${col}`);
        
        // Use the letter from our predefined grid
        if (predefinedWords.gridLetters && predefinedWords.gridLetters[row] && predefinedWords.gridLetters[row][col]) {
          cells[index].dataset.solution = predefinedWords.gridLetters[row][col];
          debugLog(`Cell ${index} (row ${row}, col ${col}) has solution ${predefinedWords.gridLetters[row][col]}`);
        } else {
          debugLog(`No solution found for cell ${index} (row ${row}, col ${col})`);
        }
        
        // Mark this cell as part of this word
        if (direction === "horizontal") {
          // Make sure we're using the correct property
          const wordText = typeof word === 'string' ? word : (word.word || '');
          if (wordText) {
            cells[index].dataset.horizontalWord = wordText;
            cells[index].dataset.horizontalIndex = i;
            debugLog(`Cell ${index} is part of horizontal word "${wordText}" at index ${i}`);
            
            // Add word boundary indicator if this is the last letter of the word
            // Check if this is the last letter based on the display length
            const isLastLetter = (i === displayLength - 1);
            if (isLastLetter) {
              cells[index].classList.add('word-end-right');
              debugLog(`Added right boundary to cell ${index} (end of horizontal word "${wordText}")`);
            }
          }
        } else {
          // Make sure we're using the correct property
          const wordText = typeof word === 'string' ? word : (word.word || '');
          if (wordText) {
            cells[index].dataset.verticalWord = wordText;
            cells[index].dataset.verticalIndex = i;
            debugLog(`Cell ${index} is part of vertical word "${wordText}" at index ${i}`);
            
            // Add word boundary indicator if this is the last letter of the word
            // Check if this is the last letter based on the display length
            const isLastLetter = (i === displayLength - 1);
            if (isLastLetter) {
              cells[index].classList.add('word-end-bottom');
              debugLog(`Added bottom boundary to cell ${index} (end of vertical word "${wordText}")`);
            }
          }
        }
      }
    }
  });
}

function drawLetters() {
  const currentLetters = getCurrentPlayerLetters();
  debugLog(`Drawing letters for Player ${currentPlayer}: ${JSON.stringify(currentLetters)}`);
  
  const lettersContainer = document.getElementById(currentPlayer === 1 ? 'letters' : 'letters2');
  lettersContainer.innerHTML = '';
  
  currentLetters.forEach((letter, index) => {
    const span = document.createElement('span');
    span.className = 'letter';
    span.innerText = letter;
    span.draggable = true;
    span.dataset.index = index;
    
    span.addEventListener('dragstart', (e) => {
      draggedLetter = letter;
      draggedLetterIndex = index;
      debugLog(`Drag started: ${letter} (index ${index})`);
    });
    
    lettersContainer.appendChild(span);
  });
}

function submitMove() {
  debugLog("Submitting move");
  
  // Check if any letters were placed
  if (placedLetters.length === 0) {
    document.getElementById('message').innerText = "Keine Buchstaben platziert!";
    return;
  }
  
  // Reset any previous error indicators
  document.querySelectorAll('.incorrect-cell').forEach(cell => {
    cell.classList.remove('incorrect-cell');
  });
  
  // Validate the move
  let isValid = true;
  let score = 0;
  const completedWords = new Set();
  
  // Check each placed letter
  placedLetters.forEach(({ letter, cellIndex }) => {
    const cell = document.querySelector(`.cell[data-index="${cellIndex}"]`);
    if (cell) {
      const solution = cell.dataset.solution;
      if (solution && letter !== solution) {
        // Incorrect letter
        isValid = false;
        cell.classList.add('incorrect-cell');
      } else if (solution) {
        // Correct letter
        // Check if this completes a word
        const horizontalWord = cell.dataset.horizontalWord;
        const verticalWord = cell.dataset.verticalWord;
        
        if (horizontalWord && !completedWords.has(horizontalWord)) {
          // Check if the horizontal word is complete
          const wordCells = document.querySelectorAll(`.cell[data-horizontal-word="${horizontalWord}"]`);
          let isWordComplete = true;
          wordCells.forEach(wordCell => {
            if (!wordCell.querySelector('.cell-letter')) {
              isWordComplete = false;
            }
          });
          
          if (isWordComplete) {
            completedWords.add(horizontalWord);
            score += horizontalWord.length;
          }
        }
        
        if (verticalWord && !completedWords.has(verticalWord)) {
          // Check if the vertical word is complete
          const wordCells = document.querySelectorAll(`.cell[data-vertical-word="${verticalWord}"]`);
          let isWordComplete = true;
          wordCells.forEach(wordCell => {
            if (!wordCell.querySelector('.cell-letter')) {
              isWordComplete = false;
            }
          });
          
          if (isWordComplete) {
            completedWords.add(verticalWord);
            score += verticalWord.length;
          }
        }
      }
    }
  });
  
  if (!isValid) {
    document.getElementById('message').innerText = "Falsche Buchstaben! Versuche es erneut.";
    
    // Get all incorrect cells
    const incorrectCells = document.querySelectorAll('.incorrect-cell');
    
    // After 3 seconds, remove the incorrect-cell class and clear the letters
    setTimeout(() => {
      incorrectCells.forEach(cell => {
        // Remove the incorrect-cell class
        cell.classList.remove('incorrect-cell');
        
        // Remove the letter from the cell
        const letterElement = cell.querySelector('.cell-letter');
        if (letterElement) {
          cell.removeChild(letterElement);
        }
        
        // Find this cell in placedLetters and remove it
        const cellIndex = parseInt(cell.dataset.index);
        placedLetters = placedLetters.filter(item => item.cellIndex !== cellIndex);
      });
      
      document.getElementById('message').innerText = "Spieler " + currentPlayer + " ist am Zug.";
    }, 3000);
    
    return;
  }
  
  // Update score
  scores[currentPlayer - 1] += score;
  document.getElementById(`score${currentPlayer}`).innerText = scores[currentPlayer - 1];
  
  // Switch player
  document.getElementById(`player${currentPlayer}`).classList.remove('active-player');
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  document.getElementById(`player${currentPlayer}`).classList.add('active-player');
  
  // Reset placed letters
  placedLetters = [];
  
  // Give new letters to the current player
  if (getCurrentPlayerLetters().length === 0) {
    setCurrentPlayerLetters(randomLetters());
  }
  
  // Update the UI
  drawLetters();
  
  // Show message
  document.getElementById('message').innerText = `Spieler ${currentPlayer} beginnt. Ziehe Buchstaben in das Rätsel!`;
}

// Initialize the game
async function initGame() {
  try {
    player1Letters = randomLetters();
    player2Letters = randomLetters();
    
    // Create the crossword puzzle
    // Skip API-based grid generation and always use our fixed grid
    // This ensures we always have valid words in both directions
    debugLog("Using fixed grid with valid words");
    predefinedWords = WordGenerator.createFixedGrid();
    
    drawGrid();
    drawLetters();
    document.getElementById('message').innerText = "Spieler 1 beginnt. Ziehe Buchstaben in das Rätsel!";
  } catch (error) {
    debugLog(`Game initialization error: ${error.message}`);
    // Show error message to user
    document.getElementById('message').innerText = "Fehler beim Laden des Spiels. Bitte Seite neu laden.";
  }
}

// Start the game
initGame().catch(error => {
  console.error("Failed to initialize game:", error);
  document.getElementById('message').innerText = "Fehler beim Laden des Spiels. Bitte Seite neu laden.";
});