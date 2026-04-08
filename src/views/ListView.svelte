<script lang="ts">
  import { notesStore } from '../stores';

  const notes = notesStore;
</script>

<div class="list-view">
  <h1>List View</h1>
  <div class="list">
    {#each $notes as note}
      <div class="list-item">
        <div class="title">{note.title}</div>
        <div class="content">{note.content.substring(0, 100)}...</div>
      </div>
    {/each}
  </div>
</div>

<style>
  .list-view { padding: var(--space-4); }
  .list-item {
    padding: var(--space-3);
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
  }
  .list-item:hover { background: var(--bg-hover); }
  .title { font-weight: 600; margin-bottom: var(--space-2); }
  .content { color: var(--text-muted); font-size: var(--text-sm); }
</style>