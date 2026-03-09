const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_CHARS = 2000;

let conversationHistory = [];
let isLoading = false;

// Auto-resize textarea
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

function updateCharCount() {
  const len = document.getElementById('userInput').value.length;
  const el = document.getElementById('charCount');
  el.textContent = `${len} / ${MAX_CHARS}`;
  el.style.color = len > MAX_CHARS * 0.9 ? '#f87171' : 'var(--text3)';
}

// Enter to send
document.getElementById('userInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function useSuggestion(btn) {
  const icon = btn.querySelector('.suggestion-icon');
  const text = btn.textContent.replace(icon.textContent, '').trim();
  document.getElementById('userInput').value = text;
  autoResize(document.getElementById('userInput'));
  updateCharCount();
  sendMessage();
}

function showMessages() {
  const welcome = document.getElementById('welcome');
  const msgs = document.getElementById('messages');
  welcome.classList.add('hidden');
  msgs.classList.add('visible');
}

function clearChat() {
  conversationHistory = [];
  const msgs = document.getElementById('messages');
  msgs.innerHTML = '';
  msgs.classList.remove('visible');
  document.getElementById('welcome').classList.remove('hidden');
}

function appendMessage(role, content) {
  showMessages();
  const msgs = document.getElementById('messages');

  const row = document.createElement('div');
  row.className = `msg-row ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'ai' ? '✦' : '👤';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (role === 'ai') {
    bubble.innerHTML = formatMessage(content);
  } else {
    bubble.textContent = content;
  }

  row.appendChild(avatar);
  row.appendChild(bubble);
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
  return bubble;
}

function showTyping() {
  showMessages();
  const msgs = document.getElementById('messages');
  const row = document.createElement('div');
  row.className = 'msg-row ai';
  row.id = 'typingRow';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = '✦';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

  row.appendChild(avatar);
  row.appendChild(bubble);
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping() {
  const row = document.getElementById('typingRow');
  if (row) row.remove();
}

function formatMessage(text) {
  // Convert markdown-like formatting
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<strong>$1</strong>')
    .replace(/^## (.+)$/gm, '<strong>$1</strong>')
    .replace(/^# (.+)$/gm, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '• $1')
    .split('\n\n').map(p => p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '').join('');
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text || isLoading) return;
  if (text.length > MAX_CHARS) return;

  input.value = '';
  input.style.height = 'auto';
  updateCharCount();

  isLoading = true;
  document.getElementById('sendBtn').disabled = true;

  appendMessage('user', text);
  conversationHistory.push({ role: 'user', content: text });

  showTyping();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: "You are Aura, a brilliant and warm AI assistant. You're helpful, insightful, and thoughtful. Give clear, well-structured responses. Use markdown formatting when appropriate (bold for emphasis, code blocks for code). Keep responses concise but thorough.",
        messages: conversationHistory
      })
    });

    const data = await response.json();
    removeTyping();

    if (data.error) {
      appendMessage('ai', `⚠️ Error: ${data.error.message}`);
      conversationHistory.pop();
    } else {
      const reply = data.content.map(b => b.type === 'text' ? b.text : '').join('');
      conversationHistory.push({ role: 'assistant', content: reply });
      appendMessage('ai', reply);
    }
  } catch (err) {
    removeTyping();
    appendMessage('ai', '⚠️ Something went wrong. Please check your connection and try again.');
    conversationHistory.pop();
  }

  isLoading = false;
  document.getElementById('sendBtn').disabled = false;
  input.focus();
}