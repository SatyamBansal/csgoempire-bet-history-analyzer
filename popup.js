// Popup script for Bet Calculator Extension
(() => {
  'use strict';

  let bettingData = [];

  // DOM elements
  const loadingEl = document.getElementById('loading');
  const mainContentEl = document.getElementById('main-content');
  const totalBetsEl = document.getElementById('total-bets');
  const totalProfitEl = document.getElementById('total-profit');
  const summaryTbodyEl = document.getElementById('summary-tbody');
  const recentBetsListEl = document.getElementById('recent-bets-list');
  const exportBtn = document.getElementById('export-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const clearBtn = document.getElementById('clear-btn');

  // Initialize popup
  const init = async () => {
    try {
      await loadData();
      renderUI();
      setupEventListeners();
    } catch (error) {
      console.error('Error initializing popup:', error);
      showError('Failed to load data');
    }
  };

  // Load data from storage
  const loadData = async () => {
    try {
      const result = await chrome.storage.local.get(['bettingData']);
      bettingData = result.bettingData || [];
    } catch (error) {
      console.error('Error loading data:', error);
      bettingData = [];
    }
  };

  // Calculate totals from data
  const calculateTotals = () => {
    const results = {};

    bettingData.forEach(record => {
      const status = record.status;
      if (!results[status]) {
        results[status] = { betTotal: 0, profitTotal: 0, count: 0 };
      }
      results[status].betTotal += record.bet;
      results[status].profitTotal += record.profit;
      results[status].count += 1;
    });

    let grandBet = 0, grandProfit = 0, grandCount = 0;
    for (const k in results) {
      results[k].betTotal = Number(results[k].betTotal.toFixed(2));
      results[k].profitTotal = Number(results[k].profitTotal.toFixed(2));
      grandBet += results[k].betTotal;
      grandProfit += results[k].profitTotal;
      grandCount += results[k].count;
    }

    results.TOTAL = {
      betTotal: Number(grandBet.toFixed(2)),
      profitTotal: Number(grandProfit.toFixed(2)),
      count: grandCount
    };

    return results;
  };

  // Render the UI
  const renderUI = () => {
    if (bettingData.length === 0) {
      renderEmptyState();
      return;
    }

    const totals = calculateTotals();
    
    // Update main stats
    totalBetsEl.textContent = totals.TOTAL.count;
    totalProfitEl.textContent = `$${totals.TOTAL.profitTotal.toFixed(2)}`;
    totalProfitEl.className = `stat-value ${getProfitClass(totals.TOTAL.profitTotal)}`;

    // Render summary table
    renderSummaryTable(totals);

    // Render recent bets
    renderRecentBets();

    // Show main content
    loadingEl.style.display = 'none';
    mainContentEl.style.display = 'block';
  };

  // Render empty state
  const renderEmptyState = () => {
    loadingEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h3>No betting data recorded</h3>
        <p>Visit a betting site and click the "Record Bets" button to start tracking your data.</p>
      </div>
    `;
  };

  // Render summary table
  const renderSummaryTable = (totals) => {
    summaryTbodyEl.innerHTML = '';

    const statusOrder = ['won', 'lost', 'cancelled', 'TOTAL'];
    
    statusOrder.forEach(status => {
      if (totals[status]) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <span class="status-badge status-${status}">${status}</span>
          </td>
          <td>${totals[status].count}</td>
          <td>$${totals[status].betTotal.toFixed(2)}</td>
          <td class="${getProfitClass(totals[status].profitTotal)}">
            $${totals[status].profitTotal.toFixed(2)}
          </td>
        `;
        summaryTbodyEl.appendChild(row);
      }
    });
  };

  // Render recent bets
  const renderRecentBets = () => {
    recentBetsListEl.innerHTML = '';

    if (bettingData.length === 0) {
      recentBetsListEl.innerHTML = '<div class="empty-state">No bets recorded</div>';
      return;
    }

    // Sort by recorded date (most recent first) and take last 10
    const recentBets = [...bettingData]
      .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
      .slice(0, 10);

    recentBets.forEach(bet => {
      const betItem = document.createElement('div');
      betItem.className = 'bet-item';
      betItem.innerHTML = `
        <div class="bet-info">
          <div class="bet-game">${bet.game}</div>
          <div class="bet-slip">${bet.slipId}</div>
        </div>
        <div class="bet-amount">
          <div class="bet-profit ${getProfitClass(bet.profit)}">
            $${bet.profit.toFixed(2)}
          </div>
          <div style="font-size: 11px; color: #999;">
            Bet: $${bet.bet.toFixed(2)}
          </div>
        </div>
      `;
      recentBetsListEl.appendChild(betItem);
    });
  };

  // Get CSS class for profit styling
  const getProfitClass = (profit) => {
    if (profit > 0) return 'profit-positive';
    if (profit < 0) return 'profit-negative';
    return 'profit-neutral';
  };

  // Setup event listeners
  const setupEventListeners = () => {
    exportBtn.addEventListener('click', exportToCSV);
    refreshBtn.addEventListener('click', refreshData);
    clearBtn.addEventListener('click', clearAllData);
  };

  // Export data to CSV
  const exportToCSV = () => {
    if (bettingData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Game', 'Slip ID', 'Bet Amount', 'Profit', 'Status', 'Created', 'Recorded At', 'Page URL'];
    const csvContent = [
      headers.join(','),
      ...bettingData.map(record => [
        `"${record.game}"`,
        `"${record.slipId}"`,
        record.bet,
        record.profit,
        record.status,
        `"${record.created}"`,
        `"${record.recordedAt}"`,
        `"${record.pageUrl}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `betting-data-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Refresh data
  const refreshData = async () => {
    loadingEl.style.display = 'block';
    mainContentEl.style.display = 'none';
    loadingEl.textContent = 'Refreshing data...';
    
    try {
      await loadData();
      renderUI();
    } catch (error) {
      console.error('Error refreshing data:', error);
      showError('Failed to refresh data');
    }
  };

  // Clear all data
  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all betting data? This action cannot be undone.')) {
      chrome.storage.local.remove(['bettingData'], () => {
        bettingData = [];
        renderUI();
      });
    }
  };

  // Show error message
  const showError = (message) => {
    loadingEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Error</h3>
        <p>${message}</p>
      </div>
    `;
  };

  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
