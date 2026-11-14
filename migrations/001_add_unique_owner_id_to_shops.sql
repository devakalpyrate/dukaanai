-- Migration: Add UNIQUE constraint on shops.owner_id to enforce 1-Owner-to-1-Shop rule
-- Pre-check verified: 0 duplicate owner_id entries exist in dukaanai.shops
-- Target database: dukaanai

ALTER TABLE `shops`
  ADD CONSTRAINT `uq_shops_owner` UNIQUE (`owner_id`);
