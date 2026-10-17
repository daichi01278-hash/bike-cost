// バイク維持費・売り時の計算ロジック(ブラウザとNodeの両方で動く純粋関数のみ)。
// 料金表は data.mjs。出典と確認状況もそこに書く。
import { RATES } from "./data.mjs";

export function classify(cc) {
  if (!Number.isFinite(cc) || cc <= 0) throw new Error("排気量(cc)を正の数で入力してください");
  if (cc <= 50) return "gentsuki1";
  if (cc <= 125) return "gentsuki2";
  if (cc <= 250) return "kei2";
  return "kogata2";
}

export const CLASS_LABEL = {
  gentsuki1: "原付一種(50cc以下)",
  gentsuki2: "原付二種(51〜125cc)",
  kei2: "軽二輪(126〜250cc)",
  kogata2: "小型二輪(251cc以上・車検あり)",
};

export function keiTax(cc) {
  const t = RATES.keiTax;
  if (cc <= 50) return t.upTo50;
  if (cc <= 90) return t.upTo90;
  if (cc <= 125) return t.upTo125;
  if (cc <= 250) return t.upTo250;
  return t.over250;
}

// 小型二輪の重量税(車検2年分)。初度検査年月から検査を受ける月までの経過月数で区分。
// 国交省の基準では12年10か月以後が「13年経過」、17年10か月以後が「18年経過」。
export function weightTax2y(elapsedMonths) {
  const w = RATES.weightTaxKogata2y;
  if (elapsedMonths >= 17 * 12 + 10) return w.from18;
  if (elapsedMonths >= 12 * 12 + 10) return w.from13;
  return w.base;
}

export function elapsedMonths(firstRegYear, firstRegMonth, date) {
  return (date.getFullYear() - firstRegYear) * 12 + (date.getMonth() + 1 - firstRegMonth);
}

function inspectionDate(input, today) {
  if (input.shakenExpiry) {
    const [y, mo] = String(input.shakenExpiry).split("-").map(Number);
    if (y && mo) return new Date(y, mo - 1, 1);
  }
  return today;
}

export function ageYears(firstRegYear, firstRegMonth, today) {
  return Math.max(0, Math.floor(elapsedMonths(firstRegYear, firstRegMonth, today) / 12));
}

/**
 * 年間維持費。入力はすべて円・km・km/L。
 * @returns {{cls:string, items:{key:string,label:string,yen:number,note?:string}[], annual:number, monthly:number}}
 */
export function annualCost(input, today = new Date()) {
  const cc = Number(input.cc);
  const cls = classify(cc);
  const age = ageYears(Number(input.firstRegYear), Number(input.firstRegMonth || 1), today);
  const items = [];

  items.push({ key: "keiTax", label: "軽自動車税(種別割)", yen: keiTax(cc) });

  const jibai = RATES.jibaiseki24[cls === "gentsuki2" ? "gentsuki1" : cls];
  items.push({ key: "jibaiseki", label: "自賠責保険(24か月契約の1年分)", yen: Math.round(jibai / 2) });

  if (cls === "kogata2") {
    const at = inspectionDate(input, today);
    const wt = weightTax2y(elapsedMonths(Number(input.firstRegYear), Number(input.firstRegMonth || 1), at));
    items.push({ key: "weightTax", label: "重量税(車検ごと÷2)", yen: Math.round(wt / 2), note: `初度登録から${age}年` });
    const shaken = Number(input.inspectionFee ?? RATES.inspectionStampFee) + Number(input.shakenService ?? 0);
    items.push({ key: "shaken", label: "車検の検査手数料+整備・代行費(÷2)", yen: Math.round(shaken / 2) });
  }

  const km = Number(input.kmPerYear || 0);
  const kmpl = Number(input.kmPerLiter || 0);
  const fuel = kmpl > 0 ? Math.round((km / kmpl) * Number(input.fuelPrice || 0)) : 0;
  items.push({ key: "fuel", label: "ガソリン代", yen: fuel, note: `${km.toLocaleString()}km ÷ ${kmpl}km/L` });

  items.push({ key: "insurance", label: "任意保険", yen: Math.round(Number(input.insurance || 0)) });
  items.push({ key: "parking", label: "駐輪場(月額×12)", yen: Math.round(Number(input.parkingMonthly || 0) * 12) });
  items.push({ key: "maintenance", label: "メンテナンス(オイル・タイヤ等)", yen: Math.round(Number(input.maintenance || 0)) });

  const annual = items.reduce((s, i) => s + i.yen, 0);
  return { cls, age, items, annual, monthly: Math.round(annual / 12) };
}

/** 売却・手放すタイミングのヒント。事実に基づく制度のみ(査定額の予想はしない)。 */
export function sellHints(input, today = new Date()) {
  const cc = Number(input.cc);
  const cls = classify(cc);
  const hints = [];
  const m = today.getMonth() + 1;
  const tax = keiTax(cc);

  if (m >= 1 && m <= 3) {
    hints.push({
      level: "act",
      text: `軽自動車税は4月1日時点の所有者に1年分(${tax.toLocaleString()}円)かかります。手放すなら3月中に名義変更・廃車の手続きを終えると今年度分を払わずに済みます(月割の還付はありません)。`,
    });
  } else {
    hints.push({
      level: "info",
      text: `軽自動車税(${tax.toLocaleString()}円)は4月1日時点の所有者に1年分かかり、月割の還付はありません。手放す予定があるなら1〜3月の手続き完了が目安です。`,
    });
  }

  if (cls === "kogata2" && input.shakenExpiry) {
    const [y, mo] = String(input.shakenExpiry).split("-").map(Number);
    const monthsLeft = (y - today.getFullYear()) * 12 + (mo - m);
    const months = elapsedMonths(Number(input.firstRegYear), Number(input.firstRegMonth || 1), new Date(y, mo - 1, 1));
    const cost = weightTax2y(months) + RATES.jibaiseki24.kogata2 + Number(input.inspectionFee ?? RATES.inspectionStampFee) + Number(input.shakenService ?? 0);
    if (monthsLeft >= 0 && monthsLeft <= 3) {
      hints.push({
        level: "act",
        text: `車検満了まで約${monthsLeft}か月です。次の車検には約${cost.toLocaleString()}円(重量税・自賠責・手数料・整備代の入力値の合計)かかります。手放すつもりなら車検を通す前の売却で、この出費を避けられます。`,
      });
    } else if (monthsLeft > 3) {
      hints.push({ level: "info", text: `次の車検(満了まで約${monthsLeft}か月)の見込み費用は約${cost.toLocaleString()}円です。` });
    } else {
      hints.push({ level: "warn", text: "車検の満了日が過ぎています。車検切れのバイクは公道を走れません。" });
    }
  }

  if (cls === "kogata2") {
    const months = elapsedMonths(Number(input.firstRegYear), Number(input.firstRegMonth || 1), today);
    for (const threshold of [13, 18]) {
      const switchAt = (threshold - 1) * 12 + 10;
      if (months < switchAt && months >= switchAt - 24) {
        const before = weightTax2y(switchAt - 1);
        const after = weightTax2y(switchAt);
        hints.push({
          level: "info",
          text: `初度登録から${threshold - 1}年10か月(${threshold}年経過の扱い)以後の車検では、重量税が${before.toLocaleString()}円から${after.toLocaleString()}円に上がります(現在${Math.floor(months / 12)}年${months % 12}か月)。`,
        });
      }
    }
  }
  return hints;
}
