# Component Structure

All components are organized into **component folders** following Atomic Design principles.

## Folder Structure

```
components/
├── atoms/                         # Basic building blocks (6)
│   ├── CircuitButton/
│   ├── CircuitBadge/
│   ├── CircuitInput/
│   ├── CircuitSelect/
│   ├── CircuitCheckbox/
│   └── CircuitIcon/
│
├── molecules/                     # Functional combinations (7)
│   ├── FormField/
│   ├── PlayerCard/
│   ├── LobbyCard/
│   ├── CounterControl/
│   ├── DialogHeader/
│   ├── EmptyState/
│   └── VirtualDPad/
│
├── organisms/                     # Complex sections (6)
│   ├── CreateLobbyDialog/
│   ├── LobbyBrowser/
│   ├── LobbyPanel/
│   ├── ReplayBrowser/
│   ├── ReplayPlayer/
│   └── WelcomeScreen/
│
└── COMPONENT_STRUCTURE.md        # This file
```

## Component Folder Pattern

Each component lives in its own folder, allowing for co-location of related files:

```
ComponentName/
├── ComponentName.vue     # Main component (required)
├── types.ts             # Component-specific types (optional)
├── utils.ts             # Helper functions (optional)
├── constants.ts         # Component constants (optional)
├── ComponentName.test.ts # Unit tests (optional)
└── README.md            # Component docs (optional)
```

## Auto-Import

Nuxt automatically imports all components from the `components/` directory.

**Configuration in `nuxt.config.ts`:**

```ts
components: [
  {
    path: '@/components',
    pathPrefix: false,
  },
],
```

This means:
- ✅ **No manual imports needed** - components are globally available
- ✅ **No index.ts files needed** - Nuxt handles registration
- ✅ **Tree-shaking built-in** - unused components aren't bundled

## Usage Examples

### Using Atoms

```vue
<template>
  <CircuitButton variant="primary" @click="handleClick">
    Click Me
  </CircuitButton>
  
  <CircuitInput v-model="name" placeholder="Enter name" />
</template>

<!-- No imports needed! -->
<script setup lang="ts">
const name = ref('');
const handleClick = () => console.log('clicked');
</script>
```

### Using Molecules

```vue
<template>
  <FormField
    v-model="email"
    label="Email"
    type="email"
    hint="We'll never share your email"
  />
  
  <PlayerCard
    player-id="123"
    name="Player1"
    color="#0ff"
    :is-ready="true"
  />
</template>

<!-- Still no imports! -->
<script setup lang="ts">
const email = ref('');
</script>
```

### Using Organisms

```vue
<template>
  <CreateLobbyDialog
    v-if="showDialog"
    @create="handleCreate"
    @cancel="showDialog = false"
  />
</template>

<!-- Auto-imported! -->
<script setup lang="ts">
const showDialog = ref(false);
const handleCreate = (settings) => {
  console.log('Creating lobby with', settings);
};
</script>
```

## Benefits of Component Folders

### 1. **Co-location**
Everything related to a component stays together:
```
CircuitButton/
├── CircuitButton.vue
├── types.ts              # Button-specific types
├── utils.ts              # Button helper functions
└── CircuitButton.test.ts # Button tests
```

### 2. **Scalability**
Easy to add new files without cluttering the parent directory:
```
FormField/
├── FormField.vue
├── types.ts
├── validation.ts         # Field-specific validation
├── formatters.ts         # Input formatters
└── FormField.stories.ts  # Storybook stories
```

### 3. **Encapsulation**
Component logic stays with the component, not spread across the codebase.

### 4. **Easy Navigation**
All component files are in one place, making it easier to find what you need.

### 5. **Clean Imports**
Even though Nuxt auto-imports components, having folders means if you *do* need to manually import a util:
```ts
import { validateEmail } from '@/components/molecules/FormField/validation';
```

## Adding a New Component

### Step 1: Create folder
```bash
mkdir app/components/atoms/CircuitNewComponent
```

### Step 2: Create component
```bash
touch app/components/atoms/CircuitNewComponent/CircuitNewComponent.vue
```

### Step 3: Use it!
Nuxt will automatically detect and register it. Just use `<CircuitNewComponent />` anywhere.

## Component Naming

- **Atoms**: Prefix with `Circuit` (e.g., `CircuitButton`)
- **Molecules**: Descriptive names (e.g., `FormField`, `PlayerCard`)
- **Organisms**: Descriptive names (e.g., `LobbyBrowser`, `CreateLobbyDialog`)

## TypeScript Support

All components have full TypeScript support:

```vue
<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
});
</script>
```

Props are automatically inferred when using components thanks to Volar/Vue Language Features.

## Testing Components

