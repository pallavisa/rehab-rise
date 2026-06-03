import { pool } from './db.js';

const tables = [
  `CREATE TABLE IF NOT EXISTS programs (
    id          VARCHAR(32)   PRIMARY KEY,
    name        VARCHAR(120)  NOT NULL,
    tag         VARCHAR(60),
    price       INT           NOT NULL,
    cadence     VARCHAR(40)   NOT NULL DEFAULT '/ month',
    summary     TEXT,
    features    JSON,
    saving      VARCHAR(60),
    is_accent   TINYINT(1)    NOT NULL DEFAULT 0,
    is_bundle   TINYINT(1)    NOT NULL DEFAULT 0,
    is_active   TINYINT(1)    NOT NULL DEFAULT 1,
    sort_order  INT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS availability_slots (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    slot_date  DATE        NOT NULL,
    slot_time  VARCHAR(5)  NOT NULL,
    is_taken   TINYINT(1)  NOT NULL DEFAULT 0,
    UNIQUE KEY uniq_slot (slot_date, slot_time)
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS availability_template (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    weekday   VARCHAR(3)  NOT NULL,
    slot_time VARCHAR(5)  NOT NULL,
    is_open   TINYINT(1)  NOT NULL DEFAULT 0,
    UNIQUE KEY uniq_tmpl (weekday, slot_time)
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS members (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(160) NOT NULL,
    email         VARCHAR(200) NOT NULL UNIQUE,
    phone         VARCHAR(60),
    password_hash VARCHAR(255) NOT NULL,
    is_admin      TINYINT(1)   NOT NULL DEFAULT 0,
    status        VARCHAR(20)  NOT NULL DEFAULT 'Active',
    note          TEXT,
    joined        VARCHAR(40),
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS bookings (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    slot_id     INT          NOT NULL,
    name        VARCHAR(160) NOT NULL,
    email       VARCHAR(200) NOT NULL,
    phone       VARCHAR(60)  NOT NULL,
    program     VARCHAR(80)  DEFAULT 'Not sure yet',
    note        TEXT,
    meet_link   VARCHAR(255),
    status      VARCHAR(20)  NOT NULL DEFAULT 'new',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_slot FOREIGN KEY (slot_id)
      REFERENCES availability_slots(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS subscriptions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    member_id   INT          NOT NULL,
    program_id  VARCHAR(32)  NOT NULL,
    amount      INT          NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'active',
    started_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    renews_at   DATE,
    CONSTRAINT fk_sub_member  FOREIGN KEY (member_id)  REFERENCES members(id)  ON DELETE CASCADE,
    CONSTRAINT fk_sub_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS payments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    member_id   INT          NOT NULL,
    receipt     VARCHAR(40)  NOT NULL,
    period      VARCHAR(40),
    amount      INT          NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'Paid',
    paid_on     DATE,
    CONSTRAINT fk_pay_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS sessions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    member_id   INT          NOT NULL,
    title       VARCHAR(160) NOT NULL,
    type        VARCHAR(60)  DEFAULT 'Video session',
    starts_at   DATETIME     NOT NULL,
    mins        INT          NOT NULL DEFAULT 30,
    meet_link   VARCHAR(255),
    status      VARCHAR(20)  NOT NULL DEFAULT 'upcoming',
    CONSTRAINT fk_sess_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS files (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    member_id   INT          NOT NULL,
    name        VARCHAR(255) NOT NULL,
    kind        VARCHAR(80)  DEFAULT 'Shared file',
    category    VARCHAR(40)  DEFAULT 'plan',
    ext         VARCHAR(12),
    size_bytes  BIGINT       DEFAULT 0,
    stored_name VARCHAR(255) NOT NULL,
    is_new      TINYINT(1)   NOT NULL DEFAULT 1,
    added_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_file_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS training_plans (
    member_id   INT          PRIMARY KEY,
    plan        JSON         NOT NULL,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_plan_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
];

async function run() {
  console.log('Creating tables...');
  for (const sql of tables) {
    const name = sql.match(/TABLE IF NOT EXISTS (\w+)/)?.[1];
    await pool.query(sql);
    console.log(`  ✓ ${name}`);
  }
  console.log('All tables created.');
  await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
