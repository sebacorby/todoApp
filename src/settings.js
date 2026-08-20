import{getSetting,saveSetting}from"./db.js";
const $=s=>document.querySelector(s),DEF={low:"#66d9a5",medium:"#62a8ff",high:"#f6ad55",urgent:"#ff6b7a"};
async function open(){const c={...DEF,...await getSetting("criticalityColors",{})};for(const k of Object.keys(DEF))$(`[data-color="${k}"]`).value=c[k];$("#settings-dialog").showModal()}
$("#open-settings").addEventListener("click",open);$("#close-settings").addEventListener("click",()=>$("#settings-dialog").close());$("#reset-colors").addEventListener("click",()=>{for(const k of Object.keys(DEF))$(`[data-color="${k}"]`).value=DEF[k]});
$("#settings-form").addEventListener("submit",async e=>{e.preventDefault();const c={};for(const k of Object.keys(DEF))c[k]=$(`[data-color="${k}"]`).value;await saveSetting("criticalityColors",c);$("#settings-dialog").close();window.todoReloadColors?.()});
