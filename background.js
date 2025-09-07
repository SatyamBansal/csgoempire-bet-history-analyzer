// Background script for Bet Calculator Extension
(() => {
  'use strict';

  // Extension installation/update handler
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('Bet Calculator Extension installed');
      // Initialize storage with empty data
      chrome.storage.local.set({ bettingData: [] });
    } else if (details.reason === 'update') {
      console.log('Bet Calculator Extension updated');
    }
  });

  // Handle messages from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getData') {
      handleGetData(sendResponse);
      return true; // Keep message channel open for async response
    }
    
    if (request.action === 'saveData') {
      handleSaveData(request.data, sendResponse);
      return true; // Keep message channel open for async response
    }
    
    if (request.action === 'clearData') {
      handleClearData(sendResponse);
      return true; // Keep message channel open for async response
    }

    // Synchronous response for unknown actions
    sendResponse({ success: false, error: 'Unknown action' });
  });

  // Get all betting data
  function handleGetData(sendResponse) {
    chrome.storage.local.get(['bettingData'], (result) => {
      try {
        const data = result.bettingData || [];
        const totals = calculateTotals(data);
        
        sendResponse({
          success: true,
          data: data,
          totals: totals,
          count: data.length
        });
      } catch (error) {
        console.error('Error getting data:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
    });
  }

  // Save betting data with deduplication
  function handleSaveData(newData, sendResponse) {
    chrome.storage.local.get(['bettingData'], (result) => {
      try {
        let existingData = result.bettingData || [];

        // Create a map for quick lookup by slipId
        const dataMap = new Map();
        existingData.forEach(item => {
          dataMap.set(item.slipId, item);
        });

        // Process new data - overwrite duplicates
        let newRecords = 0;
        let updatedRecords = 0;

        newData.forEach(newRecord => {
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
        chrome.storage.local.set({ bettingData: updatedData }, () => {
          const totals = calculateTotals(updatedData);
          
          sendResponse({
            success: true,
            newRecords: newRecords,
            updatedRecords: updatedRecords,
            totalRecords: updatedData.length,
            totals: totals
          });
        });
      } catch (error) {
        console.error('Error saving data:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
    });
  }

  // Clear all data
  function handleClearData(sendResponse) {
    chrome.storage.local.remove(['bettingData'], () => {
      sendResponse({
        success: true,
        message: 'All data cleared'
      });
    });
  }

  // Calculate totals from data
  function calculateTotals(data) {
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
  }

  console.log('Bet Calculator Extension background script loaded');

})();