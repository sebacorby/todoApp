const button = document.createElement("button");
button.type = "button";
button.className = "dashboard-back-to-top";
button.setAttribute("aria-label", "Volver arriba");
button.title = "Volver arriba";
button.innerHTML = "↑";
document.body.append(button);

function isDashboard() {
  return Boolean(document.querySelector('.nav-item[data-view="dashboard"].active'));
}

function syncButton() {
  button.classList.toggle("show", isDashboard() && window.scrollY > 320);
}

button.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", syncButton, { passive: true });
window.addEventListener("resize", syncButton);

document.querySelectorAll(".nav-item[data-view]").forEach(item => {
  item.addEventListener("click", () => requestAnimationFrame(syncButton));
});

new MutationObserver(syncButton).observe(document.querySelector("#content"), {
  childList: true,
  subtree: false,
});

const style = document.createElement("style");
style.dataset.dashboardBackToTop = "";
style.textContent = `
.dashboard-back-to-top{
  position:fixed;
  right:24px;
  bottom:24px;
  z-index:30;
  width:44px;
  height:44px;
  border:1px solid var(--border);
  border-radius:14px;
  background:var(--accent);
  color:#10131a;
  font-size:24px;
  font-weight:900;
  line-height:1;
  display:grid;
  place-items:center;
  opacity:0;
  transform:translateY(10px);
  pointer-events:none;
  transition:opacity .18s ease,transform .18s ease;
}
.dashboard-back-to-top.show{
  opacity:1;
  transform:none;
  pointer-events:auto;
}
.dashboard{
  min-height:100%;
}
@media(max-width:720px){
  .dashboard-back-to-top{
    right:16px;
    bottom:16px;
  }
}
`;
document.head.append(style);

syncButton();
