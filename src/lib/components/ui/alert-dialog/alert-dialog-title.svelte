<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';

  let className = '';
  export { className as class };
</script>

<h2 class={`text-lg font-semibold ${className}`}>
  <slot />
</h2>
