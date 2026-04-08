<script lang="ts">
  import { cn } from '../../utils';

  interface $$Props extends Omit<HTMLTextAreaElement, ''> {
    class?: string;
  }

  let className = '';
  export { className as class };

  const finalClass = cn(
    'flex min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2',
    className
  );
</script>

<textarea class={finalClass} {...$$restProps} />
