# AI-Block Runtime

The first AI-Block runtime is a shell and sandbox boundary. The AI bar can still return real HTML AI-Blocks through the `compose_blocks` task and document patches. In-block editbar Regenerate is not wired yet.

AI result dialogs offer **Insert** (add at cursor or after the active block) and **Replace** (selection, highlighted block, or selected blocks) for document outcomes.

## Representation

AI-Blocks use one Tiptap node: `lociAIBlock`.

It is:

- `group: "block"`
- `atom: true`
- `isolating: true`
- `selectable: true`

The mirrored `LociBlock` type is `aiBlock`.

## Attrs

AI-Block attrs include:

- `id`
- `prompt`
- `sourceKind`
- `source`
- `artifact`
- `data`
- `status`
- `revision`
- `createdAt`
- `updatedAt`
- `error`

`sourceKind` starts with `placeholder` and `html`. Future kinds can include `reactSpec`, `terminal`, and `chart` after each runtime has its own sandbox and validation rules.

## Shell

Every AI-Block renders through the shared shell. The shell provides Loci spacing, typography, editbar actions, fallback UI, and content-driven sizing. The artifact renderer is a child module so future generated artifact production is isolated from the main editor files.

## HTML Sandbox

HTML artifacts render in an iframe `srcdoc` sandbox. The iframe allows scripts and forms, but it does not get `allow-same-origin`, top navigation, popups, cookies, local storage, React state, Tiptap DOM, or app-shell access.

The iframe can only talk to Loci through validated `postMessage` events:

- `height`: requests a clamped iframe height.
- `saveData`: requests a small JSON data save for the owning AI-Block.

Messages must come from the exact iframe `contentWindow` and include the per-render nonce.

## Composer Patches

The AI bar can return a validated document patch containing multiple operations. A patch may insert text blocks, structured blocks, and AI-Blocks in one action. Loci validates the patch, converts it into normal `LociBlock` records, then applies it through block operations.

## Persistence

AI-Blocks persist through normal Tiptap JSON and mirrored block normalization. Saved/reusable AI-Blocks are normal block content in this pass; a reusable block library can come later.
