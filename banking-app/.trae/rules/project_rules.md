Banking App Project Rules & Guidelines
📋 Project Overview
Banking Application

Framework: React Native with Expo
Routing: Expo Router (App Router)
Language: TypeScript (Strict Mode)
Styling: NativeWind CSS
State Management: Zustand
Target: iOS & Android

🏗️ PROJECT STRUCTURE RULES
Mandatory Folder Structure
banking-app/
├── app/ # Expo Router pages
│ ├── \_layout.tsx # Root layout
│ ├── index.tsx # App entry point
│ ├── (onboarding)/ # New user flow
│ ├── (auth)/ # Login flow
│ ├── (app)/ # Main app screens
│ └── +not-found.tsx # 404 page
├── components/ # Reusable UI components
│ ├── ui/ # Base UI components
│ └── forms/ # Form components
├── stores/ # Zustand stores
├── services/ # API & external services
├── utils/ # Helper functions
├── hooks/ # Custom React hooks
├── types/ # TypeScript type definitions
├── constants/ # App constants
└── assets/ # Images, fonts, etc.

📝 CODING STANDARDS
TypeScript Rules

✅ Strict Mode: "strict": true in tsconfig.json
✅ No any types - Use proper typing always
✅ Interface over Type for object definitions
✅ Enum for constants instead of string literals
✅ Generic types for reusable functions
❌ No implicit returns - always be explicit

File Naming Convention

Components: PascalCase (UserProfile.tsx)
Hooks: camelCase with 'use' prefix (useAuth.ts)
Utils: camelCase (formatCurrency.ts)
Types: PascalCase with 'T' prefix (TUserData.ts)
Constants: SCREAMING_SNAKE_CASE (API_ENDPOINTS.ts)
Routes: kebab-case (mobile-number.tsx)

Import Rules
typescript// 1. React/External libraries first
import React from 'react'
import { View, Text } from 'react-native'

// 2. Internal utilities/hooks
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/utils/formatCurrency'

// 3. Components (UI first, then feature-specific)
import { Button } from '@/components/ui/Button'
import { UserProfile } from '@/components/UserProfile'

// 4. Types last
import type { TUser } from '@/types/TUser'

🎨 STYLING RULES (NativeWind)
Design System Approach

✅ Use Tailwind classes only - No custom CSS
✅ Consistent spacing: Use 4, 8, 12, 16, 20, 24 scale
✅ Color palette: Define app colors in tailwind.config.js
✅ Typography scale: text-sm, text-base, text-lg, etc.
❌ No inline styles - Everything through NativeWind

Component Styling Pattern
typescript// ✅ Good - Consistent, readable classes
<View className="flex-1 bg-white px-4 py-6">
<Text className="text-2xl font-bold text-gray-900 mb-4">
Welcome Back
</Text>
</View>

// ❌ Bad - Inconsistent spacing, no system
<View className="flex-1 bg-white px-3 py-7">
<Text className="text-xl font-semibold text-black mb-3">
Welcome Back
</Text>
</View>
Responsive Design Rules

✅ Mobile-first approach
✅ Test on both iPhone & Android screen sizes
✅ Use SafeAreaView consistently
✅ Handle keyboard overlays properly

🗄️ STATE MANAGEMENT RULES (Zustand)
Store Organization
typescript// ✅ One store per domain
stores/
├── useAuthStore.ts # Authentication state
├── useUserStore.ts # User profile data
├── useSecurityStore.ts # Security settings
└── useAppStore.ts # App-wide state
Store Structure Pattern
typescriptinterface AuthState {
// State
user: TUser | null
isAuthenticated: boolean
isLoading: boolean

// Actions
login: (credentials: TLoginCredentials) => Promise<void>
logout: () => void
refreshToken: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
// Initial state
user: null,
isAuthenticated: false,
isLoading: false,

// Actions
login: async (credentials) => {
set({ isLoading: true })
// Implementation
},
// ...
}))
State Update Rules

