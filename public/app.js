// Chart.js インスタンス管理
let priceChartInst = null;
let volumeChartInst = null;
let financialChartInst = null;

// Chart.js グローバル設定
Chart.defaults.color = '#8b949e';
Chart.defaults.borderColor = '#30363d';

// ===== クイック検索 =====
function quickSearch(symbol) {
  document.getElementById('symbolInput').value = symbol;
  fetchAll();
}

// ===== エンターキー対応 =====
document.getElementById('symbolInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') fetchAll();
});

// ===== メイン取得処理 =====
async function fetchAll() {
  const symbol = document.getElementById('symbolInput').value.trim().toUpperCase();
  if (!symbol) return alert('銘柄コードを入力してください');

  const range = document.getElementById('rangeSelect').value;

  showLoading(true);
  hideError();
  document.getElementById('results').classList.add('hidden');

  try {
    const [stockRes, finRes] = await Promise.all([
      fetch(`/api/stock/${symbol}?range=${range}`).then(r => r.json()),
      fetch(`/api/financials/${symbol}`).then(r => r.json()),
    ]);

    if (stockRes.error) throw new Error(stockRes.error);

    renderStockHeader(stockRes, finRes);
    renderPriceChart(stockRes);
    renderVolumeChart(stockRes);
    if (!finRes.error) renderFinancialChart(finRes);

    document.getElementById('results').classList.remove('hidden');
  } catch (e) {
    showError(e.message);
  } finally {
    showLoading(false);
  }
}

// ===== KPIヘッダー描画 =====
function renderStockHeader(stock, fin) {
  document.getElementById('stockName').textContent =
    `${stock.name} (${stock.symbol}) — ${stock.currency}`;

  const lastClose = stock.data.at(-1)?.close;
  const prevClose = stock.data.at(-2)?.close;
  const change = lastClose && prevClose ? ((lastClose - prevClose) / prevClose * 100) : null;

  const kpis = [
    { label: '現在値', value: lastClose ? `${lastClose.toLocaleString()}` : '—', cls: 'blue' },
    { label: '前日比', value: change !== null ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : '—', cls: change > 0 ? 'green' : 'red' },
    { label: 'EPS', value: fin.eps !== null ? fin.eps.toFixed(2) : '—', cls: '' },
    { label: 'PER', value: fin.per !== null ? fin.per.toFixed(1) + 'x' : '—', cls: '' },
    { label: 'PBR', value: fin.pbr !== null ? fin.pbr.toFixed(2) + 'x' : '—', cls: '' },
    { label: 'ROE', value: fin.roe !== null ? (fin.roe * 100).toFixed(1) + '%' : '—', cls: fin.roe > 0.15 ? 'green' : '' },
    { label: '配当利回り', value: fin.dividendYield !== null ? (fin.dividendYield * 100).toFixed(2) + '%' : '—', cls: 'green' },
    { label: '時価総額', value: fin.marketCap !== null ? formatBigNum(fin.marketCap) : '—', cls: '' },
  ];

  document.getElementById('kpiGrid').innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.cls}">${k.value}</div>
    </div>
  `).join('');
}

// ===== 株価チャート =====
function renderPriceChart(stock) {
  destroyChart('priceChartInst');
  const ctx = document.getElementById('priceChart').getContext('2d');
  const labels = stock.data.map(d => d.date);
  const values = stock.data.map(d => d.close);
  const first = values[0], last = values.at(-1);
  const rising = last >= first;

  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, rising ? 'rgba(63,185,80,0.35)' : 'rgba(248,81,73,0.35)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  priceChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${stock.symbol} 終値`,
        data: values,
        borderColor: rising ? '#3fb950' : '#f85149',
        backgroundColor: gradient,
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => `${stock.currency} ${ctx.parsed.y.toLocaleString()}` }
      }},
      scales: {
        x: { ticks: { maxTicksLimit: 8, maxRotation: 0 } },
        y: { position: 'right', ticks: { callback: v => v.toLocaleString() } }
      }
    }
  });
}

// ===== 出来高チャート =====
function renderVolumeChart(stock) {
  destroyChart('volumeChartInst');
  const ctx = document.getElementById('volumeChart').getContext('2d');
  const labels = stock.data.map(d => d.date);
  const values = stock.data.map(d => d.volume);

  volumeChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '出来高',
        data: values,
        backgroundColor: 'rgba(88,166,255,0.5)',
        borderColor: '#58a6ff',
        borderWidth: 0,
        borderRadius: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxTicksLimit: 6, maxRotation: 0 } },
        y: { position: 'right', ticks: { callback: v => formatBigNum(v) } }
      }
    }
  });
}

// ===== 業績チャート =====
function renderFinancialChart(fin) {
  if (!fin.statements || fin.statements.length === 0) return;
  destroyChart('financialChartInst');

  const ctx = document.getElementById('financialChart').getContext('2d');
  const labels = fin.statements.map(s => s.date);
  const revenues   = fin.statements.map(s => s.revenue);
  const netIncomes = fin.statements.map(s => s.netIncome);
  const grossProfits = fin.statements.map(s => s.grossProfit);

  financialChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '売上高',
          data: revenues,
          backgroundColor: 'rgba(88,166,255,0.7)',
          borderRadius: 4,
          order: 2,
        },
        {
          label: '粗利益',
          data: grossProfits,
          backgroundColor: 'rgba(210,153,34,0.7)',
          borderRadius: 4,
          order: 2,
        },
        {
          label: '純利益',
          type: 'line',
          data: netIncomes,
          borderColor: '#3fb950',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          pointRadius: 5,
          pointBackgroundColor: '#3fb950',
          tension: 0.3,
          order: 1,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 14 } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${formatBigNum(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: {},
        y: { position: 'right', ticks: { callback: v => formatBigNum(v) } }
      }
    }
  });
}

// ===== ユーティリティ =====
function destroyChart(name) {
  const inst = name === 'priceChartInst' ? priceChartInst
             : name === 'volumeChartInst' ? volumeChartInst
             : financialChartInst;
  if (inst) inst.destroy();
}

function formatBigNum(v) {
  if (v === null || v === undefined) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e12) return (v / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9)  return (v / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6)  return (v / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3)  return (v / 1e3).toFixed(1) + 'K';
  return v.toString();
}

function showLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
}
function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = '⚠️ ' + msg;
  el.classList.remove('hidden');
}
function hideError() {
  document.getElementById('errorMsg').classList.add('hidden');
}
