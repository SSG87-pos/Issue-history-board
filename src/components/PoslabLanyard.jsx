/* eslint-disable react/no-unknown-property */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, useGLTF } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import cardGLB from '../assets/lanyard/card.glb';

extend({ MeshLineGeometry, MeshLineMaterial });

function createPoslabCardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1448;
  const ctx = canvas.getContext('2d');

  const faceGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  faceGradient.addColorStop(0, '#004f82');
  faceGradient.addColorStop(0.48, '#00649b');
  faceGradient.addColorStop(1, '#002d50');
  ctx.fillStyle = faceGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.moveTo(126, -80);
  ctx.lineTo(426, -80);
  ctx.lineTo(26, 1528);
  ctx.lineTo(-274, 1528);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = 'rgba(69, 197, 231, 0.5)';
  ctx.lineWidth = 18;
  for (let y = 90; y < canvas.height + 120; y += 270) {
    for (let x = -80; x < canvas.width + 180; x += 285) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 104, y + 214);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  const depthShade = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  depthShade.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
  depthShade.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
  depthShade.addColorStop(1, 'rgba(0, 22, 40, 0.18)');
  ctx.fillStyle = depthShade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '900 106px Inter, Arial, sans-serif';
  ctx.shadowColor = 'rgba(0, 29, 52, 0.26)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('POSLAB', 44, 592);
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
  ctx.fillRect(44, 640, 420, 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

function Band({ isMobile = false, maxSpeed = 40, minSpeed = 1.2 }) {
  const band = useRef();
  const fixed = useRef();
  const jointOne = useRef();
  const jointTwo = useRef();
  const jointThree = useRef();
  const card = useRef();
  const { nodes } = useGLTF(cardGLB);
  const cardTexture = useMemo(() => createPoslabCardTexture(), []);
  const [curve] = useState(
    () => new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
  );
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);
  const vec = useMemo(() => new THREE.Vector3(), []);
  const ang = useMemo(() => new THREE.Vector3(), []);
  const rot = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const segmentProps = { angularDamping: 3.1, canSleep: false, colliders: false, linearDamping: 3, type: 'dynamic' };

  useRopeJoint(fixed, jointOne, [[0, 0, 0], [0, 0, 0], 1.08]);
  useRopeJoint(jointOne, jointTwo, [[0, 0, 0], [0, 0, 0], 1.08]);
  useRopeJoint(jointTwo, jointThree, [[0, 0, 0], [0, 0, 0], 1.08]);
  useSphericalJoint(jointThree, card, [[0, 0, 0], [0, 1.5, 0]]);

  useEffect(() => {
    if (!hovered) return undefined;
    document.body.style.cursor = dragged ? 'grabbing' : 'grab';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [dragged, hovered]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, jointOne, jointTwo, jointThree, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }

    if (!fixed.current || !jointOne.current || !jointTwo.current || !jointThree.current || !card.current) return;

    [jointOne, jointTwo].forEach((ref) => {
      if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
      const distance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())));
      ref.current.lerped.lerp(ref.current.translation(), delta * (minSpeed + distance * (maxSpeed - minSpeed)));
    });
    curve.points[0].copy(jointThree.current.translation());
    curve.points[1].copy(jointTwo.current.lerped);
    curve.points[2].copy(jointOne.current.lerped);
    curve.points[3].copy(fixed.current.translation());
    band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32));

    ang.copy(card.current.angvel());
    rot.copy(card.current.rotation());
    const sway = Math.sin(state.clock.elapsedTime * 1.15) * 0.05;
    card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.36, z: ang.z + sway });
  });

  curve.curveType = 'chordal';

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.58, 0.02, 0]} ref={jointOne} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.16, -0.05, 0]} ref={jointTwo} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.72, -0.12, 0]} ref={jointThree} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[2.18, -0.28, 0]} ref={card} {...segmentProps} type={dragged ? 'kinematicPosition' : 'dynamic'}>
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            onPointerDown={(event) => {
              event.target.setPointerCapture(event.pointerId);
              drag(new THREE.Vector3().copy(event.point).sub(vec.copy(card.current.translation())));
            }}
            onPointerOut={() => hover(false)}
            onPointerOver={() => hover(true)}
            onPointerUp={(event) => {
              event.target.releasePointerCapture(event.pointerId);
              drag(false);
            }}
            position={[0, -1.2, -0.05]}
            scale={2.25}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshBasicMaterial map={cardTexture} map-anisotropy={16} toneMapped={false} />
            </mesh>
            <mesh geometry={nodes.clip.geometry}>
              <meshPhysicalMaterial clearcoat={0.55} color="#23475f" metalness={0.72} roughness={0.34} />
            </mesh>
            <mesh geometry={nodes.clamp.geometry}>
              <meshPhysicalMaterial clearcoat={0.5} color="#123f5c" metalness={0.8} roughness={0.32} />
            </mesh>
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial color="#123f5c" depthTest={false} lineWidth={0.92} resolution={isMobile ? [1000, 2000] : [1000, 1000]} />
      </mesh>
    </>
  );
}

export default function PoslabLanyard({ fov = 25, gravity = [0, -20, 0], position = [0, 0, 15], transparent = true }) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="poslab-lanyard-wrapper" aria-hidden="true">
      <Canvas
        camera={{ fov, position }}
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ alpha: transparent }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
      >
        <ambientLight intensity={Math.PI} />
        <Suspense fallback={null}>
          <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
            <Band isMobile={isMobile} />
          </Physics>
          <Environment blur={0.75}>
            <Lightformer color="white" intensity={2} position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
            <Lightformer color="white" intensity={3} position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
            <Lightformer color="white" intensity={3} position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
            <Lightformer color="white" intensity={10} position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
          </Environment>
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(cardGLB);
