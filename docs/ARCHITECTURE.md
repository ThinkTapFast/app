# Server Architecture Diagram

## 🏗️ System Architecture Overview

```mermaid
graph TB
    UI[Client UI Components] --> SA[Server Actions]
    API[External API /api/v1/] --> SA
    
    SA --> Auth[Authentication Layer]
    Auth --> Clerk[Clerk Authentication]
    Auth --> ABAC[ABAC Permission System]
    
    SA --> BL[Business Logic Layer]
    BL --> DB[Database Layer]
    DB --> Prisma[Prisma ORM]
    Prisma --> Neon[Neon PostgreSQL]
    
    ABAC --> Permissions[Permission Matrices]
    ABAC --> Roles[Role Hierarchies]
    
    subgraph "Server Actions Layer"
        SA --> Content[Content Actions]
        SA --> Project[Project Actions]
        SA --> Billing[Billing Actions]
        SA --> AuthActions[Auth Actions]
    end
    
    subgraph "Authentication System"
        Auth --> Types[Type System]
        Auth --> Helpers[Clerk Helpers]
        Auth --> Middleware[Auth Middleware]
    end
```

## 🔐 Permission Flow Diagram

```mermaid
sequenceDiagram
    participant C as Client Component
    participant SA as Server Action
    participant Auth as Auth Layer
    participant ABAC as ABAC System
    participant DB as Database
    
    C->>SA: Call Action with Data
    SA->>Auth: requireAuth()
    Auth->>Clerk: Verify Authentication
    Clerk-->>Auth: User Data
    Auth-->>SA: Authenticated User
    
    SA->>Auth: createPermissionContext()
    Auth->>DB: Load User Memberships
    DB-->>Auth: User with Roles
    Auth-->>SA: Permission Context
    
    SA->>ABAC: checkPermission(context, resource, action)
    ABAC->>ABAC: Evaluate Plan Permissions
    ABAC->>ABAC: Check Role Hierarchy
    ABAC->>ABAC: Validate Resource Access
    ABAC-->>SA: Permission Result
    
    alt Permission Granted
        SA->>DB: Execute Business Logic
        DB-->>SA: Operation Result
        SA-->>C: Success Response
    else Permission Denied
        SA-->>C: Error Response
    end
```

