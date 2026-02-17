-- Use this file to define your SQL tables
-- The SQL in this file will be executed when you run `npm run setup-db`


DROP TABLE IF EXISTS cognito_users CASCADE;
DROP TABLE IF EXISTS stripe_customers CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS cancellation_data CASCADE;
DROP TABLE IF EXISTS failed_transactions CASCADE;
DROP TABLE IF EXISTS gallery_posts CASCADE;
DROP TABLE IF EXISTS posts_imgs CASCADE;
DROP TABLE IF EXISTS quota_tracking CASCADE;
DROP TABLE IF EXISTS product_sales CASCADE;
DROP TABLE IF EXISTS quota_goals CASCADE;
DROP TABLE IF EXISTS inventory_snapshot CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS image_uploads CASCADE;
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS followers CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_visibility CASCADE;

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE TABLE cognito_users (
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
sub VARCHAR(255) UNIQUE NOT NULL,
email VARCHAR(255) UNIQUE NOT NULL,
customer_id VARCHAR(255) UNIQUE,
created_at TIMESTAMP DEFAULT NOW(),  
image_url VARCHAR(255),
public_id VARCHAR(255),
first_name VARCHAR(255),
last_name VARCHAR(255),
bio VARCHAR(255),
email_hash VARCHAR(255) UNIQUE NOT NULL,
social_media_links JSON
);  

CREATE TABLE stripe_customers (
aws_sub VARCHAR(255) UNIQUE NOT NULL,
customer_id VARCHAR(255) UNIQUE PRIMARY KEY NOT NULL,
email VARCHAR(255) UNIQUE,
name VARCHAR(255),
phone VARCHAR(255)UNIQUE,
display_name VARCHAR(255),
website_url VARCHAR(255),
social_media_links JSON,
logo_image_url VARCHAR(255),
logo_public_id VARCHAR(255),
confirmed BOOLEAN DEFAULT FALSE,
email_hash VARCHAR(255) UNIQUE ,
FOREIGN KEY (aws_sub) REFERENCES cognito_users(sub) ON DELETE CASCADE 
);

CREATE TABLE subscriptions (
customer_id VARCHAR(255)UNIQUE NOT NULL,
subscription_id VARCHAR(255)  PRIMARY KEY NOT NULL,
is_active BOOLEAN NOT NULL,
interval VARCHAR(255),
subscription_start_date BIGINT,
subscription_end_date BIGINT,
trial_start_date BIGINT,
trial_end_date BIGINT,
status VARCHAR(20) DEFAULT 'inactive',
FOREIGN KEY (customer_id) REFERENCES stripe_customers(customer_id) ON DELETE CASCADE
);

CREATE TABLE invoices (
  customer_id VARCHAR(255) NOT NULL,
  invoice_id VARCHAR(255) PRIMARY KEY,
  start_date BIGINT,
  end_date BIGINT,
  invoice_status VARCHAR(255),
  subscription_id VARCHAR(255) NOT NULL,
  amount_due DECIMAL(9,2),
  amount_paid DECIMAL(9,2),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (customer_id) REFERENCES stripe_customers(customer_id) ON DELETE CASCADE 
);

CREATE TABLE cancellation_data (
  subscription_id VARCHAR(255) NOT NULL,
  canceled_at VARCHAR(255) NOT NULL,
  comment VARCHAR(255),
  feedback VARCHAR(255),
  reason VARCHAR(255)
);

CREATE TABLE failed_transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id VARCHAR(255) NOT NULL,
  failure_code VARCHAR(255) NOT NULL,
  transaction_amt BIGINT NOT NULL,
  timestamp BIGINT NOT NULL,
  invoice_id VARCHAR(255) NOT NULL
);

CREATE TABLE gallery_posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  title VARCHAR,
  description VARCHAR,
  image_url VARCHAR,
  category VARCHAR,
  price VARCHAR,
  customer_id VARCHAR(255),
  public_id VARCHAR,
  num_imgs BIGINT,
  FOREIGN KEY (customer_id) REFERENCES stripe_customers(customer_id) ON DELETE CASCADE , 
  sold BOOLEAN DEFAULT FALSE,
  date_sold VARCHAR
);

CREATE TABLE posts_imgs (
  id SERIAL PRIMARY KEY,
  post_id INTEGER,
  image_url VARCHAR(255),
  public_id VARCHAR(255),
  resource_type VARCHAR(255),
  FOREIGN KEY (post_id) REFERENCES gallery_posts(id) ON DELETE CASCADE 
);

