-- Migration script to enhance market_analyses table
-- This script adds new columns to support enhanced Vinted market analysis

-- Add new columns to market_analyses table
ALTER TABLE market_analyses ADD COLUMN category_name TEXT;
ALTER TABLE market_analyses ADD COLUMN brand_id INTEGER;
ALTER TABLE market_analyses ADD COLUMN raw_data TEXT;
ALTER TABLE market_analyses ADD COLUMN expires_at TEXT;

-- Create new indexes for enhanced functionality
CREATE INDEX IF NOT EXISTS idx_market_analyses_product_name ON market_analyses(product_name);
CREATE INDEX IF NOT EXISTS idx_market_analyses_expires_at ON market_analyses(expires_at);

-- Update existing records to have proper structure
UPDATE market_analyses 
SET updated_at = datetime('now') 
WHERE updated_at IS NULL;

-- Clean up old records that might have invalid data
DELETE FROM market_analyses 
WHERE created_at < datetime('now', '-30 days') 
AND status = 'failed';

-- Add some sample data validation
-- Ensure all records have proper JSON structure in result column
UPDATE market_analyses 
SET result = '{"salesVolume": 0, "avgPrice": 0}' 
WHERE result IS NULL OR result = '';

-- Create a view for easy querying of successful analyses
CREATE VIEW IF NOT EXISTS successful_market_analyses AS
SELECT 
    id,
    user_id,
    product_name,
    catalog_id,
    category_name,
    brand_id,
    json_extract(result, '$.salesVolume') as sales_volume,
    json_extract(result, '$.avgPrice') as avg_price,
    json_extract(result, '$.priceRange.min') as min_price,
    json_extract(result, '$.priceRange.max') as max_price,
    created_at,
    updated_at
FROM market_analyses 
WHERE status = 'completed' 
AND result IS NOT NULL;

-- Create a view for analysis statistics
CREATE VIEW IF NOT EXISTS market_analysis_stats AS
SELECT 
    user_id,
    COUNT(*) as total_analyses,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_analyses,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_analyses,
    AVG(CASE WHEN status = 'completed' THEN json_extract(result, '$.salesVolume') END) as avg_sales_volume,
    AVG(CASE WHEN status = 'completed' THEN json_extract(result, '$.avgPrice') END) as avg_price,
    MAX(created_at) as last_analysis_date
FROM market_analyses 
GROUP BY user_id;