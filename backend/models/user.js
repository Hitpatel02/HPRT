/**
 * models/user.js
 *
 * Schema: "user".admin_users
 *
 * Application admin users (login accounts). Passwords are bcrypt-hashed.
 */

const TABLE = '"user".admin_users';

const COLUMNS = {
    id: { type: 'SERIAL', primaryKey: true },
    username: { type: 'VARCHAR(100)', notNull: true, unique: true },
    email: { type: 'VARCHAR(255)', notNull: true, unique: true },
    password_hash: { type: 'VARCHAR(255)', notNull: true, description: 'bcrypt hash' },
    created_at: { type: 'TIMESTAMPTZ', default: 'NOW()' },
    last_login: { type: 'TIMESTAMPTZ', nullable: true },
};

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLE} (
  id            SERIAL        PRIMARY KEY,
  username      VARCHAR(100)  NOT NULL UNIQUE,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_login    TIMESTAMPTZ
);
`;

module.exports = { TABLE, COLUMNS, CREATE_SQL };
