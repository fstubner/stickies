<script lang="ts">
  import { notesStore } from '../stores';
  import NoteCard from '../components/notes/NoteCard.svelte';

  const notes = notesStore;
</script>

<div class="dashboard">
  <h1>Dashboard</h1>
  <div class="notes-grid">
    {#each $notes as note}
      <NoteCard {note} />
    {:else}
      <p>No notes yet. Create one to get started!</p>
    {/each}
  </div>
</div>

<style>
  .dashboard { padding: var(--space-6); }
  .notes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-4);
  }
</style>