# MMM-HK-Transport-ETA-Data

This repository collects Citybus (CTB) and KMB (九巴) route and stop data from the Hong Kong government's data API and publishes it to GitHub Pages.

## How it works

1. A daily GitHub Action runs at 5 AM Hong Kong time
2. The Action collects current CTB and KMB route and stop data
3. The data is published to GitHub Pages as JSON files
4. The JSON files are NOT committed to the main branch, keeping the repository clean

## Data Access

The collected data is available at: `https://[username].github.io/MMM-HK-Transport-ETA-Data/`

### CTB Data

Each CTB stop's data is available as a separate JSON file named with its stop ID:

- `https://[username].github.io/MMM-HK-Transport-ETA-Data/ctb/stops/{stop_id}.json`
- Examples:
  - `https://[username].github.io/MMM-HK-Transport-ETA-Data/ctb/stops/001001.json`
  - `https://[username].github.io/MMM-HK-Transport-ETA-Data/ctb/stops/001002.json`

### KMB Data

Each KMB stop's data is available as a separate JSON file named with its stop ID:

- `https://[username].github.io/MMM-HK-Transport-ETA-Data/kmb/stops/{stop_id}.json`
- Examples:
  - `https://[username].github.io/MMM-HK-Transport-ETA-Data/kmb/stops/00040ED8B61CA94B.json`
  - `https://[username].github.io/MMM-HK-Transport-ETA-Data/kmb/stops/0D98A0E934584FD0.json`

#### Nearby Stops Feature

Each stop file now includes a `nearbyStopIDs` field that contains an array of stop IDs that share the same coordinates as the current stop:

```json
{
  "stop": "00115688D89603F9",
  "name_en": "THE FAMILY PLANNING ASSOCIATION OF HK (YL221)",
  "name_tc": "香港家庭計劃指導會 (YL221)",
  "name_sc": "香港家庭计划指导会 (YL221)",
  "lat": "22.445861",
  "long": "114.022618",
  "routes": ["A36"],
  "data_timestamp": "2025-09-25T05:15:00.368Z",
  "nearbyStopIDs": ["0D98A0E934584FD0"]
}
```

### Data Endpoints

- **CTB Stops**: `https://[username].github.io/MMM-HK-Transport-ETA-Data/ctb/stops/{stop_id}.json`
- **CTB All Stops**: `https://[username].github.io/MMM-HK-Transport-ETA-Data/ctb/stops/allstops.json`
- **CTB Routes**: `https://[username].github.io/MMM-HK-Transport-ETA-Data/ctb/routes/{route_id}.json`
- **CTB All Routes**: `https://[username].github.io/MMM-HK-Transport-ETA-Data/ctb/routes/allroutes.json`
- **KMB Stops**: `https://[username].github.io/MMM-HK-Transport-ETA-Data/kmb/stops/{stop_id}.json`
- **KMB All Stops**: `https://[username].github.io/MMM-HK-Transport-ETA-Data/kmb/stops/allstops.json`
- **KMB Routes**: `https://[username].github.io/MMM-HK-Transport-ETA-Data/kmb/routes/{route_id}.json`
- **KMB All Routes**: `https://[username].github.io/MMM-HK-Transport-ETA-Data/kmb/routes/allroutes.json`

## Setup GitHub Pages

To enable GitHub Pages for this repository:

1. Go to the repository Settings
2. Navigate to the "Pages" section in the sidebar
3. Under "Source", select "GitHub Actions"
4. Click "Save"

The data will then be automatically published to your GitHub Pages site after each daily run.

## Running Data Collection Locally

You can run the data collection scripts locally:

- `pnpm collect-data` - Collects both CTB and KMB data
- `pnpm collect-ctb` - Collects only CTB data
- `pnpm collect-kmb` - Collects only KMB data
- `pnpm format` - Formats all code files
- `pnpm format:check` - Checks code formatting
