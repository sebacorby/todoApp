
import { allBacklogGroups, saveBacklogGroup } from "./db.js";

let dialog;
let form;
let input;
let title;
let submit;
let mode = "create";
let parentId = null;
let groupId = null;

function ensureDialog() {
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.className = "backlog-folder-dialog";
  dialog.dataset.backlogFolderDialog = "";
  dialog.innerHTML = `
    <form method="dialog" data-folder-dialog-form>
      <div class="modal-head">
        <div>
          <p class="eyebrow">BACKLOG</p>
          <h2 data-folder-dialog-title>Nueva carpeta</h2>
        </div>
        <button type="button" class="icon-button" data-folder-dialog-close aria-label="Cerrar">×</button>
      </div>
      <label>Nombre
        <input data-folder-dialog-name maxlength="80" autocomplete="off" required>
      </label>
      <p class="form-error" data-folder-dialog-error role="alert"></p>
      <div class="modal-actions">
        <span></span>
        <button type="button" class="secondary" data-folder-dialog-cancel>Cancelar</button>
        <button class="primary" data-folder-dialog-submit>Crear</button>
      </div>
    </form>`;
  document.body.append(dialog);

  form = dialog.querySelector("[data-folder-dialog-form]");
  input = dialog.querySelector("[data-folder-dialog-name]");
  title = dialog.querySelector("[data-folder-dialog-title]");
  submit = dialog.querySelector("[data-folder-dialog-submit]");

  const close = () => dialog.open && dialog.close();
  dialog.querySelector("[data-folder-dialog-close]").onclick = close;
  dialog.querySelector("[data-folder-dialog-cancel]").onclick = close;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const name = input.value.trim();
    const error = dialog.querySelector("[data-folder-dialog-error]");
    error.textContent = "";
    if (!name) {
      error.textContent = "El nombre de la carpeta es obligatorio.";
      input.focus();
      return;
    }

    try {
      const groups = await allBacklogGroups();
      let savedId = groupId;

      if (mode === "rename" && groupId) {
        const group = groups.find(item => item.id === groupId);
        if (!group) throw new Error("La carpeta ya no existe.");
        await saveBacklogGroup({
          ...group,
          name,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const siblings = groups.filter(item => (item.parentId ?? null) === (parentId ?? null));
        const groupOrder = siblings.length
          ? Math.max(...siblings.map(item => item.groupOrder ?? 0)) + 1
          : 0;
        savedId = await saveBacklogGroup({ name, parentId, groupOrder });
      }

      dialog.close();
      await window.todoRenderApp?.();

      if (mode === "create" && savedId) {
        const refreshed = await allBacklogGroups();
        const chain = [];
        let current = refreshed.find(item => item.id === Number(savedId));
        while (current) {
          chain.unshift(current.id);
          current = current.parentId == null
            ? null
            : refreshed.find(item => item.id === Number(current.parentId));
        }
        for (const id of chain) {
          const toggle = document.querySelector(`[data-group-toggle="${id}"]`);
          if (toggle?.getAttribute("aria-expanded") === "false") toggle.click();
        }
      }
    } catch (error) {
      error = error instanceof Error ? error : new Error(String(error));
      dialog.querySelector("[data-folder-dialog-error]").textContent = error.message;
    }
  });

  return dialog;
}

async function openDialog({ kind, parent = null, id = null }) {
  ensureDialog();
  mode = kind;
  parentId = parent;
  groupId = id;
  input.value = "";
  dialog.querySelector("[data-folder-dialog-error]").textContent = "";

  if (kind === "rename") {
    const groups = await allBacklogGroups();
    const group = groups.find(item => item.id === Number(id));
    if (!group) return;
    parentId = group.parentId ?? null;
    input.value = group.name;
    title.textContent = "Renombrar carpeta";
    submit.textContent = "Guardar";
  } else {
    title.textContent = parent == null ? "Nueva carpeta" : "Nueva subcarpeta";
    submit.textContent = "Crear";
  }

  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

document.addEventListener("click", event => {
  const root = event.target.closest("[data-root-group-add]");
  const child = event.target.closest("[data-group-add]");
  const rename = event.target.closest("[data-group-rename]");
  if (!root && !child && !rename) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  if (root) {
    openDialog({ kind: "create", parent: null });
  } else if (child) {
    openDialog({ kind: "create", parent: Number(child.dataset.groupAdd) });
  } else {
    openDialog({ kind: "rename", id: Number(rename.dataset.groupRename) });
  }
}, true);
