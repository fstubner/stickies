<script lang="ts">
  import type { Note } from '../../types/Note';
  import { getContext } from 'svelte';
  import NoteNode from './nodes/NoteNode.svelte';
  import SemanticEdge from './edges/SemanticEdge.svelte';
  import { onMount } from 'svelte';

  // Canvas context setup
  const canvas = getContext('canvas') || {};
  export let notes: Note[] = [];
  export let selectedNotes: Set<string> = new Set();
  export let hoverNote: string | null = null;

  let canvasElement: SVGElement;
  let transform = { x: 0, y: 0, scale: 1 };
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  const GRID_SIZE = 20;

  onMount(() => {
    // Initialize canvas with pan/zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scale = transform.scale - e.deltaY * 0.001;
      transform.scale = Math.max(0.1, Math.min(5, scale));
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
        isDragging = true;
        dragStart = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        transform.x += e.clientX - dragStart.x;
        transform.y += e.clientY - dragStart.y;
        dragStart = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    canvasElement?.addEventListener('wheel', handleWheel, { passive: false });
    canvasElement?.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvasElement?.removeEventListener('wheel', handleWheel);
      canvasElement?.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });
</script>

<svg
  bind:this={canvasElement}
  class="canvas"
  on:contextmenu|preventDefault
>
  <!-- Grid background -->
  <defs>
    <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
      <path d="M {GRID_SIZE} 0 L 0 0 0 {GRID_SIZE}" fill="none" stroke="var(--border-color)" stroke-width="0.5" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" />

  <!-- Edges between related notes -->
  <g class="edges">
    {#each notes as note (note.id)}
      {#if note.relatedIds && note.relatedIds.length > 0}
        {#each note.relatedIds as relatedId (relatedId)}
          <SemanticEdge {note} targetId={relatedId} />
        {/each}
      {/if}
    {/each}
  </g>

  <!-- Note nodes -->
  <g class="nodes" transform="translate({transform.x}, {transform.y}) scale({transform.scale})">
    {#each notes as note (note.id)}
      <NoteNode
        {note}
        selected={selectedNotes.has(note.id)}
        hover={hoverNote === note.id}
        on:select
        on:hover
        on:move
      />
    {/each}
  </g>
</svg>

<style>
  .canvas {
    width: 100%;
    height: 100%;
    background-color: var(--bg-primary);
    cursor: grab;
  }

  .canvas:active {
    cursor: grabbing;
  }
</style>