✅ Immutable updates - Never mutate state directly
✅ Async actions - Handle loading/error states
✅ Type safety - All actions properly typed
❌ No business logic in components - Keep in stores

🛣️ ROUTING RULES (Expo Router)
Route Organization
app/
├── \_layout.tsx # Root layout with auth logic
├── index.tsx # Redirects to appropriate flow
├── (onboarding)/
│ ├── \_layout.tsx # Onboarding-specific layout
│ ├── get-started.tsx
│ └── [step].tsx # Dynamic routing if needed
├── (auth)/
│ ├── \_layout.tsx # Auth-specific layout
│ └── login.tsx
└── (app)/
├── \_layout.tsx # Main app layout
├── dashboard.tsx
└── (tabs)/ # Tab navigation
├── \_layout.tsx
├── home.tsx
└── profile.tsx
Navigation Rules

✅ Type-safe navigation - Use proper TypeScript
✅ Route guards - Implement in \_layout.tsx files
✅ Deep linking - Handle external links securely
✅ Loading states - Show appropriate loaders
❌ No navigation in components - Use hooks/stores

Route Protection Pattern
typescript// app/\_layout.tsx
export default function RootLayout() {
const { isAuthenticated, isLoading } = useAuthStore()

if (isLoading) return <LoadingScreen />

return (
<Stack>
{isAuthenticated ? (
<Stack.Screen name="(app)" options={{ headerShown: false }} />
) : (
<Stack.Screen name="(auth)" options={{ headerShown: false }} />
)}
</Stack>
)
}

🔐 SECURITY RULES
Data Handling

✅ Encrypt sensitive data - PINs, personal info
✅ Secure storage - Use Expo SecureStore for credentials
✅ No hardcoded secrets - Use environment variables
✅ Input validation - Validate all user inputs
❌ No sensitive data in logs - Careful with console.log

Authentication Rules

✅ Multi-factor auth - PIN + Biometric preferred
✅ Session management - Proper token handling
✅ Auto-logout - After inactivity
✅ Failed attempt limits - Lock after X attempts

🧪 TESTING RULES
Test Structure
**tests**/
├── components/ # Component tests
├── hooks/ # Hook tests
├── stores/ # Store tests  
├── utils/ # Utility tests
└── flows/ # End-to-end flow tests
Testing Requirements

✅ Component tests - Test UI behavior
✅ Hook tests - Test custom hooks
✅ Store tests - Test state management
✅ Flow tests - Test complete user journeys
✅ Mock external services - Don't hit real APIs in tests

🚀 PERFORMANCE RULES
Code Performance

✅ Lazy loading - Load screens on demand
✅ Memoization - Use React.memo, useMemo, useCallback
✅ Optimize images - Proper image formats and sizes
✅ Bundle size - Monitor and optimize bundle size
❌ No unnecessary re-renders - Optimize component updates

📦 DEPLOYMENT RULES
Build Configuration

✅ Environment separation - Dev, staging, production
✅ Proper app versioning - Semantic versioning
✅ Asset optimization - Compress images, fonts
✅ Bundle analysis - Monitor bundle size

Release Process

Code review - All code must be reviewed
Testing - Run full test suite
Staging deployment - Test in staging environment
Security audit - Check for vulnerabilities
Production release - Deploy to app stores

⚠️ CRITICAL DON'TS

❌ Never store sensitive data unencrypted
❌ Never skip TypeScript errors
❌ Never use any type
❌ Never commit secrets to git
❌ Never skip error handling
❌ Never collect behavioral data without consent

🏁 SUCCESS METRICS
Code Quality

Zero TypeScript errors
90%+ test coverage
No security vulnerabilities
Clean architecture principles followed

User Experience

< 3 second app launch time
Smooth 60fps animations
Intuitive navigation flows
Accessible for all users

Security

All sensitive data encrypted
Proper session management
Security audit passed
Chat controls Sonnet 4
