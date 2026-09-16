# Shiuli CAD Studio — Django REST Backend

A complete, production-ready Django 5.x REST API backend (with SQLite database) for **Shiuli CAD Studio** — a jewellery CAD design marketplace supporting three distinct user roles: **Client**, **CAD Designer (Staff)**, and **Super Admin**.

---

## Technical Features

1. **Role-Based Access Control (RBAC):** Custom `accounts.User` model with distinct roles (`client`, `staff`, `admin`) and custom DRF permission classes (`IsClient`, `IsStaff`, `IsAdmin`).
2. **Race-Condition-Safe Job Assignment Engine:** Uses database row-level locking (`select_for_update()`) inside an atomic transaction to ensure first-accept-wins job claims without race conditions or double booking.
3. **Live Capacity Enforcement:** Live calculation of staff active jobs (`WITH_DESIGNER`) against individual `max_concurrent_jobs` limit. Returns HTTP 409 for taken jobs and HTTP 403 for capacity limits.
4. **Real-time Push Layer:** Integrated **Django Channels** and **Daphne** WebSocket consumer (`NotificationConsumer`) for real-time broadcasts of job pool updates and notification pushes.
5. **Ready-Made Catalog Approval Flow:** Multi-tier catalog workflow (`PENDING` -> `APPROVED` / `REJECTED`) with secure file download endpoints restricting raw 3DM/STL CAD files to verified purchasers only.
6. **Custom Order Negotiation & Workflows:** Custom design request submission, admin price quote, client counter-offer negotiation, advance payment, milestone tracking, and deliverable upload.
7. **Gateway-Agnostic Payments & Settlement System:** Decoupled `PaymentGatewayInterface` with mock service implementation that idempotently updates order states and triggers pool release upon advance payment confirmation.
8. **Auto-Escalation & Platform Settings:** Singleton `PlatformSettings` model for configurable assignment modes (`first_accept_wins` vs `priority_least_loaded`), job limits, and background auto-escalation timer task (`check_escalations`).
9. **Django Admin Integration:** Full model registration in built-in Django Admin for development convenience.
10. **OpenAPI / Swagger Documentation:** Auto-generated interactive API documentation powered by `drf-spectacular`.

---

## Getting Started

### Prerequisites
- Python 3.11+
- Virtual environment (`venv`)

### 1. Installation
Navigate to the project root and activate the virtual environment:
```bash
# Windows
.\venv\Scripts\activate

# Linux / macOS
source venv/bin/activate
```

Install requirements:
```bash
pip install -r backend/requirements.txt
```

### 2. Environment Configuration
Create a `.env` file inside `backend/` or set environment variables:
```env
SECRET_KEY=django-insecure-shiuli-cad-studio-dev-key
DEBUG=True
ALLOWED_HOSTS=*
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Run Migrations & Seed Data
Initialize database schema and populate realistic demo data:
```bash
python backend/manage.py migrate
python backend/manage.py seed_demo_data
```

Seed data automatically creates default accounts:
| Role | Username | Password | Notes |
|---|---|---|---|
| **Super Admin** | `admin` | `admin123` | Full admin privileges |
| **CAD Designer** | `designer_rahul` | `staff123` | Senior Designer (Limit: 3) |
| **CAD Designer** | `designer_ananya` | `staff123` | Junior Designer (Limit: 2) |
| **Client** | `client_vikram` | `client123` | Sample Client |
| **Client** | `client_priya` | `client123` | Sample Client |

---

## Running the Development Server

### Run Web & WebSocket Server (Daphne / ASGI)
```bash
python backend/manage.py runserver
```

- **REST API Root:** `http://127.0.0.1:8000/api/`
- **Swagger Documentation:** `http://127.0.0.1:8000/api/docs/`
- **ReDoc Documentation:** `http://127.0.0.1:8000/api/redoc/`
- **Django Built-in Admin:** `http://127.0.0.1:8000/admin/`
- **WebSocket Endpoint:** `ws://127.0.0.1:8000/ws/notifications/?token=<jwt_access_token>`

---

## Running Test Suite

Run the automated test suite with pytest:
```bash
pytest backend/tests
```

Included Test Coverage:
- `test_concurrency.py`: Verifies `select_for_update()` concurrency control for job claims.
- `test_capacity.py`: Verifies live job capacity limits (`StaffAtCapacityError`).
- `test_status_transitions.py`: Verifies legal state transitions and state guards.
- `test_payments.py`: Verifies payment webhook idempotency and pool release logic.

---

## Core API Endpoints

### 🔑 Authentication (`/api/auth/`)
- `POST /api/auth/register/` — Client self-registration
- `POST /api/auth/login/` — Returns JWT tokens & user role
- `POST /api/auth/refresh/` — Refresh access token
- `POST /api/auth/logout/` — Blacklists refresh token
- `GET /api/auth/me/` — Get current logged-in profile
- `PATCH /api/auth/me/` — Update profile details

### 💎 Catalog (`/api/catalog/`)
- `GET /api/catalog/categories/` — Category tree
- `GET /api/catalog/products/` — Product list (filterable by category, style, price)
- `GET /api/catalog/products/{slug}/` — Product detail (hides CAD raw links unless purchased)
- `POST /api/catalog/products/` — Staff upload ready design (status=PENDING)
- `GET /api/catalog/products/pending/` — Admin approval queue
- `POST /api/catalog/products/{slug}/approve/` — Admin approve design
- `POST /api/catalog/products/{slug}/reject/` — Admin reject design
- `GET /api/catalog/products/download/{file_id}/` — Secure file download endpoint

### 🎨 Custom Orders (`/api/custom-requests/` & `/api/orders/`)
- `POST /api/custom-requests/` — Client submits custom request
- `POST /api/custom-requests/{id}/quote/` — Admin sends price quote
- `POST /api/custom-requests/{id}/negotiate/` — Client counter-offer
- `POST /api/custom-requests/{id}/accept-quote/` — Client accepts quote
- `POST /api/custom-requests/{id}/confirm-order/` — Confirms order creation
- `GET /api/orders/` — Role-scoped order list
- `GET /api/orders/pool/` — Staff view available jobs pool
- `POST /api/orders/{id}/accept/` — Staff claim job (race-condition safe)
- `POST /api/orders/{id}/milestone/` — Staff updates progress milestone
- `POST /api/orders/{id}/deliverables/` — Staff uploads deliverables
- `POST /api/orders/{id}/complete/` — Staff completes order
- `POST /api/orders/{id}/reassign/` — Admin manual override to pool

### ⚙️ Staff & Platform Management (`/api/staff/` & `/api/platform-settings/`)
- `GET /api/staff/` — Admin list staff & live loads
- `POST /api/staff/` — Admin create staff account
- `PATCH /api/staff/{id}/` — Admin update staff job limits/status
- `GET /api/staff/{id}/performance/` — Staff performance stats
- `GET /api/staff/me/dashboard/` — Staff dashboard summary
- `GET /api/platform-settings/` — Read platform settings
- `PATCH /api/platform-settings/` — Update platform settings

### 💳 Payments & Settlements (`/api/payments/` & `/api/settlements/`)
- `POST /api/payments/create-order/` — Initiate payment session
- `POST /api/payments/verify/` — Idempotent payment webhook
- `GET /api/settlements/` — List settlements
- `POST /api/settlements/process/` — Bulk process settlements

### 🔔 Notifications (`/api/notifications/`)
- `GET /api/notifications/` — List notifications
- `POST /api/notifications/{id}/read/` — Mark read
- `POST /api/notifications/mark-all-read/` — Mark all read
