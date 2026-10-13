class Label {
  constructor(gallery) {
    this.gallery = gallery
    this.overlayElement = null
    this.activePlaneIndex = -1
  }

  init() {
    if (this.overlayElement) return
    this.overlayElement = document.createElement('section')
    this.overlayElement.className = 'plane-label-overlay'
    this.overlayElement.setAttribute('aria-live', 'polite')
    this.overlayElement.innerHTML = `
      <div class="plane-label-overlay__left">
        <p class="plane-label-overlay__index"></p>
        <p class="plane-label-card__word"></p>
        <span class="plane-label-overlay__chip" aria-hidden="true"></span>
      </div>`
    this.indexElement = this.overlayElement.querySelector('.plane-label-overlay__index')
    this.wordElement = this.overlayElement.querySelector('.plane-label-card__word')
    this.chipElement = this.overlayElement.querySelector('.plane-label-overlay__chip')
    document.body.append(this.overlayElement)
  }

  resize() {}

  update(camera) {
    if (!camera || !this.overlayElement) return
    const blend = this.gallery.getPlaneBlendData(camera.position.z)
    if (!blend) {
      this.wordElement.textContent = '图库中没有可用图片'
      return
    }
    const index = blend.blend >= 0.5 ? blend.nextPlaneIndex : blend.currentPlaneIndex
    const plane = this.gallery.planes[index]
    if (index !== this.activePlaneIndex) {
      this.indexElement.textContent = `${String(index + 1).padStart(2, '0')} / ${this.gallery.planes.length}`
      this.wordElement.textContent = plane.userData.label.word
      this.activePlaneIndex = index
    }
    this.chipElement.style.backgroundColor = plane.userData.accentColor
  }

  render() {}

  dispose() {
    this.overlayElement?.remove()
    this.overlayElement = null
    this.activePlaneIndex = -1
  }
}

export { Label }
