CREATE TABLE IF NOT EXISTS endpoint_metrics (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(24) NOT NULL,
    service_name VARCHAR(24) NOT NULL,
    endpoint_name VARCHAR(24) NOT NULL,
    method VARCHAR(8) NOT NULL,
    time_bucket TIMESTAMP NOT NULL,
    total_hits INTEGER DEFAULT 0,
    error_hits INTEGER DEFAULT 0,
    avg_latency NUMERIC(10, 3) DEFAULT 0.000,
    max_latency NUMERIC(10, 3) DEFAULT 0.000,
    min_latency NUMERIC(10, 3) DEFAULT 0.000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(client_id, service_name, endpoint_name, method, time_bucket)

);

CREATE INDEX IF NOT EXISTS idx_endpoint_metrices_client_id ON endpoint_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_metrices_service_name ON endpoint_metrics(client_id, service_name);
CREATE INDEX IF NOT EXISTS idx_endpoint_metrices_endpoint_name ON endpoint_metrics(client_id, service_name, endpoint_name);
CREATE INDEX IF NOT EXISTS idx_endpoint_metrices_time_bucket ON endpoint_metrics(time_bucket);

CREATE OR REPLACE FUNCTION updated_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

--

DROP TRIGGER IF EXISTS update_endpoint_metrics_updated_at ON endpoint_metrics;
CREATE TRIGGER update_endpoint_metrics_updated_at
BEFORE UPDATE ON endpoint_metrics
FOR EACH ROW
EXECUTE PROCEDURE updated_updated_at_column();