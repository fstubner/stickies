<script lang="ts">
  import { noteService } from '../../services/noteService';
  import { notes } from '../../stores/notes';
  import type { Note } from '../../types/Note';

  export let noteId: string;

  let relatedNotes: Note[] = [];
  let loading = false;

  async function loadRelated() {
    loading = true;
    try {
      const note = $notes.find(n => n.id === noteId);
      if (note && note.relatedIds && note.relatedIds.length > 0) {
        relatedNotes = note.relatedIds
          .map(id => $notes.find(n => n.id === id))
          .filter((n): n is Note => !!n);
      }
    } finally {
      loading = false;
    }
  }

  $: if (noteId) {
    loadRelated();
  }
</script>

<div class="related-notes">
  <h4>Related Notes ({relatedNotes.length})</h4>
  {#if loading}
    <p>Loading...</p>
  {:else if relatedNotes.length === 0}
    <p class="empty">No related notes found</p>
  {:else}
    <div class="related-list">
      {#each relatedNotes as note (note.id)}
        <a href="#" class="related-item">
          <span class="title">{note.title}</span>
          <span class="preview">{note.content?.substring(0, 50)}...</span>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  .related-notes {
    padding: 16px 0;
    border-top: 1px solid var(--border-color);
  }

  .related-notes h4 {
    margin: 0 0 12px 0;
    color: var(--text-primary);
  }

  .empty {
    color: var(--text-muted);
    font-size: 14px;
  }

  .related-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .related-item {
    display: flex;
    flex-direction: column;
    padding: 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .related-item:hover {
    background: var(--bg-tertiary);
    border-color: var(--accent);
  }

  .title {
    color: var(--accent);
    font-weight: 600;
    font-size: 14px;
  }

  .preview {
    color: var(--text-muted);
    font-size: 12px;
    margin-top: 4px;
  }
</style>