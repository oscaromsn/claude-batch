# Claude Batch Repository Guide

## Build Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma migrate dev` - Run database migrations
- `npx prisma studio` - Open Prisma database UI

## Code Style Guidelines
- **TypeScript**: Strict mode enabled with proper typing
- **Imports**: Use absolute imports with `@/` prefix
- **Components**: Functional components with React hooks
- **Naming**: PascalCase for components, camelCase for variables/functions
- **CSS**: Tailwind classes with consistent ordering
- **State Management**: React Query for server state, Zustand for client state
- **Error Handling**: Use Zod for validation, try/catch for async operations
- **API**: RESTful endpoints with proper error responses
- **Forms**: Use react-hook-form with Zod resolvers
- **Database**: Prisma ORM with well-defined schema models

## Architecture
- Next.js App Router for routing
- Authentication with NextAuth.js
- ShadCN UI components
- PostgreSQL database with Prisma

## Claude-Optimized Resources
- **Code Index**: `.claude/code_index/` - Component and API relationships
- **Patterns**: `.claude/patterns/` - Implementation patterns for key features
- **Cheatsheets**: `.claude/cheatsheets/` - Quick reference guides
- **Debug History**: `.claude/debug_history/` - Solutions to common issues
- **Q&A Database**: `.claude/qa/` - Frequently asked questions
- **Delta Summaries**: `.claude/delta/` - Version change documentation