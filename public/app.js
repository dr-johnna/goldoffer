/* ============================================
   GOLD OFFER COACH
   Client-side application
   ============================================ */

// ---------- State ----------
const state = {
  conversation: [], // [{role: 'user'|'assistant', content: '...'}]
  isStreaming: false,
  accessCode: '', // stored after successful gate verification
};

// ---------- DOM refs ----------
const gate = document.getElementById('gate');
const gateForm = document.getElementById('gate-form');
const gateInput = document.getElementById('gate-input');
const gateError = document.getElementById('gate-error');

const welcome = document.getElementById('welcome');
const entryPaths = document.querySelectorAll('.entry-path');

const chat = document.getElementById('chat');
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatSubmit = document.getElementById('chat-submit');

const btnDownload = document.getElementById('btn-download');
const btnCopy = document.getElementById('btn-copy');
const btnRestart = document.getElementById('btn-restart');

// ---------- Gate ----------
const GATE_STORAGE_KEY = 'goc_unlocked';

function checkGate() {
  // Check if previously unlocked in this session
  if (sessionStorage.getItem(GATE_STORAGE_KEY) === 'true') {
    showWelcome();
    return;
  }
  
}

gateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = gateInput.value.trim();

  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();

    if (data.ok) {
      sessionStorage.setItem(GATE_STORAGE_KEY, 'true');
      state.accessCode = code;
      gateError.hidden = true;
      showWelcome();
    } else {
      gateError.hidden = false;
      gateInput.value = '';
      gateInput.focus();
    }
  } catch (err) {
    gateError.textContent = 'Something went wrong. Please try again.';
    gateError.hidden = false;
  }
});

function showWelcome() {
  gate.classList.add("gate-exit"); setTimeout(() => gate.remove(), 400);
  welcome.hidden = false;
  chat.hidden = true;
}

function showChat() {
  gate.classList.add("gate-exit"); setTimeout(() => gate.remove(), 400);
  welcome.hidden = true;
  chat.hidden = false;
  setTimeout(() => chatInput.focus(), 100);
}

// ---------- Entry Paths ----------
entryPaths.forEach((btn) => {
  btn.addEventListener('click', () => {
    const starter = btn.dataset.starter;
    showChat();
    sendMessage(starter);
  });
});

// ---------- Chat Input ----------
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || state.isStreaming) return;
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendMessage(text);
});

// ---------- Messaging ----------
async function sendMessage(text) {
  if (state.isStreaming) return;

  // Add user message
  state.conversation.push({ role: 'user', content: text });
  renderMessage('user', text);

  // Add typing indicator placeholder
  const coachEl = renderMessage('assistant', '', true);
  state.isStreaming = true;
  chatSubmit.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: state.conversation, code: state.accessCode }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Request failed');
    }

    // Streaming
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    // Remove typing indicator, prepare for streaming text
    const contentEl = coachEl.querySelector('.message-content');
    contentEl.innerHTML = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE-style: split on newlines, each line may be "data: ..."
      const lines = buffer.split('\n');
      buffer = lines.pop(); // incomplete line held for next chunk

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('data:')) {
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === 'content' && evt.text) {
              fullText += evt.text;
              contentEl.innerHTML = formatMarkdown(fullText);
              scrollToBottom();
            } else if (evt.type === 'error') {
              fullText = 'I ran into a moment of trouble responding. Please try again in a moment.';
              contentEl.innerHTML = formatMarkdown(fullText);
            }
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }
    }

    state.conversation.push({ role: 'assistant', content: fullText });
  } catch (err) {
    console.error(err);
    const contentEl = coachEl.querySelector('.message-content');
    contentEl.innerHTML = '<p>I ran into a moment of trouble responding. Please try again in a moment.</p>';
  } finally {
    state.isStreaming = false;
    chatSubmit.disabled = false;
    chatInput.focus();
  }
}

