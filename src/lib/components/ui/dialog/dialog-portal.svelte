<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { onMount } from 'svelte';

  interface $$Props extends DialogPrimitive.PortalProps {}

  let mounted = false;

  onMount(() => {
    mounted = true;
  });
</script>

{#if mounted}
  <DialogPrimitive.Portal {...$$restProps}>
    <slot />
  </DialogPrimitive.Portal>
{/if}
