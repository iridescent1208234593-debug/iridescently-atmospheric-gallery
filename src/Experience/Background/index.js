import * as THREE from 'three'
import vertexShader from '@/Experience/Background/shaders/vertex.glsl'
import fragmentShader from '@/Experience/Background/shaders/fragment.glsl'

class Background {
  constructor(debug = null) {
    this.debug = debug
    this.isInitialized = false
    this.isDebugBound = false

    this.scene = null
    this.camera = null
    this.material = null
    this.mesh = null

    this.backgroundColor = new THREE.Color('#FBE8CD')
    this.blob1Color = new THREE.Color('#FFD56D')
    this.blob2Color = new THREE.Color('#5D816A')
    this.nextBackgroundColor = new THREE.Color()
    this.nextBlob1Color = new THREE.Color()
    this.nextBlob2Color = new THREE.Color()

    this.baseBlobRadius = 0.65
    this.secondaryBlobRadiusRatio = 0.78
    this.baseBlobStrength = 0.9

    this.depthToRadiusAmount = 0.08
    this.velocityToStrengthAmount = 0.1
    this.motionSmoothing = 0.1
    this.motionDepthProgress = 0
    this.motionVelocityIntensity = 0
    this.smoothedDepthProgress = 0
    this.smoothedVelocityIntensity = 0

    this.blobRadius = this.baseBlobRadius
    this.blobStrength = this.baseBlobStrength
    this.noiseStrength = 0.04
  }

  init() {
    if (this.isInitialized) return

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uBackgroundColor: { value: this.backgroundColor },
        uBlob1Color: { value: this.blob1Color },
        uBlob2Color: { value: this.blob2Color },
        uNoiseStrength: { value: this.noiseStrength },
        uBlobRadius: { value: this.blobRadius },
        uBlobRadiusSecondary: { value: this.blobRadius * this.secondaryBlobRadiusRatio },
        uBlobStrength: { value: this.blobStrength },
        uTime: { value: 0 },
        uVelocityIntensity: { value: 0 },
      },
    })

    const geometry = new THREE.PlaneGeometry(2, 2)
    this.mesh = new THREE.Mesh(geometry, this.material)
    this.scene.add(this.mesh)
    this.applyMotionToBlob()
    this.bindDebug()

    this.isInitialized = true
  }

  setMoodColors({ background, blob1, blob2 } = {}) {
    if (background) this.backgroundColor.set(background)
    if (blob1) this.blob1Color.set(blob1)
    if (blob2) this.blob2Color.set(blob2)

    this.updateUniformColors()
  }

  setMoodBlend({ currentMood, nextMood, blend } = {}) {
    if (!currentMood) return

    const safeBlend = THREE.MathUtils.clamp(blend ?? 0, 0, 1)
    if (!nextMood || safeBlend <= 0) {
      this.setMoodColors(currentMood)
      return
    }

    this.backgroundColor
      .set(currentMood.background)
      .lerp(this.nextBackgroundColor.set(nextMood.background), safeBlend)
    this.blob1Color.set(currentMood.blob1).lerp(this.nextBlob1Color.set(nextMood.blob1), safeBlend)
    this.blob2Color.set(currentMood.blob2).lerp(this.nextBlob2Color.set(nextMood.blob2), safeBlend)

    this.updateUniformColors()
  }

  updateUniformColors() {
    if (!this.material) return

    this.material.uniforms.uBackgroundColor.value.copy(this.backgroundColor)
    this.material.uniforms.uBlob1Color.value.copy(this.blob1Color)
    this.material.uniforms.uBlob2Color.value.copy(this.blob2Color)
    this.material.uniforms.uNoiseStrength.value = this.noiseStrength
  }

  updateBlobUniforms() {
    if (!this.material) return

    this.material.uniforms.uBlobRadius.value = this.blobRadius
    this.material.uniforms.uBlobRadiusSecondary.value =
      this.blobRadius * this.secondaryBlobRadiusRatio
    this.material.uniforms.uBlobStrength.value = this.blobStrength
  }

  setMotionResponse({ depthProgress, velocityIntensity } = {}) {
    if (Number.isFinite(depthProgress)) {
      this.motionDepthProgress = THREE.MathUtils.clamp(depthProgress, 0, 1)
    }
    if (Number.isFinite(velocityIntensity)) {
      this.motionVelocityIntensity = THREE.MathUtils.clamp(velocityIntensity, 0, 1)
    }
  }

  applyMotionToBlob() {
    const nextBlobRadius =
      this.baseBlobRadius + this.smoothedDepthProgress * this.depthToRadiusAmount
    const nextBlobStrength =
      this.baseBlobStrength + this.smoothedVelocityIntensity * this.velocityToStrengthAmount

    this.blobRadius = THREE.MathUtils.clamp(nextBlobRadius, 0.05, 1)
    this.blobStrength = THREE.MathUtils.clamp(nextBlobStrength, 0, 1)

    this.updateBlobUniforms()
  }

  bindDebug() {
    if (!this.debug || this.isDebugBound) return

    this.debug.addBinding({
      folderTitle: 'Background',
      targetObject: this,
      property: 'baseBlobRadius',
      label: 'Blob Radius',
      options: { min: 0.1, max: 1, step: 0.01 },
      onChange: () => {
        this.applyMotionToBlob()
      },
    })

    this.debug.addBinding({
      folderTitle: 'Background',
      targetObject: this,
      property: 'secondaryBlobRadiusRatio',
      label: 'Blob 2 Size',
      options: { min: 0.3, max: 1.2, step: 0.01 },
      onChange: () => {
        this.applyMotionToBlob()
      },
    })

    this.debug.addBinding({
      folderTitle: 'Background',
      targetObject: this,
      property: 'baseBlobStrength',
      label: 'Blob Strength',
      options: { min: 0, max: 1, step: 0.01 },
      onChange: () => {
        this.applyMotionToBlob()
      },
    })

    this.debug.addBinding({
      folderTitle: 'Background',
      targetObject: this,
      property: 'noiseStrength',
      label: 'Noise',
      options: { min: 0, max: 0.2, step: 0.005 },
      onChange: () => {
        this.updateUniformColors()
      },
    })

    this.isDebugBound = true
  }

  update(time = 0) {
    this.smoothedDepthProgress = THREE.MathUtils.lerp(
      this.smoothedDepthProgress,
      this.motionDepthProgress,
      this.motionSmoothing
    )
    this.smoothedVelocityIntensity = THREE.MathUtils.lerp(
      this.smoothedVelocityIntensity,
      this.motionVelocityIntensity,
      this.motionSmoothing
    )

    if (this.material) {
      this.material.uniforms.uTime.value = time
      this.material.uniforms.uVelocityIntensity.value = this.smoothedVelocityIntensity
    }

    this.applyMotionToBlob()
  }

  render(renderer) {
    if (!this.isInitialized) return
    renderer.render(this.scene, this.camera)
  }

  dispose() {
    if (!this.isInitialized) return

    this.mesh.geometry.dispose()
    this.material.dispose()
    this.scene.clear()

    this.scene = null
    this.camera = null
    this.mesh = null
    this.material = null
    this.isInitialized = false
  }
}

export { Background }
