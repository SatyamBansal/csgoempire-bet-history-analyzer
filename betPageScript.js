
(() => {
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
  
      let profit;
      if (Math.abs(rawProfit) > 1e-9) {
        // Old row (already net) OR new row win
        profit = rawProfit;
      } else {
        // Profit cell shows 0 → need to infer from status
        if (status === "lost") {
          profit = -bet; // new row lost bet
        } else {
          profit = 0; // open / canceled
        }
      }
  
      const game = row.querySelector("h4.text-light-1")?.innerText.trim() || "";
      const slipId = row.querySelector("td:nth-child(2) p, p.size-medium")?.innerText.trim() || "";
      const created = row.querySelector("td:nth-last-child(2) p")?.innerText.trim() || "";
  
      detailedRows.push({
        game,
        slipId,
        bet: Number(bet.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        status,
        created
      });
  
      if (!results[status]) results[status] = { betTotal: 0, profitTotal: 0, count: 0 };
      results[status].betTotal += bet;
      results[status].profitTotal += profit;
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
  
    console.log("===== SUMMARY =====");
    console.table(results);
  
    console.log(`===== DETAILED ROWS (${detailedRows.length}) =====`);
    console.table(detailedRows);
  
    return { summary: results, rows: detailedRows, count: detailedRows.length };
  })();
  