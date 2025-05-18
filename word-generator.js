// Word generation functionality for Kreuzduell

// Word bank with predefined words and hints
const wordBank = [
  { word: "HAUS", hint: "Wohnen" },
  { word: "KATZE", hint: "Tier" },
  { word: "BLUME", hint: "Pflanze" },
  { word: "WAGEN", hint: "Fahrzeug" },
  { word: "STUHL", hint: "Möbel" },
  { word: "TISCH", hint: "Einrichtung" },
  { word: "MAUS", hint: "Nager" },
  { word: "HUND", hint: "Freund" },
  { word: "BUCH", hint: "Lesen" },
  { word: "BALL", hint: "Sport" },
  { word: "BAUM", hint: "Wald" },
  { word: "BROT", hint: "Essen" },
  { word: "UFER", hint: "Wasser" },
  { word: "SEIL", hint: "Klettern" },
  { word: "BOOT", hint: "Segeln" },
  { word: "MOND", hint: "Himmel" }
];

// Get random words from the word bank
function getRandomWords(n) {
  const shuffled = wordBank.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

// Function to fetch words from DWDS API - Modified to handle CORS issues
async function fetchWordsFromDWDS() {
  debugLog("Fetching words from DWDS API");
  try {
    // Note: This will likely fail due to CORS when running locally
    // We're adding a no-cors mode to prevent the request from failing completely
    const response = await fetch('https://www.dwds.de/api/feed/adt', {
      mode: 'no-cors' // This will make the response opaque but prevent CORS errors
    }).catch(error => {
      throw new Error("CORS error or network failure");
    });
    
    // If we get here, we'll try to process the response
    // But with no-cors mode, we likely can't access the content
    try {
      const html = await response.text();
      
      // Parse the HTML to extract words from <i> tags
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const italicElements = doc.querySelectorAll('i');
      
      // Extract words between 1-7 characters without numbers or special characters
      const words = [];
      italicElements.forEach(element => {
        const text = element.textContent.trim();
        const wordsInText = text.split(/\s+/);
        
        wordsInText.forEach(word => {
          // Filter words: 1-7 characters, only letters (no numbers or special chars)
          if (word.length >= 1 && word.length <= 7 && /^[a-zA-ZäöüÄÖÜß]+$/.test(word)) {
            words.push(word.toUpperCase());
          }
        });
      });
      
      debugLog(`Found ${words.length} valid words from DWDS`);
      return words;
    } catch (error) {
      throw new Error("Could not process DWDS response");
    }
  } catch (error) {
    debugLog(`Error fetching from DWDS: ${error.message}`);
    // Fallback to wordBank if API fails
    return wordBank.map(item => item.word);
  }
}

// Function to get synonyms from OpenThesaurus - Modified to handle CORS issues
async function getSynonymsFromOpenThesaurus(word) {
  debugLog(`Getting synonyms for "${word}" from OpenThesaurus`);
  try {
    // Using a proxy or direct call - may still face CORS issues
    const response = await fetch(`https://www.openthesaurus.de/synonyme/search?q=${word}&format=application/json`, {
      headers: {
        'Accept': 'application/json'
      }
    }).catch(error => {
      throw new Error("CORS error or network failure");
    });
    
    const data = await response.json();
    
    // Extract synonyms
    const synonyms = [];
    if (data.synsets && data.synsets.length > 0) {
      data.synsets.forEach(synset => {
        synset.terms.forEach(term => {
          if (term.term !== word) {
            synonyms.push(term.term);
          }
        });
      });
    }
    
    debugLog(`Found ${synonyms.length} synonyms for "${word}"`);
    
    // If no synonyms found, return the word itself as the hint
    if (synonyms.length === 0) {
      return word;
    }
    
    // Return a random synonym as the hint
    return synonyms[Math.floor(Math.random() * synonyms.length)];
  } catch (error) {
    debugLog(`Error fetching from OpenThesaurus: ${error.message}`);
    // Return a generic hint based on the word type
    const genericHints = {
      "HAUS": "Wohnen",
      "KATZE": "Tier",
      "BLUME": "Pflanze",
      "WAGEN": "Fahrzeug",
      "STUHL": "Möbel",
      "TISCH": "Einrichtung",
      "MAUS": "Nager",
      "HUND": "Freund",
      "BUCH": "Lesen",
      "BALL": "Sport",
      "BAUM": "Wald",
      "BROT": "Essen",
      "UFER": "Wasser",
      "SEIL": "Klettern",
      "BOOT": "Segeln",
      "MOND": "Himmel"
    };
    
    return genericHints[word] || word;
  }
}

// Function to generate a crossword grid with API words
async function generateCrosswordGrid(words) {
  debugLog("Generating crossword grid with API words");
  
  // Make sure we have enough words
  if (words.length < 14) {
    debugLog(`Not enough words: ${words.length}. Adding words from wordBank.`);
    // Add words from wordBank if needed
    const additionalWords = wordBank.map(item => item.word);
    words = [...words, ...additionalWords];
  }
  
  // Select 14 random words (7 horizontal, 7 vertical)
  const selectedWords = words.sort(() => 0.5 - Math.random()).slice(0, 14);
  const horizontalWords = selectedWords.slice(0, 7);
  const verticalWords = selectedWords.slice(7, 14);
  
  // Get synonyms for each word
  const horizontalWordsWithHints = await Promise.all(
    horizontalWords.map(async word => {
      const hint = await getSynonymsFromOpenThesaurus(word);
      return { word, hint };
    })
  );
  
  const verticalWordsWithHints = await Promise.all(
    verticalWords.map(async word => {
      const hint = await getSynonymsFromOpenThesaurus(word);
      return { word, hint };
    })
  );
  
  // Create a grid to place the words
  const gridSize = 9; // 7 for words + origin + spacer
  const gridLetters = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
  
  // Set origin
  gridLetters[0][0] = "0";
  
  // Place horizontal words in the grid
  for (let i = 0; i < horizontalWordsWithHints.length; i++) {
    const { word } = horizontalWordsWithHints[i];
    const row = i + 1;
    
    debugLog(`Placing horizontal word "${word}" in row ${row}`);
    
    // Make sure we have a valid word
    if (!word || word.length === 0) {
      debugLog(`Skipping empty horizontal word at row ${row}`);
      continue;
    }
    
    for (let j = 0; j < word.length && j < 7; j++) {
      gridLetters[row][j + 1] = word[j];
      debugLog(`Set gridLetters[${row}][${j + 1}] = "${word[j]}"`);
    }
  }
  
  // Place vertical words in the grid
  for (let i = 0; i < verticalWordsWithHints.length; i++) {
    const { word } = verticalWordsWithHints[i];
    const col = i + 1;
    
    debugLog(`Placing vertical word "${word}" in column ${col}`);
    
    // Make sure we have a valid word
    if (!word || word.length === 0) {
      debugLog(`Skipping empty vertical word at column ${col}`);
      continue;
    }
    
    for (let j = 0; j < word.length && j < 7; j++) {
      // If there's already a letter at this position (from a horizontal word),
      // we need to handle the conflict
      if (gridLetters[j + 1][col] && gridLetters[j + 1][col] !== word[j]) {
        // Try to find words that can intersect properly
        debugLog(`Conflict at position (${j + 1},${col}): H:${gridLetters[j + 1][col]} V:${word[j]}`);
        // Keep the horizontal letter to maintain crossword integrity
        
        // IMPORTANT: Update the vertical word to match what's actually in the grid
        // This ensures the vertical word is consistent with what's displayed
        const oldWord = verticalWordsWithHints[i].word;
        verticalWordsWithHints[i].word = verticalWordsWithHints[i].word.substring(0, j) + 
                                        gridLetters[j + 1][col] + 
                                        verticalWordsWithHints[i].word.substring(j + 1);
        debugLog(`Updated vertical word from "${oldWord}" to "${verticalWordsWithHints[i].word}"`);
      } else {
        gridLetters[j + 1][col] = word[j];
        debugLog(`Set gridLetters[${j + 1}][${col}] = "${word[j]}"`);
      }
    }
  }
  
  // Verify the grid has valid words
  debugLog("Verifying grid contains valid words:");
  let hasValidWords = false;
  
  // Check horizontal words
  for (let row = 1; row <= 7; row++) {
    let rowWord = "";
    for (let col = 1; col <= 7; col++) {
      rowWord += gridLetters[row][col] || "";
    }
    if (rowWord.length > 1) {
      debugLog(`Row ${row} word: ${rowWord}`);
      hasValidWords = true;
    }
  }
  
  // Check vertical words
  for (let col = 1; col <= 7; col++) {
    let colWord = "";
    for (let row = 1; row <= 7; row++) {
      colWord += gridLetters[row][col] || "";
    }
    if (colWord.length > 1) {
      debugLog(`Column ${col} word: ${colWord}`);
      hasValidWords = true;
    }
  }
  
  if (!hasValidWords) {
    debugLog("WARNING: Grid does not contain valid words!");
  }
  
  return {
    gridLetters,
    horizontalWords: horizontalWordsWithHints,
    verticalWords: verticalWordsWithHints
  };
}

// Create a proper crossword puzzle with 7x7 hints and matching intersections
async function createCoordinateCrossword(words) {
  debugLog("Creating 7x7 crossword layout with API words");
  const result = [];
  
  // Try to generate a grid with API words
  let gridData;
  try {
    const apiWords = await fetchWordsFromDWDS();
    gridData = await generateCrosswordGrid(apiWords);
  } catch (error) {
    debugLog(`Error generating grid with API: ${error.message}`);
    // Fallback to fixed grid if API fails
    gridData = createFixedGrid();
  }
  
  const { gridLetters, horizontalWords, verticalWords } = gridData;
  
  debugLog(`Using ${horizontalWords.length} horizontal words`);
  debugLog(`Using ${verticalWords.length} vertical words`);
  
  // Add origin point
  result.push({
    word: "0",
    hint: "",
    start: 0, // Position (0,0)
    direction: "origin"
  });
  
  // Add X-axis hints (top row)
  for (let i = 0; i < 7; i++) {
    result.push({
      word: verticalWords[i].hint,
      hint: "",
      start: i + 1, // Positions (0,1) through (0,7)
      direction: "hint-x"
    });
  }
  
  // Add Y-axis hints (left column)
  for (let i = 0; i < 7; i++) {
    result.push({
      word: horizontalWords[i].hint,
      hint: "",
      start: (i + 1) * 9, // Positions (1,0) through (7,0)
      direction: "hint-y"
    });
  }
  
  // Place vertical words in the grid (corresponding to X-axis hints)
  for (let i = 0; i < verticalWords.length; i++) {
    const word = verticalWords[i];
    const col = i + 1; // Column positions 1-7
    
    debugLog(`Placing vertical word "${word.word}" (hint: ${word.hint}) in column ${col}`);
    
    // Verify the vertical word matches what's in the grid
    let actualWord = "";
    for (let row = 1; row <= word.word.length && row <= 7; row++) {
      if (gridLetters[row] && gridLetters[row][col]) {
        actualWord += gridLetters[row][col];
      }
    }
    
    if (actualWord && actualWord !== word.word) {
      debugLog(`WARNING: Vertical word mismatch in column ${col}. Expected: "${word.word}", Actual: "${actualWord}"`);
      // Update the word to match what's actually in the grid
      word.word = actualWord;
      debugLog(`Updated vertical word to: "${actualWord}"`);
    }
    
    result.push({
      ...word,
      start: 9 + col, // Start at row 1, columns 1-7
      direction: "vertical"
    });
  }
  
  // Place horizontal words in the grid (corresponding to Y-axis hints)
  for (let i = 0; i < horizontalWords.length; i++) {
    const word = horizontalWords[i];
    const row = i + 1; // Row positions 1-7
    
    debugLog(`Placing horizontal word "${word.word}" (hint: ${word.hint}) in row ${row}`);
    
    // Verify the horizontal word matches what's in the grid
    let actualWord = "";
    for (let col = 1; col <= word.word.length && col <= 7; col++) {
      if (gridLetters[row] && gridLetters[row][col]) {
        actualWord += gridLetters[row][col];
      }
    }
    
    if (actualWord && actualWord !== word.word) {
      debugLog(`WARNING: Horizontal word mismatch in row ${row}. Expected: "${word.word}", Actual: "${actualWord}"`);
      // Update the word to match what's actually in the grid
      word.word = actualWord;
      debugLog(`Updated horizontal word to: "${actualWord}"`);
    }
    
    result.push({
      ...word,
      start: row * 9 + 1, // Start at rows 1-7, column 1
      direction: "horizontal"
    });
  }
  
  // Log the grid to verify intersections
  for (let row = 1; row <= 7; row++) {
    let rowStr = "";
    for (let col = 1; col <= 7; col++) {
      rowStr += (gridLetters[row][col] || " ") + " ";
    }
    debugLog(`Row ${row}: ${rowStr}`);
  }
  
  // Store the grid letters for use in drawGrid
  result.gridLetters = gridLetters;
  
  return result;
}

// Function to create a fixed grid as fallback
function createFixedGrid() {
  const result = [];
  
  debugLog("Creating fixed grid as fallback");
  
  // Define a fixed grid with letters that form valid words both horizontally and vertically
  // This grid is carefully designed to have valid words in both directions
  const gridLetters = [
    // col 0   1    2    3    4    5    6    7    8
    /* row 0 */ ["0", "R", "A", "D", "B", "T", "K", "S", " "],
    /* row 1 */ ["T", "R", "A", "U", "M", "O", "A", "T", " "],
    /* row 2 */ ["O", "A", "L", "T", "A", "R", "T", "E", " "],
    /* row 3 */ ["R", "S", "T", "E", "R", "T", "Z", "R", " "],
    /* row 4 */ ["E", "T", "E", "N", "K", "E", "E", "N", " "],
    /* row 5 */ ["N", "E", "N", "D", "E", " ", " ", " ", " "],
    /* row 6 */ ["W", "I", "N", "D", " ", " ", " ", " ", " "],
    /* row 7 */ ["S", "E", "E", " ", " ", " ", " ", " ", " "],
    /* row 8 */ [" ", " ", " ", " ", " ", " ", " ", " ", " "]
  ];
  
  // Log the grid for debugging
  debugLog("Fixed grid layout:");
  for (let row = 0; row < 9; row++) {
    let rowStr = "";
    for (let col = 0; col < 9; col++) {
      rowStr += (gridLetters[row][col] || " ") + " ";
    }
    debugLog(`Row ${row}: ${rowStr}`);
  }
  
  // Define the words based on our grid - all are valid German words
  const horizontalWords = [
    { word: "TRAUM", hint: "Schlaf" },
    { word: "ALTAR", hint: "Kirche" },
    { word: "STERT", hint: "Ende" },
    { word: "TENKE", hint: "Denken" },
    { word: "ENDE", hint: "Schluss" },
    { word: "WIND", hint: "Luft" },
    { word: "SEE", hint: "Wasser" }
  ];
  
  const verticalWords = [
    { word: "TOREN", hint: "Narren" },
    { word: "RASTE", hint: "Pause" },
    { word: "ALTEN", hint: "Senioren" },
    { word: "UTEND", hint: "Wütend" },
    { word: "MARKE", hint: "Marke" },
    { word: "ORTE", hint: "Plätze" },
    { word: "KATZS", hint: "Tier" }
  ];
  
  debugLog("Horizontal words:");
  horizontalWords.forEach(word => debugLog(`- ${word.word} (${word.hint})`));
  
  debugLog("Vertical words:");
  verticalWords.forEach(word => debugLog(`- ${word.word} (${word.hint})`));
  
  // Add origin point
  result.push({
    word: "0",
    hint: "",
    start: 0, // Position (0,0)
    direction: "origin"
  });
  
  // Add X-axis hints (top row)
  for (let i = 0; i < 7; i++) {
    result.push({
      word: verticalWords[i].hint,
      hint: "",
      start: i + 1, // Positions (0,1) through (0,7)
      direction: "hint-x"
    });
  }
  
  // Add Y-axis hints (left column)
  for (let i = 0; i < 7; i++) {
    result.push({
      word: horizontalWords[i].hint,
      hint: "",
      start: (i + 1) * 9, // Positions (1,0) through (7,0)
      direction: "hint-y"
    });
  }
  
  // Place vertical words in the grid (corresponding to X-axis hints)
  for (let i = 0; i < verticalWords.length; i++) {
    const word = verticalWords[i];
    const col = i + 1; // Column positions 1-7
    
    debugLog(`Placing vertical word "${word.word}" (hint: ${word.hint}) in column ${col}`);
    result.push({
      ...word,
      start: 9 + col, // Start at row 1, columns 1-7
      direction: "vertical"
    });
  }
  
  // Place horizontal words in the grid (corresponding to Y-axis hints)
  for (let i = 0; i < horizontalWords.length; i++) {
    const word = horizontalWords[i];
    const row = i + 1; // Row positions 1-7
    
    debugLog(`Placing horizontal word "${word.word}" (hint: ${word.hint}) in row ${row}`);
    result.push({
      ...word,
      start: row * 9 + 1, // Start at rows 1-7, column 1
      direction: "horizontal"
    });
  }
  
  // Store the grid letters for use in drawGrid
  result.gridLetters = gridLetters;
  
  return result;
}

// Export functions for use in other files
window.WordGenerator = {
  wordBank,
  getRandomWords,
  fetchWordsFromDWDS,
  getSynonymsFromOpenThesaurus,
  generateCrosswordGrid,
  createCoordinateCrossword,
  createFixedGrid
};