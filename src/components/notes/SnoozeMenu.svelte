<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { snoozeNote, SNOOZE_OPTIONS, type SnoozeOption } from '../../services/notificationService';

  export let noteId: string;
  export let isOpen = false;

  const dispatch = createEventDispatcher();

  function handleSnooze(option: SnoozeOption) {
    snoozeNote(noteId, option);
    isOpen = false;
    dispatch('snoozed', { option });
  }
</script>

<div class="snooze-menu" class:open={isOpen}>
  {#each SNOOZE_OPTIONS as option}
    <button on:click={() => handleSnooze(option)}>
      {option.label}
    </button>
  {/each}
</div>

<style>
  .snooze-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    display: none;
    flex-direction: column;
    z-index: var(--z-dropdown);
  }

  .snooze-menu.open {
    display: flex;
  }

  button {
    padding: var(--space-2) var(--space-3);
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
    font-size: var(--text-sm);
    transition: background-color var(--transition-fast);
  }

  button:hover {
    background-color: var(--bg-hover);
  }
</style>