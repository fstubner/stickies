<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { cn } from '../../utils';

  interface $$Props extends DialogPrimitive.OverlayProps {
    class?: string;
  }

  let className = '';
  export { className as class };

  const finalClass = cn(
    'fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out',
    className
  );
</script>

<div class={finalClass} {...$$restProps} />
