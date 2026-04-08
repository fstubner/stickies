<script lang="ts">
  import type { Note } from '../../types/Note';
  import { createEventDispatcher } from 'svelte';
  import { noteService } from '../../services/noteService';

  const dispatch = createEventDispatcher<{
    moveCard: { noteId: string; column: string };
    deleteCard: { noteId: string };
  }>();

  export let note: Note;
  export let draggable = true;

  let isDragging = false;

  const handleDragStart = (e: DragEvent) => {
    if (!draggable) return;
    isDragging = true;
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', note.id);
  };

  const handleDelete = async () => {
    if (confirm('Delete this note?')) {
      await noteService.deleteNote(note.id);
      dispatch('deleteCard', { noteId: note.id });
    }
  };
</script>

<div
  class="kanban-card"
  class:dragging={isDragging}
  draggable={draggable}
  on:dragstart={handleDragStart}
  on:dragend={() => (isDragging = false)}
>
  <div class="card-header">
    <h3>{note.title}</h3>
    <button class="delete-btn" on:click={handleDelete} title="Delete">
      &times;
    </button>
  </div>
  <p class="card-content">{note.content?.substring(0, 100)}...</p>
  {#if note.tags && note.tags.length > 0}
    <div class="card-tags">
      {#each note.tags.slice(0, 3) as tag (tag.id)}
        <span class="tag">{tag.name}</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .kanban-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 8px;
    cursor: grab;
    transition: all 0.2s ease;
  }

  .kanban-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .kanban-card.dragging {
    opacity: 0.5;
    cursor: grabbing;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }

  .card-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .delete-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 20px;
    padding: 0;
    line-height: 1;
  }

  .delete-btn:hover {
    color: var(--error);
  }

  .card-content {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 8px 0;
    line-height: 1.4;
  }

  .card-tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .tag {
    background: var(--bg-tertiary);
    color: var(--text-muted);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
  }
</style>
