<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    remove: void;
  }>();

  export let label: string = '';
  export let removable: boolean = true;
  export let variant: 'default' | 'primary' | 'success' | 'warning' | 'error' = 'default';
</script>

<div class="chip" class:variant>
  <span class="label">{label}</span>
  {#if removable}
    <button class="remove-btn" on:click={() => dispatch('remove')}>&times;</button>
  {/if}
</div>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    font-size: 13px;
  }

  .chip.variant {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }

  .label {
    color: var(--text-primary);
    font-weight: 500;
  }

  .remove-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 16px;
    padding: 0;
    line-height: 1;
  }

  .remove-btn:hover {
    color: var(--text-primary);
  }
</style>