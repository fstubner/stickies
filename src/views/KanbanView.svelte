<script lang="ts">
  import KanbanColumn from '../components/kanban/KanbanColumn.svelte';

  const columns = ['todo', 'in-progress', 'done'];
</script>

<div class="kanban-view">
  <h1>Kanban</h1>
  <div class="kanban-board">
    {#each columns as column}
      <KanbanColumn {column} />
    {/each}
  </div>
</div>

<style>
  .kanban-view { padding: var(--space-4); }
  .kanban-board {
    display: flex;
    gap: var(--space-4);
    overflow-x: auto;
  }
</style>