/**
 * Transforms platoHtml format to MPUJ (Multi-Part User JSON) array
 * for Gemini API.
 * Consecutive non-model messages are grouped into a single 'user' message
 * with multiple parts. Each part includes the speaker's name and utterance.
 * Model messages have a single part with the utterance.
 *
 * @param {string} platoHtml - The platoHtml formatted string.
 * @returns {Array<Object>} - An array of message objects suitable for Gemini API `contents`.
 *                            Each object has 'role' ('user' or 'model') and 'parts' (an array of text parts).
 *                            Returns an empty array if platoHtml is empty or whitespace.
 * @throws {Error} If platoHtml is null, undefined, or not a string.
 * @throws {Error} If window.machineConfig or window.machineConfig.name is not available.
 */
function platoHtmlToMpuj(platoHtml) {
  if (platoHtml === null || typeof platoHtml !== 'string') {
    throw new Error('Invalid input: platoHtml must be a string.');
  }
  if (!platoHtml.trim()) {
    return []; // Return empty array for empty or whitespace-only HTML
  }

  if (!window.machineConfig || typeof window.machineConfig.name !== 'string' || !window.machineConfig.name.trim()) {
    console.error('platoHtmlToMpuj: machineConfig.name is not available or empty. Please ensure window.machineConfig.name is correctly set.');
    throw new Error('machineConfig.name is not configured. Cannot determine model messages.');
  }
  const modelNameUpper = window.machineConfig.name.toUpperCase();

  const mpujMessages = [];
  let currentUserParts = []; // To accumulate parts for the current user message

  const parser = new DOMParser();
  const doc = parser.parseFromString(platoHtml, 'text/html');
  const paragraphs = doc.querySelectorAll('p.dialogue');

  paragraphs.forEach(p => {
    const speakerSpan = p.querySelector('span.speaker');
    if (!speakerSpan) {
      console.warn('Skipping paragraph due to missing speaker span:', p.outerHTML);
      return; // Skip malformed paragraphs
    }

    const speaker = speakerSpan.textContent.trim();

    // Extract utterance: text after the speaker span, with leading colon/whitespace removed.
    const fullParaText = p.textContent || '';
    let utterance = fullParaText.substring(speakerSpan.textContent.length).trim();
    if (utterance.startsWith(':')) {
      utterance = utterance.substring(1).trim();
    }

    const isModelMessage = speaker.toUpperCase() === modelNameUpper;

    if (isModelMessage) {
      // If there are accumulated user parts, push them as a single user message first.
      if (currentUserParts.length > 0) {
        mpujMessages.push({ role: 'user', parts: currentUserParts });
        currentUserParts = []; // Reset for the next sequence of user messages
      }
      // Add the model message.
      mpujMessages.push({ role: 'model', parts: [{ text: utterance }] });
    } else {
      // This is a part of a user message (from any participant other than the model,
      // including "INSTRUCTIONS" if present).
      // The part includes the speaker's name and their utterance.
      currentUserParts.push({ text: `${speaker}: ${utterance}` });
    }
  });

  // After iterating through all paragraphs, if there are any remaining user parts, add them.
  if (currentUserParts.length > 0) {
    mpujMessages.push({ role: 'user', parts: currentUserParts });
  }

  return mpujMessages;
}

/**
 * Transforms platoHtml format to platoText format.
 * @param {string} platoHtml - The platoHtml formatted string.
 * @returns {string} - The platoText formatted string.
 */
function platoHtmlToPlatoText(platoHtml) {
  if (typeof platoHtml !== 'string') { // Allow empty string
    throw new Error('Invalid input: platoHtml must be a string');
  }
  if (!platoHtml.trim()) {
    return '';
  }

  let result = '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(platoHtml, 'text/html');
  const paragraphs = doc.querySelectorAll('p.dialogue');

  paragraphs.forEach(p => {
    const speakerSpan = p.querySelector('span.speaker');
    if (!speakerSpan) return;

    const speaker = speakerSpan.textContent.trim();
    const utterance = p.textContent.replace(speakerSpan.textContent, '').replace(/:\s*/, '').trim();
    result += `${speaker}: ${utterance}\n\n`;
  });

  return result;
}

/**
 * Transforms platoText format to platoHtml format.
 * @param {string} platoText - The platoText formatted string.
 * @returns {string} - The platoHtml formatted string.
 */
function platoTextToPlatoHtml(platoText) {
  if (typeof platoText !== 'string') { // Allow empty string
    throw new Error('Invalid input: platoText must be a string');
  }
  // If platoText is an empty string or only whitespace, return an empty string.
  // The display logic will handle showing the file picker or placeholder.
  if (!platoText.trim()) {
    return '';
  }

  const regex = /([A-Za-z0-9_ -]+):\s*(.*?)\n\n/gs;
  let result = '';
  let match;

  while ((match = regex.exec(platoText)) !== null) {
    const speaker = match[1].trim();
    const utterance = match[2].trim().replace(/</g, '&lt;').replace(/>/g, '&gt;'); // Escape HTML characters
    result += `<p class="dialogue"><span class="speaker">${speaker}</span> ${utterance}</p>\n`;
  }

  return result.trimEnd();
}