CREATE TABLE quota_tracking (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  type VARCHAR,
  date VARCHAR,
  title VARCHAR,
  description VARCHAR,
  category VARCHAR,
  price VARCHAR,
  image_url VARCHAR,
  public_id VARCHAR,
  customer_id VARCHAR(255) NOT NULL,
  num_days BIGINT NOT NULL,
  post_id BIGINT,
  sold BOOLEAN DEFAULT false,
  date_sold VARCHAR, 
  qty INTEGER DEFAULT 1,   
  FOREIGN KEY (customer_id) REFERENCES stripe_customers(customer_id) ON DELETE CASCADE 
  );

CREATE TABLE product_sales (
  id SERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES quota_tracking(id) ON DELETE CASCADE,
  quantity_sold INT NOT NULL,
  date_sold VARCHAR NOT NULL
);
CREATE INDEX idx_sales_product ON product_sales(product_id);

CREATE TABLE quota_goals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  monthly_quota BIGINT,
  work_days BIGINT, 
  customer_id VARCHAR(255) UNIQUE NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES stripe_customers(customer_id)  ON DELETE CASCADE 
);

CREATE TABLE inventory_snapshot (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  category_count JSONB,
  price_count JSONB,
  customer_id VARCHAR(255) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES stripe_customers(customer_id) ON DELETE CASCADE 
);

CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  customer_id VARCHAR(255) NOT NULL,
  order_number BIGINT NOT NULL ,
date TIMESTAMP NOT NULL,
  is_fulfilled BOOLEAN DEFAULT false NOT NULL,
  client_name VARCHAR(255),
  items JSONB,
  shipping BIGINT DEFAULT 0,
  FOREIGN KEY (customer_id) REFERENCES stripe_customers(customer_id)  ON DELETE CASCADE ,
  CONSTRAINT unique_user_order UNIQUE (customer_id, order_number)

);

CREATE TABLE image_uploads(
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  image_count INTEGER NOT NULL CHECK (image_count > 0),
  customer_id VARCHAR(255) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES stripe_customers(customer_id)  ON DELETE CASCADE 
);

-- Add index for the queries you'll be running in image_uploads table
CREATE INDEX idx_image_uploads_customer_time 
ON image_uploads (customer_id, created_at);

CREATE TABLE webhook_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE followers (
    follower_id VARCHAR(255) NOT NULL,
    followed_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_followers UNIQUE (follower_id, followed_id),
    CONSTRAINT fk_followed FOREIGN KEY (followed_id) REFERENCES cognito_users(sub) ON DELETE CASCADE
);

CREATE TABLE likes (
    like_id SERIAL PRIMARY KEY,
    sub VARCHAR NOT NULL REFERENCES cognito_users(sub) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES gallery_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure a user can only like an item once
    UNIQUE(sub, post_id)
);
-- These indexes will help with performance
CREATE INDEX likes_user_gallery_idx ON likes(sub, post_id);
CREATE INDEX likes_gallery_item_idx ON likes(post_id);

-- Conversations table
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation participants (linking conversations to cognito users)
CREATE TABLE conversation_participants (
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    user_sub TEXT REFERENCES cognito_users(sub) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, user_sub)
);

-- Messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    sender_sub TEXT REFERENCES cognito_users(sub) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);

-- Index for faster queries
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_sub ON messages(sender_sub);
CREATE INDEX idx_conversation_participants_user_sub ON conversation_participants(user_sub);

CREATE TABLE conversation_visibility (
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    user_sub TEXT REFERENCES cognito_users(sub) ON DELETE CASCADE,
    is_visible BOOLEAN DEFAULT TRUE,
    hidden_at TIMESTAMP,
    sender BOOLEAN DEFAULT FALSE,
    first_message_sent BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (conversation_id, user_sub)
);




--  adding users for testing --
-- User with no profile data
INSERT INTO "cognito_users" 
("bio", "created_at", "customer_id", "email", "first_name", "image_url", "last_name", "public_id", "sub", "email_hash") 
VALUES 
(NULL, NOW(), NULL, 'noProfile@example.com', NULL, NULL, NULL, NULL, 'sub_noProfile', 'dummy_hash_5');

-- User with profile data but no associated customer data
INSERT INTO "cognito_users"  ("bio", "created_at", "customer_id", "email", "first_name", "image_url", "last_name", "public_id", "sub", "email_hash") 
VALUES  
('Bio for profile user', NOW(), NULL, 'withProfile@example.com', 'First', 'image_url_path', 'Last', 'publicID_profile', 'sub_withProfile', 'dummy_hash_6');

