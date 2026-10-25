import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import Database from 'better-sqlite3'

test('category migration preserves expenses and isolates user catalogs', () => {
  const db = new Database(':memory:')
  try {
    db.pragma('foreign_keys = ON')
    const journal = JSON.parse(readFileSync(new URL('../server/db/migrations/meta/_journal.json', import.meta.url)))
    const apply = (entry) => db.exec(readFileSync(new URL(`../server/db/migrations/${entry.tag}.sql`, import.meta.url), 'utf8'))
    journal.entries.slice(0, 4).forEach(apply)
    db.exec(`
      INSERT INTO user (id, name, email) VALUES ('alice', 'Alice', 'alice@example.com'), ('bob', 'Bob', 'bob@example.com');
      INSERT INTO categories (key, name) VALUES ('custom', 'Custom');
      INSERT INTO expense (id, user_id, amount, date, category, description)
      VALUES ('e1', 'alice', 100, '2026-10-25', 'custom', 'Example');
    `)
    apply(journal.entries[4])
    assert.equal(db.prepare('SELECT count(*) AS n FROM categories WHERE user_id = ?').get('alice').n, 8)
    assert.equal(db.prepare('SELECT count(*) AS n FROM categories WHERE user_id = ?').get('bob').n, 8)
    assert.equal(db.prepare('SELECT category FROM expense WHERE id = ?').get('e1').category, 'custom')
    db.prepare('UPDATE categories SET name = ? WHERE user_id = ? AND key = ?').run('Personal', 'alice', 'custom')
    assert.equal(db.prepare('SELECT name FROM categories WHERE user_id = ? AND key = ?').get('bob', 'custom').name, 'Custom')
    db.prepare('DELETE FROM categories WHERE user_id = ? AND key = ?').run('bob', 'custom')
    assert.equal(db.prepare('SELECT name FROM categories WHERE user_id = ? AND key = ?').get('alice', 'custom').name, 'Personal')
    assert.throws(() => db.prepare('INSERT INTO categories (user_id, key, name) VALUES (?, ?, ?)').run('alice', 'custom', 'Duplicate'), /UNIQUE/)
    assert.throws(() => db.prepare('INSERT INTO categories (user_id, key, name) VALUES (?, ?, ?)').run('missing', 'custom', 'Invalid'), /FOREIGN KEY/)
    db.prepare('DELETE FROM user WHERE id = ?').run('bob')
    assert.equal(db.prepare('SELECT count(*) AS n FROM categories WHERE user_id = ?').get('bob').n, 0)
    assert.equal(db.prepare('SELECT count(*) AS n FROM categories WHERE user_id = ?').get('alice').n, 8)
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally {
    db.close()
  }
})
