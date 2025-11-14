# AI Workflow Portal UI - Easy-Button Layer

Modern, user-friendly frontend for the AI Workflow Infrastructure. Built with Next.js 14, TypeScript, and Tailwind CSS.

## 🎯 Features

### Core Functionality
- **Dashboard** - Real-time metrics and system overview
- **Template Library** - Browse and use pre-built workflow templates
- **Workflow Management** - Create, deploy, and monitor workflows
- **Connections Hub** - Manage integrations with external services
- **Human-in-Loop Inbox** - Approve and manage pending workflow tasks
- **Test Runner** - Test workflows in sandbox mode before deployment
- **Analytics** - Comprehensive observability and cost tracking

### Easy-Button Features
- ✅ Visual workflow templates with wizards
- ✅ One-click integrations with OAuth
- ✅ Approval inbox with SLA tracking
- ✅ Sandbox testing environment
- ✅ Real-time metrics and cost dashboards
- ✅ Multi-tenant architecture
- ✅ Role-based access control

## 🚀 Quick Start

### Demo Login

- Email: admin@example.com
- Password: admin123

Use these credentials on the Login page after seeding (or when running with Supabase Auth configured).

### Prerequisites
- Node.js 20+
- npm or yarn
- Portal Backend API running (see main README)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.template .env.local

# Edit environment variables
nano .env.local

# Run development server
npm run dev
```

The application will be available at http://localhost:3002

### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_ACTIVEPIECES_URL=http://localhost:8080
NEXT_PUBLIC_FLOWISE_URL=http://localhost:3000
NEXT_PUBLIC_TEMPORAL_URL=http://localhost:8088
NEXT_PUBLIC_GRAFANA_URL=http://localhost:3001
NEXT_PUBLIC_NANGO_URL=http://localhost:3003
```

## 🏗️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query (React Query v5)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Icons**: Lucide React

## 📁 Project Structure

```
portal-ui/
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── auth/                 # Authentication pages
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/            # Main application
│   │   │   ├── analytics/        # Observability dashboard
│   │   │   ├── connections/      # Integrations management
│   │   │   ├── inbox/            # Human-in-loop approvals
│   │   │   ├── templates/        # Template library
│   │   │   ├── test-runner/      # Workflow testing
│   │   │   ├── workflows/        # Workflow management
│   │   │   ├── layout.tsx        # Dashboard layout with sidebar
│   │   │   └── page.tsx          # Dashboard homepage
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Landing page
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── label-badge.tsx
│   │   └── providers.tsx         # React Query provider
│   └── lib/
│       ├── api-client.ts         # API client
│       ├── store.ts              # Zustand stores
│       └── utils.ts              # Utility functions
├── public/                       # Static assets
├── Dockerfile                    # Production Docker image
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies
```

## 🎨 UI Components

### Built-in Components (shadcn/ui style)
- **Button** - Multiple variants (default, outline, destructive, ghost)
- **Card** - Container with header, content, footer
- **Input** - Form inputs with validation
- **Label** - Form labels
- **Badge** - Status indicators with color variants
- **Tabs** - Tabbed interface
- **Dialog** - Modal dialogs
- **Dropdown** - Dropdown menus
- **Toast** - Notifications (using Sonner)

### Usage Example

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function MyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Card</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  )
}
```

## 🔐 Authentication

The portal uses JWT-based authentication:

```typescript
// Login
const { token, user } = await apiClient.login(email, password)
useAuthStore.getState().setAuth(user, token)

// Logout
useAuthStore.getState().clearAuth()

// Check auth status
const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
```

## 📊 State Management

Uses Zustand for global state:

```typescript
// Auth store
const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()

// Sidebar store
const { isOpen, toggle, setOpen } = useSidebarStore()

// Notifications
const { addNotification } = useNotificationStore()
addNotification('success', 'Operation completed!')
```

## 🌐 API Integration

All API calls go through the centralized API client:

```typescript
import apiClient from '@/lib/api-client'

