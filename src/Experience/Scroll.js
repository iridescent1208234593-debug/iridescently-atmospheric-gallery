import * as THREE from 'three'

class Scroll {
  constructor(camera, gallery, debug = null) {
    this.isInitialized = false
    this.isDebugBound = false
    this.camera = camera
    this.gallery = gallery
    this.debug = debug

    // Scroll state
    this.scrollTarget = 0
    this.scrollCurrent = 0
    this.scrollSmoothing = 0.08
    this.scrollToWorldFactor = 0.01
    this.wheelScrollSpeed = 1
    this.touchScrollSpeed = 1.8
    this.previousScrollCurrent = 0
    this.invertScroll = false

    // Velocity
    this.rawVelocity = 0
    this.velocity = 0
    this.velocityDamping = 0.12
    this.velocityMax = 1.5
    this.velocityStopThreshold = 0.0001

    // Bounds
    this.useScrollBounds = true
    this.firstPlaneViewOffset = 5
    this.lastPlaneViewOffset = 5
    this.minCameraZ = -Infinity
    this.maxCameraZ = Infinity
    this.cameraStartZ = this.camera.position.z

    // Debug UI
    this.showVelocityVisualizer = true
    this.debugUiVisible = false
    this.touchY = 0
    this.velocityVisualizerElement = null
    this.velocityVisualizerFillElement = null
    this.velocityVisualizerValueElement = null

    // Input events
    this.onWheel = (event) => {
      event.preventDefault()
      const normalizedWheelDelta = this.normalizeWheelDelta(event) * this.wheelScrollSpeed
      this.addScrollInput(normalizedWheelDelta)
    }
    this.onTouchStart = (event) => {
      this.touchY = event.touches[0]?.clientY ?? 0
    }
    this.onTouchMove = (event) => {
      event.preventDefault()
      const currentTouchY = event.touches[0]?.clientY ?? this.touchY
      const deltaY = this.touchY - currentTouchY
      this.addScrollInput(deltaY * this.touchScrollSpeed)
      this.touchY = currentTouchY
    }
  }

  init() {
    if (this.isInitialized) return

    this.updateCameraBounds()
    this.cameraStartZ = this.maxCameraZ
    this.camera.position.z = this.cameraStartZ
    this.scrollTarget = 0
    this.scrollCurrent = 0
    this.previousScrollCurrent = this.scrollCurrent
    this.rawVelocity = 0
    this.velocity = 0
    this.createVelocityVisualizer()
    this.updateVelocityVisualizer()
    this.bindDebug()

    this.isInitialized = true
  }

  bindEvents() {
    window.addEventListener('wheel', this.onWheel, { passive: false })
    window.addEventListener('touchstart', this.onTouchStart, { passive: true })
    window.addEventListener('touchmove', this.onTouchMove, { passive: false })
  }

  updateCameraBounds() {
    const depthRange = this.gallery.getDepthRange()
    this.maxCameraZ = depthRange.nearestZ + this.firstPlaneViewOffset
    this.minCameraZ = depthRange.deepestZ + this.lastPlaneViewOffset

    if (this.minCameraZ > this.maxCameraZ) {
      this.minCameraZ = this.maxCameraZ
    }
  }

  cameraZFromScroll(scrollAmount) {
    return this.cameraStartZ - scrollAmount * this.scrollToWorldFactor
  }

  scrollFromCameraZ(cameraZ) {
    if (this.scrollToWorldFactor === 0) return 0
    return (this.cameraStartZ - cameraZ) / this.scrollToWorldFactor
  }

  normalizeWheelDelta(event) {
    if (event.deltaMode === 1) return event.deltaY * 16
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight
    return event.deltaY
  }

  addScrollInput(deltaY) {
    const scrollDirection = this.invertScroll ? -1 : 1
    this.scrollTarget += deltaY * scrollDirection
  }

  updateVelocity() {
    this.rawVelocity = this.scrollCurrent - this.previousScrollCurrent
    this.velocity = THREE.MathUtils.lerp(this.velocity, this.rawVelocity, this.velocityDamping)
    this.velocity = THREE.MathUtils.clamp(this.velocity, -this.velocityMax, this.velocityMax)

    if (Math.abs(this.velocity) < this.velocityStopThreshold) {
      this.velocity = 0
    }

    this.previousScrollCurrent = this.scrollCurrent
  }

