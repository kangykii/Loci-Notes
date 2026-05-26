# AI-Block Rules

AI-Blocks are sandboxed mini-documents inside a Loci document. They may become generated HTML artifacts, interactive models, charts, terminals, simulations, or tools, but they still behave like normal Loci blocks.

## Rule 0

Tiptap owns the main document.

An AI-Block can own its inner artifact, but it cannot own editor selection, block order, history, clipboard, drag/drop, persistence, or global keyboard behavior. Anything that affects the main document must go through an explicit Loci editor command.

## Block Behavior

Every AI-Block must:

- Be a native Tiptap block.
- Be movable through the normal block handle.
- Be selectable, deletable, duplicable, and restorable like other blocks.
- Have an edit/action surface for edit, regenerate, inspect source, and save/reuse workflows.
- Save and reopen as normal note content.
- Size from its content by default, not from a fixed embedded viewport.

## Sandbox Boundary

The artifact inside an AI-Block must not leak events or DOM writes into the editor.

- Sandbox pointer, keyboard, input, paste, drag, and clipboard events stop at the AI-Block boundary unless Loci intentionally routes them.
- Raw generated code cannot directly mutate ProseMirror DOM.
- Loci provides the artifact shell and design constraints.
- Invalid artifacts render a safe fallback.
- Coded HTML artifacts run in sandboxed iframes without same-origin access to the editor.

Privileged runtimes, such as a Python terminal inside a block, require a separate security/runtime pass.

## Future Atoms

Atoms may later link blocks to blocks, not only words to definitions. This implementation does not change Atom schemas yet, but AI-Block IDs and metadata should be stable enough to support that direction.
