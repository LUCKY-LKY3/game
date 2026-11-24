/**
 * Web leaderboard (used only when the game runs on a normal website, not inside the Artifact).
 * Fill these in from your Google Form + published Google Sheet. Leave empty to keep it device-only.
 * See WEB_LEADERBOARD.md for the step-by-step.
 */
export const WEB_BOARD = {
  /** https://docs.google.com/forms/d/e/<FORM_ID>/formResponse */
  formUrl: '',
  /** Field ids from the pre-filled link, like 'entry.1234567890' */
  entryNick: '',
  entryFighter: '',
  entryScore: '',
  entryWave: '',
  /** Sheet > File > Share > Publish to web > CSV link */
  csvUrl: '',
};

export const webBoardConfigured = (): boolean =>
  Boolean(WEB_BOARD.formUrl && WEB_BOARD.entryNick && WEB_BOARD.entryFighter && WEB_BOARD.entryScore && WEB_BOARD.entryWave && WEB_BOARD.csvUrl);
