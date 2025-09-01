const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const db = new sqlite3.Database(path.join(__dirname, 'tournaments.db'));

app.use(cors());
app.use(bodyParser.json());

// Create table if not exists
const createTable = `CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  gameType TEXT,
  maxParticipants INTEGER,
  startDate INTEGER,
  tournamentType TEXT,
  participantFee REAL,
  spectatorFee REAL,
  rules TEXT,
  prizePool REAL,
  isVideoStreamEnabled INTEGER
)`;
db.run(createTable);

// List tournaments
app.get('/api/tournaments', (req, res) => {
  db.all('SELECT * FROM tournaments', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create tournament
app.post('/api/tournaments', (req, res) => {
  const {
    name, description, gameType, maxParticipants, startDate, tournamentType,
    participantFee, spectatorFee, rules, prizePool, isVideoStreamEnabled
  } = req.body;
  db.run(
    `INSERT INTO tournaments (name, description, gameType, maxParticipants, startDate, tournamentType, participantFee, spectatorFee, rules, prizePool, isVideoStreamEnabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, description, gameType, maxParticipants, startDate, tournamentType, participantFee, spectatorFee, rules, prizePool, isVideoStreamEnabled ? 1 : 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Get tournament by id
app.get('/api/tournaments/:id', (req, res) => {
  db.get('SELECT * FROM tournaments WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
