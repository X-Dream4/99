/* ============================================================
   liao.js — 了了 App 全部逻辑
   ============================================================ */

/* ---------- 存取工具 ---------- */
function lSave(key, val) {
  try { localStorage.setItem('liao_' + key, JSON.stringify(val)); } catch (e) {}
}
function lLoad(key, def) {
  try {
    const v = localStorage.getItem('liao_' + key);
    return v !== null ? JSON.parse(v) : def;
  } catch (e) { return def; }
}

/* ============================================================
   数据初始化
   ============================================================ */
let liaoRoles      = lLoad('roles', []);
let liaoChats      = lLoad('chats', []);
let liaoSuiyan     = lLoad('suiyan', []);
let liaoUserName   = lLoad('userName', '用户');
let liaoUserAvatar = lLoad('userAvatar', 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=user');
let liaoBgSrc      = lLoad('suiyanBg', '');

let currentChatIdx = -1;

/* ============================================================
   入口绑定
   ============================================================ */
function bindLiaoEntry() {
  document.querySelectorAll('[data-app="chat"]').forEach(el => {
    el.addEventListener('click', openLiaoApp);
  });
  const dockChat = document.getElementById('dock-chat');
  if (dockChat) dockChat.addEventListener('click', openLiaoApp);
}
bindLiaoEntry();

function openLiaoApp() {
  document.getElementById('liao-app').classList.add('show');
  switchLiaoTab('chatlist');
  renderChatList();
}

function closeLiaoApp() {
  document.getElementById('liao-app').classList.remove('show');
}

document.getElementById('liao-close-btn').addEventListener('click', closeLiaoApp);

/* ============================================================
   顶部标签切换
   ============================================================ */
function switchLiaoTab(tabId) {
  document.querySelectorAll('.liao-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.liao-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.panel === tabId);
  });
  if (tabId === 'chatlist') renderChatList();
  if (tabId === 'rolelib')  renderRoleLib();
  if (tabId === 'suiyan')   renderSuiyan();
}

document.querySelectorAll('.liao-tab-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    switchLiaoTab(this.dataset.tab);
  });
});

/* ============================================================
   ① 聊天列表
   ============================================================ */
function renderChatList() {
  const list = document.getElementById('liao-chat-list');
  list.innerHTML = '';

  if (!liaoChats.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text-light);font-size:13px;">还没有聊天，点击下方新建角色开始吧</div>`;
    return;
  }

  liaoChats.forEach((chat, idx) => {
    const role = liaoRoles.find(r => r.id === chat.roleId);
    if (!role) return;
    const msgs = chat.messages || [];
    const lastMsg  = msgs.length ? msgs[msgs.length - 1].content : '暂无消息';
    const lastTime = msgs.length ? formatTime(msgs[msgs.length - 1].ts) : '';

    const item = document.createElement('div');
    item.className = 'chat-list-item';
    item.innerHTML = `
      <img class="chat-item-avatar" src="${role.avatar || defaultAvatar()}" alt="">
      <div class="chat-item-body">
        <div class="chat-item-name">${escHtml(role.nickname || role.realname)}</div>
        <div class="chat-item-preview">${escHtml(lastMsg)}</div>
      </div>
      <div class="chat-item-meta">
        <div class="chat-item-time">${lastTime}</div>
      </div>`;
    item.addEventListener('click', () => openChatView(idx));
    list.appendChild(item);
  });
}

/* ============================================================
   底部操作栏
   ============================================================ */
document.getElementById('liao-btn-new-role').addEventListener('click', openNewRoleModal);
document.getElementById('liao-btn-new-group').addEventListener('click', () => {
  document.getElementById('liao-new-group-modal').classList.add('show');
});
document.getElementById('liao-btn-import').addEventListener('click', () => {
  document.getElementById('liao-import-modal').classList.add('show');
});

/* ============================================================
   新建角色弹窗
   ============================================================ */
let newRoleAvatarSrc = '';

function openNewRoleModal() {
  newRoleAvatarSrc = '';
  document.getElementById('liao-role-avatar-preview').src = defaultAvatar();
  document.getElementById('liao-role-nickname').value   = '';
  document.getElementById('liao-role-realname').value   = '';
  document.getElementById('liao-role-setting').value    = '';
  document.getElementById('liao-role-avatar-url').value = '';
  document.getElementById('liao-new-role-modal').classList.add('show');
}

document.getElementById('liao-role-avatar-url').addEventListener('input', function () {
  const url = this.value.trim();
  if (url) {
    document.getElementById('liao-role-avatar-preview').src = url;
    newRoleAvatarSrc = url;
  }
});

document.getElementById('liao-role-avatar-local-btn').addEventListener('click', () => {
  document.getElementById('liao-role-avatar-file').click();
});
document.getElementById('liao-role-avatar-file').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    newRoleAvatarSrc = e.target.result;
    document.getElementById('liao-role-avatar-preview').src = newRoleAvatarSrc;
  };
  reader.readAsDataURL(file);
});