/**
 * Transforms platoText format to MPUJ (Multi-Part User JSON) array
 * for Gemini API.
 * Consecutive non-model messages are grouped into a single 'user' message
 * with multiple parts. Each part includes the speaker's name and utterance.
 * Model messages have a single part with the utterance.
 *
 * @param {string} platoText - The platoText formatted string.
 * @returns {Array<Object>} - An array of message objects suitable for Gemini API `contents`.
 *                            Each object has 'role' ('user' or 'model') and 'parts' (an array of text parts).
 *                            Returns an empty array if platoText is empty or whitespace.
 * @throws {Error} If platoText is null, undefined, or not a string.
 * @throws {Error} If window.machineConfig or window.machineConfig.name is not available.
 */
function platoTextToMpuj(platoText) {
  if (platoText === null || typeof platoText !== 'string') {
    throw new Error('Invalid input: platoText must be a string.');
  }
  if (!platoText.trim()) {
    return []; // Return empty array for empty or whitespace-only text
  }

  if (!window.machineConfig || typeof window.machineConfig.name !== 'string' || !window.machineConfig.name.trim()) {
    console.error('platoTextToMpuj: machineConfig.name is not available or empty. Please ensure window.machineConfig.name is correctly set.');
    throw new Error('machineConfig.name is not configured. Cannot determine model messages.');
  }
  const modelNameUpper = window.machineConfig.name.toUpperCase();

  const mpujMessages = [];
  let currentUserParts = []; // To accumulate parts for the current user message

  // Regex to capture "Speaker: Utterance" followed by two newlines
  // It captures the speaker (group 1) and the utterance (group 2)
  const regex = /([A-Za-z0-9_ -]+):\s*([\s\S]*?)(?=\n\n[A-Za-z0-9_ -]+:|\n*$)/g;
  let match;

  // Iterate over all matches in the platoText
  // We need to adjust the regex or post-processing slightly because the original
  // regex /([A-Za-z0-9_ -]+):\s*(.*?)\n\n/gs might not capture the last utterance
  // if it's not followed by \n\n.
  // A simpler approach is to split by \n\n and then parse each block.

  const messageBlocks = platoText.trim().split(/\n\n+/); // Split by one or more pairs of newlines

  messageBlocks.forEach(block => {
    if (!block.trim()) return; // Skip empty blocks

    const parts = block.match(/^([A-Za-z0-9_ -]+):\s*([\s\S]*)$/);
    if (!parts || parts.length < 3) {
      console.warn('Skipping malformed message block in platoTextToMpuj:', block);
      return; // Skip malformed blocks
    }

    const speaker = parts[1].trim();
    const utterance = parts[2].trim();

    const isModelMessage = speaker.toUpperCase() === modelNameUpper;

    if (isModelMessage) {
      // If there are accumulated user parts, push them as a single user message first.
      if (currentUserParts.length > 0) {
        mpujMessages.push({ role: 'user', parts: currentUserParts });
        currentUserParts = []; // Reset for the next sequence of user messages
      }
      // Add the model message.
      mpujMessages.push({ role: 'model', parts: [{ text: utterance }] });
    } else {
      // This is a part of a user message (from any participant other than the model).
      // The part includes the speaker's name and their utterance.
      currentUserParts.push({ text: `${speaker}: ${utterance}` });
    }
  });

  // After iterating through all blocks, if there are any remaining user parts, add them.
  if (currentUserParts.length > 0) {
    mpujMessages.push({ role: 'user', parts: currentUserParts });
  }

  return mpujMessages;
}

/**
 * Transforms a MPJ (Multi-part JSON) message to platoText format.
 * @param {Array<Object>} mpjMessage - a MPJ (Multi-part JSON) message object.
 *                                      Each object should have 'name' and 'content' properties.
 * @returns {string} - The platoText formatted string.
 */
function mpjToPlatoText(mpjMessage) {
  if (!Array.isArray(cmjMessages)) {
    console.error('Invalid input: cmjMessages must be an array.');
    // Consider throwing an error for more robust handling:
    // throw new Error('Invalid input: cmjMessages must be an array.');
    return ''; // Return empty string if input is not an array
  }
  let platoText = '';

  cmjMessages.forEach(message => {
    // Ensure the message object has the expected 'name' and 'content' properties
    if (message && typeof message.name === 'string' && typeof message.content === 'string') {
      const speaker = message.name.trim(); // Trim individual parts for cleanliness
      const utterance = message.content.trim(); // Trim individual parts for cleanliness

      // Append the formatted string, ensuring it ends with two newlines
      platoText += `${speaker}: ${utterance}\n\n`;
    } else {
      console.warn('Skipping malformed CMJ message object during CmjToPlatoText conversion:', message);
    }
  });
  return platoText;
}

