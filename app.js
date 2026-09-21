const express = require('express');
const app = express();
const port = 8080;

app.get('/', (req, res) => res.send('Hello World!'));

// Export the app so tests can import it without starting a server.
module.exports = app;

// Only bind the port when run directly (node app.js / npm start).
if (require.main === module) {
  app.listen(port);
  console.log(`App running on http://localhost:${port}`);
}