document.getElementById('liao-role-confirm-btn').addEventListener('click', () => {
  const nickname = document.getElementById('liao-role-nickname').value.trim();
  const realname = document.getElementById('liao-role-realname').value.trim();
  const setting  = document.getElementById('liao-role-setting').value.trim();
  if (!nickname && !realname) { alert('请至少填写备注名或真实名字'); return; }

  const role = {
    id:       'role_' + Date.now(),
    nickname: nickname || realname,
    realname: realname || nickname,
    avatar:   newRoleAvatarSrc || defaultAvatar(),
    setting:  setting
  };
  liaoRoles.push(role);
  lSave('roles', liaoRoles);

  const chat = { roleId: role.id, messages: [], chatUserName: liaoUserName, chatUserAvatar: liaoUserAvatar, chatUserSetting: '' };
  liaoChats.push(chat);
  lSave('chats', liaoChats);

  document.getElementById('liao-new-role-modal').classList.remove('show');
  renderChatList();
  renderRoleLib();
});

document.getElementById('liao-role-cancel-btn').addEventListener('click', () => {
  document.getElementById('liao-new-role-modal').classList.remove('show');
});

/* ============================================================
   ② 角色库
   ============================================================ */
function renderRoleLib() {
  const grid  = document.getElementById('liao-role-grid');
  const count = document.getElementById('liao-role-count');
  grid.innerHTML = '';

  liaoRoles.forEach(role => {
    const card = document.createElement('div');
    card.className = 'role-card';
    card.innerHTML = `
      <img class="role-card-avatar" src="${role.avatar || defaultAvatar()}" alt="">
      <div class="role-card-name">${escHtml(role.nickname)}</div>
      <div class="role-card-real">${escHtml(role.realname)}</div>`;
    card.addEventListener('click', () => {
      const chatIdx = liaoChats.findIndex(c => c.roleId === role.id);
      if (chatIdx >= 0) {
        switchLiaoTab('chatlist');
        setTimeout(() => openChatView(chatIdx), 80);
      }
    });
    grid.appendChild(card);
  });

  count.textContent = `共 ${liaoRoles.length} 个角色`;
}

/* ============================================================
   ③ 我的主页
   ============================================================ */
document.querySelectorAll('.my-menu-item').forEach(item => {
  item.addEventListener('click', function () {
    const title = this.querySelector('.my-menu-title').textContent;
    alert(`「${title}」功能建设中，敬请期待`);
  });
});

/* ============================================================
   ④ 随言
   ============================================================ */
function renderSuiyan() {
  const header = document.getElementById('suiyan-header');
  if (liaoBgSrc) header.style.backgroundImage = `url(${liaoBgSrc})`;

  const avatarEl = document.getElementById('suiyan-user-avatar');
  const nameEl   = document.getElementById('suiyan-user-name');
  avatarEl.src             = liaoUserAvatar;
  nameEl.textContent       = liaoUserName;

  const list = document.getElementById('suiyan-list');
  list.innerHTML = '';

  if (!liaoSuiyan.length) {
    list.innerHTML = `<div style="text-align:center;padding:30px 20px;color:var(--text-light);font-size:13px;">还没有随言，点击右上角 + 发布第一条吧</div>`;
    return;
  }

  [...liaoSuiyan].reverse().forEach((post, revIdx) => {
    const realIdx = liaoSuiyan.length - 1 - revIdx;
    list.appendChild(buildSuiyanItem(post, realIdx));
  });
}

function buildSuiyanItem(post, idx) {
  const div = document.createElement('div');
  div.className = 'suiyan-item';
  const likedByUser = post.likedBy && post.likedBy.includes('user');

  let commentsHtml = '';
  if (post.comments && post.comments.length) {
    const rows = post.comments.map(c =>
      `<div class="suiyan-comment-item"><span class="suiyan-comment-author">${escHtml(c.author)}</span>${escHtml(c.text)}</div>`
    ).join('');
    commentsHtml = `<div class="suiyan-comments">${rows}</div>`;
  }

  div.innerHTML = `
    <div class="suiyan-item-header">
      <img class="suiyan-item-avatar" src="${post.avatar || defaultAvatar()}" alt="">
      <div class="suiyan-item-meta">
        <div class="suiyan-item-name">${escHtml(post.author)}</div>
        <div class="suiyan-item-time">${formatTime(post.ts)}</div>
      </div>
    </div>
    <div class="suiyan-item-content">${escHtml(post.content)}</div>
    <div class="suiyan-actions">
      <button class="suiyan-action-btn like-btn ${likedByUser ? 'liked' : ''}" data-idx="${idx}">
        <span class="action-icon">${likedByUser ? '♥' : '♡'}</span>
        <span class="like-count">${post.likes || 0}</span>
      </button>
      <button class="suiyan-action-btn comment-btn" data-idx="${idx}">
        <span class="action-icon">○</span>
        <span>${post.comments ? post.comments.length : 0}</span>
      </button>
    </div>
    ${commentsHtml}`;

  div.querySelector('.like-btn').addEventListener('click', function () {
    const i = parseInt(this.dataset.idx);
    if (!liaoSuiyan[i].likedBy) liaoSuiyan[i].likedBy = [];
    const pos = liaoSuiyan[i].likedBy.indexOf('user');
    if (pos >= 0) {
      liaoSuiyan[i].likedBy.splice(pos, 1);
      liaoSuiyan[i].likes = Math.max(0, (liaoSuiyan[i].likes || 1) - 1);
    } else {
      liaoSuiyan[i].likedBy.push('user');
      liaoSuiyan[i].likes = (liaoSuiyan[i].likes || 0) + 1;
    }
    lSave('suiyan', liaoSuiyan);
    renderSuiyan();
  });

  div.querySelector('.comment-btn').addEventListener('click', function () {
    openCommentModal(parseInt(this.dataset.idx));
  });

  return div;
}

