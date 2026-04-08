<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { cn } from '../../utils';

  interface $$Props extends DialogPrimitive.DescriptionProps {
    class?: string;
  }

  let className = '';
  export { className as class };

  const finalClass = cn('text-sm text-gray-500', className);
</script>

<p class={finalClass} {...$$restProps}>
  <slot />
</p>
