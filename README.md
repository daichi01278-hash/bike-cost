> **移転しました:** このサイトは https://nirin-navi.com/cost に統合されました。旧URL(bike-ijihi.daichi01278.workers.dev)は `worker.js` で新URLへ恒久リダイレクトしています。

# bike-cost

バイクの年間維持費と、手放すタイミング(4月1日の課税・車検前の売却・重量税の増額)を計算する静的サイト。

- 計算ロジック: `src/calc.mjs`、料金表と出典: `src/data.mjs`
- テスト: `npm test`
- ビルド: `SITE_URL=https://... npm run build` → `dist/`

料金表は公的資料(損害保険料率算出機構、国土交通省、市区町村)に基づく目安です。