/* ---- 随言：头像点击上传 ---- */
document.getElementById('suiyan-user-avatar').addEventListener('click', () => {
  openSuiyanAvatarModal();
});

document.getElementById('suiyan-user-name').addEventListener('click', () => {
  openSuiyanNameModal();
});

document.getElementById('suiyan-bg-btn').addEventListener('click', () => {
  document.getElementById('liao-suiyan-bg-url').value = liaoBgSrc || '';
  document.getElementById('liao-suiyan-bg-modal').style.display = 'flex';
});

/* ---- 随言：头像弹窗 ---- */
function openSuiyanAvatarModal() {
  document.getElementById('liao-suiyan-avatar-url-input').value = liaoUserAvatar || '';
  document.getElementById('liao-suiyan-avatar-modal').style.display = 'flex';
}

document.getElementById('liao-suiyan-avatar-confirm').addEventListener('click', () => {
  const url = document.getElementById('liao-suiyan-avatar-url-input').value.trim();
  if (url) {
    liaoUserAvatar = url;
    lSave('userAvatar', liaoUserAvatar);
    renderSuiyan();
  }
  document.getElementById('liao-suiyan-avatar-modal').style.display = 'none';
});

document.getElementById('liao-suiyan-avatar-local').addEventListener('click', () => {
  document.getElementById('liao-suiyan-avatar-file').click();
});

document.getElementById('liao-suiyan-avatar-file').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    liaoUserAvatar = e.target.result;
    lSave('userAvatar', liaoUserAvatar);
    document.getElementById('liao-suiyan-avatar-modal').style.display = 'none';
    renderSuiyan();
  };
  reader.readAsDataURL(file);
  this.value = '';
});

document.getElementById('liao-suiyan-avatar-cancel').addEventListener('click', () => {
  document.getElementById('liao-suiyan-avatar-modal').style.display = 'none';
});

/* ---- 随言：用户名弹窗 ---- */
function openSuiyanNameModal() {
  document.getElementById('liao-suiyan-name-input').value = liaoUserName;
  document.getElementById('liao-suiyan-name-modal').style.display = 'flex';
}

document.getElementById('liao-suiyan-name-confirm').addEventListener('click', () => {
  const name = document.getElementById('liao-suiyan-name-input').value.trim();
  if (name) {
    liaoUserName = name;
    lSave('userName', liaoUserName);
    renderSuiyan();
  }
  document.getElementById('liao-suiyan-name-modal').style.display = 'none';
});

document.getElementById('liao-suiyan-name-cancel').addEventListener('click', () => {
  document.getElementById('liao-suiyan-name-modal').style.display = 'none';
});

/* ---- 随言背景图 ---- */
document.getElementById('liao-suiyan-bg-confirm').addEventListener('click', () => {
  const url = document.getElementById('liao-suiyan-bg-url').value.trim();
  liaoBgSrc = url;
  lSave('suiyanBg', url);
  document.getElementById('liao-suiyan-bg-modal').style.display = 'none';
  renderSuiyan();
});

document.getElementById('liao-suiyan-bg-local').addEventListener('click', () => {
  document.getElementById('liao-suiyan-bg-file').click();
});

document.getElementById('liao-suiyan-bg-file').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    liaoBgSrc = e.target.result;
    lSave('suiyanBg', liaoBgSrc);
    document.getElementById('liao-suiyan-bg-modal').style.display = 'none';
    renderSuiyan();
  };
  reader.readAsDataURL(file);
});

document.getElementById('liao-suiyan-bg-cancel').addEventListener('click', () => {
  document.getElementById('liao-suiyan-bg-modal').style.display = 'none';
});

/* ---- 发随言 ---- */
document.getElementById('suiyan-post-btn').addEventListener('click', () => {
  document.getElementById('liao-post-content').value = '';
  document.getElementById('liao-post-modal').classList.add('show');
});

