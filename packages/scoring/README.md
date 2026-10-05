# VISIUM scoring

`computeVisiumScore.js` is the preserved deterministic scoring implementation originally developed as a standalone VISIUM prototype.

It accepts session events plus a spatial-zone schema and returns component scores, lead temperature, reliability, a signal breakdown, and algorithm metadata. It is implemented and tested here, but it is not currently imported by the web application or backed by a repository-local event database.

Run `npm run test:scoring` from the repository root.