-- User with a customer ID but no profile data entered in stripe_customers
INSERT INTO "cognito_users" ("bio", "created_at", "customer_id", "email", "first_name", "image_url", "last_name", "public_id", "sub", "email_hash") 
VALUES (NULL, NOW(), 'stripe-customer-id_noProfile', 'customerNoProfile@example.com', NULL, NULL, NULL, NULL, 'sub_customerNoProfile', 'dummy_hash_7');

INSERT INTO "stripe_customers" 
("aws_sub", "customer_id", "display_name", "email", "logo_image_url", "logo_public_id", "name", "phone", "website_url", "confirmed", "email_hash") 
VALUES 
('sub_customerNoProfile', 'stripe-customer-id_noProfile', NULL, 'customerNoProfile@example.com', NULL, NULL, NULL, NULL, NULL, true, 'dummy_hash_8');

-- Customer with profile data
INSERT INTO "cognito_users"  ("bio", "created_at", "customer_id", "email", "first_name", "image_url", "last_name", "public_id", "sub", "email_hash") 
VALUES 
('Bio for full customer', NOW(), 'stripe-customer-id_full', 'fullCustomer@example.com', 'CustomerFirst', 'image_url_path', 'CustomerLast', 'publicID_fullCustomer', 'sub_fullCustomer', 'dummy_hash_9');

-- Test Customer (2) with profile data
INSERT INTO "cognito_users"  ("bio", "created_at", "customer_id", "email", "first_name", "image_url", "last_name", "public_id", "sub", "email_hash") 
VALUES 
('Bio for full customer 2', NOW(), 'cus_OVLKmXa6lrzktm', 'kevinnail@hotmail.com', 'CustomerTestFirst', 'image_url_path', 'CustomerTestLast', 'publicID_fullTestCustomer', '0861e380-30a1-70f8-82fd-0dc85cc975aa', 'dummy_hash_15');

-- Test Customer (2) with customer data
INSERT INTO "stripe_customers" 
("aws_sub", "customer_id", "display_name", "email", "logo_image_url", "logo_public_id", "name", "phone", "website_url", "confirmed", "email_hash") 
VALUES   ('0861e380-30a1-70f8-82fd-0dc85cc975aa', 'cus_OVLKmXa6lrzktm', 'Test Customer 2', 'kevinnail@hotmail.com', 'logo_image_url_path2', 'publicID_logo2', 'FullName2', '555-3333', 'http://website.com', true, 'dummy_hash_15');

 -- dTest Customer (2)  data insertions for testing
INSERT INTO orders (customer_id, order_number, date, is_fulfilled, client_name, items, shipping) VALUES
('cus_OVLKmXa6lrzktm', 21, '2023-10-01', true, 'Up In Smoke', '[{"name": "glass stuff", "category": "Recyclers", "description": "all fume with opals and it has a lot of other stuff I would love to talk about for a while", "qty": 5, "rate": 1000}, {"name": "glass stuff", "category": "Dry pieces", "description": "fume + dichro", "qty": 20, "rate": 20}]',100),
('cus_OVLKmXa6lrzktm', 22, '2023-10-02', true, 'Puff Puff Pass', '[{"name": "glass stuff", "category": "Slides", "description": "dichro and fume", "qty": 5, "rate": 250}, {"name": "glass stuff", "category": "Dry Pipes", "description": "all fume", "qty": 5, "rate": 640}]',40),
('cus_OVLKmXa6lrzktm', 23, '2023-10-03', false, 'Pipes Galore', '[{"name": "glass stuff", "category": "Recyclers", "description": "all fume with opals", "qty": 5, "rate": 1000}, {"name": "glass stuff", "category": "Dry pieces", "description": "fume + dichro", "qty": 20, "rate": 20}]',50),
('cus_OVLKmXa6lrzktm', 24, '2023-10-04', false, 'Robert (collector)', '[{"name": "glass stuff", "category": "Slides", "description": "all fume with opals", "qty": 5, "rate": 250}, {"name": "glass stuff", "category": "Dry Pipes", "description": "dichro and fume", "qty": 5, "rate": 640}]',0);



INSERT INTO "stripe_customers" 
("aws_sub", "customer_id", "display_name", "email", "logo_image_url", "logo_public_id", "name", "phone", "website_url", "confirmed", "email_hash") 
VALUES   ('sub_fullCustomer', 'stripe-customer-id_full', 'Display Name', 'fullCustomer@example.com', 'logo_image_url_path', 'publicID_logo', 'FullName', '555-1234', 'http://website.com', true, 'dummy_hash_10');

INSERT INTO "quota_goals"
("monthly_quota","work_days","customer_id")
VALUES  (5000,25,'stripe-customer-id_full');

