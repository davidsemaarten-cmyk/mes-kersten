-- Migration 021: Link laser_jobs to orders table
-- A laser job is conceptually an order of type "Plaat snijden".
-- This adds the FK so the hierarchy Project → Fase → Orderreeks → Order → LaserJob is complete.

ALTER TABLE laser_jobs
    ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_laser_jobs_order ON laser_jobs(order_id);
