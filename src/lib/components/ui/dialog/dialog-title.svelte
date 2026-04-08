<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { cn } from '../../utils';

  interface $$Props extends DialogPrimitive.TitleProps {
    class?: string;
  }

  let className = '';
  export { className as class };

  const finalClass = cn('text-lg font-semibold leading-none tracking-tight', className);
</script>

<DialogPrimitive.Title class={finalClass} {...$$restProps}>
  <slot />
</DialogPrimitive.Title>
