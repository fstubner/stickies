<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { HANDLE_COLORS } from '../../../utils/canvasValidation';
  import { Icon } from '../../ui';
  import { activeWorkspace } from '../../stores/workspaces';
  import { tags } from '../../stores/tags';
  import { notes } from '../../stores/notes';
  import LinkPicker from './LinkPicker.svelte';
  import MarkdownToolbar from './MarkdownToolbar.svelte';
  import TagSuggestions from './TagSuggestions.svelte';
  import RelatedNotes from './RelatedNotes.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import type { Note } from '../../types/Note';
  import type { Tag, NoteLink } from '../../types';

  // Delete confirmation dialog state
  let showDeleteConfirm = false;

  const dispatch = createEventDispatcher<{
    save: { updates: Partial<Note> };
    close: void;
    delete: void;
    popout: void;
  }>();

  let isClosing = false;

  export let note: Note;
  export let isOpen = false;

  let noteDetailClassApplied = false;

  function syncNoteDetailClass(open: boolean) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (open && !noteDetailClassApplied) {
      root.classList.add('note-detail-open');
      noteDetailClassApplied = true;
    } else if (!open && noteDetailClassApplied) {
      root.classList.remove('note-detail-open');
      noteDetailClassApplied = false;
    }
  }

  $: syncNoteDetailClass(isOpen);

  onDestroy(() => {
    if (typeof document !== 'undefined' && noteDetailClassApplied) {
      document.documentElement.classList.remove('note-detail-open');
    }
  });

  let editedTitle = '';
  let editedContent = '';
  let editedStatusId = '';
  let editedPriorityId = '';
  let editedDueDate = '';
  let editedTagIds: string[] = [];
  let editedLinks: NoteLink[] = [];

  // Properties and state
  let showLinkPicker = false;
  let showTagSuggestions = false;
  let currentLinkInput = '';
  let showMarkdownToolbar = false;

  // Initialize when note changes
  $: if (note && isOpen) {
    editedTitle = note.title || '';
    editedContent = note.content || '';
    editedStatusId = note.statusId || '';
    editedPriorityId = note.priorityId || '';
    editedDueDate = note.dueDate || '';
    editedTagIds = note.tagIds || [];
    editedLinks = note.links || [];
  }

  function handleSave() {
    const updates: Partial<Note> = {
      title: editedTitle,
      content: editedContent,
      statusId: editedStatusId,
      priorityId: editedPriorityId,
      dueDate: editedDueDate,
      tagIds: editedTagIds,
      links: editedLinks,
    };
    dispatch('save', { updates });
  }

  function handleClose() {
    isClosing = true;
    setTimeout(() => {
      dispatch('close');
      isClosing = false;
    }, 200);
  }

  function handleDelete() {
    showDeleteConfirm = true;
  }

  function confirmDelete() {
    showDeleteConfirm = false;
    dispatch('delete');
  }

  function handlePopout() {
    dispatch('popout');
  }

  function addLink(url: string) {
    editedLinks = [...editedLinks, { id: Date.now().toString(), url, title: url }];
    showLinkPicker = false;
    currentLinkInput = '';
  }

  function removeLink(id: string) {
    editedLinks = editedLinks.filter(l => l.id !== id);
  }
</script>

<div class="note-detail" class:closing={isClosing} class:open={isOpen}>
  <div class="detail-header">
    <div class="header-actions">
      <button class="btn-icon" title="Pop out" on:click={handlePopout}>
        <Icon name="external" />
      </button>
      <button class="btn-icon" title="Close" on:click={handleClose}>
        <Icon name="close" />
      </button>
    </div>
  </div>

  <div class="detail-content">
    <input
      type="text"
      placeholder="Title"
      bind:value={editedTitle}
      class="title-input"
    />

    <MarkdownToolbar
      bind:content={editedContent}
      show={showMarkdownToolbar}
      on:toggle={() => (showMarkdownToolbar = !showMarkdownToolbar)}
    />

    <textarea
      placeholder="Content"
      bind:value={editedContent}
      class="content-textarea"
    />

    <div class="tags-section">
      <TagSuggestions
        bind:selected={editedTagIds}
        show={showTagSuggestions}
        on:select={(e) => {
          editedTagIds = [...editedTagIds, e.detail.tagId];
          showTagSuggestions = false;
        }}
      />
    </div>

    <div class="links-section">
      <h4>Links</h4>
      {#each editedLinks as link (link.id)}
        <div class="link-item">
          <a href={link.url} target="_blank">{link.title}</a>
          <button on:click={() => removeLink(link.id)}>Remove</button>
        </div>
      {/each}
      <button on:click={() => (showLinkPicker = true)}>Add Link</button>
      {#if showLinkPicker}
        <LinkPicker on:select={(e) => addLink(e.detail.url)} />
      {/if}
    </div>

    <RelatedNotes noteId={note.id} />
  </div>

  <div class="detail-footer">
    <button class="btn-secondary" on:click={handleDelete}>Delete</button>
    <button class="btn-primary" on:click={handleSave}>Save</button>
  </div>

  {#if showDeleteConfirm}
    <ConfirmDialog
      title="Delete Note?"
      message="This action cannot be undone."
      onConfirm={confirmDelete}
      onCancel={() => (showDeleteConfirm = false)}
    />
  {/if}
</div>

<style>
  .note-detail {
    position: fixed;
    right: 0;
    top: 0;
    width: 400px;
    height: 100vh;
    background: var(--bg-primary);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    z-index: 100;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  }

  .note-detail.open {
    transform: translateX(0);
  }

  .note-detail.closing {
    transform: translateX(100%);
  }

  .detail-header {
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: flex-end;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .detail-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .title-input {
    width: 100%;
    padding: 8px;
    margin-bottom: 16px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 18px;
    font-weight: 600;
  }

  .content-textarea {
    width: 100%;
    padding: 8px;
    min-height: 200px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    margin-bottom: 16px;
    resize: vertical;
  }

  .tags-section,
  .links-section {
    margin-bottom: 16px;
  }

  .link-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background: var(--bg-secondary);
    border-radius: 4px;
    margin-bottom: 4px;
  }

  .detail-footer {
    padding: 16px;
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .btn-primary,
  .btn-secondary {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 14px;
  }

  .btn-primary {
    background: var(--accent);
    color: white;
  }

  .btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 4px;
  }

  .btn-icon:hover {
    color: var(--text-primary);
  }
</style>