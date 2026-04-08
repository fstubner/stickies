<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
  import { cn } from '../../utils';
  import { getContext } from 'svelte';

  interface Context {
    open: boolean;
  }

  const { open } = getContext<Context>('alertDialog');
</script>

{#if $open}
  <div class="fixed inset-0 z-50 bg-black/50" />
{/if}
