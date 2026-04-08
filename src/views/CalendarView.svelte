<script lang="ts">
  import { calendarService } from '../services';

  let events: any[] = [];

  async function loadEvents() {
    events = await calendarService.getUpcomingEvents();
  }

  loadEvents();
</script>

<div class="calendar-view">
  <h1>Calendar</h1>
  <div class="events">
    {#each events as event}
      <div class="event-item">{event.title}</div>
    {/each}
  </div>
</div>

<style>
  .calendar-view { padding: var(--space-4); }
  .event-item { padding: var(--space-2); border: 1px solid var(--border-color); margin: var(--space-2) 0; }
</style>