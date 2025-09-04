# User Data Pattern

This document explains the pattern for safely handling user data across the application, especially when pages are opened in new windows or tabs.

## Problem

When a page is opened in a new window/tab, the `CustomerContext` might not be initialized yet, causing errors like:
```
Error: Cannot destructure property 'activeCustomerId' of '(0 , _contexts_CustomerContext__WEBPACK_IMPORTED_MODULE_12__.useUser)(...)' as it is null.
```

## Solution

We've implemented a comprehensive solution with multiple layers of protection:

### 1. Enhanced CustomerContext

The `CustomerContext` now includes:
- `isReady`: Boolean indicating if the context has finished initializing
- `retryLoad`: Function to retry loading user data
- Better error handling and loading states

### 2. Safe Hooks

#### `useUserSafely()`
Returns user details with loading state information:
```typescript
const { userDetails, isLoading, isReady, isAvailable } = useUserSafely();
```

#### `useUserData()`
Comprehensive hook that provides all user-related data:
```typescript
const { 
  isLoading, 
  isReady, 
  isAvailable, 
  userDetails, 
  activeCustomerId, 
  customers, 
  activeSportAbbrev, 
  activeSportName, 
  retryLoad 
} = useUserData();
```

### 3. UserDataProvider Component

A wrapper component that ensures user data is available before rendering children:

```typescript
import UserDataProvider from '@/components/UserDataProvider';

export default function MyPage() {
  return (
    <UserDataProvider>
      <MyPageContent />
    </UserDataProvider>
  );
}
```

### 4. Error Boundary

`ContextErrorBoundary` component that catches context-related errors and provides retry functionality.

## Usage Patterns

### For Pages That Need User Data

```typescript
// Wrap your page component
export default function MyPage() {
  return (
    <UserDataProvider>
      <MyPageContent />
    </UserDataProvider>
  );
}

// Your content component can safely use user data
function MyPageContent() {
  const { userDetails, activeCustomerId } = useUserData();
  // ... rest of your component
}
```

### For Components That Need User Data

```typescript
function MyComponent() {
  const { userDetails, isAvailable } = useUserSafely();
  
  if (!isAvailable) {
    return <div>Loading...</div>;
  }
  
  // Safe to use userDetails here
  return <div>Hello, {userDetails.name_first}!</div>;
}
```

### For Components That Require User Data

```typescript
function MyComponent() {
  // This will throw an error if user data is not available
  const { userDetails } = useUserDataRequired();
  
  // Safe to use userDetails here
  return <div>Hello, {userDetails.name_first}!</div>;
}
```

## Benefits

1. **No More Runtime Errors**: Pages opened in new windows won't crash
2. **Consistent Loading States**: All pages show proper loading indicators
3. **Retry Functionality**: Users can retry if data loading fails
4. **Better UX**: Clear feedback when data is not available
5. **Type Safety**: TypeScript ensures proper usage

## Migration

To migrate existing pages:

1. Import `UserDataProvider`:
   ```typescript
   import UserDataProvider from '@/components/UserDataProvider';
   ```

2. Wrap your page component:
   ```typescript
   export default function MyPage() {
     return (
       <UserDataProvider>
         <MyPageContent />
       </UserDataProvider>
     );
   }
   ```

3. Update your content component to use the safe hooks:
   ```typescript
   function MyPageContent() {
     const { userDetails, activeCustomerId } = useUserData();
     // ... rest of your component
   }
   ```

This pattern ensures that your application handles user data loading gracefully across all scenarios. 