// Example usage
const templates = await apiClient.getTemplates()
const flow = await apiClient.createFlow(data)
const connections = await apiClient.getConnections()
```

### Available API Methods

**Authentication:**
- `register(data)` - Create new account
- `login(email, password)` - Login

**Templates:**
- `getTemplates()` - List templates
- `getTemplate(id)` - Get template details
- `createTemplate(data)` - Create template

**Workflows:**
- `getFlows()` - List workflows
- `getFlow(id)` - Get workflow details
- `createFlow(data)` - Create workflow
- `deployFlow(id)` - Deploy workflow
- `deleteFlow(id)` - Delete workflow

**Integrations:**
- `getConnections()` - List connections
- `initiateConnection(provider, category)` - Start OAuth flow
- `deleteConnection(id)` - Remove connection
- `getProviders(category)` - List available providers

**Analytics:**
- `getAnalytics()` - Get dashboard metrics
- `getExecutions(flowId?)` - List executions

## 🎯 Key Pages

### Dashboard (`/dashboard`)
- Overview metrics
- Recent executions
- Quick actions
- System status

### Templates (`/dashboard/templates`)
- Template library
- Category filters
- Search functionality
- Featured templates

### Workflows (`/dashboard/workflows`)
- Workflow list with status
- Execution statistics
- Deploy/pause/delete actions
- Link to Activepieces builder

### Connections (`/dashboard/connections`)
- Connected services by category
- Available providers
- One-click OAuth connection
- Usage statistics

### Inbox (`/dashboard/inbox`)
- Pending approvals list
- SLA countdown timers
- Approval details view
- Approve/reject/request info actions

### Test Runner (`/dashboard/test-runner`)
- Workflow selection
- JSON test data editor
- Sandbox mode toggle
- Test results with metrics

### Analytics (`/dashboard/analytics`)
- Execution trends charts
- Latency monitoring
- Cost breakdown
- Usage quotas

## 🔧 Development

### Running Locally

```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Type check
npm run type-check

# Build for production
npm run build

# Run production build
npm run start
```

### Adding New Pages

1. Create page in `src/app/dashboard/[name]/page.tsx`
2. Add route to navigation in `src/app/dashboard/layout.tsx`
3. Create API methods in `src/lib/api-client.ts` if needed
4. Use React Query for data fetching

### Adding New Components

1. Create component in `src/components/ui/[name].tsx`
2. Export from component file
3. Import where needed: `import { MyComponent } from '@/components/ui/my-component'`

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t ai-workflow-portal-ui .
```

### Run Container

```bash
docker run -p 3002:3002 \
  -e NEXT_PUBLIC_API_URL=http://portal-api:5000 \
  ai-workflow-portal-ui
```

### With Docker Compose

Add to main `docker-compose.yml`:

```yaml
portal-ui:
  build: ./portal-ui
  container_name: portal-ui
  ports:
    - "3002:3002"
  environment:
    - NEXT_PUBLIC_API_URL=http://portal-api:5000
    - NEXT_PUBLIC_ACTIVEPIECES_URL=http://activepieces-server:8080
    - NEXT_PUBLIC_FLOWISE_URL=http://flowise:3000
    - NEXT_PUBLIC_TEMPORAL_URL=http://temporal-ui:8088
    - NEXT_PUBLIC_GRAFANA_URL=http://grafana:3001
    - NEXT_PUBLIC_NANGO_URL=http://nango:3003
  networks:
    - ai-workflow-network
  depends_on:
    - portal-api
```

## 🌩️ Vercel + Render Production (stable URL)

Deploy the frontend to Vercel for a permanent URL, and the backend to a host like Render. Your production link stays the same across pushes; only the build behind it updates.

### 1) Backend on Render (or any public host)

