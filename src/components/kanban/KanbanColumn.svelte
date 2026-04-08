<script lang="ts">
  import type { Note } from '../../types/Note';
  import KanbanCard from './KanbanCard.svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    moveCard: { noteId: string; column: string };
    deleteCard: { noteId: string };
  }>();

  export let title = '';
  export let notes: Note[] = [];
  export let columnId = '';

  let dragOverColumn = false;

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    dragOverColumn = true;
  };

  const handleDragLeave = () => {
    dragOverColumn = false;
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    dragOverColumn = false;
    const noteId = e.dataTransfer!.getData('text/plain');
    dispatch('moveCard', { noteId, column: columnId });
  };
</script>

<div
  class="kanban-column"
  class:drag-over={dragOverColumn}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
>
  <div class="column-header">
    <h2>{title}</h2>
    <span class="count">{notes.length}</span>
  </div>
  <div class="cards-container">
    {#each notes as note (note.id)}
      <KanbanCard {note} on:moveCard on:deleteCard />
    {/each}
  </div>
</div>

<style>
  .kanban-column {
    background: var(--bg-tertiary);
    border-radius: 8px;
    padding: 16px;
    min-width: 300px;
    max-height: 600px;
    overflow-y: auto;
    transition: background 0.2s ease;
  }

  .kanban-column.drag-over {
    background: var(--accent-light);
  }

  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .column-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .count {
    background: var(--bg-secondary);
    color: var(--text-muted);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
  }

  .cards-container {
    display: flex;
    flex-direction: column;
  }
</style>
