// ========== 论坛功能 ==========

function openForum() {
  showPage('forum');
  loadMessages();
}

async function loadMessages() {
  const list = document.getElementById('forumList');
  list.innerHTML = '<p class="forum-empty">加载中...</p>';

  try {
    // 线上用 API，本地双击用 localStorage 兜底
    let messages = [];
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      const res = await fetch('/api/forum');
      const data = await res.json();
      messages = data.messages || [];
    } else {
      messages = JSON.parse(localStorage.getItem('forumMessages') || '[]');
    }
    renderMessages(messages);
  } catch (e) {
    // 兜底：localStorage
    const messages = JSON.parse(localStorage.getItem('forumMessages') || '[]');
    renderMessages(messages);
  }
}

function renderMessages(messages) {
  const list = document.getElementById('forumList');
  if (messages.length === 0) {
    list.innerHTML = '<p class="forum-empty">还没有留言，来做第一个发言的人吧！</p>';
    return;
  }

  list.innerHTML = messages.map(m => `
    <div class="forum-item">
      <div class="forum-item-header">
        <span class="forum-item-name">${escapeHtml(m.name)}</span>
        <span class="forum-item-time">${escapeHtml(m.time)}</span>
      </div>
      <div class="forum-item-msg">${escapeHtml(m.msg)}</div>
    </div>
  `).join('');
}

async function postMessage() {
  const nameInput = document.getElementById('forumName');
  const msgInput = document.getElementById('forumMsg');
  const name = nameInput.value.trim() || '匿名玩家';
  const msg = msgInput.value.trim();

  if (!msg) { alert('写点什么再发吧！'); return; }

  try {
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, msg })
      });
      if (!res.ok) throw new Error('发送失败');
    } else {
      // 本地双击模式：存 localStorage
      const messages = JSON.parse(localStorage.getItem('forumMessages') || '[]');
      messages.unshift({
        id: Date.now(), name, msg,
        time: new Date().toLocaleString('zh-CN')
      });
      if (messages.length > 100) messages.length = 100;
      localStorage.setItem('forumMessages', JSON.stringify(messages));
    }
    msgInput.value = '';
    loadMessages();
  } catch (e) {
    alert('发送失败：' + e.message);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}