/**
 * Transforms an array of CMJ message objects to platoText format.
 * @param {Array<Object>} cmjMessages - An array of CMJ message objects.
 *                                      Each object should have 'name' and 'content' properties.
 * @returns {string} - The platoText formatted string.
 */
function CmjToPlatoText(cmjMessages) {
  if (!Array.isArray(cmjMessages)) {
    console.error('Invalid input: cmjMessages must be an array.');
    // Consider throwing an error for more robust handling:
    // throw new Error('Invalid input: cmjMessages must be an array.');
    return ''; // Return empty string if input is not an array
  }
  let platoText = '';

  cmjMessages.forEach(message => {
    // Ensure the message object has the expected 'name' and 'content' properties
    if (message && typeof message.name === 'string' && typeof message.content === 'string') {
      const speaker = message.name.trim(); // Trim individual parts for cleanliness

      // Normalize newlines within the LLM's utterance:
      // - Convert sequences of two or more newlines to '\n\t'
      //   to match platoText's internal paragraph formatting.
      // - Then, trim the result.
      let utterance = message.content.replace(/\n{2,}/g, '\n\t');
      utterance = utterance.trim();

      // Append the formatted string, ensuring it ends with two newlines
      platoText += `${speaker}: ${utterance}\n\n`;
    } else {
      console.warn('Skipping malformed CMJ message object during CmjToPlatoText conversion:', message);
    }
  });
  return platoText;
}

/**
 * Transforms platoHtml format to CMJ (Chat Messages JSON) format.
 * @param {string} platoHtml - The platoHtml formatted string.
 * @returns {Array<Object>} - Array of message objects. (Note: JSDoc says JSON stringified, actual code returns Array)
 */
function platoHtmlToCmj(platoHtml) {
  if (!platoHtml || typeof platoHtml !== 'string') {
    throw new Error('Invalid input: platoHtml must be a non-empty string');
  }

  const messages = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(platoHtml, 'text/html');
  const paragraphs = doc.querySelectorAll('p.dialogue');

  paragraphs.forEach(p => {
    const speakerSpan = p.querySelector('span.speaker');
    if (!speakerSpan) return; // Skip malformed paragraphs

    const speaker = speakerSpan.textContent.trim();

    // --- New utterance extraction logic ---
    const rawHtmlOfP = p.innerHTML;
    const speakerSpanHtml = speakerSpan.outerHTML;
    const speakerSpanEndIndex = rawHtmlOfP.indexOf(speakerSpanHtml) + speakerSpanHtml.length;

    let utteranceHtml = rawHtmlOfP.substring(speakerSpanEndIndex);

    // The template in platoTextToPlatoHtml adds a space: <span ...></span> ${utterance}
    // Remove this specific structural space if it exists.
    if (utteranceHtml.startsWith(' ')) {
        utteranceHtml = utteranceHtml.substring(1);
    }

    // 1. Convert <br />&emsp; (and variants with optional space) to \n\t
    let processedUtterance = utteranceHtml.replace(/<br\s*\/?>\s*&emsp;/gi, '\n\t');

    // 2. Convert remaining <br /> (and variants) to \n
    processedUtterance = processedUtterance.replace(/<br\s*\/?>/gi, '\n');

    // 3. Strip any other HTML tags and decode entities (e.g., &lt; to <)
    // Using a temporary element for this is a standard and robust method.
    const decoder = document.createElement('div');
    decoder.innerHTML = processedUtterance;
    const finalUtterance = decoder.textContent.trim(); // Trim after all processing
    // --- End of new utterance extraction logic ---

    let role = 'user';
    // Safely access machineConfig.name and compare in uppercase
    let assistantNameUpper = '';
    if (typeof machineConfig !== 'undefined' && machineConfig && typeof machineConfig.name === 'string' && machineConfig.name.trim() !== '') {
        assistantNameUpper = machineConfig.name.toUpperCase();
    } else {
        // console.warn("machineConfig.name not available for role assignment in platoHtmlToCmj.");
    }

    if (assistantNameUpper && speaker.toUpperCase() === assistantNameUpper) {
      role = 'assistant';
    } else if (speaker.toUpperCase() === 'INSTRUCTIONS') {
      role = 'system';
    }

    messages.push({
      role: role,
      name: speaker,
      content: finalUtterance
    });
  });

  return messages; // JSDoc indicates string, but function returns Array.
}
