<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  function handleComplete() {
    dispatch('complete');
  }
</script>

<div class="onboarding">
  <h1>Welcome to Stickies</h1>
  <p>Let's get you started with creating your first note.</p>
  <button on:click={handleComplete}>Get Started</button>
</div>

<style>
  .onboarding {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    padding: var(--space-8);
    text-align: center;
  }
  button {
    margin-top: var(--space-4);
    padding: var(--space-3) var(--space-6);
    background: var(--accent);
    color: white;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
  }
</style>