- Use `render.yaml` (in repo root) to create a web service named `workflow-backend` with rootDir `backend`.
- Set required env vars in Render:
  - PORT=5000, CORS_ORIGIN=*
  - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (if you use Supabase)
  - NANGO_HOST, NANGO_SECRET_KEY
  - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
  - DEFAULT_SMS_SENDER, DEFAULT_EMAIL_SENDER (set to verified values)
  - NANGO_TWILIO_PROVIDER_CONFIG_KEY, NANGO_TWILIO_CONNECTION_ID
  - NANGO_EMAIL_PROVIDER_CONFIG_KEY, NANGO_EMAIL_CONNECTION_ID
  - SENDGRID_API_KEY
- After deploy, note the public backend URL, e.g. `https://workflow-backend.onrender.com`.

### 2) Frontend on Vercel (permanent alias)

Create a Vercel project from this repo. In Project → Settings → Environment Variables (Production, and Preview if desired), set:

- NEXT_PUBLIC_API_URL = https://workflow-backend.onrender.com
- NEXT_PUBLIC_SUPABASE_URL = https://YOUR-PROJECT.supabase.co
- NEXT_PUBLIC_SUPABASE_ANON_KEY = <your anon key>
- NEXT_PUBLIC_APP_NAME = AI Workflow Portal (optional)
- NEXT_PUBLIC_APP_VERSION = 3.0.0 (optional)
- NEXT_PUBLIC_DEMO_MODE = false
- NEXT_PUBLIC_NANGO_URL = https://api.nango.dev (optional)

Build defaults are fine (`npm run build`). `next.config.js` already rewrites `/api/*` → `${NEXT_PUBLIC_API_URL}/api/*`, avoiding CORS.

Set Production Branch = `main`. Each push to `main` automatically becomes Production at a stable URL such as `your-project.vercel.app`. You can also add a custom domain and it will remain constant across deployments.

### 3) Test

- Open the Vercel production URL and sign in (Supabase) or use demo if configured.
- From the Workflow canvas, run a test; the browser hits `/api/*` on Vercel, which proxies to your backend.

### Notes

- Keep server-only secrets (Twilio, Nango, SendGrid, Supabase Service Role) on the backend host only.
- If you later move the backend, just change `NEXT_PUBLIC_API_URL` in Vercel and redeploy.
- For Twilio/SendGrid, ensure the default senders are verified/purchased; you can also override sender per step in the UI.

## 🧪 Testing

```bash
# Run tests (when added)
npm run test

# E2E tests (when added)
npm run test:e2e
```

## 📝 Best Practices

### Component Organization
- Keep components small and focused
- Use TypeScript for type safety
- Follow naming conventions (PascalCase for components)
- Colocate related files

### State Management
- Use React Query for server state
- Use Zustand for global client state
- Use local useState for component state
- Keep state as local as possible

### Styling
- Use Tailwind utility classes
- Follow mobile-first approach
- Use dark mode classes when needed
- Maintain consistent spacing

### Performance
- Use React Query caching
- Implement lazy loading for heavy components
- Optimize images with Next.js Image component
- Use proper TypeScript types for better DX

## 🚀 Production Checklist

- [ ] Set strong JWT secret in backend
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up proper error tracking (Sentry, etc.)
- [ ] Configure analytics (Google Analytics, Plausible, etc.)
- [ ] Set up monitoring (Uptime robot, etc.)
- [ ] Enable HTTPS/TLS
- [ ] Configure CSP headers
- [ ] Set up automated backups
- [ ] Test all authentication flows
- [ ] Verify all API integrations
- [ ] Load test the application

## 🤝 Contributing

1. Create a feature branch
2. Make changes with clear commits
3. Test thoroughly
4. Create pull request
5. Wait for review

## 📄 License

Internal project for Cream Digital Engineering

## 🆘 Support

For issues or questions:
1. Check the main README.md
2. Review API documentation
3. Check browser console for errors
4. Review server logs

---

**Version**: 3.0.0  
**Last Updated**: November 2025  
**Built with**: Next.js 14, TypeScript, Tailwind CSS
# ai_workflow
