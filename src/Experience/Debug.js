import { Pane } from 'tweakpane'

class Debug {
  constructor() {
    this.pane = null
    this.folders = new Map()
    this.isVisible = false
  }

  init() {
    if (this.pane) return this.pane

    this.pane = new Pane({ title: 'Debug' })
    this.pane.element.classList.add('debug-pane')
    this.setVisible(this.isVisible)
    return this.pane
  }

  setVisible(isVisible) {
    this.isVisible = isVisible
    if (!this.pane) return
    this.pane.element.style.display = isVisible ? 'block' : 'none'
  }

  getFolder(folderTitle) {
    this.init()
    if (this.folders.has(folderTitle)) {
      return this.folders.get(folderTitle)
    }

    const folder = this.pane.addFolder({ title: folderTitle, expanded: true })
    this.folders.set(folderTitle, folder)
    return folder
  }

  addBinding({ folderTitle, targetObject, property, label, options = {}, onChange }) {
    const folder = this.getFolder(folderTitle)
    const binding = folder.addBinding(targetObject, property, {
      label,
      ...options,
    })

    binding.on('change', (event) => {
      if (onChange) {
        onChange(event.value)
      }
    })

    return binding
  }

  dispose() {
    if (!this.pane) return
    this.pane.dispose()
    this.pane = null
    this.folders.clear()
  }
}

export { Debug }
