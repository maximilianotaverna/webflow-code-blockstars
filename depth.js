// These images tend to work https://www.flaticon.com/free-icon/honeycomb_10632767

const userData = {
  picture:
    "https://cdn-icons-png.flaticon.com/512/10621/10621305.png",
  depth: 44,
  backwards: false,
  animation: false,
  wireframe: true,
  zoom: 500,
  resolution: 16,
  precision: 4, // dont worry about this
};

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);
const container = new THREE.Object3D();
container.destination = { x: 0, y: 0 };
scene.add(container);

let billData = [];
let first = true;
let bill;
let amount = 0;
let pointsBill = null;

init();

function init() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.position.set(0, 0, userData.zoom);
  scene.add(camera);

  loadImage();

  window.addEventListener("mousemove", onMousemove);
  window.addEventListener("resize", onResize);
}

function getClosestPrecision(imageWidth, imageHeight) {
  // Calculate the possible divisors for precision based on image dimensions
  const divisors = [];
  for (let i = userData.resolution; i <= Math.min(imageWidth, imageHeight); i++) {
    if (imageWidth % i === 0 && imageHeight % i === 0) {
      divisors.push(i);
    }
  }

  // Find the closest divisor that results in a precision of 3 or higher
  for (let i = 0; i < divisors.length; i++) {
    if (imageWidth / divisors[i] >= 4 && imageHeight / divisors[i] >= 4) {
      return divisors[i];
    }
  }

  // If no suitable divisor is found, return a default precision of 3
  return 4;
}

function getImgData() {
  if (bill.width === 0 || bill.height === 0) {
    // Handle the case when the image dimensions are invalid
    // You can show an error message or take appropriate action
    return;
  }

  // Calculate the closest working precision value based on image dimensions
  userData.precision = getClosestPrecision(bill.width, bill.height);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = bill.width;
  canvas.height = bill.height;
  ctx.drawImage(bill, 0, 0);
  billData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  createParticles();
}

function loadImage() {
  bill = new Image();
  bill.crossOrigin = "Anonymous";
  bill.onload = function () {
    if (bill.width === 0 || bill.height === 0) {
      // Handle the case when the image dimensions are invalid
      // You can show an error message or take appropriate action
      return;
    }

    getImgData();

    if (first) {
      requestAnimationFrame(render);
      first = false;
    }
  };
  bill.src = userData.picture;
}

function createParticles(randomize) {
  const geometry = new THREE.Geometry();
  amount = 0;

  if (pointsBill !== null) {
    container.remove(pointsBill);
    pointsBill = null;
  }

  for (let y = 0; y < bill.height; y += userData.precision) {
    for (let x = 0; x < bill.width; x += userData.precision) {
      const color = [
        billData[(y * bill.width + x) * 4],
        billData[(y * bill.width + x) * 4 + 1],
        billData[(y * bill.width + x) * 4 + 2],
        billData[(y * bill.width + x) * 4 + 3]
      ];

      const destination = {
        x: x - bill.width / 2,
        y: bill.height / 2 - y,
        z:
          (userData.backwards ? -1 : 1) *
          (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]) *
          (userData.depth * 0.01)
      };

      let particle;

      if (randomize === "random") {
        particle = new THREE.Vector3(
          destination.x + (Math.random() - 0.5) * 50,
          destination.y + (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 50
        );
      } else {
        particle = new THREE.Vector3(destination.x, destination.y, 0);
      }

      if (!userData.animation) {
        particle = new THREE.Vector3(
          destination.x,
          destination.y,
          destination.z
        );
      }

      geometry.vertices.push(particle);
      particle.destination = destination;

      const outColor = new THREE.Color().set(
        `rgb(${color[0]}, ${color[1]}, ${color[2]})`
      );

      if (color[3] < 200) {
        outColor.set(0x000000);
        particle.destination.z = 0;
        particle.z = 0;
      }

      if (
        y / userData.precision < bill.height / userData.precision - 1 &&
        x / userData.precision < bill.width / userData.precision - 1
      ) {
        const face = new THREE.Face3(
          amount,
          amount + 1,
          amount + bill.width / userData.precision
        );

        geometry.faces.push(face);
        face.color.set(outColor);

        const face2 = new THREE.Face3(
          amount + 1,
          amount + bill.width / userData.precision,
          amount + bill.width / userData.precision + 1
        );

        geometry.faces.push(face2);
        face2.color.set(outColor);
      }

      amount++;
    }
  }

  const material = new THREE.MeshBasicMaterial({
    wireframe: userData.wireframe,
    vertexColors: THREE.FaceColors,
    side: THREE.DoubleSide
  });

  pointsBill = new THREE.Mesh(geometry, material);
  container.add(pointsBill);
}

function onMousemove(e) {
  const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
  const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
  container.destination.x = y * 0.5;
  container.destination.y = x * 0.5;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateParticles() {
  if (pointsBill) {  // Check if pointsBill is not null
    for (let i = amount - 1; i > 0; i--) {
      const particle = pointsBill.geometry.vertices[i];
      particle.x += (particle.destination.x - particle.x) * 0.01;
      particle.y += (particle.destination.y - particle.y) * 0.01;
      particle.z += (particle.destination.z - particle.z) * 0.01;
    }
  }
}

function render() {
  requestAnimationFrame(render);

  updateParticles();

  if (pointsBill) {  // Check if pointsBill is not null
    pointsBill.geometry.verticesNeedUpdate = true;

    container.rotation.x +=
      (container.destination.x - container.rotation.x) * 0.05;
    container.rotation.y +=
      (container.destination.y - container.rotation.y) * 0.05;

    renderer.render(scene, camera);
  }
}

// Start the rendering loop
render();
