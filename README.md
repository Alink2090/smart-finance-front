# Smart Finance Manager v2 🚀

Production-ready fintech dashboard with auth + full API integration.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure backend URL
cp .env.example .env
# Edit VITE_API_URL=http://your-backend.com/api

# 3. Dev server
npm run dev

# 4. Production build
npm run build
```

## Architecture

```
src/
  context/
    AuthContext.jsx     ← JWT auth state (login/register/logout/profile)
    ToastContext.jsx    ← Global toast notifications
  services/
    api.js              ← Axios instance + all API methods (documented)
  hooks/
    useApi.js           ← useApi() auto-fetch + useMutation() for mutations
  layouts/
    DashboardLayout.jsx ← Auth guard + sidebar + topbar wrapper
  components/
    Icons.jsx           ← SVG icon set
    Sidebar.jsx         ← Nav sidebar with logout
    Topbar.jsx          ← Header with user info
    ConfirmModal.jsx    ← Reusable delete confirm dialog
  pages/
    Login.jsx           ← POST /api/login
    Register.jsx        ← POST /api/register
    Dashboard.jsx       ← GET /api/analytics/dashboard + charts
    Transactions.jsx    ← Full CRUD: GET/POST/PUT/DELETE /api/transactions
    AddTransaction.jsx  ← POST /api/transactions
    Budgets.jsx         ← GET/POST/PUT /api/budgets
    Analytics.jsx       ← GET /api/analytics/category-expenses + monthly-expenses
    Categories.jsx      ← GET/POST/DELETE /api/categories
```

## API Contract

### Auth
| Method | Endpoint         | Body / Response |
|--------|-----------------|-----------------|
| POST   | /api/register   | `{name, email, password, password_confirmation}` → `{token, user}` |
| POST   | /api/login      | `{email, password}` → `{token, user}` |
| GET    | /api/profile    | Bearer token → `{id, name, email, ...}` |

### Transactions
| Method | Endpoint                  | Notes |
|--------|--------------------------|-------|
| GET    | /api/transactions         | Query: `search, type, category_id, page, per_page` |
| POST   | /api/transactions         | Body: `{title, amount, type, category_id, payment_method, date, notes}` |
| PUT    | /api/transactions/{id}    | Same body, partial allowed |
| DELETE | /api/transactions/{id}    | 204 or `{message}` |

Response can be:
- Plain array `[...]`
- Paginated `{ data: [...], meta: { total, page, per_page, last_page } }`

### Categories
| Method | Endpoint              | Notes |
|--------|-----------------------|-------|
| GET    | /api/categories       | Returns `[{id, name, color, icon}]` |
| POST   | /api/categories       | Body: `{name, color, icon}` |
| DELETE | /api/categories/{id}  | 204 |

### Budgets
| Method | Endpoint           | Notes |
|--------|-------------------|-------|
| GET    | /api/budgets       | Returns `[{id, category_id, category, limit_amount, spent_amount, period}]` |
| POST   | /api/budgets       | Body: `{category_id, limit_amount, period}` period: "monthly"\|"yearly" |
| PUT    | /api/budgets/{id}  | Body: `{limit_amount, period}` |

### Analytics
| Method | Endpoint                           | Response |
|--------|------------------------------------|---------|
| GET    | /api/analytics/dashboard           | `{total_income, total_expenses, balance, budget_usage_pct, income_change_pct, expense_change_pct}` |
| GET    | /api/analytics/category-expenses   | `[{category, amount, color}]` query: `period` |
| GET    | /api/analytics/monthly-expenses    | `[{month, income, expenses}]` query: `months` |

## Token Auth
The app stores the JWT token in `localStorage` under the key `token`.
All requests automatically include `Authorization: Bearer {token}`.
On 401, the user is redirected to `/login` automatically.

## Error Handling
- API errors show toast notifications
- Laravel validation errors (`errors.field`) are shown inline in forms
- 401 auto-redirect to login
- Network errors show retry buttons

## Design
- **Dark fintech theme** — black/charcoal surfaces, emerald accent
- **Sora** + **JetBrains Mono** typography
- Skeleton loaders on all data fetches
- Animated toasts, modals, page transitions
- Fully responsive