## 📊 Database Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Membership : has
    Organization ||--o{ Membership : contains
    Membership ||--o{ MembershipRole : has
    Role ||--o{ MembershipRole : defines
    Role ||--o{ RolePermission : grants
    Permission ||--o{ RolePermission : specified_by
    
    Organization ||--o{ Workspace : contains
    Organization ||--o{ Project : owns
    Organization ||--o{ Content : manages
    
    Workspace ||--o{ WorkspaceMembership : has
    Project ||--o{ ProjectMembership : has
    
    User ||--o{ WorkspaceMembership : participates
    User ||--o{ ProjectMembership : collaborates
    User ||--o{ Content : creates
    
    Project ||--o{ Content : contains
    
    User {
        string id PK
        string email
        string name
        datetime createdAt
        datetime updatedAt
    }
    
    Organization {
        string id PK
        string name
        Plan plan
        datetime createdAt
        datetime updatedAt
    }
    
    Membership {
        string id PK
        string userId FK
        string organizationId FK
        datetime joinedAt
    }
    
    Role {
        string id PK
        string name
        Scope scope
        string description
    }
    
    Permission {
        string id PK
        string name
        string resource
        string action
        string description
    }
```

## 🎯 Role Hierarchy Visualization

```mermaid
graph TB
    subgraph "Organizational Roles"
        O1[Owner] --> O2[Admin]
        O2 --> O3[Member]
        O3 --> O4[Viewer]
    end
    
    subgraph "Workspace Roles"
        W1[Admin] --> W2[Editor]
        W2 --> W3[Viewer]
    end
    
    subgraph "Project Roles"
        P1[Owner] --> P2[Editor]
        P2 --> P3[Collaborator]
        P3 --> P4[Viewer]
    end
    
    subgraph "Plan Hierarchy"
        PL1[CUSTOM] --> PL2[AGENCY]
        PL2 --> PL3[BUSINESS]
        PL3 --> PL4[PRO]
        PL4 --> PL5[FREE]
    end
```

## 🚀 Action Execution Flow

```mermaid
graph LR
    Start([Client Action Call]) --> Auth{Authenticated?}
    Auth -->|No| Redirect[Redirect to Login]
    Auth -->|Yes| Context[Create Permission Context]
    
    Context --> Permission{Has Permission?}
    Permission -->|No| Error[Return Error]
    Permission -->|Yes| Validate[Validate Input]
    
    Validate --> Plan{Within Plan Limits?}
    Plan -->|No| Limit[Plan Limit Error]
    Plan -->|Yes| Execute[Execute Business Logic]
    
    Execute --> DB[Database Operation]
    DB --> Cache[Invalidate Cache]
    Cache --> Success[Return Success]
    
    Error --> End([End])
    Limit --> End
    Redirect --> End
    Success --> End
```

## 📈 Plan Feature Matrix Visualization

```mermaid
graph TB
    subgraph "FREE Plan"
        F1[10 Content/Month]
        F2[1 Project]
        F3[1 Team Member]
        F4[Basic Support]
    end
    
    subgraph "PRO Plan"
        P1[1000 Content/Month]
        P2[10 Projects]
        P3[5 Team Members]
        P4[API Access]
        P5[PDF Export]
        P6[Priority Support]
    end
    
    subgraph "BUSINESS Plan"
        B1[Unlimited Content]
        B2[Unlimited Projects]
        B3[25 Team Members]
        B4[Advanced API]
        B5[All Export Formats]
        B6[Analytics]
        B7[Custom Integrations]
    end
    
    subgraph "AGENCY Plan"
        A1[Unlimited Content]
        A2[Unlimited Projects]
        A3[100 Team Members]
        A4[White-label]
        A5[Advanced Analytics]
        A6[Priority Support]
        A7[Custom Features]
    end
```

## 🔄 Data Flow Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React Components]
        Forms[Form Components]
        Hooks[Custom Hooks]
    end
    
    subgraph "Server Actions Layer"
        WithPerm[withPermissionAction Wrapper]
        ContentA[Content Actions]
        ProjectA[Project Actions]
        BillingA[Billing Actions]
    end
    
    subgraph "Authentication Layer"
        ClerkHelpers[Clerk Helpers]
        ABACSystem[ABAC System]
        PermConfig[Permission Config]
    end
    
    subgraph "Data Layer"
        PrismaClient[Prisma Client]
        DBQueries[Database Queries]
        NeonDB[Neon PostgreSQL]
    end
    
    UI --> WithPerm
    Forms --> WithPerm
    Hooks --> WithPerm
    
    WithPerm --> ContentA
    WithPerm --> ProjectA
    WithPerm --> BillingA
    
    ContentA --> ClerkHelpers
    ProjectA --> ClerkHelpers
    BillingA --> ClerkHelpers
    
    ClerkHelpers --> ABACSystem
    ABACSystem --> PermConfig
    
    ContentA --> PrismaClient
    ProjectA --> PrismaClient
    BillingA --> PrismaClient
    
    PrismaClient --> DBQueries
    DBQueries --> NeonDB
```

## 📱 API Architecture

```mermaid
graph TB
    subgraph "External API (/api/v1/)"
        APIAuth[API Authentication]
        APIRoutes[API Routes]
        APILimit[Rate Limiting]
    end
    
    subgraph "Internal Actions"
        ServerActions[Server Actions]
        InternalAuth[Internal Auth]
    end
    
    subgraph "Shared Services"
        ABAC[ABAC System]
        DB[Database Layer]
        Queue[Job Queues]
    end
    
    APIAuth --> APIRoutes
    APIRoutes --> APILimit
    APILimit --> ABAC
    
    ServerActions --> InternalAuth
    InternalAuth --> ABAC
    
    ABAC --> DB
    APIRoutes --> Queue
    ServerActions --> Queue
```

## 🎨 Component Integration Pattern

```mermaid
sequenceDiagram
    participant UI as UI Component
    participant Hook as Custom Hook
    participant Action as Server Action
    participant Auth as Auth System
    participant DB as Database
    
    UI->>Hook: User Interaction
    Hook->>Action: Call Server Action
    Action->>Auth: Verify Permission
    Auth-->>Action: Permission Result
    
    alt Permission Granted
        Action->>DB: Execute Operation
        DB-->>Action: Result
        Action-->>Hook: Success
        Hook-->>UI: Update State
        UI->>UI: Show Success Message
    else Permission Denied
        Action-->>Hook: Error
        Hook-->>UI: Error State
        UI->>UI: Show Error Message
    end
```

---

This technical documentation provides a comprehensive visual representation of the ThinkTapFast server architecture, showing how all components interact to provide a secure, scalable, and maintainable system.
