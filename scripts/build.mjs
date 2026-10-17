// dist/ に静的サイトを生成する。ページは排気量区分ごとの少数のみ(量産しない)。
import { mkdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { DEFAULTS, DEFAULT_FUEL_PRICE, RATES } from "../src/data.mjs";
import { annualCost } from "../src/calc.mjs";

const SITE = (process.env.SITE_URL || "").replace(/\/$/, "") || "https://example.pages.dev";
if (process.env.CF_PAGES && !process.env.SITE_URL) {
  console.error("SITE_URL is not set. Cloudflare Pages > Settings > Variables: SITE_URL=https://<project>.pages.dev, then retry the deployment.");
  process.exit(1);
}
const DIST = new URL("../dist/", import.meta.url).pathname;
const thisYear = new Date().getFullYear();

const PAGES = [
  {
    path: "",
    cls: "kogata2",
    cc: 400,
    title: "バイク維持費シミュレーター|排気量・年式から年間費用と手放すタイミングを計算",
    h1: "バイクの年間維持費を計算する",
    lead: "排気量と年式、走る距離を入れると、税金・自賠責・車検・ガソリン・保険・駐輪場をまとめた年間の維持費が出ます。2026年11月からの自賠責保険料の改定にも対応しています。",
    body: [
      "250cc以下と251cc以上で、かかる費用の種類が変わります。251cc以上は2年ごとの車検があり、そのたびに重量税と自賠責保険、検査手数料、整備代がかかります。",
      "軽自動車税は4月1日時点の所有者に1年分かかります。売却や廃車を考えているなら、計算結果の「手放す・乗り換えるタイミング」も確認してください。",
    ],
  },
  {
    path: "50cc/",
    cls: "gentsuki1",
    cc: 50,
    title: "原付(50cc)の維持費はいくら?年間費用シミュレーター",
    h1: "原付(50cc)の年間維持費",
    lead: "50cc以下の原付一種の維持費を計算します。車検はなく、毎年の軽自動車税は2,000円です。",
    body: [
      "原付の任意保険は、自動車保険のファミリーバイク特約で安く入れることがあります。初期値は単独で入る場合の目安なので、契約中の金額に書き換えてください。",
      "2025年4月から、125cc以下で最高出力を4.0kW以下に抑えた「新基準原付」も原付一種として扱われます。",
    ],
  },
  {
    path: "125cc/",
    cls: "gentsuki2",
    cc: 125,
    title: "125ccバイク(原付二種)の維持費|年間費用シミュレーター",
    h1: "125cc(原付二種)の年間維持費",
    lead: "51〜125ccの原付二種の維持費を計算します。車検はなく、軽自動車税は90cc以下が2,000円、91〜125ccが2,400円です。",
    body: [
      "自賠責保険料は原付一種と同じ区分です。2026年11月1日以降に始まる契約から値上がりしています。",
      "125ccは燃費が良く、ガソリン代が維持費に占める割合は小さめです。駐輪場代と任意保険が年間費用を大きく左右します。",
    ],
  },
  {
    path: "250cc/",
    cls: "kei2",
    cc: 250,
    title: "250ccバイクの維持費|車検なし・年間費用シミュレーター",
    h1: "250cc(軽二輪)の年間維持費",
    lead: "126〜250ccの軽二輪の維持費を計算します。車検はなく、軽自動車税は3,600円です。重量税は新車の届出時に一度だけ4,900円かかります(年間費用には含めていません)。",
    body: [
      "車検がないため、同じくらいの走行距離なら400cc以上より年間で数万円安くなりやすい区分です。そのぶん点検整備は自分で計画する必要があります。",
    ],
  },
  {
    path: "400cc/",
    cls: "kogata2",
    cc: 400,
    title: "400ccバイクの維持費|車検・重量税込みの年間費用シミュレーター",
    h1: "400cc(小型二輪)の年間維持費",
    lead: "251cc以上の小型二輪の維持費を計算します。2年ごとの車検で、重量税・自賠責保険・検査手数料・整備代がかかります。軽自動車税は6,000円です。",
    body: [
      `重量税(車検2年分)は、初度検査から12年10か月以後の車検で${RATES.weightTaxKogata2y.from13.toLocaleString()}円、17年10か月以後で${RATES.weightTaxKogata2y.from18.toLocaleString()}円に上がります。年式の古いバイクほど車検ごとの法定費用が増えます。`,
      "車検の整備・代行費はお店によって大きく違います。ユーザー車検なら0円にして計算してください。",
    ],
  },
  {
    path: "oogata/",
    cls: "kogata2",
    cc: 1000,
    title: "大型バイクの維持費|1000cc前後の年間費用シミュレーター",
    h1: "大型バイク(1000cc前後)の年間維持費",
    lead: "税金と自賠責保険は400ccと同じ区分(251cc以上)です。差が出るのは燃費、タイヤなどの消耗品、任意保険です。",
    body: ["初期値のメンテナンス費は400ccと同じ目安です。タイヤ交換の頻度が高いなら上乗せしてください。"],
  },
];

function field(name, label, value, attrs = "", only = "") {
  return `<label${only ? ` data-only="${only}"` : ""}><span>${label}</span><input name="${name}" value="${value}" ${attrs}></label>`;
}

function page(p) {
  const d = { ...DEFAULTS[p.cls], cc: p.cc };
  const example = annualCost({ ...d, firstRegYear: thisYear - 5, fuelPrice: DEFAULT_FUEL_PRICE, inspectionFee: RATES.inspectionStampFee });
  const url = SITE + "/" + p.path;
  return `<!doctype html>
<html lang="ja"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${p.title}</title>
<meta name="description" content="${p.lead.slice(0, 110)}">
<link rel="icon" href="data:,">
<link rel="canonical" href="${url}">
<link rel="stylesheet" href="/style.css">
</head><body>
<header><a href="/">バイク維持費シミュレーター</a></header>
<main>
<h1>${p.h1}</h1>
<p class="lead">${p.lead}</p>
<form id="calc" onsubmit="return false">
${field("cc", "排気量(cc)", d.cc, 'type="number" min="1" step="1" required')}
${field("firstRegYear", "初度登録(年)", thisYear - 5, 'type="number" min="1960" max="2100"')}
${field("firstRegMonth", "初度登録(月)", 4, 'type="number" min="1" max="12"')}
${field("shakenExpiry", "車検満了(年-月)", "", 'type="month"', "kogata2")}
${field("kmPerYear", "年間走行距離(km)", d.kmPerYear, 'type="number" min="0" step="100"')}
${field("kmPerLiter", "燃費(km/L)", d.kmPerLiter, 'type="number" min="0" step="0.1"')}
${field("fuelPrice", "ガソリン単価(円/L)", DEFAULT_FUEL_PRICE, 'type="number" min="0"')}
${field("insurance", "任意保険(円/年)", d.insurance, 'type="number" min="0" step="1000"')}
${field("parkingMonthly", "駐輪場(円/月)", d.parkingMonthly, 'type="number" min="0" step="500"')}
${field("maintenance", "メンテナンス(円/年)", d.maintenance, 'type="number" min="0" step="1000"')}
${field("shakenService", "車検の整備・代行費(円/回)", d.shakenService, 'type="number" min="0" step="1000"', "kogata2")}
</form>
<section id="result" aria-live="polite"><noscript>
<p>計算にはJavaScriptが必要です。参考: ${p.cc}cc・初期値の場合の年間維持費は約${example.annual.toLocaleString()}円(月${example.monthly.toLocaleString()}円)です。</p>
</noscript></section>
<section class="body">${p.body.map((t) => `<p>${t}</p>`).join("\n")}</section>
<section class="notes">
<h2>計算の前提と出典</h2>
<ul>
<li>軽自動車税(種別割): 50cc以下・90cc以下 2,000円、125cc以下 2,400円、250cc以下 3,600円、251cc以上 6,000円(市区町村の税率表)。</li>
<li>自賠責保険: 2026年11月1日以降に始まる24か月契約(離島以外・沖縄県を除く)を1年分に換算。原付 ${RATES.jibaiseki24.gentsuki1.toLocaleString()}円、軽二輪 ${RATES.jibaiseki24.kei2.toLocaleString()}円、小型二輪 ${RATES.jibaiseki24.kogata2.toLocaleString()}円(損害保険料率算出機構「自動車損害賠償責任保険基準料率」2026年4月30日届出)。</li>
<li>重量税(251cc以上、車検2年分・自家用): ${RATES.weightTaxKogata2y.base.toLocaleString()}円、13年経過 ${RATES.weightTaxKogata2y.from13.toLocaleString()}円、18年経過 ${RATES.weightTaxKogata2y.from18.toLocaleString()}円(国土交通省の税額表、2026年5月〜2028年4月の継続検査)。エコカー減税は考慮していません。</li>
<li>車検の検査手数料: 自分で持ち込む継続検査で${RATES.inspectionStampFee.toLocaleString()}円(国土交通省「登録・検査手数料一覧表」令和8年4月1日現在)。お店に頼む場合は整備・代行費に含めて入力してください。</li>
<li>保険・駐輪場・メンテナンス・燃費・ガソリン単価の初期値は目安です。実際の金額に書き換えてください。</li>
<li>このページは入力内容を保存・送信しません。計算結果は目安で、正確な金額は市区町村・保険会社・販売店に確認してください。</li>
</ul>
<p>料金表の基準日: ${RATES.asOf}</p>
</section>
<nav><h2>排気量別</h2><ul>${PAGES.filter((x) => x.path).map((x) => `<li><a href="/${x.path}">${x.h1}</a></li>`).join("")}</ul></nav>
</main>
<footer><a href="/privacy/">プライバシー</a></footer>
<script type="module" src="/app.mjs"></script>
</body></html>
`;
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
for (const p of PAGES) {
  mkdirSync(DIST + p.path, { recursive: true });
  writeFileSync(DIST + p.path + "index.html", page(p));
}
mkdirSync(DIST + "privacy/", { recursive: true });
writeFileSync(
  DIST + "privacy/index.html",
  `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>プライバシー|バイク維持費シミュレーター</title><link rel="stylesheet" href="/style.css"></head><body><main><h1>プライバシー</h1><p>入力した値はブラウザ内で計算するだけで、サーバーに送信・保存しません。共有用に入力値がURLに入ります。</p><p>アクセス数の把握にCookieを使わない集計(Cloudflare Web Analytics)を使う場合があります。広告・アフィリエイトリンクを置く場合は、このページに明記します。</p><p><a href="/">戻る</a></p></main></body></html>\n`
);
for (const f of ["app.mjs", "calc.mjs", "data.mjs"]) copyFileSync(new URL("../src/" + f, import.meta.url), DIST + f);
copyFileSync(new URL("../src/style.css", import.meta.url), DIST + "style.css");
writeFileSync(DIST + "robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
writeFileSync(
  DIST + "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map((p) => `<url><loc>${SITE}/${p.path}</loc></url>`).join("\n")}\n</urlset>\n`
);
console.log(`built ${PAGES.length} pages into dist/`);
