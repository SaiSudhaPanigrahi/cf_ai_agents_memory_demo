const chat = document.getElementById('chat');
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const micBtn = document.getElementById('mic-btn');

const sessionId = localStorage.getItem('sessionId') || crypto.randomUUID();
localStorage.setItem('sessionId', sessionId);

function addMsg(role, text){
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMsg('user', text);
  input.value='';

  try{
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ sessionId, user: 'web', text })
    });
    const data = await res.json();
    if (data.reply) {
      addMsg('assistant', data.reply);
    } else {
      addMsg('assistant', '[No reply]');
    }
  } catch (e) {
    addMsg('assistant', 'Error: ' + e.message);
  }
});

// Optional voice input via Web Speech API (in-browser STT)
let recognition = null;
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.onresult = (event) => {
    const result = event.results[0][0].transcript;
    input.value = result;
  };
  recognition.onerror = (e) => console.warn('Speech error', e);
}

micBtn.addEventListener('click', () => {
  if (!recognition) {
    alert('Speech recognition not supported in this browser.');
    return;
  }
  recognition.start();
});
