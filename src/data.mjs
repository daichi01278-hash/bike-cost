// 料金表。値を変えたら test/calc.test.mjs と research.md の出典欄も更新する。
// 確認状況: "verified" = 公的資料または複数の独立した出典で一致 / "single" = 出典1つのみ(要原本確認)
export const RATES = {
  asOf: "2026-11-01",

  // 軽自動車税(種別割)年額。2016年度以降の税率。二輪に13年経過の重課はない。
  // 出典: 各市区町村の軽自動車税ページ(例: 静岡市、中央区)。status: verified
  keiTax: { upTo50: 2000, upTo90: 2000, upTo125: 2400, upTo250: 3600, over250: 6000 },

  // 自動車重量税 小型二輪(251cc以上)の車検2年分(自家用)。エコカー減税対象外。
  // 13年経過 = 初度検査年月から12年10か月以後の検査、18年経過も同様(17年10か月以後)。
  // 出典: 国交省「令和8年度税制改正に伴う自動車重量税の税額の基本的な考え方 その3」
  // (2026-05-01〜2028-04-30の継続検査)。status: verified
  weightTaxKogata2y: { base: 3800, from13: 4600, from18: 5000 },

  // 自賠責保険 24か月(離島以外・沖縄県を除く)。2026-11-01以降に始期の契約。
  // 出典: 損害保険料率算出機構「自動車損害賠償責任保険基準料率」2026-04-30届出
  // (小型二輪自動車 / 軽自動車 検査対象外車 / 一般原動機付自転車)。status: verified
  jibaiseki24: { gentsuki1: 9630, kei2: 9780, kogata2: 9640 },

  // 継続検査を自分で受ける場合(持込検査)の手数料 小型自動車(二輪): 印紙600+証紙1,500。
  // お店経由(保安基準適合証の提出)なら1,500円だが、整備・代行費に含めて入力してもらう。
  // 出典: 国交省 自動車登録ポータル「登録・検査手数料一覧表」令和8年4月1日現在。status: verified
  inspectionStampFee: 2100,
};

// 排気量区分ごとの初期値。すべて「目安(推定)」で、利用者が上書きする前提。
export const DEFAULTS = {
  gentsuki1: { cc: 50, kmPerLiter: 45, kmPerYear: 3000, insurance: 10000, parkingMonthly: 2000, maintenance: 10000, shakenService: 0 },
  gentsuki2: { cc: 125, kmPerLiter: 45, kmPerYear: 4000, insurance: 12000, parkingMonthly: 3000, maintenance: 15000, shakenService: 0 },
  kei2: { cc: 250, kmPerLiter: 30, kmPerYear: 5000, insurance: 25000, parkingMonthly: 5000, maintenance: 25000, shakenService: 0 },
  kogata2: { cc: 400, kmPerLiter: 22, kmPerYear: 5000, insurance: 30000, parkingMonthly: 5000, maintenance: 35000, shakenService: 25000 },
};
export const DEFAULT_FUEL_PRICE = 165; // 円/L。仮置き(2026-10時点の全国平均は未確認)