document.getElementById('liao-post-confirm').addEventListener('click', () => {
  const content = document.getElementById('liao-post-content').value.trim();
  if (!content) return;
  liaoSuiyan.push({ author: liaoUserName, avatar: liaoUserAvatar, content, ts: Date.now(), likes: 0, likedBy: [], comments: [], isUser: true });
  lSave('suiyan', liaoSuiyan);
  document.getElementById('liao-post-modal').classList.remove('show');
  renderSuiyan();
});

document.getElementById('liao-post-cancel').addEventListener('click', () => {
  document.getElementById('liao-post-modal').classList.remove('show');
});

/* ============================================================
   评论弹窗
   ============================================================ */
let commentTargetIdx = -1;

function openCommentModal(idx) {
  commentTargetIdx = idx;
  const post   = liaoSuiyan[idx];
  const listEl = document.getElementById('liao-comment-list');
  listEl.innerHTML = '';

  if (post.comments && post.comments.length) {
    post.comments.forEach(c => {
      const row = document.createElement('div');
      row.className = 'liao-comment-row';
      row.innerHTML = `<span class="comment-name">${escHtml(c.author)}</span>${escHtml(c.text)}`;
      listEl.appendChild(row);
    });
  } else {
    listEl.innerHTML = '<div style="font-size:12px;color:var(--text-light);padding:4px 0;">暂无评论</div>';
  }

  document.getElementById('liao-comment-input').value = '';
  document.getElementById('liao-comment-modal').classList.add('show');
}

document.getElementById('liao-comment-confirm').addEventListener('click', () => {
  const text = document.getElementById('liao-comment-input').value.trim();
  if (!text || commentTargetIdx < 0) return;
  if (!liaoSuiyan[commentTargetIdx].comments) liaoSuiyan[commentTargetIdx].comments = [];
  liaoSuiyan[commentTargetIdx].comments.push({ author: liaoUserName, text });
  lSave('suiyan', liaoSuiyan);
  document.getElementById('liao-comment-modal').classList.remove('show');
  renderSuiyan();
});

document.getElementById('liao-comment-cancel').addEventListener('click', () => {
  document.getElementById('liao-comment-modal').classList.remove('show');
});

/* ============================================================
   聊天界面
   ============================================================ */
function openChatView(chatIdx) {
  currentChatIdx = chatIdx;
  const chat = liaoChats[chatIdx];
  const role = liaoRoles.find(r => r.id === chat.roleId);
  if (!role) return;

  document.getElementById('chat-view-title').textContent = role.nickname || role.realname;
  renderChatMessages();
  document.getElementById('liao-chat-view').classList.add('show');
  setTimeout(scrollChatToBottom, 100);
}

function closeChatView() {
  document.getElementById('liao-chat-view').classList.remove('show');
  currentChatIdx = -1;
}

document.getElementById('chat-view-back').addEventListener('click', closeChatView);

function renderChatMessages() {
  if (currentChatIdx < 0) return;
  const chat = liaoChats[currentChatIdx];
  const role = liaoRoles.find(r => r.id === chat.roleId);
  const area = document.getElementById('liao-chat-messages');
  area.innerHTML = '';

  const chatUserAvatar = chat.chatUserAvatar || liaoUserAvatar;
  const roleAvatar     = (role && role.avatar) ? role.avatar : defaultAvatar();

  chat.messages.forEach(msg => {
    appendMessageBubble(msg, role, chatUserAvatar, false);
  });

  scrollChatToBottom();
}

function appendMessageBubble(msg, role, chatUserAvatar, animate) {
  const area = document.getElementById('liao-chat-messages');
  const roleAvatar = (role && role.avatar) ? role.avatar : defaultAvatar();
  const uAvatar    = chatUserAvatar || liaoUserAvatar;

  const row = document.createElement('div');
  row.className = 'chat-msg-row' + (msg.role === 'user' ? ' user-row' : '');

  if (msg.role === 'user') {
    row.innerHTML = `
      <div class="chat-msg-bubble">${escHtml(msg.content)}</div>
      <img class="chat-msg-avatar" src="${uAvatar}" alt="">`;
  } else {
    row.innerHTML = `
      <img class="chat-msg-avatar" src="${roleAvatar}" alt="">
      <div class="chat-msg-bubble">${escHtml(msg.content)}</div>`;
  }

  if (animate) {
    row.style.opacity = '0';
    row.style.transform = 'translateY(8px)';
    row.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
    area.appendChild(row);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        row.style.opacity = '1';
        row.style.transform = 'translateY(0)';
      });
    });
  } else {
    area.appendChild(row);
  }

  scrollChatToBottom();
}

function scrollChatToBottom() {
  const area = document.getElementById('liao-chat-messages');
  area.scrollTop = area.scrollHeight;
}

/* ---- 发送用户消息 ---- */
document.getElementById('chat-send-btn').addEventListener('click', sendUserMessage);
document.getElementById('chat-view-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendUserMessage();
  }
});

