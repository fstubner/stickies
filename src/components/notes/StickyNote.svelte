<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import NoteCard from './NoteCard.svelte';
  import { noteService } from '../../services/noteService';
  import { electronService } from '../../services/electronService';
  import { getNoteById } from '../../stores/notes';
  import type { Note } from '../../types/Note';

  export let noteId: string;

  let note: Note | null = null;
  let windowHandle: any = null;

  onMount(async () => {
    // Get note from store
    note = getNoteById(noteId);

    // Register window with electron if available
    if (typeof window.electron !== 'undefined' && noteId) {
      windowHandle = window.electron.registerStickyWindow(noteId);
    }
  });

  onDestroy(() => {
    if (windowHandle && typeof window.electron !== 'undefined') {
      window.electron.unregisterStickyWindow(windowHandle);
    }
  });

  function handleClose() {
    if (typeof window.electron !== 'undefined') {
      window.electron.closeWindow();
    } else {
      window.close();
    }
  }

  function handlePin() {
    if (typeof window.electron !== 'undefined') {
      window.electron.pinWindow();
    }
  }
</script>

{#if note}
  <div class="sticky-window">
    <div class="window-header">
      <div class="header-controls">
        <button class="btn-icon" on:click={handlePin} title="Pin window">
          📌
        </button>
        <button class="btn-icon" on:click={handleClose} title="Close window">
          ✕
        </button>
      </div>
    </div>
    <div class="window-content">
      <NoteCard {note} />
    </div>
  </div>
{:else}
  <div class="error">
    <p>Note not found</p>
  </div>
{/if}

<style>
  .sticky-window {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
  }

  .window-header {
    padding: 8px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: flex-end;
  }

  .header-controls {
    display: flex;
    gap: 4px;
  }

  .btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 4px 8px;
  }

  .btn-icon:hover {
    background: var(--bg-secondary);
    border-radius: 4px;
  }

  .window-content {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }

  .error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    color: var(--error);
  }
</style>