function renderMessage(role, text, isTyping = false) {
  const wrapper = document.createElement('div');
  wrapper.className = `message message-${role === 'user' ? 'user' : 'coach'}`;

  const roleEl = document.createElement('div');
  roleEl.className = `message-role ${role === 'user' ? 'message-role-user' : 'message-role-coach'}`;
  roleEl.textContent = role === 'user' ? 'You' : 'Gold Offer Coach';

  const contentEl = document.createElement('div');
  contentEl.className = 'message-content';

  if (isTyping) {
    contentEl.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  } else {
    contentEl.innerHTML = formatMarkdown(text);
  }

  wrapper.appendChild(roleEl);
  wrapper.appendChild(contentEl);
  messagesEl.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

function scrollToBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

// ---------- Minimal Markdown Formatter ----------
// Handles: **bold**, *italic*, lists, paragraphs, line breaks
function formatMarkdown(text) {
  if (!text) return '';

  // Escape HTML first
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic (single asterisk not part of double)
  safe = safe.replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1<em>$2</em>$3');

  // Split into blocks by blank lines
  const blocks = safe.split(/\n\s*\n/);
  const rendered = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';

    // Bulleted list (lines starting with - or •)
    if (/^[-•]\s/.test(trimmed)) {
      const items = trimmed
        .split('\n')
        .filter(l => /^[-•]\s/.test(l.trim()))
        .map(l => `<li>${l.trim().replace(/^[-•]\s/, '')}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed
        .split('\n')
        .filter(l => /^\d+\.\s/.test(l.trim()))
        .map(l => `<li>${l.trim().replace(/^\d+\.\s/, '')}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    }

    // Regular paragraph, preserve single line breaks as <br>
    const withBreaks = trimmed.replace(/\n/g, '<br>');
    return `<p>${withBreaks}</p>`;
  });

  return rendered.join('');
}

// ---------- PDF Download ----------
btnDownload.addEventListener('click', () => {
  if (state.conversation.length === 0) {
    alert('Please have at least one exchange before downloading.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
    orientation: 'portrait',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54; // ~0.75"
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const DARK = [32, 32, 32];
  const MUTED = [107, 107, 107];
  const TEAL = [63, 168, 150];

  // Title
  doc.setFont('times', 'normal');
  doc.setFontSize(24);
  doc.setTextColor(...DARK);
  doc.text('Gold Offer Coach', margin, y);
  y += 28;

  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text('Conversation with Dr. Johnna\'s G.O.L.D. Framework', margin, y);
  y += 16;

  // Date
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  doc.text(date, margin, y);
  y += 24;

  // Divider
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  // Messages
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  state.conversation.forEach((msg) => {
    const label = msg.role === 'user' ? 'YOU' : 'GOLD OFFER COACH';

    // Check page break
    if (y > pageHeight - margin - 40) {
      doc.addPage();
      y = margin;
    }

    // Role label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...(msg.role === 'user' ? MUTED : TEAL));
    doc.text(label, margin, y);
    y += 16;

    // Content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...DARK);

    // Strip markdown for PDF (basic)
    const plainText = msg.content
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^[-•]\s/gm, '• ')
      .replace(/^\d+\.\s/gm, (m) => m);

    const lines = doc.splitTextToSize(plainText, maxWidth);
    lines.forEach((line) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 14;
    });
    y += 14;
  });

  // Footer on last page
  if (y < pageHeight - margin - 30) {
    y = pageHeight - margin - 10;
  }
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('doctorjohnna.com', margin, pageHeight - 30);
  doc.text('Built with the G.O.L.D. Framework', pageWidth - margin, pageHeight - 30, { align: 'right' });

  doc.save(`gold-offer-conversation-${Date.now()}.pdf`);
});

// ---------- Copy Conversation ----------
btnCopy.addEventListener('click', async () => {
  if (state.conversation.length === 0) {
    alert('Please have at least one exchange before copying.');
    return;
  }

  const text = state.conversation
    .map((msg) => {
      const label = msg.role === 'user' ? 'YOU' : 'GOLD OFFER COACH';
      return `${label}:\n${msg.content}\n`;
    })
    .join('\n---\n\n');

  const header = `GOLD OFFER COACH\nConversation with Dr. Johnna's G.O.L.D. Framework\n${new Date().toLocaleDateString()}\n\n===\n\n`;

  try {
    await navigator.clipboard.writeText(header + text);
    const original = btnCopy.textContent;
    btnCopy.textContent = 'Copied';
    setTimeout(() => { btnCopy.textContent = original; }, 1800);
  } catch (err) {
    alert('Could not copy to clipboard. Please try the download option instead.');
  }
});

// ---------- Restart ----------
btnRestart.addEventListener('click', () => {
  if (state.conversation.length > 0) {
    const confirmed = confirm('Start a new conversation? This will clear your current session.');
    if (!confirmed) return;
  }
  state.conversation = [];
  messagesEl.innerHTML = '';
  showWelcome();
});

// ---------- Init ----------
checkGate();