function sendUserMessage() {
  if (currentChatIdx < 0) return;
  const input   = document.getElementById('chat-view-input');
  const content = input.value.trim();
  if (!content) return;

  const msg = { role: 'user', content, ts: Date.now() };
  liaoChats[currentChatIdx].messages.push(msg);
  lSave('chats', liaoChats);
  input.value = '';

  const chat = liaoChats[currentChatIdx];
  const role = liaoRoles.find(r => r.id === chat.roleId);
  const chatUserAvatar = chat.chatUserAvatar || liaoUserAvatar;
  appendMessageBubble(msg, role, chatUserAvatar, true);
}

/* ============================================================
   文本拆分为多条气泡
   ============================================================ */
function splitIntoBubbles(text) {
  // 先去除所有emoji
  text = removeEmoji(text);
  // 按中文句末标点、换行拆分
  const parts = text
    .split(/(?<=[。！？…\n])|(?<=\n)/g)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (!parts.length) return [text.trim()].filter(Boolean);

  // 合并过短片段（少于2字）到下一条
  const merged = [];
  let buf = '';
  for (const p of parts) {
    buf += (buf ? '' : '') + p;
    if (buf.replace(/\s/g, '').length >= 2) {
      merged.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) merged.push(buf.trim());

  return merged.length ? merged : [text.trim()];
}

function removeEmoji(str) {
  return str.replace(
    /[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu,
    ''
  ).replace(/[\u2702-\u27B0]/gu, '').trim();
}

/* 根据字数计算延迟（毫秒） */
function calcBubbleDelay(text) {
  const len = text.replace(/\s/g, '').length;
  if (len <= 2)  return 200;
  if (len <= 5)  return 500;
  if (len <= 10) return 900;
  if (len <= 20) return 1400;
  return 2000;
}

/* ============================================================
   API 调用 — 角色分条发送
   ============================================================ */
document.getElementById('chat-api-btn').addEventListener('click', async () => {
  if (currentChatIdx < 0) return;

  const chat = liaoChats[currentChatIdx];
  const role = liaoRoles.find(r => r.id === chat.roleId);
  if (!role) return;

  const activeConfig = loadApiConfig();
  if (!activeConfig || !activeConfig.url) {
    alert('请先在设置中配置 API 地址');
    return;
  }
  const model = loadApiModel();
  if (!model) {
    alert('请先在设置中选择模型');
    return;
  }

  const btn = document.getElementById('chat-api-btn');
  btn.classList.add('loading');
  showTypingIndicator(true);

  /* 读取聊天设置 */
  const chatSettings    = chat.chatSettings    || {};
  const maxApiMsgs      = chatSettings.maxApiMsgs   !== undefined ? chatSettings.maxApiMsgs   : 0;
  const chatUserSetting = chat.chatUserSetting || '';
  const chatUserName2   = chat.chatUserName    || liaoUserName;

  /* 构建 system prompt */
  const roleSetting = role.setting || '';
  const systemPrompt =
    `你扮演角色：${role.realname}。\n` +
    (roleSetting ? `【角色设定】\n${roleSetting}\n` : '') +
    (chatUserSetting ? `【用户设定】\n对方是${chatUserName2}，${chatUserSetting}\n` : `【用户设定】\n对方叫${chatUserName2}。\n`) +
    `【回复规则】
1. 用口语短句，像发微信一样聊天，有情绪有立场。
2. 每一句话单独一条，不要把多句话写在一起，用换行分隔每一句。
3. 允许犯错、语气词、不完美的表达。
4. 不使用任何emoji或表情符号，纯文字。
5. 回复内容请完全符合角色设定，设定优先级高于上述规则。
6. 每句话之间用换行符分隔，绝对不要把所有话写成一段。`;

  /* 历史消息截取 */
  let historyMsgs = chat.messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
  if (maxApiMsgs > 0 && historyMsgs.length > maxApiMsgs) {
    historyMsgs = historyMsgs.slice(-maxApiMsgs);
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...historyMsgs
  ];

  try {
    const endpoint = activeConfig.url.replace(/\/$/, '') + '/chat/completions';
    const headers  = { 'Content-Type': 'application/json' };
    if (activeConfig.key) headers['Authorization'] = 'Bearer ' + activeConfig.key;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages, stream: false })
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const json    = await res.json();
    let rawContent = json.choices?.[0]?.message?.content || '';
    rawContent = removeEmoji(rawContent);

    showTypingIndicator(false);

    /* 拆分成多条气泡，逐条延迟显示 */
    const bubbles = splitIntoBubbles(rawContent);
    const chatUserAvatar2 = chat.chatUserAvatar || liaoUserAvatar;

    let cumulativeDelay = 0;
    bubbles.forEach((bubbleText, i) => {
      const delay = calcBubbleDelay(bubbleText);
      cumulativeDelay += (i === 0 ? 200 : delay);

      setTimeout(() => {
        const msgObj = { role: 'assistant', content: bubbleText, ts: Date.now() };
        liaoChats[currentChatIdx].messages.push(msgObj);
        lSave('chats', liaoChats);

        appendMessageBubble(msgObj, role, chatUserAvatar2, true);

        // 最后一条后刷新聊天列表预览
        if (i === bubbles.length - 1) {
          renderChatList();
          if (Math.random() < 0.10) scheduleRoleSuiyan(role, bubbleText);
        }
      }, cumulativeDelay);
    });

  } catch (err) {
    showTypingIndicator(false);
    alert('API 请求失败：' + err.message);
  } finally {
    btn.classList.remove('loading');
  }
});

