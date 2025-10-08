-- Phase 0.1: Extend Role System (Part 1)
-- Add new WMS roles to app_role enum

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'store_customer';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'branch_manager';