/**
 * The WebGL renderer, its render loop and the observer that keeps it sized.
 *
 * The only part of the canvas that needs a real WebGL context, so it is kept
 * to that and left out of coverage. A WebGL context is a real resource and
 * browsers keep a small number of them, so `dispose` gives it back: a route
 * that leaks one on every visit stops drawing after a handful.
 */

import { WebGLRenderer, type PerspectiveCamera, type Scene } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createGizmo } from 'src/viewer';

export interface Renderer {
  controls: OrbitControls;
  dispose: () => void;
}

function createRenderer(parent: HTMLElement): WebGLRenderer {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(globalThis.devicePixelRatio);
  // The canvas is sized by CSS and drawn at the size `setSize` is given.
  // Without this it takes its CSS size from its pixel size, which on a retina
  // screen is twice the box it sits in, and the page grows sideways.
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  parent.appendChild(renderer.domElement);
  return renderer;
}

function observeSize(
  parent: HTMLElement,
  renderer: WebGLRenderer,
  camera: PerspectiveCamera,
): ResizeObserver {
  const resize = () => {
    const { clientWidth, clientHeight } = parent;
    if (clientWidth === 0 || clientHeight === 0) return;
    // `false` leaves the CSS size alone, which keeps the canvas inside its
    // box instead of the box growing to fit the canvas.
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(parent);
  return observer;
}

/** Call `draw` on every animation frame until the returned function runs. */
function loop(draw: () => void): () => void {
  let running = true;
  const tick = () => {
    if (!running) return;
    draw();
    globalThis.requestAnimationFrame(tick);
  };
  tick();
  return () => {
    running = false;
  };
}

/**
 * Draw the scene and then the axes indicator on every frame, so the
 * indicator sits over the view instead of in it. The returned function stops
 * drawing and gives the indicator back.
 */
function drawEveryFrame(
  renderer: WebGLRenderer,
  controls: OrbitControls,
  scene: Scene,
  camera: PerspectiveCamera,
): () => void {
  const gizmo = createGizmo();
  const stop = loop(() => {
    controls.update();
    renderer.render(scene, camera);
    gizmo.draw(renderer, camera);
  });
  return () => {
    stop();
    gizmo.dispose();
  };
}

/** Draw `scene` into `parent` on every frame until `dispose` is called. */
export function startRenderer(
  parent: HTMLElement,
  scene: Scene,
  camera: PerspectiveCamera,
): Renderer {
  const renderer = createRenderer(parent);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  const observer = observeSize(parent, renderer, camera);
  const stop = drawEveryFrame(renderer, controls, scene, camera);

  const dispose = () => {
    stop();
    observer.disconnect();
    controls.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    parent.removeChild(renderer.domElement);
  };
  return { controls, dispose };
}