function showTypingIndicator(show) {
  document.getElementById('chat-typing').classList.toggle('show', show);
  if (show) scrollChatToBottom();
}

/* ============================================================
   角色随言
   ============================================================ */
function scheduleRoleSuiyan(role, replyContent) {
  setTimeout(() => {
    const clean = removeEmoji(replyContent);
    liaoSuiyan.push({
      author:   role.nickname || role.realname,
      avatar:   role.avatar || defaultAvatar(),
      content:  clean.slice(0, 60) + (clean.length > 60 ? '...' : ''),
      ts:       Date.now(),
      likes:    0,
      likedBy:  [],
      comments: [],
      isUser:   false,
      roleId:   role.id
    });
    lSave('suiyan', liaoSuiyan);
  }, 800);
}

/* ============================================================
   聊天设置界面（全屏）
   ============================================================ */
function openChatSettings() {
  if (currentChatIdx < 0) return;
  const chat = liaoChats[currentChatIdx];
  const role = liaoRoles.find(r => r.id === chat.roleId);
  if (!role) return;

  /* 填充角色设置 */
  document.getElementById('cs-role-avatar-preview').src = role.avatar || defaultAvatar();
  document.getElementById('cs-role-avatar-url').value   = '';
  document.getElementById('cs-role-nickname').value     = role.nickname || '';
  document.getElementById('cs-role-realname').value     = role.realname || '';
  document.getElementById('cs-role-setting').value      = role.setting  || '';

  /* 填充用户设置 */
  const chatUserAvatar3 = chat.chatUserAvatar || liaoUserAvatar;
  const chatUserName3   = chat.chatUserName   || liaoUserName;
  const chatUserSetting3= chat.chatUserSetting || '';
  document.getElementById('cs-user-avatar-preview').src = chatUserAvatar3;
  document.getElementById('cs-user-avatar-url').value   = '';
  document.getElementById('cs-user-name').value         = chatUserName3;
  document.getElementById('cs-user-setting').value      = chatUserSetting3;

  /* 填充聊天美化 */
  const beauty = (chat.chatSettings && chat.chatSettings.beauty) || {};
  document.getElementById('cs-role-bubble-color').value = beauty.roleBubbleColor || '#ffffff';
  document.getElementById('cs-user-bubble-color').value = beauty.userBubbleColor || '#99C8ED';
  document.getElementById('cs-role-bubble-radius').value= beauty.roleBubbleRadius|| '16';
  document.getElementById('cs-user-bubble-radius').value= beauty.userBubbleRadius|| '16';
  document.getElementById('cs-font-size').value         = beauty.fontSize         || '13.5';
  document.getElementById('cs-custom-css').value        = beauty.customCSS        || '';

  /* 填充消息数量设置 */
  const settings = chat.chatSettings || {};
  document.getElementById('cs-max-api-msgs').value      = settings.maxApiMsgs  !== undefined ? settings.maxApiMsgs  : 0;
  document.getElementById('cs-max-load-msgs').value     = settings.maxLoadMsgs !== undefined ? settings.maxLoadMsgs : 50;

  /* 切换到第一页 */
  switchChatSettingsTab('cs-tab-role');

  document.getElementById('liao-chat-settings').classList.add('show');
}

function closeChatSettings() {
  document.getElementById('liao-chat-settings').classList.remove('show');
}

document.getElementById('chat-settings-open-btn').addEventListener('click', openChatSettings);
document.getElementById('cs-close-btn').addEventListener('click', closeChatSettings);

/* ---- 设置页标签切换 ---- */
function switchChatSettingsTab(tabId) {
  document.querySelectorAll('.cs-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cstab === tabId);
  });
  document.querySelectorAll('.cs-page').forEach(page => {
    page.classList.toggle('active', page.id === tabId + '-page');
  });
}

document.querySelectorAll('.cs-tab-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    switchChatSettingsTab(this.dataset.cstab);
  });
});

/* ---- 展开/折叠条目 ---- */
document.querySelectorAll('.cs-accordion-header').forEach(header => {
  header.addEventListener('click', function () {
    const item = this.closest('.cs-accordion-item');
    item.classList.toggle('open');
  });
});

/* ---- 角色设置：头像上传 ---- */
let csRoleAvatarSrc = '';
let csUserAvatarSrc = '';

