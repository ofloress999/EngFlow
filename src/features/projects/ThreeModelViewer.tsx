import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { ProjectFile } from "../../types";

type ThreeModelViewerProps = {
  file: ProjectFile;
  zoom: number;
};

export function ThreeModelViewer({ file, zoom }: ThreeModelViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState("Carregando modelo 3D...");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const container = host;

    let disposed = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
    camera.position.set(4 / zoom, 3 / zoom, 6 / zoom);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.style.display = "block";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.width = "100%";
      container.replaceChildren(renderer.domElement);
    } catch {
      setStatus("WebGL indisponivel neste navegador. Nao foi possivel renderizar o modelo 3D.");
      return;
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const grid = new THREE.GridHelper(12, 24, 0x14b8a6, 0xd1d5db);
    scene.add(grid);
    scene.add(new THREE.AxesHelper(2.5));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 2.2));
    const directional = new THREE.DirectionalLight(0xffffff, 2.4);
    directional.position.set(5, 8, 4);
    scene.add(directional);

    function resize() {
      const rect = container.getBoundingClientRect();
      const width = Math.max(320, rect.width);
      const height = Math.max(360, rect.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function frameObject(object: THREE.Object3D) {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z) || 1;
      const scale = 4 / maxSize;
      object.scale.multiplyScalar(scale);
      object.position.sub(center.multiplyScalar(scale));
      controls.target.set(0, 0, 0);
      camera.position.set(4 / zoom, 3 / zoom, 6 / zoom);
      controls.update();
    }

    function addModel(object: THREE.Object3D) {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (!child.material) {
            child.material = new THREE.MeshStandardMaterial({ color: 0x14b8a6 });
          }
        }
      });
      scene.add(object);
      frameObject(object);
      setStatus("Modelo 3D carregado. Arraste para rotacionar, role para zoom.");
    }

    async function load() {
      try {
        const url = file.fileUrl;
        const name = file.name.toLowerCase();
        if (name.endsWith(".fbx")) {
          const buffer = await fetchModelBuffer(url);
          addModel(new FBXLoader().parse(buffer, ""));
          return;
        }
        if (name.endsWith(".obj")) {
          const text = await fetchModelText(url);
          addModel(new OBJLoader().parse(text));
          return;
        }
        if (name.endsWith(".gltf") || name.endsWith(".glb")) {
          const content = name.endsWith(".glb") ? await fetchModelBuffer(url) : await fetchModelText(url);
          new GLTFLoader().parse(content, "", (gltf) => addModel(gltf.scene), () => {
            setStatus("Nao foi possivel abrir este GLTF/GLB no navegador.");
          });
          return;
        }
        setStatus("Formato 3D ainda nao suportado pelo viewer em tempo real.");
      } catch {
        setStatus("Falha ao carregar o modelo 3D. Verifique se o arquivo nao depende de texturas externas ou se esta corrompido.");
      }
    }

    resize();
    void load();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    function animate() {
      if (disposed) return;
      controls.update();
      renderer.render(scene, camera);
      window.requestAnimationFrame(animate);
    }
    animate();

    return () => {
      disposed = true;
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material?.dispose());
        }
      });
      container.replaceChildren();
    };
  }, [file.id, file.fileUrl, file.name, zoom]);

  return (
    <div className="relative h-[28rem] w-full">
      <div ref={hostRef} className="h-full w-full" />
      {status.startsWith("Falha") || status.startsWith("WebGL") || status.startsWith("Nao foi") ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5 text-center">
          <div className="rounded-3xl bg-white/95 p-5 shadow-sm">
            <p className="font-black text-slate-900">Preview 3D indisponivel</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{status}</p>
          </div>
        </div>
      ) : null}
      <p className="absolute bottom-3 left-3 right-3 rounded-2xl bg-white/90 px-3 py-2 text-center text-xs font-bold text-slate-700 shadow-sm">
        {status}
      </p>
    </div>
  );
}

async function fetchModelBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("model_fetch_failed");
  return response.arrayBuffer();
}

async function fetchModelText(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("model_fetch_failed");
  return response.text();
}
