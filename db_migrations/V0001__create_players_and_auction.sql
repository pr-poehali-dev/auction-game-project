CREATE TABLE t_p50676489_auction_game_project.players (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  avatar VARCHAR(512),
  coins INTEGER NOT NULL DEFAULT 2500,
  spins_left INTEGER NOT NULL DEFAULT 2,
  spin_refill_at BIGINT NOT NULL DEFAULT 0,
  inventory JSONB NOT NULL DEFAULT '[]',
  spin_history JSONB NOT NULL DEFAULT '[]',
  stats JSONB NOT NULL DEFAULT '{"spins":0,"wins":0,"auctionWins":0,"level":1,"xp":0}',
  purchased_items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p50676489_auction_game_project.auction_lots (
  id VARCHAR(64) PRIMARY KEY,
  prize JSONB NOT NULL,
  seller_id INTEGER REFERENCES t_p50676489_auction_game_project.players(id),
  seller_name VARCHAR(255) NOT NULL DEFAULT 'Игрок',
  start_price INTEGER NOT NULL,
  current_bid INTEGER NOT NULL,
  bidder_name VARCHAR(255) NOT NULL DEFAULT '—',
  bidder_id INTEGER REFERENCES t_p50676489_auction_game_project.players(id),
  ends_at BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
