<script lang="ts">
  import { activityStore } from '../stores';

  const activity = activityStore;
</script>

<div class="activity-view">
  <h1>Activity</h1>
  {#each $activity as item}
    <div class="activity-item">
      <span class="type">{item.type}</span>
      <span class="description">{item.description}</span>
      <span class="time">{new Date(item.timestamp).toLocaleString()}</span>
    </div>
  {:else}
    <p>No activity yet</p>
  {/each}
</div>

<style>
  .activity-view { padding: var(--space-4); }
  .activity-item {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-2);
    border-bottom: 1px solid var(--border-color);
  }
  .type { font-weight: 600; }
  .time { color: var(--text-muted); font-size: var(--text-sm); }
</style>