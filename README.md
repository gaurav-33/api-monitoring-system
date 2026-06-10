# 🚀 API Monitoring SaaS Platform

A highly scalable, real-time API monitoring, tracking, and analytics system. Designed for high throughput and zero client latency, this platform empowers developers to effortlessly monitor their application's API endpoints, capturing crucial metrics such as hit rates, response latencies, status code distributions, and endpoint performance.

---

## 🏗️ System Architecture & Design


### Domain-Driven Design (DDD)
The backend is built utilizing a **Modular/Domain-Driven Architecture**, separating distinct business domains into isolated services. This structure ensures maintainability and paves the way for a seamless transition into true microservices as the platform scales.
- **Auth Service**: Manages user registration, authentication (JWT), and Role-Based Access Control (RBAC).
- **Client Service**: Manages multi-tenant workspaces, client applications, and secure API key provisioning/validation.
- **Ingest Service**: A highly-optimized, lightweight ingestion endpoint that receives metrics and immediately pushes them to the event bus.
- **Processor Service**: A decoupled worker that consumes events from the queue, processes them, and persists the data into the appropriate databases.
- **Analytics Service**: Aggregates time-series data and serves optimized statistics for the dashboard UI.

---

## 🌊 Data Flow & Event Queuing

To guarantee that the monitoring process **does not add any latency** to the client applications, the system relies heavily on an **Asynchronous Message Broker (RabbitMQ)** pattern.

### The Journey of an API Hit:
1. **Interception (Client Application)**: The middleware in the client app intercepts incoming requests and outgoing responses, calculating latency and extracting metadata (status code, endpoint path, method).
2. **Ingestion (`/ingest`)**: The client asynchronously sends this lightweight payload to the Ingest Service.
3. **Queueing (RabbitMQ)**: 
   - The Ingest Service rapidly validates the payload (via Zod).
   - Instead of performing an expensive database write, it publishes the event to a RabbitMQ message exchange (`EventProducer`).
   - The server immediately responds with a `202 Accepted` status, completely decoupling the client from database write overhead.
4. **Processing & Storage (`Processor Worker`)**: 
   - A dedicated consumer worker listens to the RabbitMQ queues.
   - It safely pulls events, batches them if necessary, and writes the high-volume time-series data to **MongoDB**, and relational analytics metadata to **PostgreSQL**.
5. **Visualization (`Analytics Dashboard`)**: The React-based dashboard queries the Analytics Service, which fetches and structures the historical data for ApexCharts visualization.

---

## 🛡️ Core System Design & Resilience

To ensure high availability and fault tolerance, particularly during traffic spikes and infrastructure turbulence, the system implements robust distributed system patterns:

### 1. Circuit Breaker Pattern (`CircuitBreaker.js`)
Prevents cascading failures when the message broker (RabbitMQ) is degraded.
- **CLOSED**: Normal operation. Requests are allowed through to the event producer.
- **OPEN**: If failures exceed a defined threshold (e.g., 5 consecutive failures), the circuit opens. Subsequent ingestion requests are safely rejected or dropped early without attempting to reach the broker, allowing the infrastructure time to recover and preventing thread pool exhaustion.
- **HALF_OPEN**: After a configured cooldown, the circuit allows limited test requests. Success resets to `CLOSED`, while a failure trips it back to `OPEN`.

### 2. Exponential Backoff with Jitter (`RetryStrategy.js`)
Handles transient network glitches gracefully without overwhelming recovering systems.
- **Retryable Errors**: Intelligently identifies retriable network errors (e.g., `ECONNRESET`, `ETIMEDOUT`, channel closures).
- **Exponential Backoff**: Subsequent retries wait progressively longer (e.g., 200ms, 400ms, 800ms).
- **Jitter**: A randomization factor is applied to the delay to prevent the "Thundering Herd" problem, where multiple failed concurrent requests attempt to reconnect at the exact same millisecond.

### 3. Resilient Event Producer (`eventProducer.js`)
- **Back-Pressure Handling**: Listens to broker `drain` events. If internal TCP buffers fill up, it temporarily pauses publishing until the broker catches up.
- **Graceful Shutdown**: Properly closes channels and drains pending metrics on Node.js `SIGTERM`/`SIGINT`, ensuring zero data loss during redeployments.

---

## 🚀 Client Onboarding & Integration

Integrating your application with the API Monitoring System takes less than 5 minutes.

### Step 1: Registration & Login
1. Navigate to the **Dashboard** UI.
2. Create a new user account and log in.

