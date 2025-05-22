document.addEventListener('DOMContentLoaded', () => {
  // Function to create a placeholder for special characters
  function makeSpecialCharPlaceholder(char) {
    const span = document.createElement('span');
    if (char === '\u00a0') { // Non-breaking space
      span.textContent = ' '; // Render as a regular space
    } else if (char === '\t') { // Tab character
      // You can choose to render tabs as multiple spaces or a specific tab symbol
      span.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;'; // Example: 4 spaces
      span.className = 'cm-tab-placeholder';
    } else {
      // For other special characters, you might want a visual indicator
      // or render them as they are if the font supports them and they are intended.
      // For now, let's try to make them less obtrusive or replace with space.
      span.textContent = ' '; // Default to a space for other caught special chars
    }
    // span.className = 'cm-specialchar-placeholder'; // General class if needed
    return span;
  }

  // Regex for special characters - more comprehensive
  // This includes NBSP, tabs, and some other common problematic whitespace/control chars.
  // Adjust as needed based on what characters you find are causing issues.
  const specialCharsRegex = /[\u00a0\t\u2000-\u200F\u2028-\u202F\u205F-\u206F]+/g;

  const editorOptions = {
    mode: { name: 'javascript', json: true },
    lineNumbers: true,
    theme: 'default',
    lineWrapping: true,
    tabSize: 2,
    indentUnit: 2,
    viewportMargin: Infinity,
    value: '',
    specialChars: specialCharsRegex,
    specialCharPlaceholder: makeSpecialCharPlaceholder
  };

  const inputEditor = CodeMirror(document.getElementById('jsonInputEditor'), {
    ...editorOptions,
    autofocus: true,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    theme: 'material',
  });

  const outputEditor = CodeMirror(document.getElementById('jsonOutputEditor'), {
    ...editorOptions,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    autofocus: true,
    theme: 'material',
  });

  // Force refresh and focus to fix initial cursor/selection rendering
  inputEditor.refresh();
  outputEditor.refresh();
  inputEditor.focus();

  // --- Splitter logic for draggable resizing ---
  const splitter = document.getElementById('splitter');
  const inputArea = document.getElementById('inputArea');
  const outputArea = document.getElementById('outputArea');
  const container = document.querySelector('.container');

  let minHeight = 80;
  let lastInputHeight = null;
  let lastOutputHeight = null;

  function setInitialEditorHeights() {
    const containerHeight = container.clientHeight;
    const splitterHeight = splitter.offsetHeight || 8;
    minHeight = 80;
    let inputHeight = lastInputHeight !== null ? lastInputHeight : Math.max(minHeight, Math.floor((containerHeight - splitterHeight) * 0.45));
    let outputHeight = lastOutputHeight !== null ? lastOutputHeight : Math.max(minHeight, (containerHeight - splitterHeight) - inputHeight);
    // Clamp heights
    if (inputHeight < minHeight) inputHeight = minHeight;
    if (outputHeight < minHeight) outputHeight = minHeight;
    if (inputHeight + outputHeight + splitterHeight > containerHeight) {
      if (inputHeight > outputHeight) {
        inputHeight = containerHeight - splitterHeight - minHeight;
        outputHeight = minHeight;
      } else {
        outputHeight = containerHeight - splitterHeight - minHeight;
        inputHeight = minHeight;
      }
    }
    inputArea.style.flexBasis = inputHeight + 'px';
    outputArea.style.flexBasis = outputHeight + 'px';
  }

  // Set initial heights after layout is ready
  setInitialEditorHeights();

  window.addEventListener('resize', () => {
    setInitialEditorHeights();
    inputEditor.refresh();
    outputEditor.refresh();
  });

  let isDragging = false;
  let startY = 0;
  let startInputHeight = 0;
  let startOutputHeight = 0;

  splitter.addEventListener('mousedown', (e) => {
    isDragging = true;
    splitter.classList.add('active');
    startY = e.clientY;
    // Use flex-basis or fallback to offsetHeight
    startInputHeight = parseInt(window.getComputedStyle(inputArea).flexBasis) || inputArea.offsetHeight;
    startOutputHeight = parseInt(window.getComputedStyle(outputArea).flexBasis) || outputArea.offsetHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const containerRect = container.getBoundingClientRect();
    const dy = e.clientY - startY;
    let newInputHeight = Math.max(minHeight, startInputHeight + dy);
    let newOutputHeight = Math.max(minHeight, startOutputHeight - dy);
    // Clamp so splitter never goes out of bounds
    const totalHeight = containerRect.height - splitter.offsetHeight;
    if (newInputHeight + newOutputHeight > totalHeight) {
      if (dy > 0) {
        newInputHeight = totalHeight - minHeight;
        newOutputHeight = minHeight;
      } else {
        newInputHeight = minHeight;
        newOutputHeight = totalHeight - minHeight;
      }
    }
    inputArea.style.flexBasis = newInputHeight + 'px';
    outputArea.style.flexBasis = newOutputHeight + 'px';
    lastInputHeight = newInputHeight;
    lastOutputHeight = newOutputHeight;
    inputEditor.refresh();
    outputEditor.refresh();
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      splitter.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      inputEditor.refresh();
      outputEditor.refresh();
    }
  });

  function ensureEditorNotEmpty(editor) {
    if (!editor.getValue().trim()) {
      editor.setValue('\u00a0');
    }
  }

  // Ensure both editors always have a dummy line when empty
  ensureEditorNotEmpty(inputEditor);
  ensureEditorNotEmpty(outputEditor);

  // --- Auto-format on input change ---
  function autoFormatJson() {
    let rawJson = inputEditor.getValue();
    if (!rawJson.trim()) {
      outputEditor.setValue('\u00a0');
      outputEditor.getWrapperElement().classList.remove('error');
      return;
    }

    // Attempt to auto-fix multiple JSON objects
    let jsonDataToParse = rawJson.trim();
    if (!jsonDataToParse.startsWith('[') && jsonDataToParse.includes('}{')) {
      try {
        const objects = jsonDataToParse.replace(/}\s*{/g, '},{');
        if (!objects.startsWith('[')) {
          jsonDataToParse = `[${objects}]`;
        } else {
          jsonDataToParse = objects;
        }
        JSON.parse(jsonDataToParse);
      } catch (e) {
        jsonDataToParse = rawJson.trim();
      }
    } else if (jsonDataToParse.startsWith('{') && jsonDataToParse.endsWith('}')) {
        // Single object, do nothing special before parsing.
    } else if (!jsonDataToParse.startsWith('[') && !jsonDataToParse.endsWith(']') && jsonDataToParse.includes('},{')) {
         jsonDataToParse = `[${jsonDataToParse}]`;
    }

    try {
      const parsedJson = JSON.parse(jsonDataToParse);
      const formatted = JSON.stringify(parsedJson, null, 2);
      outputEditor.setValue(formatted);
      outputEditor.getWrapperElement().classList.remove('error');
      outputEditor.getWrapperElement().style.color = '';
      // Show gutter in output editor when there is content
      outputArea.classList.remove('hide-gutter');
    } catch (e) {
      outputEditor.setValue(`Error parsing JSON: ${e.message}`);
      outputEditor.getWrapperElement().classList.add('error');
      outputEditor.getWrapperElement().style.color = '';
      outputArea.classList.remove('hide-gutter');
    }
  }

  inputEditor.on('change', autoFormatJson);
  autoFormatJson();

  // Minimal status overlay for line/column (top-right in editor)
  const inputStatusOverlay = document.getElementById('inputStatusOverlay');
  const THEME_KEY = 'jsonFormatterTheme';

  function setTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      container.classList.add('dark-mode');
      inputStatusOverlay.title = 'Switch to light mode';
      inputEditor.setOption('theme', 'material');
      outputEditor.setOption('theme', 'material');
    } else {
      document.body.classList.remove('dark-mode');
      container.classList.remove('dark-mode');
      inputStatusOverlay.title = 'Switch to dark mode';
      inputEditor.setOption('theme', 'default');
      outputEditor.setOption('theme', 'default');
    }
    localStorage.setItem(THEME_KEY, theme);
    updateInputStatusOverlay();
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    setTheme(isDark ? 'light' : 'dark');
  }

  // On load, set theme from storage
  setTheme(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');

  // Make overlay clickable
  inputStatusOverlay.addEventListener('click', toggleTheme);

  // When updating status, show the icon
  function updateInputStatusOverlay() {
    const cursor = inputEditor.getCursor();
    const icon = document.body.classList.contains('dark-mode') ? '🌙 ' : '💡 ';
    inputStatusOverlay.textContent = `${icon}Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`;
  }
  inputEditor.on('cursorActivity', updateInputStatusOverlay);
  updateInputStatusOverlay();
}); 