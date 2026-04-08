<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { tags } from '../../stores/tags';

  const dispatch = createEventDispatcher<{
    select: { tagId: string };
  }>();

  export let selected: string[] = [];
  export let show: boolean = false;

  let filteredTags = $tags;

  function handleSelect(tagId: string) {
    if (!selected.includes(tagId)) {
      dispatch('select', { tagId });
    }
  }
</script>

{#if show}
  <div class="suggestions">
    <h4>Suggest Tags</h4>
    <div class="tags-grid">
      {#each filteredTags as tag (tag.id)}
        {#if !selected.includes(tag.id)}
          <button
            class="tag-btn"
            on:click={() => handleSelect(tag.id)}
            style="background-color: {tag.color || '#ccc'}"
          >
            {tag.name}
          </button>
        {/if}
      {/each}
    </div>
  </div>
{/if}

<style>
  .suggestions {
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 4px;
    margin-bottom: 12px;
  }

  .suggestions h4 {
    margin: 0 0 8px 0;
    color: var(--text-primary);
  }

  .tags-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag-btn {
    padding: 4px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: white;
    transition: all 0.2s ease;
  }

  .tag-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }
</style>