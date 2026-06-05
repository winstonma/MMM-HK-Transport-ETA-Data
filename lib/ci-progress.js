const fs = require('fs');

/**
 * Handles CI-specific progress tracking to prevent GitHub Actions timeouts
 * and provide a live dashboard via $GITHUB_STEP_SUMMARY.
 */
class CIRunProgress {
  constructor(totalCount, taskName = 'Data Collection', intervalMs = 30000) {
    this.totalCount = totalCount;
    this.taskName = taskName;
    this.intervalMs = intervalMs;
    this.lastLogTime = Date.now();
    this.isCI = !!process.env.CI;
    this.summaryFile = process.env.GITHUB_STEP_SUMMARY;

    // Initial setup for the Step Summary page
    this.updateSummary(0, 'Initializing...');
  }

  /**
   * Tracks progress and triggers updates based on the heartbeat interval.
   * @param {number} currentCount - Current progress count
   * @param {string} statusMessage - Message describing the current task
   */
  track(currentCount, statusMessage = 'Processing...') {
    if (!this.isCI) return;

    const now = Date.now();
    const isFinal = currentCount === this.totalCount;

    // Trigger update if interval passed, or if we hit 100% completion
    if (now - this.lastLogTime > this.intervalMs || isFinal) {
      const pct = ((currentCount / this.totalCount) * 100).toFixed(1);
      const timestamp = new Date().toISOString().split('T')[1].slice(0, 8); // "HH:MM:SS"

      // 1. Heartbeat: Print to standard terminal logs to keep job alive
      console.log(`[${timestamp}] Progress: ${currentCount}/${this.totalCount} completed (${pct}%)`);

      // 2. Dashboard: Live overwrite the Step Summary file
      this.updateSummary(currentCount, statusMessage);

      this.lastLogTime = now;
    }
  }

  /**
   * Updates the GitHub Step Summary markdown file.
   * @param {number} currentCount - Current progress count
   * @param {string} statusMessage - Message describing the current task
   */
  updateSummary(currentCount, statusMessage) {
    if (!this.summaryFile) return;

    const pct = ((currentCount / this.totalCount) * 100).toFixed(1);

    // Create a visual markdown progress bar using simple text blocks
    const progressBarLength = 20;
    const filledLength = Math.round((progressBarLength * currentCount) / this.totalCount);
    const progressBar = '🟩'.repeat(filledLength) + '⬜'.repeat(progressBarLength - filledLength);

    const markdown = `
### 🛰️ Long-Running Job Dashboard: ${this.taskName}
| Metric | Current Status |
| :--- | :--- |
| **Current Sub-Task** | ${statusMessage} |
| **Progress** | ${currentCount} / ${this.totalCount} (${pct}%) |
| **Last Updated** | ${new Date().toLocaleTimeString()} (Runner Time) |

${progressBar}

> 💡 *Note: The main terminal log is being throttled to prevent buffer bloat. Check timestamps there if debugging detailed latency issues.*
`;

    try {
      // writeFileSync completely overwrites the file, maintaining a single clean view
      fs.writeFileSync(this.summaryFile, markdown, 'utf-8');
    } catch (e) {
      // Silently fail if summary write fails to avoid crashing the main process
    }
  }
}

module.exports = { CIRunProgress };
