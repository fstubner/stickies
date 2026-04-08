<script lang="ts">
  import { cn } from '../../utils';

  interface $$Props extends HTMLAttributes<HTMLLabelElement> {
    class?: string;
  }

  let className = '';
  export { className as class };

  const finalClass = cn(
    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    className
  );
</script>

<label class={finalClass} {...$$restProps}>
  <slot />
</label>
