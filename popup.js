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
  const monthlyTbodyEl = document.getElementById('monthly-tbody');
  const recentBetsListEl = document.getElementById('recent-bets-list');
  const exportBtn = document.getElementById('export-btn');
  const exportMonthlyBtn = document.getElementById('export-monthly-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const clearBtn = document.getElementById('clear-btn');
  const recordToggle = document.getElementById('record-toggle');

  // Initialize popup
  const init = async () => {
    try {
      await loadData();
      await loadToggleState();
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

  // Load toggle state from storage
  const loadToggleState = async () => {
    try {
      const result = await chrome.storage.local.get(['recordButtonEnabled']);
      const isEnabled = result.recordButtonEnabled !== false; // Default to true
      recordToggle.checked = isEnabled;
    } catch (error) {
      console.error('Error loading toggle state:', error);
      recordToggle.checked = true; // Default to enabled
    }
  };

  // Save toggle state to storage
  const saveToggleState = async (isEnabled) => {
    try {
      await chrome.storage.local.set({ recordButtonEnabled: isEnabled });
      // Notify content script about the change
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url.includes('csgoempire.com')) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleRecordButton',
            enabled: isEnabled
          });
        }
      });
    } catch (error) {
      console.error('Error saving toggle state:', error);
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

  // Parse date from various formats
  const parseDate = (dateString) => {
    if (!dateString) return new Date();
    
    console.log('Bet Calculator - Parsing date:', dateString);
    
    // Handle CSGOEmpire format: "Sat 06 Sep 21:03"
    const empireFormat = /^(\w{3})\s+(\d{1,2})\s+(\w{3})\s+(\d{1,2}):(\d{2})$/;
    const empireMatch = dateString.match(empireFormat);
    
    if (empireMatch) {
      const [, dayName, day, monthName, hour, minute] = empireMatch;
      
      // Map month abbreviations to numbers
      const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const month = monthMap[monthName];
      if (month !== undefined) {
        // Assume current year for dates without year
        const currentYear = new Date().getFullYear();
        const parsedDate = new Date(currentYear, month, parseInt(day), parseInt(hour), parseInt(minute));
        
        // If the parsed date is in the future, assume it's from last year
        if (parsedDate > new Date()) {
          parsedDate.setFullYear(currentYear - 1);
        }
        
        console.log('Bet Calculator - Successfully parsed Empire date:', dateString, '->', parsedDate);
        return parsedDate;
      }
    }
    
    // Try other date formats as fallback
    const formats = [
      // Direct parsing
      dateString,
      // ISO format with time
      dateString.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3'),
      // Handle relative dates like "2 days ago", "1 week ago"
      dateString.replace(/ago|day|week|month|year/gi, ''),
      // Try parsing as DD/MM/YYYY or MM/DD/YYYY
      dateString.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$2-$1'),
      // Try parsing as DD-MM-YYYY or MM-DD-YYYY
      dateString.replace(/(\d{1,2})-(\d{1,2})-(\d{4})/, '$3-$2-$1'),
    ];
    
    for (const format of formats) {
      const date = new Date(format);
      if (!isNaN(date.getTime()) && date.getFullYear() > 2000) {
        console.log('Bet Calculator - Successfully parsed date:', format, '->', date);
        return date;
      }
    }
    
    console.log('Bet Calculator - Failed to parse date, using current date');
    // If all parsing fails, return current date
    return new Date();
  };

  // Calculate monthly breakdown
  const calculateMonthlyBreakdown = () => {
    const monthlyData = {};

    bettingData.forEach(record => {
      // Parse the original created date, fallback to recordedAt if created is invalid
      let recordDate;
      
      // Use created field now that we have proper parsing for Empire format
      const useRecordedAt = false;
      
      if (!useRecordedAt && record.created && record.created.trim() !== '') {
        // Try to parse the created date with multiple formats
        recordDate = parseDate(record.created);
        // If parsing failed, date is invalid, or year is too old, use recordedAt
        if (isNaN(recordDate.getTime()) || recordDate.getFullYear() < 2020) {
          console.log('Bet Calculator - Using recordedAt fallback for record:', record.slipId);
          recordDate = new Date(record.recordedAt);
        }
      } else {
        recordDate = new Date(record.recordedAt);
      }
      
      const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = recordDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          monthName: monthName,
          betTotal: 0,
          profitTotal: 0,
          count: 0,
          won: { betTotal: 0, profitTotal: 0, count: 0 },
          lost: { betTotal: 0, profitTotal: 0, count: 0 },
          cancelled: { betTotal: 0, profitTotal: 0, count: 0 }
        };
      }

      // Add to overall month totals
      monthlyData[monthKey].betTotal += record.bet;
      monthlyData[monthKey].profitTotal += record.profit;
      monthlyData[monthKey].count += 1;

      // Add to status-specific totals
      const status = record.status;
      if (monthlyData[monthKey][status]) {
        monthlyData[monthKey][status].betTotal += record.bet;
        monthlyData[monthKey][status].profitTotal += record.profit;
        monthlyData[monthKey][status].count += 1;
      }
    });

    // Round all values
    Object.keys(monthlyData).forEach(monthKey => {
      const month = monthlyData[monthKey];
      month.betTotal = Number(month.betTotal.toFixed(2));
      month.profitTotal = Number(month.profitTotal.toFixed(2));
      
      ['won', 'lost', 'cancelled'].forEach(status => {
        if (month[status]) {
          month[status].betTotal = Number(month[status].betTotal.toFixed(2));
          month[status].profitTotal = Number(month[status].profitTotal.toFixed(2));
        }
      });
    });

    // Sort by month (newest first)
    const sortedMonths = Object.keys(monthlyData).sort().reverse();
    return sortedMonths.map(monthKey => ({
      monthKey,
      ...monthlyData[monthKey]
    }));
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

    // Render monthly breakdown
    renderMonthlyBreakdown();

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

  // Render monthly breakdown
  const renderMonthlyBreakdown = () => {
    monthlyTbodyEl.innerHTML = '';

    if (bettingData.length === 0) {
      monthlyTbodyEl.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666; padding: 20px;">No data available</td></tr>';
      return;
    }

    const monthlyData = calculateMonthlyBreakdown();
    
    // Debug logging
    console.log('Bet Calculator - Monthly data:', monthlyData);
    console.log('Bet Calculator - Sample records:', bettingData.slice(0, 3).map(r => ({ 
      created: r.created, 
      recordedAt: r.recordedAt 
    })));

    if (monthlyData.length === 0) {
      monthlyTbodyEl.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666; padding: 20px;">No monthly data available</td></tr>';
      return;
    }

    monthlyData.forEach(month => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="month-name">${month.monthName}</td>
        <td>${month.count}</td>
        <td>$${month.betTotal.toFixed(2)}</td>
        <td class="${getProfitClass(month.profitTotal)}">
          $${month.profitTotal.toFixed(2)}
        </td>
        <td class="status-count">
          ${month.won.count} ($${month.won.profitTotal.toFixed(2)})
        </td>
        <td class="status-count">
          ${month.lost.count} ($${month.lost.profitTotal.toFixed(2)})
        </td>
        <td class="status-count">
          ${month.cancelled.count} ($${month.cancelled.profitTotal.toFixed(2)})
        </td>
      `;
      monthlyTbodyEl.appendChild(row);
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
    exportMonthlyBtn.addEventListener('click', exportMonthlyToCSV);
    refreshBtn.addEventListener('click', refreshData);
    clearBtn.addEventListener('click', clearAllData);
    recordToggle.addEventListener('change', (e) => {
      saveToggleState(e.target.checked);
    });
  };

  // Export data to CSV
  const exportToCSV = () => {
    if (bettingData.length === 0) {
      alert('No data to export');
      return;
    }

     const headers = ['Game', 'Slip ID', 'Bet Amount', 'Profit', 'Status', 'Created', 'Recorded At'];
    const csvContent = [
      headers.join(','),
      ...bettingData.map(record => [
        `"${record.game}"`,
        `"${record.slipId}"`,
        record.bet,
        record.profit,
        record.status,
        `"${record.created}"`,
        `"${record.recordedAt}"`
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

  // Export monthly data to CSV
  const exportMonthlyToCSV = () => {
    const monthlyData = calculateMonthlyBreakdown();
    
    if (monthlyData.length === 0) {
      alert('No monthly data to export');
      return;
    }

    const headers = ['Month', 'Total Bets', 'Bet Total', 'Profit/Loss', 'Won Count', 'Won Profit', 'Lost Count', 'Lost Profit', 'Cancelled Count', 'Cancelled Profit'];
    const csvContent = [
      headers.join(','),
      ...monthlyData.map(month => [
        `"${month.monthName}"`,
        month.count,
        month.betTotal,
        month.profitTotal,
        month.won.count,
        month.won.profitTotal,
        month.lost.count,
        month.lost.profitTotal,
        month.cancelled.count,
        month.cancelled.profitTotal
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `monthly-betting-data-${new Date().toISOString().split('T')[0]}.csv`);
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
