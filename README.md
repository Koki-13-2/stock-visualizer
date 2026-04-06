# 📈 株価・業績ビジュアライザー

Yahoo Finance のデータを使ってリアルタイムで株価・業績を可視化するWebアプリ。

## 🚀 機能
- **株価チャート** — 終値の折れ線グラフ（グラデーション付き、上昇/下落で色変化）
- **出来高チャート** — 棒グラフで出来高推移
- **業績チャート** — 売上高・粗利益・純利益の推移
- **KPI表示** — EPS / PER / PBR / ROE / 配当利回り / 時価総額
- **期間選択** — 1ヶ月 〜 5年
- **クイック選択** — Apple, Tesla, NVIDIA, トヨタ など

## 📦 セットアップ

```bash
npm install
npm start
```

ブラウザで `http://localhost:3000` を開く。

## 🔍 銘柄コード例
| 銘柄 | コード |
|------|--------|
| Apple | `AAPL` |
| Toyota | `7203.T` |
| Sony | `6758.T` |
| SoftBank Group | `9984.T` |
| Tesla | `TSLA` |
| NVIDIA | `NVDA` |

## 🛠 技術スタック
- **Backend**: Node.js + Express
- **Data**: Yahoo Finance API (v8 / v10)
- **Frontend**: Vanilla JS + Chart.js
- **Style**: CSS Custom Properties (ダークテーマ)
