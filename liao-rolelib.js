/* ============================================================
   liao-rolelib.js — 角色库
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
