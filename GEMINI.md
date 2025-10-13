# Gemini Context: EatingMeeting App

This document provides a comprehensive overview of the EatingMeeting mobile application for the Gemini AI assistant. It covers the project's purpose, architecture, and development conventions to ensure effective and consistent collaboration.

## 1. Project Overview

EatingMeeting is a React Native (Expo) mobile application designed to help users find "meal buddies" in a platonic, non-dating context. It allows users to discover nearby restaurants, connect with other users, chat in real-time, and propose meals at specific places and times.

### Key Technologies

- **Frontend**: React Native with Expo SDK
- **Language**: TypeScript (Strict)
- **Routing**: Expo Router (file-based)
- **State Management**: Zustand
- **UI Components**: Custom-built components, `lucide-react-native` for icons.
- **Backend-as-a-Service (BaaS)**: Supabase
  - **Authentication**: OTP-based email login.
  - **Database**: PostgreSQL for storing profiles, chats, proposals, etc.
  - **Realtime**: Used for live chat and meal proposal status updates.
  - **Storage**: Used for user-uploaded profile photos.

### Architecture

The project follows a clean, feature-oriented architecture that separates concerns into distinct directories:

- `app/`: Contains all screens and routes, managed by Expo Router. The file system in this directory dictates the navigation structure.
- `components/`: Holds reusable, generic UI components (e.g., `Button`, `Avatar`).
- `hooks/`: Centralizes business logic into custom React hooks (e.g., `useAuth`, `useChat`, `useMap`). This is the primary layer for interacting with backend services.
- `lib/`: Contains core utilities and service clients, including the Supabase client initialization (`supabase.ts`), helper functions, and data validation.
- `state/`: Manages global application state using Zustand. It is divided into separate stores for different domains (e.g., `auth.store.ts`, `chat.store.ts`).
- `supabase/`: Holds database migrations and schema definitions.
- `types/`: Contains shared TypeScript type definitions, ensuring type safety across the application.

## 2. Building and Running

All project scripts are defined in `package.json` and should be run using `npm`.

- **Start Development Server**: Starts the Expo development server for testing on simulators or physical devices via the Expo Go app.
  ```bash
  npm run dev
  ```

- **Type Checking**: Runs the TypeScript compiler to check for any type errors without generating JavaScript files. This should be run to ensure code quality.
  ```bash
  npm run typecheck
  ```

- **Linting**: Runs the Expo linter to check for code style and quality issues.
  ```bash
  npm run lint
  ```

- **Web Build**: Creates a production export of the app for the web platform.
  ```bash
  npm run build:web
  ```

## 3. Development Conventions

- **State Management**: Global state must be managed via Zustand stores in the `state/` directory. For new features, either extend an existing store or create a new one. Avoid using component-local state for data that needs to be shared.

- **Backend Interaction**: All communication with the Supabase backend must be abstracted through custom hooks in the `hooks/` directory. Components should not directly import or use the `supabase` client from `lib/`. This keeps components clean and centralizes data-fetching logic.

- **Routing**: Navigation is handled by Expo Router. To create a new screen, add a new file or directory within the `app/` folder. Protected routes and authentication logic are managed in the root layout file (`app/_layout.tsx`).

- **Styling**: Styling is done using React Native's `StyleSheet` API. Each component or screen should contain its own styles. There are no global CSS or utility class libraries in use.

- **Type Safety**: The project is written in TypeScript with `strict` mode enabled. All new code should be fully typed. Use the types defined in the `types/` directory where applicable.

- **Testing**: While no formal testing framework (like Jest or React Native Testing Library) is currently set up, type checking (`npm run typecheck`) is used as the primary method of ensuring code correctness.

## 4. Development Principles & Lessons Learned

This section documents lessons learned from previous tasks and defines principles for more stable and efficient development in the future.

### 4.1. Surgical Precision in Code Modification

- **Issue**: When using the `replace` tool to swap large blocks of code, essential imports like `StyleSheet` and `Platform` were accidentally removed. This caused a cascade of runtime errors.
- **Principle**: When modifying code, target the **smallest possible scope** required for the change. Instead of replacing entire files or large blocks, prefer to replace smaller units like specific functions, JSX blocks, or style definitions. Always verify that essential elements like imports are preserved after any modification.

### 4.2. Dependency Management and Prioritizing Built-in APIs

- **Issue**: An external library (`react-native-keyboard-aware-scroll-view`) was hastily introduced to improve keyboard animations. This led to dependency issues, increased complexity, and ultimately broke the UI layout.
- **Principle**: Before introducing a new external library, always consider solving the problem with **built-in React Native APIs** first. If an external library is deemed necessary, thoroughly vet its stability and ensure it is correctly added to `package.json` and integrated into the project.

### 4.3. Reliable Reversion Strategy

- **Issue**: When a change introduced a critical error, the process of reverting to a previous stable state was not smooth, which delayed the resolution.
- **Principle**: If a change breaks a core feature or introduces a critical bug, the first priority is to **perfectly restore the code to the last known stable version**. From that stable state, attempt a new approach to solve the problem.
