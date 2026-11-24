# Web leaderboard setup (Google Form + Google Sheet)

Only needed when the game is on a normal website. Inside the Artifact the shared board already works.

1. **Make a Google Form** with four *Short answer* questions, in this order: `Nickname`, `Fighter`, `Score`, `Wave`.
2. **Link it to a Sheet**: Form > Responses tab > green Sheets icon > Create. The sheet columns will be Timestamp, Nickname, Fighter, Score, Wave.
3. **Publish the sheet as CSV**: in the Sheet, File > Share > Publish to web > pick the responses sheet and *Comma-separated values (.csv)* > Publish. Copy the link (this is `csvUrl`).
4. **Get the field ids**: in the Form, three dots > *Get pre-filled link*. Type `NICK`, `FIGHTER`, `123`, `4` into the four fields, press *Get link*, copy it. It looks like
   `https://docs.google.com/forms/d/e/<FORM_ID>/viewform?usp=pp_url&entry.111=NICK&entry.222=FIGHTER&entry.333=123&entry.444=4`
5. Send both links to Claude (or fill `src/config.ts` yourself): `formUrl` is the same address with `viewform...` replaced by `formResponse`, and the four `entry.NNN` ids.

Deleting a score: delete its row in the Sheet. It disappears from the game within a few minutes.

Notes: anyone can submit, so the game ignores rows where score is more than 25,000 x wave, and the name is cleaned to 12 letters/numbers. Scores show on the Public tab; the This device tab always works offline.
