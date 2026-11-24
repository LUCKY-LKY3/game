/**
 * Web leaderboard (used only when the game runs on a normal website, not inside the Artifact).
 * Fill these in from your Google Form + published Google Sheet. Leave empty to keep it device-only.
 * See WEB_LEADERBOARD.md for the step-by-step.
 */
export const WEB_BOARD = {
  /** https://docs.google.com/forms/d/e/<FORM_ID>/formResponse */
  formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSf2a-GrNmK3sBGz8rjhTA1wUmcebwcym6LlTf9in8wbKVcSJw/formResponse',
  /** Field ids from the pre-filled link, like 'entry.1234567890' */
  entryNick: 'entry.1611354872',
  entryFighter: 'entry.324219132',
  entryScore: 'entry.2138772026',
  entryWave: 'entry.1454779527',
  /** Sheet > File > Share > Publish to web > CSV link */
  csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTs9V8p1W6LyNSOmbxa-bAgEKOOo5uuzo89meN2oLHgHT0Uq0tYHLUkw2OCZ0NcQKt7B-ZzxYQZt8nY/pub?gid=1696784378&single=true&output=csv',
};

export const webBoardConfigured = (): boolean =>
  Boolean(WEB_BOARD.formUrl && WEB_BOARD.entryNick && WEB_BOARD.entryFighter && WEB_BOARD.entryScore && WEB_BOARD.entryWave && WEB_BOARD.csvUrl);
