// フォーム ⇄ 計算ロジックの接続。状態はURLのクエリにだけ持つ(保存・送信しない)。
import { annualCost, sellHints, classify, CLASS_LABEL } from "./calc.mjs";

const form = document.getElementById("calc");
const out = document.getElementById("result");
const FIELDS = ["cc", "firstRegYear", "firstRegMonth", "shakenExpiry", "kmPerYear", "kmPerLiter", "fuelPrice", "insurance", "parkingMonthly", "maintenance", "shakenService"];

const yen = (n) => n.toLocaleString("ja-JP") + "円";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function readForm() {
  const v = {};
  for (const f of FIELDS) v[f] = form.elements[f].value;
  return v;
}

function render() {
  const v = readForm();
  let cls;
  try {
    cls = classify(Number(v.cc));
  } catch (e) {
    out.innerHTML = `<p class="err">${esc(e.message)}</p>`;
    return;
  }
  document.querySelectorAll("[data-only=kogata2]").forEach((el) => (el.hidden = cls !== "kogata2"));
  const r = annualCost(v);
  const hints = sellHints(v);
  out.innerHTML = `
    <p class="total">年間 <strong>${yen(r.annual)}</strong> <span>(月あたり ${yen(r.monthly)})</span></p>
    <p class="cls">${esc(CLASS_LABEL[cls])}</p>
    <table><tbody>${r.items
      .map((i) => `<tr><th>${esc(i.label)}</th><td>${yen(i.yen)}</td><td class="note">${esc(i.note || "")}</td></tr>`)
      .join("")}</tbody></table>
    <h3>手放す・乗り換えるタイミング</h3>
    <ul class="hints">${hints.map((h) => `<li class="${h.level}">${esc(h.text)}</li>`).join("")}</ul>`;
  const q = new URLSearchParams(v);
  history.replaceState(null, "", "?" + q.toString());
}

// URLのクエリがあれば初期値を上書き(共有リンク用)
const params = new URLSearchParams(location.search);
for (const f of FIELDS) if (params.has(f)) form.elements[f].value = params.get(f);

form.addEventListener("input", render);
render();