### Step 2: Create a Client App
1. In the Dashboard, navigate to the **Clients** or **Applications** section.
2. Click **Create Client**. Provide a descriptive name for the application you wish to monitor (e.g., "Production E-commerce API").

### Step 3: Generate an API Key
1. Select your newly created Client application.
2. Click **Generate API Key**. 
3. **Important**: Copy this key immediately. For security purposes, it will only be shown once and stored as a hash in the database.

### Step 4: Integration (Usage Demo)
Use the API key to monitor your Node.js/Express application. Here is an example of the integration (as demonstrated in the `demo/blog_app`):

```javascript
// demo/blog_app/monitoring.js
const axios = require('axios');

// The middleware function to wrap your Express app
const apiMonitoringMiddleware = (apiKey, monitoringServerUrl) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Intercept the response finish event
    res.on('finish', () => {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      const payload = {
        endpoint: req.route ? req.baseUrl + req.route.path : req.path,
        method: req.method,
        statusCode: res.statusCode,
        latency: latency,
        timestamp: new Date().toISOString()
      };

      // Asynchronously send the metric to the ingestion server
      // using the provided API Key in the headers
      axios.post(`${monitoringServerUrl}/api/ingest`, payload, {
        headers: {
          'x-api-key': apiKey
        }
      }).catch(err => {
        // Silently fail to ensure the main application is never impacted by monitoring downtime
        console.error('Monitoring ingestion failed:', err.message);
      });
    });

    next();
  };
};

module.exports = apiMonitoringMiddleware;
```

**Apply it in your server:**
```javascript
// demo/blog_app/server.js
const express = require('express');
const apiMonitoringMiddleware = require('./monitoring');

const app = express();

// Use the middleware globally
app.use(apiMonitoringMiddleware(
  process.env.MONITORING_API_KEY, 
  process.env.MONITORING_SERVER_URL // e.g., https://api.yourmonitoringsystem.com
));

app.get('/api/users', (req, res) => {
  res.json({ message: "Users fetched" });
});

app.listen(8080, () => console.log('App running on port 8080'));
```

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js (v5)
- **Message Broker**: RabbitMQ (using `amqplib`)
- **Databases**:
  - **MongoDB** (via `mongoose`): For high-volume, unstructured/time-series data (API hits).
  - **PostgreSQL** (via `pg`): For relational data (users, clients, API keys).
- **Validation**: Zod
- **Security**: Helmet, Express Rate Limit, JWT, bcryptjs

### Frontend (Dashboard)
- **Framework**: React 18, Vite
- **Data Management**: TanStack React Query (v5), React Router DOM (v7)
- **Visualization**: React-ApexCharts
- **Styling**: SCSS Modules, Lucide React Icons

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Deployment Ready**: Configured for Vercel (Frontend) and Render/Heroku (Backend).

---

## 📁 Project Structure

```text
api-monitoring/
├── dashboard/                 # React frontend application
│   ├── src/
│   │   ├── api/               # Axios instances and API calls
│   │   ├── components/        # Reusable UI components & Charts
│   │   ├── pages/             # Route-level components
│   │   └── styles/            # SCSS modules & base styles
├── server/                    # Node.js backend application
│   ├── Dockerfile             # Main API Server Docker container
│   ├── Dockerfile.consumer    # Worker Docker container for processing queues
│   ├── src/
│   │   ├── services/          # Domain-driven backend modules (analytics, auth, client, ingest, processor)
│   │   └── shared/            # Shared configs, events, middlewares, models, utils
├── demo/                      # Demo applications (e.g., sample blog app with monitoring)
└── docker-compose.yml         # Container orchestration for DBs and Brokers
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Docker & Docker Compose (for local DBs/RabbitMQ)

### 1. Infrastructure Setup
```bash
cd server
docker-compose up -d
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env # Configure your DB/RabbitMQ URIs
npm run dev
```

### 3. Frontend Setup
```bash
cd dashboard
npm install
cp .env.example .env # Set VITE_API_BASE_URL (e.g., http://localhost:3000/api)
npm run dev
```

---

## 📝 Environment Variables Reference

### Backend (`server/.env`)
- `PORT`: Port for the API server (e.g., 3000)
- `MONGO_URI`: MongoDB connection string
- `POSTGRES_URI`: PostgreSQL connection string
- `RABBITMQ_URL`: RabbitMQ connection string
- `JWT_SECRET`: Secret key for JWT auth

### Frontend (`dashboard/.env`)
- `VITE_API_BASE_URL`: Full URL to the backend API (ensure `/api` suffix is included if configured).

---

## 📄 License
This project is licensed under the ISC License.