INSERT INTO "quota_tracking"
("type", "date","title","description","category", "price", "image_url", "public_id", "customer_id","num_days","post_id","sold")
VALUES ('auction', 1731744000000, 'test-title','test-description','test-category','test-price','https://res.cloudinary.com/dzodr2cdk/image/upload/f_auto,q_auto/v1731810583/at-the-fire/IMG_0749.jpg', 'image-public-id','stripe-customer-id_full',1,NULL,false);


-- Add posts for testing
-- Posts for the user with a customer ID but no profile data entered in stripe_customers
INSERT INTO "gallery_posts" 
("title", "description", "image_url", "category", "price", "customer_id", "public_id", "num_imgs","sold")
VALUES 
('SampleTitle1', 'SampleDescription1', 'sample_image_url_path_1', 'SampleCategory1', 'SamplePrice1', 'stripe-customer-id_noProfile', 'publicID_post_1', 1,false),
('SampleTitle2', 'SampleDescription2', 'sample_image_url_path_2', 'SampleCategory2', 'SamplePrice2', 'stripe-customer-id_noProfile', 'publicID_post_2', 2,false);

-- Posts for the customer with profile data
INSERT INTO "gallery_posts" 
("title", "description", "image_url", "category", "price", "customer_id", "public_id", "num_imgs","sold")
VALUES 
('SampleTitle3', 'SampleDescription3', 'sample_image_url_path_3', 'SampleCategory3', 'SamplePrice3', 'stripe-customer-id_full', 'publicID_post_3', 1,false),
('SampleTitle4', 'SampleDescription4', 'sample_image_url_path_4', 'SampleCategory4', 'SamplePrice4', 'stripe-customer-id_full', 'publicID_post_4', 2,false);

-- Add partial profile data for testing
INSERT INTO "cognito_users" 
("bio", "created_at", "customer_id", "email", "first_name", "image_url", "last_name", "public_id", "sub", "email_hash")
VALUES
(NULL, NOW(), 'stripe-customer-id_partialProfile', 'partialProfile@example.com', '', '', '', '', 'sub_partialProfile', 'dummy_hash_11');

INSERT INTO "stripe_customers" 
("aws_sub", "customer_id", "display_name", "email", "logo_image_url", "logo_public_id", "name", "phone", "website_url", "confirmed", "email_hash")
VALUES 
('sub_partialProfile', 'stripe-customer-id_partialProfile', 'Partial Profile Display Name', 'partialProfile@example.com' , ' ', ' ', 'Steve ', '555-1234 ', ' ', true, 'dummy_hash_12');

-- Add Inventory Snapshot data for testing
INSERT INTO "inventory_snapshot" 
("category_count",  "customer_id",  "price_count") 
VALUES 
('{"Beads":2,"Marbles":3,"Bubblers":1,"Recyclers":1,"Dry Pieces":2}',  'stripe-customer-id_full', '{"Beads":916,"Marbles":950,"Bubblers":500,"Recyclers":2000,"Dry Pieces":1400}');

INSERT INTO "invoices"
("customer_id", "invoice_id","start_date","end_date","invoice_status","subscription_id","amount_due","amount_paid","created_at")
VALUES
('cus_OVLKmXa6lrzktm',	'in_1Q6MzaGO3TmEVjN2K0KqjuLs',	1728092470,	1730770870,	'paid',	'sub_1Q6MzaGO3TmEVjN2qhRhKIMP',	1500.00,	1500.00,	'2024-10-05 01:41:13.414583');


INSERT INTO "subscriptions"
("customer_id", "subscription_id","is_active","interval","subscription_start_date","subscription_end_date")
VALUES
('stripe-customer-id_partialProfile',	'sub_1QKCYMGO3TmEVjN2cO6QvAkw',	true,	'year',1731389540,	1762925540);

INSERT INTO "followers"
("follower_id","followed_id","created_at")
VALUES
( 'sub_withProfile','sub_fullCustomer','2025-02-01 08:49:09.56484');

--  conversation 
INSERT INTO "conversations"
DEFAULT VALUES 
RETURNING id;

INSERT INTO "conversation_participants"
("conversation_id", "user_sub")
VALUES 
(1, 'sub_noProfile'),
(1, 'sub_fullCustomer');

INSERT INTO "conversation_visibility"
("conversation_id", "user_sub", "is_visible")
VALUES 
(1, 'sub_noProfile', true),
(1, 'sub_fullCustomer', true);

INSERT INTO "messages" 
("conversation_id", "sender_sub", "content", "is_read")
VALUES 
(1, 'sub_noProfile', 'First test message!', false),
(1, 'sub_fullCustomer', 'Second test message!', false);