When adding tests, co-locate them with the component:

```
CircuitButton/
├── CircuitButton.vue
└── CircuitButton.test.ts
```

Run tests with:
```bash
npm run test
```

---

## Component Reference

### Atoms (6 Components)

Basic UI building blocks with the "Circuit" theme prefix.

#### CircuitButton
Themed button component with variants and states.

**Props:**
- `variant?: 'primary' | 'secondary' | 'danger' | 'ghost'` - Button style (default: 'primary')
- `disabled?: boolean` - Disable button (default: false)

**Usage:**
```vue
<CircuitButton variant="primary" @click="handleClick">
  Create Lobby
</CircuitButton>
```

---

#### CircuitBadge
Small status indicator or label.

**Props:**
- `variant?: 'default' | 'success' | 'warning' | 'danger'` - Badge color (default: 'default')

**Usage:**
```vue
<CircuitBadge variant="success">Ready</CircuitBadge>
```

---

#### CircuitInput
Text input with Circuit theme styling.

**Props:**
- `modelValue: string` - Input value (v-model)
- `placeholder?: string` - Placeholder text
- `disabled?: boolean` - Disable input
- `maxlength?: number` - Maximum character length

**Events:**
- `update:modelValue` - Emitted on input change

**Usage:**
```vue
<CircuitInput v-model="playerName" placeholder="Enter name" :maxlength="20" />
```

---

#### CircuitSelect
Dropdown select with Circuit theme.

**Props:**
- `modelValue: string | number` - Selected value (v-model)
- `options: Array<{value: string | number, label: string}>` - Dropdown options
- `disabled?: boolean` - Disable select

**Events:**
- `update:modelValue` - Emitted on selection change

**Usage:**
```vue
<CircuitSelect 
  v-model="gridSize" 
  :options="[
    { value: 50, label: '50x50 (Small)' },
    { value: 100, label: '100x100 (Medium)' }
  ]"
/>
```

---

#### CircuitCheckbox
Checkbox input with Circuit theme.

**Props:**
- `modelValue: boolean` - Checked state (v-model)
- `label?: string` - Checkbox label
- `disabled?: boolean` - Disable checkbox

**Events:**
- `update:modelValue` - Emitted on toggle

**Usage:**
```vue
<CircuitCheckbox v-model="isPrivate" label="Private Lobby" />
```

---

#### CircuitIcon
Icon display component (uses emoji/unicode).

**Props:**
- `name: string` - Icon identifier
- `size?: 'sm' | 'md' | 'lg'` - Icon size (default: 'md')

**Usage:**
```vue
<CircuitIcon name="refresh" size="md" />
```

---

### Molecules (7 Components)

Functional combinations of atoms.

#### FormField
Label + input/select wrapper with optional hint text.

**Props:**
- `modelValue: string | number` - Field value (v-model)
- `label: string` - Field label
- `type?: string` - Input type (default: 'text')
- `hint?: string` - Help text below field

**Events:**
- `update:modelValue` - Emitted on value change

**Usage:**
```vue
<FormField 
  v-model="email" 
  label="Email Address" 
  type="email"
  hint="We'll never share your email"
/>
```

---

#### PlayerCard
Player display with avatar, name, color, and ready status.

**Props:**
- `playerId: string` - Unique player ID
- `name: string` - Player name
- `color: string` - Player color (hex)
- `avatar?: string` - Avatar identifier
- `isReady?: boolean` - Ready status
- `isHost?: boolean` - Host indicator

**Usage:**
```vue
<PlayerCard 
  player-id="123"
  name="Player1" 
  color="#0ff"
  avatar="recognizer"
  :is-ready="true"
  :is-host="true"
/>
```

---

#### LobbyCard
Lobby information card with player count and settings.

**Props:**
- `lobbyId: string` - Unique lobby ID
- `lobbyName: string` - Lobby name
- `gridSize: number` - Grid dimensions
- `currentPlayers: number` - Current player count
- `maxPlayers: number` - Maximum players
- `isPrivate?: boolean` - Private lobby indicator
- `status: string` - Lobby status ('waiting' | 'playing')

**Events:**
- `join` - Emitted to join lobby
- `spectate` - Emitted to spectate game

**Usage:**
```vue
<LobbyCard 
  lobby-id="abc123"
  lobby-name="Epic Game"
  :grid-size="100"
  :current-players="3"
  :max-players="4"
  status="waiting"
  @join="joinLobby"
/>
```

---

#### CounterControl
Labeled increment/decrement control.

**Props:**
- `modelValue: number` - Current value (v-model)
- `label: string` - Control label
- `min?: number` - Minimum value (default: 0)
- `max?: number` - Maximum value (default: 100)

