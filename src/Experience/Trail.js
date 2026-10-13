import * as THREE from 'three'

class Trail {
  constructor() {
    this.group = new THREE.Group()
    this.points = []
    this.mesh = null

    this.minDistance = 0.006 // Minimum movement before adding a point
    this.maxPoints = 220 // Maximum points kept in the trail
    this.curveTension = 0.5 // Curviness of Catmull-Rom spline
    this.curveSegments = 220 // Max tube segments along the curve
    this.radialSegments = 8 // Tube roundness (sides around)
    this.radiusHead = 0.012 // Radius near latest point
    this.radiusTail = 0.003 // Radius near oldest point
    this.pointSmoothing = 0.3 // Lerp smoothing when adding points
    this.maxTrimPerFrame = 4 // Max point removals per frame
    this.jumpResetDistance = 999 // Hard reset threshold for huge jumps

    this.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f6f9ff'),
      emissive: new THREE.Color('#7fd5ff'),
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.05,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })
  }

  get object() {
    return this.group
  }

  addPoint(position) {
    if (!(position instanceof THREE.Vector3)) return

    const lastPoint = this.points[this.points.length - 1] || null // Current trail tip

    if (lastPoint && position.distanceToSquared(lastPoint) < this.minDistance * this.minDistance) {
      return
    }

    const nextPoint = position.clone() // Safe copy of incoming point

    // On large jumps, restart the trail so it snaps cleanly.
    if (lastPoint && nextPoint.distanceTo(lastPoint) > this.jumpResetDistance) {
      this.points = [nextPoint]

      if (this.mesh) {
        this.mesh.geometry.dispose()
        this.group.remove(this.mesh)
        this.mesh = null
      }

      return
    }

    const easedPoint = lastPoint
      ? lastPoint.clone().lerp(nextPoint, this.pointSmoothing)
      : nextPoint
    this.points.push(easedPoint)

    let trimBudget = this.maxTrimPerFrame // Removal budget this frame
    while (this.points.length > this.maxPoints && trimBudget > 0) {
      this.points.shift()
      trimBudget -= 1
    }

    if (this.points.length < 2) {
      return
    }

    const curve = new THREE.CatmullRomCurve3(this.points, false, 'centripetal', this.curveTension)
    const segments = Math.max(24, Math.min(this.curveSegments, this.points.length * 4))
    const nextGeometry = this.createTaperedTube(curve, segments, this.radiusHead, this.radiusTail)

    if (!this.mesh) {
      this.mesh = new THREE.Mesh(nextGeometry, this.material)
      this.mesh.renderOrder = 1200
      this.group.add(this.mesh)
      return
    }

    this.mesh.geometry.dispose()
    this.mesh.geometry = nextGeometry
  }

  createTaperedTube(curve, segments, radiusHead, radiusTail) {
    const pathPoints = curve.getSpacedPoints(segments) // Points sampled on the curve
    const radialSegments = this.radialSegments // Number of points per ring
    const ringPoints = radialSegments + 1 // Closed ring needs one extra point

    const vertices = []
    const indices = []

    const up = new THREE.Vector3(0, 0, 1) // Reference up direction
    const tangent = new THREE.Vector3() // Forward direction on curve
    const normal = new THREE.Vector3() // Right/side direction on ring
    const binormal = new THREE.Vector3() // Up direction on ring plane
    const radialOffset = new THREE.Vector3() // Offset from path center to ring vertex
    const vertexPosition = new THREE.Vector3() // Final vertex position

    for (let i = 0; i < pathPoints.length; i += 1) {
      const t = i / Math.max(pathPoints.length - 1, 1) // 0..1 position on path
      const radius = radiusHead + (radiusTail - radiusHead) * Math.pow(t, 1.5) // Taper from head to tail

      curve.getTangent(t, tangent).normalize()
      normal.crossVectors(up, tangent).normalize()

      if (normal.lengthSq() === 0) {
        normal.set(1, 0, 0) // Fallback when tangent is parallel to up
      }

      binormal.crossVectors(tangent, normal).normalize()

      for (let j = 0; j <= radialSegments; j += 1) {
        const angle = (j / radialSegments) * Math.PI * 2 // Angle around current ring
        const cx = -Math.cos(angle) * radius // Ring X offset in local frame
        const cy = Math.sin(angle) * radius // Ring Y offset in local frame

        radialOffset.copy(normal).multiplyScalar(cx).addScaledVector(binormal, cy)

        vertexPosition.copy(pathPoints[i]).add(radialOffset)
        vertices.push(vertexPosition.x, vertexPosition.y, vertexPosition.z)
      }
    }

    for (let i = 0; i < pathPoints.length - 1; i += 1) {
      for (let j = 0; j < radialSegments; j += 1) {
        const baseIndex = i * ringPoints + j // Current quad corner index
        indices.push(baseIndex, baseIndex + ringPoints, baseIndex + 1)
        indices.push(baseIndex + ringPoints, baseIndex + ringPoints + 1, baseIndex + 1)
      }
    }

    const geometry = new THREE.BufferGeometry() // Output geometry
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    return geometry
  }

  dispose() {
    this.reset()
    this.material.dispose()
  }

  reset() {
    if (this.mesh) {
      this.mesh.geometry.dispose()
      this.group.remove(this.mesh)
      this.mesh = null
    }

    this.points = []
  }
}

export { Trail }
