/* ============================================================
   liao-myhome.js — 我的主页
   ============================================================ */

document.querySelectorAll('.my-menu-item').forEach(item => {
  item.addEventListener('click', function () {
    const title = this.querySelector('.my-menu-title').textContent;
    alert(`「${title}」功能建设中，敬请期待`);
  });
});
