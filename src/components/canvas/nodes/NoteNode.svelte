<script lang="ts">
  import type { Note } from '../../../types/Note';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    select: { id: string };
    hover: { id: string };
    move: { id: string; x: number; y: number };
  }>();

  export let note: Note;
  export let selected = false;
  export let hover = false;

  let x = note.metadata?.canvasX || Math.random() * 1000;
  let y = note.metadata?.canvasY || Math.random() * 1000;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      isDragging = true;
      dragOffset = { x: e.clientX - x, y: e.clientY - y };
      dispatch('select', { id: note.id });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      x = e.clientX - dragOffset.x;
      y = e.clientY - dragOffset.y;
      dispatch('move', { id: note.id, x, y });
    }
  };

  const handleMouseUp = () => {
    isDragging = false;
  };
</script>

<g
  class="note-node"
  class:selected
  class:hover
  transform="translate({x}, {y})"
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  on:mouseleave={handleMouseUp}
>
  <rect width="200" height="150" rx="8" class="node-bg" />
  <text x="10" y="25" class="node-title">{note.title}</text>
  <text x="10" y="130" class="node-preview">{note.content?.substring(0, 50)}...</text>
</g>

<style>
  .note-node {
    cursor: move;
  }

  .node-bg {
    fill: var(--bg-secondary);
    stroke: var(--border-color);
    stroke-width: 2;
    transition: all 0.2s ease;
  }

  .note-node.selected .node-bg {
    stroke: var(--accent);
    stroke-width: 3;
  }

  .note-node.hover .node-bg {
    fill: var(--bg-tertiary);
  }

  .node-title {
    font-weight: bold;
    font-size: 14px;
    fill: var(--text-primary);
  }

  .node-preview {
    font-size: 12px;
    fill: var(--text-muted);
  }
</style>
