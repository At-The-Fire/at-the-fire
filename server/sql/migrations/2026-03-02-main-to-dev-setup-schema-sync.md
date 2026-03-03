# Main → Dev schema sync for `setup.sql`

## Inconsistencies found

Comparing `server/sql/setup.sql` on `main` (production baseline) vs `dev`:

1. **`gallery_posts` differs**
   - `dev` adds `quantity INTEGER DEFAULT 1`
   - `dev` adds `deleted_at TIMESTAMPTZ DEFAULT NULL`

2. **`quota_tracking` differs**
   - `dev` adds `deleted_at TIMESTAMPTZ DEFAULT NULL`

3. **New tables on `dev` only**
   - `auctions`
   - `bids`
   - `auction_results`
   - `auction_notifications`
   - `purchases`

4. **Reset-only drop list changed in `setup.sql`**
   - `dev` added extra `DROP TABLE IF EXISTS ...` entries for the 5 new tables.
   - This affects full reset behavior only, not in-place production migration.

---

## SQL required to upgrade production (`main`) in place

> Run in PostgreSQL against production DB. This is forward-only schema SQL to align with `dev` `setup.sql`.

```sql
BEGIN;

-- 1) Existing table changes
ALTER TABLE gallery_posts
	ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

ALTER TABLE gallery_posts
	ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE quota_tracking
	ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2) New auction table
CREATE TABLE IF NOT EXISTS auctions (
	id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	seller_sub    VARCHAR NOT NULL REFERENCES cognito_users(sub) ON DELETE CASCADE,
	title         VARCHAR(255) NOT NULL,
	description   TEXT,
	image_urls    TEXT[] NOT NULL DEFAULT '{}',
	start_price   NUMERIC NOT NULL,
	buy_now_price NUMERIC,
	current_bid   NUMERIC,
	start_time    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	end_time      TIMESTAMPTZ NOT NULL,
	is_active     BOOLEAN NOT NULL DEFAULT TRUE,
	created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) New bids table
CREATE TABLE IF NOT EXISTS bids (
	id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	auction_id  BIGINT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
	bidder_sub  VARCHAR NOT NULL REFERENCES cognito_users(sub) ON DELETE CASCADE,
	bid_amount  NUMERIC NOT NULL CHECK (bid_amount > 0),
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) New auction results table
CREATE TABLE IF NOT EXISTS auction_results (
	id              SERIAL PRIMARY KEY,
	auction_id      BIGINT UNIQUE REFERENCES auctions(id),
	winner_sub      VARCHAR REFERENCES cognito_users(sub),
	final_bid       NUMERIC,
	closed_at       TIMESTAMPTZ DEFAULT NOW(),
	closed_reason   TEXT NOT NULL,
	is_paid         BOOLEAN DEFAULT FALSE,
	tracking_number TEXT
);

-- 5) New auction notifications table
CREATE TABLE IF NOT EXISTS auction_notifications (
	id          BIGSERIAL PRIMARY KEY,
	user_sub    VARCHAR NOT NULL REFERENCES cognito_users(sub) ON DELETE CASCADE,
	auction_id  BIGINT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
	type        TEXT NOT NULL CHECK (type IN ('outbid', 'won')),
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	is_read     BOOLEAN NOT NULL DEFAULT FALSE
);

-- 6) New purchases table
CREATE TABLE IF NOT EXISTS purchases (
	id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	buyer_sub                 VARCHAR NOT NULL REFERENCES cognito_users(sub),
	seller_customer_id        VARCHAR NOT NULL REFERENCES stripe_customers(customer_id),
	item_type                 VARCHAR NOT NULL CHECK (item_type IN ('gallery_post', 'auction')),
	item_id                   BIGINT NOT NULL,
	quantity                  INT NOT NULL DEFAULT 1,
	amount_paid               NUMERIC NOT NULL,
	processor_transaction_id  VARCHAR,
	status                    VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
	tracking_number           TEXT,
	shipped_at                TIMESTAMPTZ,
	created_at                TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
```
