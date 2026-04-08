<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    snooze: { minutes: number };
  }>();

  const options = [
    { label: '5 minutes', minutes: 5 },
    { label: '15 minutes', minutes: 15 },
    { label: '1 hour', minutes: 60 },
    { label: '4 hours', minutes: 240 },
    { label: '1 day', minutes: 1440 },
    { label: '3 days', minutes: 4320 },
    { label: '1 week', minutes: 10080 },
  ];

  let open = false;

  function toggle() {
    open = !open;
  }

  function snooze(minutes: number) {
    dispatch('snooze', { minutes });
    open = false;
  }
</script>

<div class="snooze-menu">
  <button class="menu-button" on:click={toggle}>
    {open ? 'Hide' : 'Snooze'}
  </button>
  {#if open}
    <div class="menu-options">
      {#each options as option (option.minutes)}
        <button class="menu-item" on:click={() => snooze(option.minutes)}>
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .snooze-menu {
    position: relative;
  }

  .menu-button {
    padding: 4px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-primary);
  }

  .menu-button:hover {
    background: var(--bg-tertiary);
  }

  .menu-options {
    position: absolute;
    top: 100%;
    right: 0;
    min-width: 150px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    margin-top: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }

  .menu-item {
    display: block;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text-primary);
    font-size: 13px;
  }

  .menu-item:hover {
    background: var(--bg-tertiary);
  }

  .menu-item:first-child {
    border-radius: 4px 4px 0 0;
  }

  .menu-item:last-child {
    border-radius: 0 0 4px 4px;
  }
</style>