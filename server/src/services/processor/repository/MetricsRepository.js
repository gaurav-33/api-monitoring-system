import { BaseRepository } from "./BaseRepository.js";

const MAX_LIMIT = 1000;
const QUERY_TIMEOUT_MS = 30000;

export class MetricsRepository extends BaseRepository {
  constructor({ logger: l, postgres: pg } = {}) {
    super({ logger: l });
    this.postgres = pg;
  }

  async upsertEndpointMetrics(metricsData) {
    try {
      const {
        clientId,
        serviceName,
        endpoint,
        method,
        totalHits,
        errorHits,
        avgLatency,
        minLatency,
        maxLatency,
        timeBucket,
      } = metricsData;

      const query = `
            INSERT INTO endpoint_metrics (
            client_id, service_name, endpoint_name, method, total_hits, error_hits,
            avg_latency, min_latency, max_latency, time_bucket
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (client_id, service_name, endpoint_name, method, time_bucket)
            DO UPDATE SET
                total_hits = endpoint_metrics.total_hits + EXCLUDED.total_hits,
                error_hits = endpoint_metrics.error_hits + EXCLUDED.error_hits,
                avg_latency = (
                    (endpoint_metrics.avg_latency * endpoint_metrics.total_hits) + (EXCLUDED.avg_latency * EXCLUDED.total_hits)
                ) / NULLIF(endpoint_metrics.total_hits + EXCLUDED.total_hits, 0),
                min_latency = LEAST(endpoint_metrics.min_latency, EXCLUDED.min_latency),
                max_latency = GREATEST(endpoint_metrics.max_latency, EXCLUDED.max_latency),
                updated_at = CURRENT_TIMESTAMP
            `;

      await this._query(query, [
        clientId,
        serviceName,
        endpoint,
        method,
        totalHits,
        errorHits,
        avgLatency,
        minLatency,
        maxLatency,
        timeBucket,
      ]);
    } catch (error) {
      this.logger.error("Error upserting endpoint metrics:", error);
      throw error;
    }
  }

  async getMetrics(filter = {}) {
    try {
      const {
        clientId,
        serviceName,
        endpoint,
        startTime,
        endTime,
        limit = 100,
        offset = 0,
      } = filter;
      const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
      const safeOffset = Math.max(0, offset);

      let query = `
        SELECT 
            service_name,
            endpoint_name,
            method,
            SUM(total_hits) as total_hits,
            SUM(error_hits) as error_hits,
            SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) as avg_latency,
            MIN(min_latency) as min_latency,
            MAX(max_latency) as max_latency,
            time_bucket
        FROM endpoint_metrics
        `;
      const params = [];
      let paramsIdx = 1;

      let whereConditions = [];

      if (clientId != null) {
        whereConditions.push(`client_id = $${paramsIdx}`);
        params.push(clientId);
        paramsIdx++;
      }
      if (serviceName) {
        whereConditions.push(`service_name = $${paramsIdx}`);
        params.push(serviceName);
        paramsIdx++;
      }
      if (endpoint) {
        whereConditions.push(`endpoint_name = $${paramsIdx}`);
        params.push(endpoint);
        paramsIdx++;
      }
      if (startTime) {
        whereConditions.push(`time_bucket >= $${paramsIdx}`);
        params.push(startTime);
        paramsIdx++;
      }
      if (endTime) {
        whereConditions.push(`time_bucket <= $${paramsIdx}`);
        params.push(endTime);
        paramsIdx++;
      }

      if (whereConditions.length > 0) {
        query += `WHERE ${whereConditions.join(" AND ")}`;
      }

      query += `
        GROUP BY service_name, endpoint_name, method, time_bucket
        ORDER BY time_bucket DESC
        LIMIT $${paramsIdx}
        OFFSET $${paramsIdx + 1}
        `;
      params.push(safeLimit, safeOffset);

      const result = await this._query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error("Error getting endpoint metrics:", error);
      throw error;
    }
  }

  async getTopEndpoints(clientId, limit = 10, startTime = null) {
    try {
      const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);

      let query = `
            SELECT
                service_name, 
                endpoint_name,
                method,
                SUM(total_hits) as total_hits,
                SUM(error_hits) as error_hits,
                SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) as avg_latency
            FROM endpoint_metrics
            `;
      const params = [];
      let paramsIdx = 1;

      if (clientId !== null) {
        query += `WHERE client_id = $${paramsIdx}`;
        params.push(clientId);
        paramsIdx++;
      }
      if (startTime) {
        query += clientId !== null ? " AND" : " WHERE";
        query += ` time_bucket >= $${paramsIdx}`;
        params.push(startTime);
        paramsIdx++;
      }

      query += `
            GROUP BY service_name, endpoint_name, method
            ORDER BY total_hits DESC
            LIMIT $${paramsIdx}
            `;
      params.push(safeLimit);

      const result = await this._query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error("Error getting top endpoints:", error);
      throw error;
    }
  }

  async getOverallStats(clientId, startTime = null, endTime = null) {
    try {
      let query = `
            SELECT
                SUM(total_hits) as total_hits,
                SUM(error_hits) as error_hits,
                SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) as avg_latency,
                COUNT(DISTINCT service_name) as unique_services,
                COUNT(DISTINCT endpoint_name) as unique_endpoints
            FROM endpoint_metrics
            `;
      const params = [];
      let paramsIdx = 1;
      const conditions = [];

      if (clientId != null) {
        conditions.push(`client_id = $${paramsIdx}`);
        params.push(clientId);
        paramsIdx++;
      }

      if (startTime) {
        conditions.push(`time_bucket >= $${paramsIdx}`);
        params.push(startTime);
        paramsIdx++;
      }

      if (endTime) {
        conditions.push(`time_bucket <= $${paramsIdx}`);
        params.push(endTime);
        paramsIdx++;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }

      const result = await this._query(query, params);
      return result.rows[0] || {};
    } catch (error) {
      this.logger.error("Error getting overall stats:", error);
      throw error;
    }
  }

  _query(sql, params = [], client = this.postgres) {
    const target = client || this.postgres;

    if (!target || typeof target.query !== "function") {
      const err = new Error(
        "Postgres client not configured on MetricsRepository",
      );
      this.logger.error("DB query error: Postgres client not configured");
      throw err;
    }

    return target.query({
      text: sql,
      values: params,
      statement_timeout: QUERY_TIMEOUT_MS,
    });
  }
}
