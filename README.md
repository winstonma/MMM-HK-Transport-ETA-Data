# MMM-HK-Transport-ETA-Data

This repository collects Citybus (CTB) route and stop data from the Hong Kong government's data API and publishes it to GitHub Pages.

## How it works

1. A daily GitHub Action runs at 5 AM Hong Kong time
2. The Action collects current CTB route and stop data
3. The data is published to GitHub Pages as JSON files
4. The JSON files are NOT committed to the main branch, keeping the repository clean

## Data Access

The collected data is available at: `https://[username].github.io/MMM-HK-Transport-ETA-Data/`

Each stop's data is available as a separate JSON file named with its stop ID:

- `https://[username].github.io/MMM-HK-Transport-ETA-Data/001001.json`
- `https://[username].github.io/MMM-HK-Transport-ETA-Data/001002.json`
- etc.

## Setup GitHub Pages

To enable GitHub Pages for this repository:

1. Go to the repository Settings
2. Navigate to the "Pages" section in the sidebar
3. Under "Source", select "GitHub Actions"
4. Click "Save"

The data will then be automatically published to your GitHub Pages site after each daily run.
