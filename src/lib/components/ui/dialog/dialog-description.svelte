<script lang="ts">
  import { cn } from "$lib/utils";
  import * as Dialog from "bits-ui";

  type $$Props = Dialog.DialogDescriptionProps;

  let className: $$Props["class"] = undefined;
  export { className as class };
</script>

<Dialog.Description class={cn("text-sm text-muted-foreground", className)}>
  <slot />
</Dialog.Description>
