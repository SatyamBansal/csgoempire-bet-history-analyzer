# CSGOEmpire Bet History Analyzer

A Chrome/Edge browser extension specifically designed for CSGOEmpire that helps you record and track your betting history across multiple paginated pages. The extension automatically parses betting information from CSGOEmpire's betting history, deduplicates records using slip IDs, and provides comprehensive analytics and insights.

## Features

- **🎯 CSGOEmpire Specific**: Designed specifically for CSGOEmpire's betting history page structure
- **📊 Record Button**: Automatically appears on CSGOEmpire with a floating "Record Bets" button
- **🔄 Pagination Support**: Record data from multiple pages of your betting history
- **🔍 Deduplication**: Automatically handles duplicate records using slip ID as the unique identifier
- **📈 Real-time Analytics**: View totals, profit/loss, and detailed breakdowns by status
- **💾 Data Persistence**: All data is stored locally in your browser
- **📤 Export Functionality**: Export all data to CSV for external analysis
- **🎯 Status Filtering**: Only records won, lost, and cancelled bets (ignores open bets)
- **⏰ Timestamp Tracking**: Shows when each bet actually happened, not when it was recorded

## Installation

### Method 1: Load as Unpacked Extension (Recommended for Development)

1. Download or clone this repository
2. Open Chrome/Edge and go to `chrome://extensions/` or `edge://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension should now appear in your extensions list

### Method 2: Pack and Install

1. In the extensions page, click "Pack extension"
2. Select the extension folder
3. Install the generated `.crx` file

## Usage

### Recording Data from CSGOEmpire

1. **Navigate to CSGOEmpire** and log into your account
2. **Go to your betting history** (usually found in your profile or account section)
3. **Look for the floating "Record Bets" button** in the top-right corner of the page
4. **Click "Record Bets"** to parse and record all betting data from the current page
5. **Navigate to other pages** of your betting history (use pagination) and repeat the process
6. **View your data** by clicking the extension icon in the browser toolbar

### CSGOEmpire Specific Instructions

- The extension works specifically with CSGOEmpire's betting history page structure
- It automatically detects CSGOEmpire's HTML elements and parses bet information
- Supports CSGOEmpire's date format parsing (e.g., "Sat 06 Sep 21:03")
- Works with CSGOEmpire's slip ID system for deduplication

### Viewing Analytics

Click the extension icon to open the popup where you can:

- **View Summary Statistics**: Total bets, total profit/loss
- **See Detailed Breakdown**: Count and totals by status (won, lost, cancelled)
- **Browse Recent Bets**: Last 10 recorded bets with details
- **Export Data**: Download all data as CSV file
- **Clear Data**: Remove all recorded data (with confirmation)

### Data Structure

Each recorded bet includes:
- **Game**: The game/event name
- **Slip ID**: Unique identifier for deduplication
- **Bet Amount**: Amount wagered
- **Profit**: Profit or loss amount
- **Status**: won, lost, or cancelled
- **Created**: Original creation date
- **Recorded At**: When the data was recorded by the extension

## Technical Details

### File Structure

```
betCalculator/
├── manifest.json          # Extension manifest
├── content.js            # Content script (injected into pages)
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── background.js         # Background service worker
└── README.md             # This file
```

### Data Storage

- Data is stored locally using Chrome's `chrome.storage.local` API
- Automatic cleanup removes data older than 90 days
- Data persists across browser sessions

### Deduplication Logic

- Uses `slipId` as the unique identifier
- When recording data, if a slip ID already exists, the new data overwrites the old data
- This ensures that updated bet statuses (e.g., open → won/lost) are properly tracked

### CSGOEmpire Compatibility

The extension is specifically designed for CSGOEmpire and works with their betting history page structure:
- Tables with rows having class `tr.bg-dark-3`
- Betting amounts in elements with `data-testid="currency-value"`
- Status in elements with class `h4.capitalize`
- Game names in elements with class `h4.text-light-1`
- CSGOEmpire's specific date format parsing
- Slip ID extraction from CSGOEmpire's table structure

**Note**: This extension is not compatible with other betting sites and is specifically tailored for CSGOEmpire's HTML structure and data format.

## Customization

### Modifying Selectors for CSGOEmpire Updates

If CSGOEmpire updates their HTML structure, you may need to modify the selectors in `content.js`:

```javascript
// Current CSGOEmpire selectors (lines 18-24)
const betElems = row.querySelectorAll('[data-testid="currency-value"]');
const statusElem = row.querySelector("h4.capitalize");
const game = row.querySelector("h4.text-light-1")?.innerText.trim() || "";
const slipId = row.querySelector("td:nth-child(2) p, p.size-medium")?.innerText.trim() || "";
```

**Note**: These selectors are specifically designed for CSGOEmpire's current HTML structure. If CSGOEmpire updates their site design, these selectors may need to be updated accordingly.

### Adding New Status Types

To include additional bet statuses, modify the status filter in `content.js` (line 25):

```javascript
// Current filter
if (!['won', 'lost', 'cancelled'].includes(status)) {
  return;
}
```

## Troubleshooting

### Extension Not Working

1. **Check if you're on CSGOEmpire**: The extension only works on CSGOEmpire's betting history page
2. **Verify you're on the betting history page**: Make sure you're viewing your betting history, not other pages
3. **Check extension is enabled**: Check the extensions page to ensure it's enabled
4. **Check console for errors**: Open browser dev tools and look for error messages
5. **Try refreshing the page**: Sometimes the content script needs a page refresh to load properly

### Data Not Recording

1. **Check if "Record Bets" button appears**: If not, you might not be on CSGOEmpire's betting history page
2. **Verify you're on the correct page**: Make sure you're on CSGOEmpire's betting history page, not other sections
3. **Check for JavaScript errors**: Look in the console for any parsing errors
4. **Ensure you have betting history**: The extension only works if you have betting history to display

### Data Export Issues

1. **Ensure data exists**: The export button only works when there's data to export
2. **Check browser permissions**: Some browsers may block downloads
3. **Try a different browser**: If issues persist, try Chrome or Edge

## Development

### Making Changes

1. **Edit the relevant files** (content.js, popup.js, etc.)
2. **Reload the extension** in `chrome://extensions/`
3. **Test on the target website**

### Debugging

1. **Content Script**: Use browser dev tools on the target page
2. **Popup**: Right-click the extension icon and select "Inspect popup"
3. **Background Script**: Go to `chrome://extensions/`, find the extension, and click "Inspect views: background page"

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or feature requests, please create an issue in the repository or contact the developer.