document.getElementById('cs-role-avatar-local-btn').addEventListener('click', () => {
  document.getElementById('cs-role-avatar-file').click();
});
document.getElementById('cs-role-avatar-file').addEventListener('change', function () {
  const file = this.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    csRoleAvatarSrc = e.target.result;
    document.getElementById('cs-role-avatar-preview').src = csRoleAvatarSrc;
  };
  reader.readAsDataURL(file);
  this.value = '';
});
document.getElementById('cs-role-avatar-url').addEventListener('input', function (e) {
  const url = e.target.value.trim();
  if (url) {
    csRoleAvatarSrc = url;
    document.getElementById('cs-role-avatar-preview').src = url;
  }
});

/* ---- 角色设置：保存 ---- */
document.getElementById('cs-role-save-btn').addEventListener('click', () => {
  if (currentChatIdx < 0) return;
  const chat = liaoChats[currentChatIdx];
  const role = liaoRoles.find(r => r.id === chat.roleId);
  if (!role) return;

  if (csRoleAvatarSrc) role.avatar = csRoleAvatarSrc;
  const nn = document.getElementById('cs-role-nickname').value.trim();
  const rn = document.getElementById('cs-role-realname').value.trim();
  const st = document.getElementById('cs-role-setting').value.trim();
  if (nn) role.nickname = nn;
  if (rn) role.realname = rn;
  role.setting = st;

  lSave('roles', liaoRoles);
  csRoleAvatarSrc = '';
  document.getElementById('chat-view-title').textContent = role.nickname || role.realname;
  renderChatList();
  alert('角色设置已保存');
});

/* ---- 用户设置：头像上传 ---- */
document.getElementById('cs-user-avatar-local-btn').addEventListener('click', () => {
  document.getElementById('cs-user-avatar-file').click();
});
document.getElementById('cs-user-avatar-file').addEventListener('change', function () {
  const file = this.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    csUserAvatarSrc = e.target.result;
    document.getElementById('cs-user-avatar-preview').src = csUserAvatarSrc;
  };
  reader.readAsDataURL(file);
  this.value = '';
});
document.getElementById('cs-user-avatar-url').addEventListener('input', function (e) {
  const url = e.target.value.trim();
  if (url) {
    csUserAvatarSrc = url;
    document.getElementById('cs-user-avatar-preview').src = url;
  }
});

/* ---- 用户设置：保存 ---- */
document.getElementById('cs-user-save-btn').addEventListener('click', () => {
  if (currentChatIdx < 0) return;
  const chat = liaoChats[currentChatIdx];
  if (csUserAvatarSrc) chat.chatUserAvatar = csUserAvatarSrc;
  const un = document.getElementById('cs-user-name').value.trim();
  const us = document.getElementById('cs-user-setting').value.trim();
  if (un) chat.chatUserName = un;
  chat.chatUserSetting = us;
  lSave('chats', liaoChats);
  csUserAvatarSrc = '';
  alert('用户设置已保存');
});

/* ---- 聊天美化：保存 ---- */
document.getElementById('cs-beauty-save-btn').addEventListener('click', () => {
  if (currentChatIdx < 0) return;
  const chat = liaoChats[currentChatIdx];
  if (!chat.chatSettings) chat.chatSettings = {};
  const beauty = {
    roleBubbleColor:  document.getElementById('cs-role-bubble-color').value,
    userBubbleColor:  document.getElementById('cs-user-bubble-color').value,
    roleBubbleRadius: document.getElementById('cs-role-bubble-radius').value,
    userBubbleRadius: document.getElementById('cs-user-bubble-radius').value,
    fontSize:         document.getElementById('cs-font-size').value,
    customCSS:        document.getElementById('cs-custom-css').value
  };
  chat.chatSettings.beauty = beauty;
  lSave('chats', liaoChats);
  applyBeautySettings(beauty);
  alert('美化设置已保存');
});

/* ---- 聊天美化：重置 ---- */
document.getElementById('cs-beauty-reset-btn').addEventListener('click', () => {
  if (currentChatIdx < 0) return;
  const chat = liaoChats[currentChatIdx];
  if (chat.chatSettings) chat.chatSettings.beauty = {};
  lSave('chats', liaoChats);
  applyBeautySettings({});
  document.getElementById('cs-role-bubble-color').value  = '#ffffff';
  document.getElementById('cs-user-bubble-color').value  = '#99C8ED';
  document.getElementById('cs-role-bubble-radius').value = '16';
  document.getElementById('cs-user-bubble-radius').value = '16';
  document.getElementById('cs-font-size').value          = '13.5';
  document.getElementById('cs-custom-css').value         = '';
  alert('美化已重置');
});

function applyBeautySettings(beauty) {
  const styleId = 'liao-beauty-style';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const rColor  = beauty.roleBubbleColor  || '#ffffff';
  const uColor  = beauty.userBubbleColor  || '#99C8ED';
  const rRadius = beauty.roleBubbleRadius || '16';
  const uRadius = beauty.userBubbleRadius || '16';
  const fSize   = beauty.fontSize         || '13.5';
  const custom  = beauty.customCSS        || '';

  styleEl.textContent = `
    #liao-chat-messages .chat-msg-row:not(.user-row) .chat-msg-bubble {
      background: ${rColor} !important;
      border-radius: 4px ${rRadius}px ${rRadius}px ${rRadius}px !important;
      font-size: ${fSize}px !important;
    }
    #liao-chat-messages .chat-msg-row.user-row .chat-msg-bubble {
      background: ${uColor} !important;
      border-radius: ${uRadius}px 4px ${uRadius}px ${uRadius}px !important;
      font-size: ${fSize}px !important;
    }
    ${custom}
  `;
}

