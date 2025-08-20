import React, { Suspense, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, ContactShadows, useHelper } from '@react-three/drei';
import * as THREE from 'three';
import { DirectionalLightHelper } from 'three';
import '../styles/ModelViewer.css'

// Component to load and display the GLB model
function ShoesModel() {
  const { scene } = useGLTF('/nikes.glb');
  
  // Force shadow casting on all meshes in the model
  React.useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.needsUpdate = true;
        }
      }
    });
  }, [scene]);
  
  return (
    <primitive 
      object={scene} 
      scale={[1, 1, 1]} 
      position={[0, -0.04, 0]}
      rotation={[0,1.6,0]}
      castShadow
    />
  );
}

// Visual helpers to show light and camera positions
function SceneHelpers() {
  const lightRef = useRef();
  const { camera, gl } = useThree();
  
  // Force shadow map update
  React.useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  
  // Show directional light helper
  //useHelper(lightRef, DirectionalLightHelper, 1, 'yellow');
  
  return (
    <>
      {/* Directional Light with helper */}
      <directionalLight 
        ref={lightRef}
        position={[1, 5, 3]} 
        target-position={[0, 0, 0]}
        intensity={2}
        castShadow={true}
        shadow-mapSize={[4096, 4096]}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
             />
      
      {/* Visual marker for light position */}
      <mesh position={[2, 4, 3]}>
        <sphereGeometry args={[0.2]} />
        <meshBasicMaterial color="yellow" />
      </mesh>
      
    </>
  );
}

// Loading component
function LoadingSpinner() {
  return (
    <div style={{ 
      position: 'absolute', 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)',
      color: 'white',
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif'
    }}>
      Loading 3D Model...
    </div>
  );
}

const ModelViewer = () => {
  return (
    <div className='model-container'>
      <Canvas
        shadows={{ enabled: true, type: THREE.PCFSoftShadowMap }}
        camera={{ 
          position: [5, 5, 4], 
          fov: 7,
          near: 0.1,
          far: 1000
        }}
        gl={{ 
          shadowMap: { 
            enabled: true, 
            type: THREE.PCFSoftShadowMap 
          } 
        }}
      >
                {/* Lighting setup with visual helpers */}
        <ambientLight intensity={0.2} />
        <SceneHelpers />
        
        {/* Camera controls */}
        <OrbitControls 
          enablePan={false}
          enableZoom={false}
          minDistance={1}
          maxDistance={2}
          minPolarAngle={Math.PI/2*0.8}
          maxPolarAngle={Math.PI/2*0.8}
          rotateSpeed={0.2}
        />
        
        {/* 3D Model */}
        <Suspense fallback={null}>
          <ShoesModel/>
        </Suspense>
        
        {/* Simple ground plane */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -0.05, 0]} 
          receiveShadow
        >
          <planeGeometry args={[0.75, 0.75]} />
          <shadowMaterial 
            metalness={0}
            receiveShadow
          />
        </mesh>
      </Canvas>
      
      {/* Loading indicator overlay */}
      <Suspense fallback={<LoadingSpinner />}>
        <div />
      </Suspense>
    </div>
  );
};

// Preload the GLB model
useGLTF.preload('/lowpolyshoes-mine.glb');

export default ModelViewer; 