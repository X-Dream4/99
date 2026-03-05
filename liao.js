/* ============================================================
   liao.js — 了了 App 全部逻辑
   ============================================================ */

/* ---------- 存取工具（复用 halo9 前缀） ---------- */
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
let liaoRoles    = lLoad('roles', []);        // 所有角色
let liaoChats    = lLoad('chats', []);         // 聊天列表（每项含roleId、messages[]）
let liaoSuiyan   = lLoad('suiyan', []);        // 随言列表
let liaoUserName = lLoad('userName', '用户');
let liaoUserAvatar = lLoad('userAvatar',
  'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=user');
let liaoBgSrc    = lLoad('suiyanBg', '');

/* 当前正在查看的聊天索引 */
let currentChatIdx = -1;

/* ============================================================
   入口绑定：点击了了App图标打开
   ============================================================ */
function bindLiaoEntry() {
  // 主屏 data-app="chat"
  document.querySelectorAll('[data-app="chat"]').forEach(el => {
    el.addEventListener('click', openLiaoApp);
  });
  // Dock #dock-chat
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
const TAB_IDS = ['chatlist', 'rolelib', 'myhome', 'suiyan'];

function switchLiaoTab(tabId) {
  document.querySelectorAll('.liao-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.liao-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.panel === tabId);
  });
  // 切换时刷新对应面板
  if (tabId === 'chatlist')  renderChatList();
  if (tabId === 'rolelib')   renderRoleLib();
  if (tabId === 'suiyan')    renderSuiyan();
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
    list.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:var(--text-light);font-size:13px;">
        还没有聊天，点击下方新建角色开始吧
      </div>`;
    return;
  }

  liaoChats.forEach((chat, idx) => {
    const role = liaoRoles.find(r => r.id === chat.roleId);
    if (!role) return;
    const lastMsg = chat.messages.length
      ? chat.messages[chat.messages.length - 1].content
      : '暂无消息';
    const lastTime = chat.messages.length
      ? formatTime(chat.messages[chat.messages.length - 1].ts)
      : '';

    const item = document.createElement('div');
    item.className = 'chat-list-item';
    item.innerHTML = `
      <img class="chat-item-avatar" src="${role.avatar || defaultAvatar()}" alt="">
      <div class="chat-item-body">
        <div class="chat-item-name">${role.nickname || role.realname}</div>
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
   底部操作栏按钮
   ============================================================ */
document.getElementById('liao-btn-new-role').addEventListener('click', () => {
  openNewRoleModal();
});
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

/* 头像URL输入实时预览 */
document.getElementById('liao-role-avatar-url').addEventListener('input', function () {
  const url = this.value.trim();
  if (url) {
    document.getElementById('liao-role-avatar-preview').src = url;
    newRoleAvatarSrc = url;
  }
});

/* 头像本地上传 */
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

/* 确认新建角色 */
document.getElementById('liao-role-confirm-btn').addEventListener('click', () => {
  const nickname = document.getElementById('liao-role-nickname').value.trim();
  const realname = document.getElementById('liao-role-realname').value.trim();
  const setting  = document.getElementById('liao-role-setting').value.trim();

  if (!nickname && !realname) {
    alert('请至少填写备注名或真实名字');
    return;
  }

  const role = {
    id:       'role_' + Date.now(),
    nickname: nickname || realname,
    realname: realname || nickname,
    avatar:   newRoleAvatarSrc || defaultAvatar(),
    setting:  setting
  };

  liaoRoles.push(role);
  lSave('roles', liaoRoles);

  // 同步新建聊天
  const chat = {
    roleId:   role.id,
    messages: []
  };
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
    // 点击角色卡片跳转到对应聊天
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
// 四个入口仅做框架占位，点击提示
document.querySelectorAll('.my-menu-item').forEach(item => {
  item.addEventListener('click', function () {
    const title = this.querySelector('.my-menu-title').textContent;
    alert(`「${title}」功能建设中，敬请期待～`);
  });
});

/* ============================================================
   ④ 随言
   ============================================================ */
function renderSuiyan() {
  // 背景图
  const header = document.getElementById('suiyan-header');
  if (liaoBgSrc) {
    header.style.backgroundImage = `url(${liaoBgSrc})`;
  }

  // 用户信息
  document.getElementById('suiyan-user-avatar').src  = liaoUserAvatar;
  document.getElementById('suiyan-user-name').textContent = liaoUserName;

  // 列表
  const list = document.getElementById('suiyan-list');
  list.innerHTML = '';

  if (!liaoSuiyan.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:30px 20px;color:var(--text-light);font-size:13px;">
        还没有随言，点击右上角 ＋ 发布第一条吧
      </div>`;
    return;
  }

  // 倒序展示（最新在上）
  [...liaoSuiyan].reverse().forEach((post, revIdx) => {
    const realIdx = liaoSuiyan.length - 1 - revIdx;
    const item = buildSuiyanItem(post, realIdx);
    list.appendChild(item);
  });
}

function buildSuiyanItem(post, idx) {
  const div = document.createElement('div');
  div.className = 'suiyan-item';

  const likedByUser = post.likedBy && post.likedBy.includes('user');

  // 评论HTML
  let commentsHtml = '';
  if (post.comments && post.comments.length) {
    const rows = post.comments.map(c =>
      `<div class="suiyan-comment-item">
        <span class="suiyan-comment-author">${escHtml(c.author)}</span>${escHtml(c.text)}
      </div>`
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
        <span class="action-icon">${likedByUser ? '❤️' : '🤍'}</span>
        <span class="like-count">${post.likes || 0}</span>
      </button>
      <button class="suiyan-action-btn comment-btn" data-idx="${idx}">
        <span class="action-icon">💬</span>
        <span>${post.comments ? post.comments.length : 0}</span>
      </button>
    </div>
    ${commentsHtml}`;

  // 点赞
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

  // 评论
  div.querySelector('.comment-btn').addEventListener('click', function () {
    openCommentModal(parseInt(this.dataset.idx));
  });

  return div;
}

/* 发随言按钮 */
document.getElementById('suiyan-post-btn').addEventListener('click', () => {
  document.getElementById('liao-post-content').value = '';
  document.getElementById('liao-post-modal').classList.add('show');
});

/* 确认发随言 */
document.getElementById('liao-post-confirm').addEventListener('click', () => {
  const content = document.getElementById('liao-post-content').value.trim();
  if (!content) return;

  liaoSuiyan.push({
    author:  liaoUserName,
    avatar:  liaoUserAvatar,
    content: content,
    ts:      Date.now(),
    likes:   0,
    likedBy: [],
    comments: [],
    isUser:  true
  });
  lSave('suiyan', liaoSuiyan);
  document.getElementById('liao-post-modal').classList.remove('show');
  renderSuiyan();
});

document.getElementById('liao-post-cancel').addEventListener('click', () => {
  document.getElementById('liao-post-modal').classList.remove('show');
});

/* 背景图更换 */
document.getElementById('suiyan-bg-btn').addEventListener('click', () => {
  document.getElementById('liao-suiyan-bg-url').value = liaoBgSrc || '';
  document.getElementById('liao-suiyan-bg-modal').classList.add('show');
});

document.getElementById('liao-suiyan-bg-confirm').addEventListener('click', () => {
  const url = document.getElementById('liao-suiyan-bg-url').value.trim();
  liaoBgSrc = url;
  lSave('suiyanBg', url);
  document.getElementById('liao-suiyan-bg-modal').classList.remove('show');
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
    document.getElementById('liao-suiyan-bg-modal').classList.remove('show');
    renderSuiyan();
  };
  reader.readAsDataURL(file);
});

document.getElementById('liao-suiyan-bg-cancel').addEventListener('click', () => {
  document.getElementById('liao-suiyan-bg-modal').classList.remove('show');
});

/* ============================================================
   评论弹窗
   ============================================================ */
let commentTargetIdx = -1;

function openCommentModal(idx) {
  commentTargetIdx = idx;
  const post = liaoSuiyan[idx];
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

  if (!liaoSuiyan[commentTargetIdx].comments) {
    liaoSuiyan[commentTargetIdx].comments = [];
  }
  liaoSuiyan[commentTargetIdx].comments.push({
    author: liaoUserName,
    text:   text
  });
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

  document.getElementById('chat-view-title').textContent =
    role.nickname || role.realname;
  renderChatMessages();
  document.getElementById('liao-chat-view').classList.add('show');

  // 滚动到底部
  setTimeout(scrollChatToBottom, 80);
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

  chat.messages.forEach(msg => {
    const row = document.createElement('div');
    row.className = 'chat-msg-row' + (msg.role === 'user' ? ' user-row' : '');

    if (msg.role === 'user') {
      row.innerHTML = `
        <div class="chat-msg-bubble">${escHtml(msg.content)}</div>
        <img class="chat-msg-avatar" src="${liaoUserAvatar}" alt="">`;
    } else {
      row.innerHTML = `
        <img class="chat-msg-avatar" src="${role ? role.avatar : defaultAvatar()}" alt="">
        <div class="chat-msg-bubble">${escHtml(msg.content)}</div>`;
    }
    area.appendChild(row);
  });

  scrollChatToBottom();
}

function scrollChatToBottom() {
  const area = document.getElementById('liao-chat-messages');
  area.scrollTop = area.scrollHeight;
}

/* 发送用户消息（Enter键或发送按钮） */
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

  liaoChats[currentChatIdx].messages.push({
    role:    'user',
    content: content,
    ts:      Date.now()
  });
  lSave('chats', liaoChats);
  input.value = '';
  renderChatMessages();
}

/* API 调用按钮（手动触发，不自动调用） */
document.getElementById('chat-api-btn').addEventListener('click', async () => {
  if (currentChatIdx < 0) return;

  const chat = liaoChats[currentChatIdx];
  const role = liaoRoles.find(r => r.id === chat.roleId);
  if (!role) return;

  // 读取 API 配置
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

  // 构建消息列表（系统提示 + 历史消息）
  const systemPrompt = role.setting
    ? `你是${role.realname}，角色设定如下：\n${role.setting}\n请严格按照角色设定来回复，不要跳出角色。`
    : `你是${role.realname}，请保持角色特征进行对话。`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chat.messages.map(m => ({ role: m.role, content: m.content }))
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
    const content = json.choices?.[0]?.message?.content || '（无回复）';

    liaoChats[currentChatIdx].messages.push({
      role:    'assistant',
      content: content,
      ts:      Date.now()
    });
    lSave('chats', liaoChats);
    renderChatMessages();

    // 角色也可在随言中互动（随机10%概率发随言）
    if (Math.random() < 0.10) {
      scheduleRoleSuiyan(role, content);
    }

  } catch (err) {
    alert('API 请求失败：' + err.message);
  } finally {
    btn.classList.remove('loading');
    showTypingIndicator(false);
  }
});

function showTypingIndicator(show) {
  document.getElementById('chat-typing').classList.toggle('show', show);
  if (show) scrollChatToBottom();
}

/* ============================================================
   角色随机发随言
   ============================================================ */
function scheduleRoleSuiyan(role, replyContent) {
  setTimeout(() => {
    liaoSuiyan.push({
      author:   role.nickname || role.realname,
      avatar:   role.avatar || defaultAvatar(),
      content:  replyContent.slice(0, 60) + (replyContent.length > 60 ? '…' : ''),
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
   新建群聊弹窗（框架占位）
   ============================================================ */
document.getElementById('liao-group-confirm').addEventListener('click', () => {
  const name = document.getElementById('liao-group-name').value.trim();
  if (!name) { alert('请填写群聊名称'); return; }
  alert('群聊「' + name + '」功能建设中，敬请期待～');
  document.getElementById('liao-new-group-modal').classList.remove('show');
});
document.getElementById('liao-group-cancel').addEventListener('click', () => {
  document.getElementById('liao-new-group-modal').classList.remove('show');
});

/* ============================================================
   文件导入角色弹窗
   ============================================================ */
document.getElementById('liao-import-file-btn').addEventListener('click', () => {
  document.getElementById('liao-import-file').click();
});

document.getElementById('liao-import-file').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      // 支持单个角色对象或角色数组
      const roles = Array.isArray(data) ? data : [data];
      let imported = 0;
      roles.forEach(r => {
        if (!r.id) r.id = 'role_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        if (!r.nickname && !r.realname) return;
        r.nickname = r.nickname || r.realname;
        r.realname = r.realname || r.nickname;
        r.avatar   = r.avatar || defaultAvatar();
        r.setting  = r.setting || '';
        // 避免重复导入
        if (!liaoRoles.find(ex => ex.id === r.id)) {
          liaoRoles.push(r);
          liaoChats.push({ roleId: r.id, messages: [] });
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
  if (diff < 60000)      return '刚刚';
  if (diff < 3600000)    return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000)   return Math.floor(diff / 3600000) + '小时前';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
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
  'liao-comment-modal',
  'liao-suiyan-bg-modal'
].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', function (e) {
      if (e.target === this) this.classList.remove('show');
    });
  }
});
