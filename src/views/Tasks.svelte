<script lang="ts">
  import { notesStore } from '../stores';

  const notes = notesStore;
</script>

<div class="tasks">
  <h1>Tasks</h1>
  <div class="task-list">
    {#each $notes as note}
      {#if note.content.includes('[ ]') || note.content.includes('[x]')}
        <div class="task-item">{note.title}</div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .tasks { padding: var(--space-4); }
  .task-item { padding: var(--space-2); border-left: 3px solid var(--accent); padding-left: var(--space-3); margin: var(--space-2) 0; }
</style>