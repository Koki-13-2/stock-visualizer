const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Yahoo Finance v8 APIから株価履歴を取得
app.get('/api/stock/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { range = '6mo', interval = '1d' } = req.query;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const response = await axios.get(url, {
      params: { range, interval, includePrePost: false },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const result = response.data.chart.result[0];
    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;
    const volumes = result.indicators.quote[0].volume;
    const meta = result.meta;

    const data = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      close: closes[i] ? parseFloat(closes[i].toFixed(2)) : null,
      volume: volumes[i] || 0,
    })).filter(d => d.close !== null);

    res.json({
      symbol: meta.symbol,
      currency: meta.currency,
      name: meta.longName || symbol,
      data
    });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: '株価データの取得に失敗しました。銘柄コードを確認してください。' });
  }
});

// Yahoo Finance v10 APIから財務データを取得
app.get('/api/financials/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`;
    const response = await axios.get(url, {
      params: { modules: 'incomeStatementHistory,defaultKeyStatistics,summaryDetail,financialData' },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const summary = response.data.quoteSummary.result[0];
    const income = summary.incomeStatementHistory?.incomeStatementHistory || [];
    const stats = summary.defaultKeyStatistics || {};
    const financial = summary.financialData || {};

    const statements = income.map(s => ({
      date: s.endDate?.fmt || '',
      revenue: s.totalRevenue?.raw || 0,
      netIncome: s.netIncome?.raw || 0,
      grossProfit: s.grossProfit?.raw || 0,
    })).reverse();

    res.json({
      statements,
      eps: stats.trailingEps?.raw || null,
      per: stats.trailingPE?.raw || null,
      pbr: stats.priceToBook?.raw || null,
      roe: financial.returnOnEquity?.raw || null,
      dividendYield: summary.summaryDetail?.dividendYield?.raw || null,
      marketCap: summary.summaryDetail?.marketCap?.raw || null,
    });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: '業績データの取得に失敗しました。' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running → http://localhost:${PORT}`);
});
