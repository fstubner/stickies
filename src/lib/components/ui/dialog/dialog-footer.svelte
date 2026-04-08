<script lang="ts">
  let className = '';
  export { className as class };
</script>

<div class={`flex justify-end gap-2 ${className}`}>
  <slot />
</div>
