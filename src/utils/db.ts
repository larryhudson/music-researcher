import sqlite3 from 'better-sqlite3';

const db = new sqlite3('database.db', {verbose: console.log});
db.pragma('journal_mode = WAL');

// Function to execute a single SQL statement
export function executeStatement(sql, params = []) {
  const statement = db.prepare(sql);
  return statement.run(params);
}

export function executeGet(sql, params = []) {
  const statement = db.prepare(sql);
  return statement.get(params);
}

// Function to execute a SQL query and return the result
export function executeQuery(sql, params = []) {
  const statement = db.prepare(sql);
  return statement.all(params);
}

export function lookupArtistFromServiceUrl({serviceUrl}) {

    const foundArtist = executeGet(`SELECT *
FROM artists
WHERE id = (
SELECT artist_id
FROM external_links
WHERE url = (?)
);`, [serviceUrl])

    return foundArtist;
}

export function initDb() {
  const createStatements = [`CREATE TABLE IF NOT EXISTS artists (
id INTEGER PRIMARY KEY,
name TEXT NOT NULL,
description TEXT
);`,
    `CREATE TABLE IF NOT EXISTS albums (
id INTEGER PRIMARY KEY,
title TEXT NOT NULL,
artist_id INTEGER NOT NULL,
release_date DATE,
description TEXT,
FOREIGN KEY (artist_id) REFERENCES artists(id)
);`,
    `CREATE TABLE IF NOT EXISTS people (
id INTEGER PRIMARY KEY,
name TEXT NOT NULL,
role TEXT
);`,
    `CREATE TABLE IF NOT EXISTS labels (
id INTEGER PRIMARY KEY,
name TEXT NOT NULL,
description TEXT
);`,
    `CREATE TABLE IF NOT EXISTS releases (
id INTEGER PRIMARY KEY,
album_id INTEGER,
artist_id INTEGER,
label_id INTEGER,
FOREIGN KEY (album_id) REFERENCES albums(id),
FOREIGN KEY (artist_id) REFERENCES artists(id),
FOREIGN KEY (label_id) REFERENCES labels(id)
);`,
    `CREATE TABLE IF NOT EXISTS credits (
id INTEGER PRIMARY KEY,
release_id INTEGER,
person_id INTEGER,
role TEXT,
FOREIGN KEY (release_id) REFERENCES releases(id),
FOREIGN KEY (person_id) REFERENCES people(id)
);`,
    `CREATE TABLE IF NOT EXISTS external_links (
id INTEGER PRIMARY KEY,
entity_type TEXT,
artist_id INTEGER,
album_id INTEGER,
person_id INTEGER,
release_id INTEGER,
service TEXT,
url TEXT,
FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE,
FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);`
    ]

  for (let statement of createStatements) {
    executeStatement(statement);
  }

}