/* ---- 消息数量设置：保存 ---- */
document.getElementById('cs-msgs-save-btn').addEventListener('click', () => {
  if (currentChatIdx < 0) return;
  const chat = liaoChats[currentChatIdx];
  if (!chat.chatSettings) chat.chatSettings = {};
  chat.chatSettings.maxApiMsgs  = parseInt(document.getElementById('cs-max-api-msgs').value)  || 0;
  chat.chatSettings.maxLoadMsgs = parseInt(document.getElementById('cs-max-load-msgs').value) || 50;
  lSave('chats', liaoChats);
  alert('消息数量设置已保存');
});

/* ---- 进入聊天界面时应用美化 ---- */
function applyCurrentChatBeauty() {
  if (currentChatIdx < 0) return;
  const chat    = liaoChats[currentChatIdx];
  const beauty  = (chat.chatSettings && chat.chatSettings.beauty) || {};
  applyBeautySettings(beauty);
}

/* ============================================================
   新建群聊弹窗
   ============================================================ */
document.getElementById('liao-group-confirm').addEventListener('click', () => {
  const name = document.getElementById('liao-group-name').value.trim();
  if (!name) { alert('请填写群聊名称'); return; }
  alert('群聊「' + name + '」功能建设中，敬请期待');
  document.getElementById('liao-new-group-modal').classList.remove('show');
});
document.getElementById('liao-group-cancel').addEventListener('click', () => {
  document.getElementById('liao-new-group-modal').classList.remove('show');
});

/* ============================================================
   文件导入角色
   ============================================================ */
document.getElementById('liao-import-file-btn').addEventListener('click', () => {
  document.getElementById('liao-import-file').click();
});

document.getElementById('liao-import-file').addEventListener('change', function () {
  const file = this.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data  = JSON.parse(e.target.result);
      const roles = Array.isArray(data) ? data : [data];
      let imported = 0;
      roles.forEach(r => {
        if (!r.id) r.id = 'role_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        if (!r.nickname && !r.realname) return;
        r.nickname = r.nickname || r.realname;
        r.realname = r.realname || r.nickname;
        r.avatar   = r.avatar   || defaultAvatar();
        r.setting  = r.setting  || '';
        if (!liaoRoles.find(ex => ex.id === r.id)) {
          liaoRoles.push(r);
          liaoChats.push({ roleId: r.id, messages: [], chatUserName: liaoUserName, chatUserAvatar: liaoUserAvatar, chatUserSetting: '' });
          imported++;
        }
      });
      lSave('roles', liaoRoles);
      lSave('chats', liaoChats);
      document.getElementById('liao-import-modal').classList.remove('show');
      renderChatList();
      renderRoleLib();
      alert('成功导入 ' + imported + ' 个角色');
    } catch (err) {
      alert('导入失败：JSON 格式错误');
    }
  };
  reader.readAsText(file);
  this.value = '';
});

document.getElementById('liao-import-cancel').addEventListener('click', () => {
  document.getElementById('liao-import-modal').classList.remove('show');
});

/* ============================================================
   工具函数
   ============================================================ */
function defaultAvatar() {
  return 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=default';
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(ts) {
  if (!ts) return '';
  const now  = new Date();
  const date = new Date(ts);
  const diff = now - date;
  if (diff < 60000)    return '刚刚';
  if (diff < 3600000)  return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  const h  = String(date.getHours()).padStart(2, '0');
  const m  = String(date.getMinutes()).padStart(2, '0');
  const mo = date.getMonth() + 1;
  const d  = date.getDate();
  if (now.getFullYear() === date.getFullYear()) return mo + '/' + d + ' ' + h + ':' + m;
  return date.getFullYear() + '/' + mo + '/' + d;
}

function loadApiConfig() {
  try {
    const v = localStorage.getItem('halo9_apiActiveConfig');
    return v ? JSON.parse(v) : null;
  } catch (e) { return null; }
}

function loadApiModel() {
  try {
    const v = localStorage.getItem('halo9_apiCurrentModel');
    return v ? JSON.parse(v) : '';
  } catch (e) { return ''; }
}

/* ============================================================
   弹窗遮罩点击关闭
   ============================================================ */
[
  'liao-new-role-modal',
  'liao-new-group-modal',
  'liao-import-modal',
  'liao-post-modal',
  'liao-comment-modal'
].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('show');
  });
});

[
  'liao-suiyan-bg-modal',
  'liao-suiyan-avatar-modal',
  'liao-suiyan-name-modal'
].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', function (e) {
    if (e.target === this) this.style.display = 'none';
  });
});