**Events:**
- `update:modelValue` - Emitted on value change

**Usage:**
```vue
<CounterControl 
  v-model="aiPlayers" 
  label="AI Players"
  :min="0"
  :max="3"
/>
```

---

#### DialogHeader
Dialog/modal title with close button.

**Props:**
- `title: string` - Dialog title

**Events:**
- `close` - Emitted when close button clicked

**Usage:**
```vue
<DialogHeader title="Create New Lobby" @close="closeDialog" />
```

---

#### EmptyState
Empty state message with icon.

**Props:**
- `icon?: string` - Emoji/icon to display
- `message: string` - Empty state message

**Usage:**
```vue
<EmptyState 
  icon="📭" 
  message="No lobbies available. Create one to get started!"
/>
```

---

#### VirtualDPad
Touch-friendly directional pad with brake button for mobile controls.

**Props:**
- `isVisible: boolean` - Show/hide D-pad

**Events:**
- `direction` - Emitted with direction ('up' | 'down' | 'left' | 'right')
- `brake` - Emitted when brake pressed

**Usage:**
```vue
<VirtualDPad 
  :is-visible="isMobile" 
  @direction="handleDirection"
  @brake="handleBrake"
/>
```

---

### Organisms (6 Components)

Complex UI sections composed of molecules and atoms.

#### CreateLobbyDialog
Complete lobby creation form with all game settings.

**Events:**
- `create` - Emitted with lobby settings object
- `cancel` - Emitted when dialog closed

**Usage:**
```vue
<CreateLobbyDialog
  @create="handleCreateLobby"
  @cancel="showDialog = false"
/>
```

---

#### LobbyBrowser
Full lobby browsing interface with filtering and actions.

**Props:**
- `playerName: string` - Current player's name

**Events:**
- `joinLobby` - Emitted with lobbyId
- `spectateGame` - Emitted with lobbyId
- `createLobby` - Emitted to open create dialog
- `changeSettings` - Emitted to open settings
- `openReplays` - Emitted to open replay browser

**Exposed Methods:**
- `updateLobbies(lobbies)` - Update lobby list from parent

**Usage:**
```vue
<LobbyBrowser
  ref="lobbyBrowser"
  :player-name="playerName"
  @join-lobby="joinLobby"
  @create-lobby="showCreateDialog = true"
/>
```

---

#### LobbyPanel
Lobby waiting room with player list and host controls.

**Props:**
- `lobbyState: LobbyState | null` - Complete lobby state
- `currentPlayerId: string | null` - Current player's ID
- `isReady: boolean` - Player ready status

**Events:**
- `toggleReady` - Emitted when ready toggled
- `updateSettings` - Emitted with settings changes
- `leaveLobby` - Emitted when leaving

**Usage:**
```vue
<LobbyPanel
  :lobby-state="currentLobby"
  :current-player-id="playerId"
  :is-ready="playerReady"
  @toggle-ready="toggleReady"
  @leave-lobby="leaveLobby"
/>
```

---

#### ReplayBrowser
Replay gallery with playback and deletion controls.

**Props:**
- `ws: WebSocket | null` - WebSocket connection for loading replays

**Events:**
- `watch` - Emitted with replayId to play
- `close` - Emitted to close browser

**Usage:**
```vue
<ReplayBrowser
  :ws="websocket"
  @watch="playReplay"
  @close="showReplays = false"
/>
```

---

#### ReplayPlayer
Full-featured replay player with timeline and controls.

**Props:**
- `replayData: ReplayData | null` - Complete replay data with game state

**Events:**
- `close` - Emitted to close player

**Usage:**
```vue
<ReplayPlayer
  :replay-data="currentReplay"
  @close="closePlayer"
/>
```

---

#### WelcomeScreen
Complete onboarding screen with game instructions and controls guide.

**Events:**
- `continue` - Emitted when user continues

**Usage:**
```vue
<WelcomeScreen @continue="startGame" />
```

---

## Atomic Design Benefits

### Code Reduction
Refactoring to atomic design resulted in significant code reduction:
- **CreateLobbyDialog**: 44% smaller
- **LobbyBrowser**: 60% smaller  
- **LobbyPanel**: 38% smaller
- **ReplayBrowser**: 29% smaller

**Total:** ~43% reduction across all organisms

### Consistency
- ✅ All buttons look and behave the same
- ✅ Form fields have consistent styling
- ✅ Color system unified across components

### Maintainability
- ✅ Fix bugs once in atoms, fixes everywhere
- ✅ Style changes propagate automatically
- ✅ Easier to test smaller components

### Reusability
- ✅ Atoms work in any context
- ✅ Molecules are context-aware but flexible
- ✅ Easy to build new organisms quickly

---

