<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { cn } from '../../utils';
  import DialogOverlay from './dialog-overlay.svelte';
  import DialogPortal from './dialog-portal.svelte';

  interface $$Props extends DialogPrimitive.ContentProps {
    class?: string;
  }

  let className = '';
  export { className as class };

  const finalClass = cn(
    'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white shadow-lg',
    className
  );
</script>

<DialogPortal>
  <DialogOverlay />
  <div class={finalClass} {...$$restProps}>
    <slot />
  </div>
</DialogPortal>
