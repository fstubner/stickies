<script lang="ts">
  import { settings } from '../stores';
</script>

<div class="settings">
  <h1>Settings</h1>
  <div class="setting-group">
    <label>
      <span>Theme</span>
      <select bind:value={$settings.theme}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  </div>
</div>

<style>
  .settings { padding: var(--space-4); }
  .setting-group { margin-bottom: var(--space-4); }
  label { display: flex; align-items: center; gap: var(--space-2); }
  select { padding: var(--space-2); border: 1px solid var(--border-color); border-radius: var(--radius); }
</style>