  createVelocityVisualizer() {
    if (this.velocityVisualizerElement) return

    const container = document.createElement('div')
    container.className = 'velocity-visualizer'

    const label = document.createElement('p')
    label.className = 'velocity-visualizer__label'
    label.textContent = 'Velocity'

    const value = document.createElement('p')
    value.className = 'velocity-visualizer__value'
    value.textContent = '0.0000'

    const track = document.createElement('div')
    track.className = 'velocity-visualizer__track'

    const fill = document.createElement('div')
    fill.className = 'velocity-visualizer__fill'
    track.append(fill)

    container.append(label, value, track)
    document.body.append(container)

    this.velocityVisualizerElement = container
    this.velocityVisualizerFillElement = fill
    this.velocityVisualizerValueElement = value
    this.setVelocityVisualizerVisible(this.showVelocityVisualizer)
  }

  setVelocityVisualizerVisible(isVisible) {
    if (!this.velocityVisualizerElement) return
    const shouldShow = Boolean(isVisible) && this.debugUiVisible
    this.velocityVisualizerElement.style.display = shouldShow ? 'block' : 'none'
  }

  setDebugUiVisible(isVisible) {
    this.debugUiVisible = Boolean(isVisible)
    this.setVelocityVisualizerVisible(this.showVelocityVisualizer)
  }

  updateVelocityVisualizer() {
    if (
      !this.velocityVisualizerElement ||
      !this.velocityVisualizerFillElement ||
      !this.velocityVisualizerValueElement
    ) {
      return
    }

    const velocitySign = this.velocity === 0 ? 0 : Math.sign(this.velocity)
    const normalizedVelocity = THREE.MathUtils.clamp(
      Math.abs(this.velocity) / this.velocityMax,
      0,
      1
    )
    const fillPercent = normalizedVelocity * 50

    if (velocitySign >= 0) {
      this.velocityVisualizerFillElement.style.left = '50%'
      this.velocityVisualizerFillElement.style.width = `${fillPercent}%`
    } else {
      this.velocityVisualizerFillElement.style.left = `${50 - fillPercent}%`
      this.velocityVisualizerFillElement.style.width = `${fillPercent}%`
    }

    this.velocityVisualizerFillElement.style.backgroundColor =
      velocitySign >= 0 ? '#7fffd4' : '#ff8fab'
    this.velocityVisualizerValueElement.textContent = this.velocity.toFixed(4)
  }

  update() {
    this.updateCameraBounds()
    this.scrollCurrent = THREE.MathUtils.lerp(
      this.scrollCurrent,
      this.scrollTarget,
      this.scrollSmoothing
    )

    if (this.useScrollBounds) {
      const minimumScroll = this.scrollFromCameraZ(this.maxCameraZ)
      const maximumScroll = this.scrollFromCameraZ(this.minCameraZ)

      this.scrollTarget = THREE.MathUtils.clamp(this.scrollTarget, minimumScroll, maximumScroll)
      this.scrollCurrent = THREE.MathUtils.clamp(this.scrollCurrent, minimumScroll, maximumScroll)
    }

    this.updateVelocity()
    this.updateVelocityVisualizer()

    const nextCameraZ = this.cameraZFromScroll(this.scrollCurrent)
    if (this.useScrollBounds) {
      this.camera.position.z = THREE.MathUtils.clamp(nextCameraZ, this.minCameraZ, this.maxCameraZ)
      return
    }

    this.camera.position.z = nextCameraZ
  }

  bindDebug() {
    if (!this.debug || this.isDebugBound) return

    this.debug.addBinding({
      folderTitle: 'Scroll',
      targetObject: this,
      property: 'useScrollBounds',
      label: 'Use Bounds',
    })

    this.debug.addBinding({
      folderTitle: 'Scroll',
      targetObject: this,
      property: 'invertScroll',
      label: 'Invert Scroll',
    })

    this.debug.addBinding({
      folderTitle: 'Scroll',
      targetObject: this,
      property: 'showVelocityVisualizer',
      label: 'Debug Velocity',
      onChange: (value) => {
        this.setVelocityVisualizerVisible(value)
      },
    })

    this.debug.addBinding({
      folderTitle: 'Scroll',
      targetObject: this,
      property: 'velocityDamping',
      label: 'Velocity Damping',
      options: {
        min: 0.01,
        max: 1,
        step: 0.01,
      },
    })

    this.debug.addBinding({
      folderTitle: 'Scroll',
      targetObject: this,
      property: 'velocityMax',
      label: 'Velocity Max',
      options: {
        min: 0.1,
        max: 5,
        step: 0.1,
      },
    })

    this.isDebugBound = true
  }

  dispose() {
    window.removeEventListener('wheel', this.onWheel)
    window.removeEventListener('touchstart', this.onTouchStart)
    window.removeEventListener('touchmove', this.onTouchMove)

    if (this.velocityVisualizerElement) {
      this.velocityVisualizerElement.remove()
    }
    this.velocityVisualizerElement = null
    this.velocityVisualizerFillElement = null
    this.velocityVisualizerValueElement = null
  }
}

export { Scroll }
