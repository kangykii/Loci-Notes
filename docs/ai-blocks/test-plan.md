# AI-Block Test Plan

## Automated Tests

- `blockTypeForNode` returns `aiBlock` for `lociAIBlock`.
- `blankBlockNode("aiBlock")` returns a valid AI-Block document.
- AI-Block attrs validate and fail closed for unsupported artifacts.
- `contentFromBlocks` serializes AI-Blocks as normal Tiptap JSON.
- `normalizeBlocksForContent` preserves AI-Block identity and content.
- Preview helpers produce safe text for valid and invalid AI-Blocks.
- Composer patches parse into multiple valid block operations.
- HTML artifact iframe messages validate source and nonce.

## Manual Smoke Checks

- Insert text before and after an AI-Block.
- Select the AI-Block as a node.
- Move it with block handles.
- Delete it and undo the deletion.
- Save, reopen, and confirm it remains stable.
- Confirm the editbar is visible and sandbox events do not type into the editor.
- Confirm the artifact grows with content and does not act like a fixed-height iframe.
- Insert a mixed AI composer result: heading, paragraph, AI-Block, summary.
- Confirm broken HTML only breaks inside the AI-Block.

## Regression Checks

- `npm test`
- `npm run build`
- `npm run lint`
- Editor smoke for focus mode, block gutter controls, floating toolbar, and note persistence.
