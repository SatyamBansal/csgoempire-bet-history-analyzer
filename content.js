// Content script for Bet Calculator Extension
(() => {
  'use strict';

  // Check if we're on CSGOEmpire betting history page
  const isBettingSite = () => {
    const isCorrectUrl = window.location.href.includes('csgoempire.com/profile/match-betting/history');
    
    // Try multiple selectors for table rows
    const hasTableRows = document.querySelector('tr.bg-dark-3') !== null ||
                        document.querySelector('tr[class*="bg-dark"]') !== null ||
                        document.querySelector('table tr') !== null;
    
    console.log('Bet Calculator - URL check:', isCorrectUrl);
    console.log('Bet Calculator - Table rows found:', hasTableRows);
    console.log('Bet Calculator - Current URL:', window.location.href);
    console.log('Bet Calculator - Available tables:', document.querySelectorAll('table').length);
    
    return isCorrectUrl && hasTableRows;
  };

  // Create and inject the record button
  const createRecordButton = () => {
    // Remove existing button if any
    const existingBtn = document.getElementById('bet-calculator-btn');
    if (existingBtn) {
      existingBtn.remove();
    }

    const button = document.createElement('button');
    button.id = 'bet-calculator-btn';
    button.innerHTML = '📊 Record Bets';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: #4CAF50;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = '#45a049';
      button.style.transform = 'translateY(-2px)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = '#4CAF50';
      button.style.transform = 'translateY(0)';
    });

    button.addEventListener('click', recordCurrentPageData);
    document.body.appendChild(button);
  };

  // Parse data from current page (adapted from your original script)
  const parseCurrentPageData = () => {
    const results = {};
    const detailedRows = [];

    const rows = [...document.querySelectorAll("tr.bg-dark-3")].filter(r => r.offsetParent !== null);

    const toNum = (txt) => {
      const s = String(txt || "")
        .replace(/\u00a0/g, " ")
        .replace(/\u2212/g, "-")
        .replace(/[^0-9.\-]/g, "");
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : 0;
    };

    rows.forEach(row => {
      const betElems = row.querySelectorAll('[data-testid="currency-value"]');
      const statusElem = row.querySelector("h4.capitalize");
      if (betElems.length < 2 || !statusElem) return;

      const bet = toNum(betElems[0].innerText);
      const rawProfit = toNum(betElems[1].innerText);
      const status = statusElem.innerText.trim().toLowerCase();

      // Only process won, lost, cancelled statuses (ignore open)
      if (!['won', 'lost', 'cancelled'].includes(status)) {
        return;
      }

      let profit;
      if (Math.abs(rawProfit) > 1e-9) {
        // Old row (already net) OR new row win
        profit = rawProfit;
      } else {
        // Profit cell shows 0 → need to infer from status
        if (status === "lost") {
          profit = -bet; // new row lost bet
        } else {
          profit = 0; // cancelled
        }
      }

      const game = row.querySelector("h4.text-light-1")?.innerText.trim() || "";
      const slipId = row.querySelector("td:nth-child(2) p, p.size-medium")?.innerText.trim() || "";
      const created = row.querySelector("td:nth-last-child(2) p")?.innerText.trim() || "";

      // Only add if slipId exists (as identifier)
      if (slipId) {
      detailedRows.push({
        game,
        slipId,
        bet: Number(bet.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        status,
        created,
        recordedAt: new Date().toISOString()
      });
      }
    });

    return detailedRows;
  };

  // Record data from current page
  const recordCurrentPageData = async () => {
    try {
      const currentPageData = parseCurrentPageData();
      
      if (currentPageData.length === 0) {
        showNotification('No valid betting data found on this page', 'warning');
        return;
      }

      // Get existing data from storage
      const result = await chrome.storage.local.get(['bettingData']);
      let existingData = result.bettingData || [];

      // Create a map for quick lookup by slipId
      const dataMap = new Map();
      existingData.forEach(item => {
        dataMap.set(item.slipId, item);
      });

      // Process new data - overwrite duplicates
      let newRecords = 0;
      let updatedRecords = 0;

      currentPageData.forEach(newRecord => {
        if (dataMap.has(newRecord.slipId)) {
          // Update existing record
          dataMap.set(newRecord.slipId, newRecord);
          updatedRecords++;
        } else {
          // Add new record
          dataMap.set(newRecord.slipId, newRecord);
          newRecords++;
        }
      });

      // Convert map back to array
      const updatedData = Array.from(dataMap.values());

      // Save updated data
      await chrome.storage.local.set({ bettingData: updatedData });

      // Calculate totals
      const totals = calculateTotals(updatedData);

      showNotification(
        `Recorded: ${newRecords} new, ${updatedRecords} updated. Total: ${totals.count} bets, Profit: $${totals.profitTotal}`,
        'success'
      );

      // Log to console for debugging
      console.log('Bet Calculator - Data recorded:', {
        newRecords,
        updatedRecords,
        totalRecords: updatedData.length,
        totals
      });

    } catch (error) {
      console.error('Error recording betting data:', error);
      showNotification('Error recording data: ' + error.message, 'error');
    }
  };

  // Calculate totals from all recorded data
  const calculateTotals = (data) => {
    const results = {};

    data.forEach(record => {
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

  // Show notification
  const showNotification = (message, type = 'info') => {
    // Remove existing notification
    const existing = document.getElementById('bet-calculator-notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'bet-calculator-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10001;
      background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#ff9800' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      max-width: 300px;
      word-wrap: break-word;
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  };

  // Initialize when page loads
  const init = () => {
    console.log('Bet Calculator - Initializing...');
    if (isBettingSite()) {
      console.log('Bet Calculator - Creating record button');
      createRecordButton();
    } else if (window.location.href.includes('csgoempire.com/profile/match-betting/history')) {
      // Fallback: create button even if table structure isn't found yet
      console.log('Bet Calculator - Creating record button (fallback mode)');
      createRecordButton();
    } else {
      console.log('Bet Calculator - Not a betting site or table not found');
    }
  };

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-initialize when navigating (for SPAs)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(init, 1000); // Delay to allow page to load
    }
  }).observe(document, { subtree: true, childList: true });

  // Make functions available globally for debugging
  window.betCalculator = {
    init: init,
    createRecordButton: createRecordButton,
    recordCurrentPageData: recordCurrentPageData
  };

  console.log('Bet Calculator Extension loaded. Use window.betCalculator.init() to manually initialize.');

})();
