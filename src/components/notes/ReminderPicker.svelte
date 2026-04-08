<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    select: { date: string; time: string };
  }>();

  let selectedDate = '';
  let selectedTime = '';

  const presets = [
    { label: 'In 5 minutes', offset: 5 },
    { label: 'In 15 minutes', offset: 15 },
    { label: 'In 1 hour', offset: 60 },
    { label: 'In 2 hours', offset: 120 },
    { label: 'Tomorrow', offset: 1440 },
    { label: 'Next week', offset: 10080 },
  ];

  function handlePreset(offset: number) {
    const now = new Date();
    const reminder = new Date(now.getTime() + offset * 60000);
    dispatch('select', {
      date: reminder.toISOString().split('T')[0],
      time: reminder.toISOString().split('T')[1].substring(0, 5),
    });
  }

  function handleCustom() {
    if (selectedDate && selectedTime) {
      dispatch('select', { date: selectedDate, time: selectedTime });
    }
  }
</script>

<div class="reminder-picker">
  <h4>Set Reminder</h4>
  <div class="presets">
    {#each presets as preset (preset.label)}
      <button on:click={() => handlePreset(preset.offset)}>
        {preset.label}
      </button>
    {/each}
  </div>
  <div class="custom">
    <input type="date" bind:value={selectedDate} />
    <input type="time" bind:value={selectedTime} />
    <button on:click={handleCustom}>Set Custom</button>
  </div>
</div>

<style>
  .reminder-picker {
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 4px;
  }

  .reminder-picker h4 {
    margin: 0 0 12px 0;
  }

  .presets {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }

  .presets button {
    padding: 8px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .custom {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .custom input {
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .custom button {
    padding: 8px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>