<script setup lang="ts">
interface LobbySettings {
  isPrivate: boolean;
  gridSize: number;
  maxPlayers: number;
  allowSpectators: boolean;
  enableAI: boolean;
  aiPlayerCount: number;
}

const emit = defineEmits<{
  create: [settings: LobbySettings];
  cancel: [];
}>();

const settings = ref<LobbySettings>({
  isPrivate: false,
  gridSize: 40,
  maxPlayers: 8,
  allowSpectators: true,
  enableAI: false,
  aiPlayerCount: 1,
});

const gridSizeOptions = [
  { value: 30, label: 'Small (30x30)' },
  { value: 40, label: 'Medium (40x40)' },
  { value: 50, label: 'Large (50x50)' },
  { value: 60, label: 'Extra Large (60x60)' },
];

const maxPlayersOptions = [
  { value: 2, label: '2 Players' },
  { value: 4, label: '4 Players' },
  { value: 6, label: '6 Players' },
  { value: 8, label: '8 Players' },
];

const create = () => {
  emit('create', settings.value);
};
</script>

<template>
  <div 
    class="fixed inset-0 bg-black/90 flex items-center justify-center z-[2000] animate-[fadeIn_0.2s_ease]"
    @click.self="emit('cancel')"
  >
    <div class="bg-cyan-950/[0.98] border-2 border-cyan-400 rounded-xl w-[90%] max-w-[500px] shadow-[0_0_30px_rgba(0,255,255,0.4)] animate-[slideUp_0.3s_ease]">
      <DialogHeader
        title="Create New Lobby"
        @close="emit('cancel')"
      />

      <div class="px-6 py-6 max-h-[60vh] overflow-y-auto flex flex-col gap-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-black/30 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-cyan-400/40 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-cyan-400/60">
        <FormField
          v-model="settings.gridSize"
          label="Grid Size"
          type="select"
          :options="gridSizeOptions"
        />

        <FormField
          v-model="settings.maxPlayers"
          label="Max Players"
          type="select"
          :options="maxPlayersOptions"
        />

        <CircuitCheckbox
          v-model="settings.isPrivate"
          label="🔒 Private Lobby"
          hint="Only players with the link can join"
        />

        <CircuitCheckbox
          v-model="settings.allowSpectators"
          label="👁️ Allow Spectators"
          hint="Others can watch without playing"
        />

        <div class="mt-1 pt-5 border-t border-cyan-400/20 flex flex-col gap-4">
          <CircuitCheckbox
            v-model="settings.enableAI"
            label="🤖 Add AI Players"
            hint="Practice against computer opponents"
          />

          <div v-if="settings.enableAI" class="p-4 bg-cyan-400/5 border border-cyan-400/20 rounded-md flex flex-col gap-2.5">
            <CounterControl
              v-model="settings.aiPlayerCount"
              label="Number of AI Players"
              :min="1"
              :max="settings.maxPlayers - 1"
            />
            <small class="block text-center text-gray-500 text-xs">
              You + {{ settings.aiPlayerCount }} AI = {{ settings.aiPlayerCount + 1 }} total players
            </small>
          </div>
        </div>
      </div>

      <div class="flex gap-4 px-6 py-5 border-t border-cyan-400/30">
        <CircuitButton
          variant="ghost"
          @click="emit('cancel')"
        >
          Cancel
        </CircuitButton>
        <CircuitButton
          variant="primary"
          @click="create"
        >
          Create Lobby
        </CircuitButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>

