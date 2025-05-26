# Claude Batch

A modern web application for batch processing text completions through Anthropic's Claude AI model. This application allows you to efficiently create, manage, and monitor batches of AI completion requests.

## 🌟 Features

- **Batch Processing**: Upload, configure, and process large batches of prompts with Claude
- **Dashboard Interface**: Monitor real-time progress of your batch completions
- **Authentication**: Secure user authentication with email/password and OAuth providers
- **API Key Management**: Create and manage API keys for programmatic access
- **User Roles**: Administrative controls and user role management
- **Robust Security**: Comprehensive security headers and authentication flows
- **Responsive Design**: Modern UI built with React, Tailwind CSS, and Shadcn UI components

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router and React Server Components
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) with database adapter
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Schema Enhancement**: [ZenStack](https://zenstack.dev/) for access policies
- **Form Management**: React Hook Form with Zod validation
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Shadcn UI components
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) and React Query
- **UI Components**: [Radix UI](https://www.radix-ui.com/) primitives
- **AI Integration**: [Anthropic API](https://anthropic.com/api/) for Claude AI access

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database
- Anthropic API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/claude-batch.git
   cd claude-batch
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in the required environment variables:
     ```
     # Database
     DATABASE_URL="postgresql://postgres:password@localhost:5432/claude_batch"

     # Anthropic API
     ANTHROPIC_API_KEY="your-anthropic-api-key"

     # NextAuth
     NEXTAUTH_SECRET="your-nextauth-secret"
     NEXTAUTH_URL="http://localhost:3000"

     # Optional OAuth Providers
     # GITHUB_ID="your-github-client-id"
     # GITHUB_SECRET="your-github-client-secret"
     # GOOGLE_ID="your-google-client-id"
     # GOOGLE_SECRET="your-google-client-secret"
     ```

4. Initialize and migrate the database:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🗄️ Database Schema

The application uses the following core data models:

- **User**: User accounts with authentication information
- **Batch**: Represents a collection of completions to be processed
- **Completion**: Individual AI completion requests within a batch
- **ApiKey**: API keys for programmatic access to the application

## 🔒 Authentication

- Email/Password authentication
- OAuth providers support (GitHub, Google)
- Session-based authentication with JWT
- Protected routes via middleware
- API key authentication for programmatic access

## 🤖 Using the API

The application provides both a web interface and API endpoints for managing batches:

1. Create an API key in the settings
2. Use the key to authenticate API requests:
   ```bash
   curl -X POST https://your-deployment-url/api/batches \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "My Batch",
       "prompts": ["Tell me about AI", "Explain quantum computing"]
     }'
   ```

## 📝 Anthropic API Integration

### Valid Models

This application supports the following Claude models:

- **Claude 4** (Latest Generation):
  - `claude-opus-4-20250514` - Our most capable and intelligent model with 32K max output tokens
  - `claude-sonnet-4-20250514` - High-performance model with 64K max output tokens
  - Features: 200K context window, extended thinking support, vision capabilities, March 2025 training cutoff

- **Claude 3.7**:
  - `claude-3-7-sonnet-20250219` - High-performance model with early extended thinking (up to 128K output with beta header)
  - Features: 200K context window, extended thinking support, vision capabilities, October 2024 training cutoff

- **Claude 3.5**:
  - `claude-3-5-sonnet-20241022` - Latest Claude 3.5 Sonnet (October 2024)
  - `claude-3-5-haiku-20241022` - Fastest model for quick responses
  - `claude-3-5-sonnet-20240620` - Previous Claude 3.5 Sonnet (June 2024)
  - Features: 200K context window, 8K max output tokens, vision capabilities

- **Claude 3** (Legacy):
  - `claude-3-opus-20240229` - Most capable Claude 3 model
  - `claude-3-sonnet-20240229` - Balanced Claude 3 model
  - `claude-3-haiku-20240307` - Fastest Claude 3 model
  - Features: 200K context window, 4K max output tokens, vision capabilities

To verify model availability or test your Anthropic API connection, you can use the provided scripts:

```bash
# Check available models (JavaScript)
cd scripts && node check-models.js

# Check available models (TypeScript)
cd scripts && npx ts-node check-models.ts

# Test batch API functionality (JavaScript)
cd scripts && node check-batch-api.js

# Test batch API functionality (TypeScript)
cd scripts && npx ts-node check-batch-api.ts
```

The scripts will automatically use the Anthropic API key from the main project's `.env.local` file, so you don't need to create a separate `.env` file in the scripts directory.

### Batch Processing Considerations

- **Batch Structure**: Each batch request must include a list of individual message requests, each with a unique `custom_id` and message parameters.
- **Propagation Delay**: After creating a batch, there might be a short delay (5-15 seconds) before it's fully available in Anthropic's system.
- **Model Name Validation**: Ensure you're using a valid model name as shown above. Invalid model names will result in a `not_found_error`.
- **Error Handling**: The application implements retry logic for handling temporary availability issues with newly created batches.

## 📊 Dashboard Usage

1. **Create a Batch**: Upload a CSV or JSON file with prompts or enter prompts manually
2. **Configure**: Set Claude model, temperature, and other parameters
3. **Process**: Start the batch and monitor progress in real-time
4. **Results**: Download or export results when processing completes

## 🛣️ Project Structure

```
claude-batch/
├── app/                   # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes
│   └── page.tsx           # Landing page
├── components/            # Reusable React components
├── config/                # Configuration files
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and services
├── prisma/                # Database schema and migrations
│   ├── schema.prisma      # Prisma schema
│   └── zenstack.schema    # ZenStack enhanced schema
├── public/                # Static assets
└── types/                 # TypeScript type definitions
```

## 🧪 Development

### Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

## 📜 License

This project is licensed under the MIT License.