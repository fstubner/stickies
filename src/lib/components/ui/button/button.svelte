<script lang="ts">
  import { Button as ButtonPrimitive } from 'bits-ui';
  import { cn } from '../../utils';

  interface $$Props extends ButtonPrimitive.Props {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    class?: string;
  }

  export let variant: $$Props['variant'] = 'primary';
  export let size: $$Props['size'] = 'md';
  let className = '';
  export { className as class };

  const variantStyles = {
    primary: 'bg-accent text-white hover:bg-accent/90',
    secondary: 'bg-bg-tertiary hover:bg-bg-hover',
    outline: 'border border-border-color hover:bg-bg-hover',
    ghost: 'hover:bg-bg-hover'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const finalClass = cn(
    'inline-flex items-center justify-center font-medium rounded transition-colors',
    variantStyles[variant],
    sizeStyles[size],
    className
  );
</script>

<button class={finalClass} {...$$restProps}>
  <slot />
</button>
