import type { AIBlockAttrs } from './aiBlocks'
import { AI_BLOCK_DATA_LIMIT, validateAIBlockAttrs } from './aiBlocks'

export const aiBlockSandboxEventTypes = new Set([
  'beforeinput',
  'input',
  'keydown',
  'keyup',
  'keypress',
  'paste',
  'copy',
  'cut',
  'drop',
  'dragstart',
  'dragover',
  'pointerdown',
  'pointermove',
  'pointerup',
  'mousedown',
  'mouseup',
  'click',
  'dblclick',
])

function button(label: string, action: string) {
  const element = document.createElement('button')
  element.type = 'button'
  element.textContent = label
  element.dataset.aiBlockAction = action
  element.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
  })
  return element
}

function dispatchAIBlockAction(id: string, action: string) {
  window.dispatchEvent(new CustomEvent('loci-ai-block-action', {
    detail: { id, action },
  }))
}

function createSandboxSrcdoc(attrs: AIBlockAttrs, nonce: string) {
  if (attrs.artifact.kind !== 'html') return ''
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<style>',
    'html,body{margin:0;min-height:0;background:transparent;color:#1A1A1A;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
    '*,*::before,*::after{box-sizing:border-box;}',
    'button,input,textarea,select{font:inherit;}',
    '</style>',
    '</head>',
    '<body>',
    attrs.artifact.html,
    '<script>',
    `const __LOCI_AI_BLOCK_NONCE__=${JSON.stringify(nonce)};`,
    'function __lociPost(type,payload){parent.postMessage({source:"loci-ai-block",nonce:__LOCI_AI_BLOCK_NONCE__,type,payload},"*");}',
    'function __lociHeight(){__lociPost("height",{height:Math.ceil(document.documentElement.scrollHeight||document.body.scrollHeight||240)});}',
    'window.LociAIBlock={saveData(data){__lociPost("saveData",{data});},resize:__lociHeight};',
    'addEventListener("load",()=>{__lociHeight();setTimeout(__lociHeight,50);setTimeout(__lociHeight,250);});',
    'new ResizeObserver(__lociHeight).observe(document.documentElement);',
    '</script>',
    '</body>',
    '</html>',
  ].join('')
}

export function isAIBlockBridgeMessage(message: unknown, nonce: string) {
  return Boolean(
    message &&
    typeof message === 'object' &&
    (message as { source?: unknown }).source === 'loci-ai-block' &&
    (message as { nonce?: unknown }).nonce === nonce,
  )
}

type AIBlockShellElement = HTMLElement & { __lociAIBlockCleanup?: () => void }

function renderHtmlArtifact(host: HTMLElement, attrs: AIBlockAttrs): (() => void) | null {
  if (attrs.artifact.kind !== 'html') return null
  const frame = document.createElement('iframe')
  const nonce = `${attrs.id}:${Math.random().toString(36).slice(2)}`
  frame.className = 'loci-ai-block-frame'
  frame.title = attrs.artifact.title
  frame.sandbox.add('allow-scripts')
  frame.sandbox.add('allow-forms')
  frame.srcdoc = createSandboxSrcdoc(attrs, nonce)
  frame.style.height = '240px'

  const onMessage = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow) return
    const message = event.data
    if (!isAIBlockBridgeMessage(message, nonce)) return
    if (message.type === 'height') {
      const height = Number(message.payload?.height)
      if (Number.isFinite(height)) frame.style.height = `${Math.max(80, Math.min(1600, Math.ceil(height)))}px`
    }
    if (message.type === 'saveData') {
      const data = message.payload?.data
      let dataSize: number
      try {
        dataSize = JSON.stringify(data).length
      } catch {
        return
      }
      if (data && typeof data === 'object' && !Array.isArray(data) && dataSize <= AI_BLOCK_DATA_LIMIT) {
        window.dispatchEvent(new CustomEvent('loci-ai-block-data', {
          detail: { id: attrs.id, data },
        }))
      }
    }
  }
  window.addEventListener('message', onMessage)
  frame.addEventListener('load', () => frame.dataset.ready = 'true')
  host.append(frame)
  return () => window.removeEventListener('message', onMessage)
}

function renderArtifact(host: HTMLElement, attrs: AIBlockAttrs): (() => void) | null {
  const htmlCleanup = renderHtmlArtifact(host, attrs)
  if (htmlCleanup) return htmlCleanup

  const artifact = document.createElement('div')
  artifact.className = 'loci-ai-block-artifact'
  artifact.dataset.aiBlockSandbox = 'true'

  const title = document.createElement('strong')
  title.textContent = attrs.artifact.title

  const body = document.createElement('p')
  body.textContent = attrs.status === 'ready'
    ? attrs.artifact.kind === 'placeholder' ? attrs.artifact.body : attrs.artifact.title
    : attrs.error || 'AI-Block unavailable.'

  const sampleControl = document.createElement('button')
  sampleControl.type = 'button'
  sampleControl.textContent = 'Sandbox interaction'
  sampleControl.setAttribute('aria-label', 'Sandbox interaction test')
  sampleControl.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    const count = Number(sampleControl.dataset.count ?? 0) + 1
    sampleControl.dataset.count = String(count)
    sampleControl.textContent = `Sandbox interaction ${count}`
  })

  artifact.append(title, body, sampleControl)
  host.append(artifact)
  return null
}

export function renderAIBlockShell(dom: HTMLElement, attrs: unknown) {
  const shellDom = dom as AIBlockShellElement
  shellDom.__lociAIBlockCleanup?.()
  shellDom.__lociAIBlockCleanup = undefined
  const validation = validateAIBlockAttrs(attrs)
  const safe = validation.attrs
  const ready = validation.ok && safe.status === 'ready'

  dom.className = `loci-ai-block ${ready ? '' : 'is-invalid'}`.trim()
  dom.dataset.lociAiBlock = 'true'
  dom.dataset.aiBlockId = safe.id
  dom.replaceChildren()

  const shell = document.createElement('div')
  shell.className = 'loci-ai-block-shell'

  const header = document.createElement('div')
  header.className = 'loci-ai-block-header'

  const label = document.createElement('span')
  label.className = 'loci-ai-block-label'
  label.textContent = `AI-Block · ${safe.sourceKind} · r${safe.revision}`

  const editbar = document.createElement('div')
  editbar.className = 'loci-ai-block-editbar'
  editbar.setAttribute('aria-label', 'AI-Block actions')
  const edit = button('Edit', 'edit')
  const regenerate = button('Regenerate', 'regenerate')
  const duplicate = button('Duplicate', 'duplicate')
  const save = button('Save', 'save')
  ;[edit, regenerate, duplicate, save].forEach((item) => {
    item.addEventListener('click', () => dispatchAIBlockAction(safe.id, item.dataset.aiBlockAction ?? ''))
  })
  editbar.append(edit, regenerate, duplicate, save)

  header.append(label, editbar)
  shell.append(header)
  shellDom.__lociAIBlockCleanup = renderArtifact(shell, safe) ?? undefined
  dom.append(shell)
}

export function shouldStopAIBlockEvent(event: Event) {
  return aiBlockSandboxEventTypes.has(event.type)
}
