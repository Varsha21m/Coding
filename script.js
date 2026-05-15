const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");
const accessorySelect = document.getElementById("accessorySelect");

let accessoryImg = new Image();
let selectedAccessory = null;

// Handle dropdown selection
accessorySelect.addEventListener("change", () => {
  const value = accessorySelect.value;
  selectedAccessory = value === "none" ? null : "images/" + value;
  if (selectedAccessory) accessoryImg.src = selectedAccessory;
});

// Start webcam
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 420, height: 320 }
    });
    videoElement.srcObject = stream;
  } catch (err) {
    console.error("Camera error:", err);
  }
}
startCamera();

// Setup Mediapipe FaceMesh
const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

// Handle results
faceMesh.onResults((results) => {
  if (!results || !results.image) return;

  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (!selectedAccessory || !results.multiFaceLandmarks?.length) return;

  for (const landmarks of results.multiFaceLandmarks) {
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const nose = landmarks[1];
    const chin = landmarks[152];

    if (!leftEye || !rightEye || !nose || !chin) return;

    // Convert normalized coords to pixels
    const leftX = leftEye.x * canvasElement.width;
    const leftY = leftEye.y * canvasElement.height;
    const rightX = rightEye.x * canvasElement.width;
    const rightY = rightEye.y * canvasElement.height;
    const noseX = nose.x * canvasElement.width;
    const noseY = nose.y * canvasElement.height;
    const chinY = chin.y * canvasElement.height;

    // Eye distance and angle
    const eyeDistance = Math.hypot(rightX - leftX, rightY - leftY);
    const angle = Math.atan2(rightY - leftY, rightX - leftX);

    // Dynamic vertical offset — between eyes and nose
    const eyeToNose = noseY - (leftY + rightY) / 2;
    const centerX = (leftX + rightX) / 2;
    const centerY = (leftY + rightY) / 2 + eyeToNose * 0.3;

    // Glass size
    const width = eyeDistance * 2.0;
    const aspect = accessoryImg.width / accessoryImg.height;
    const height = width / aspect;

    // Draw rotated glasses
    canvasCtx.save();
    canvasCtx.translate(centerX, centerY);
    canvasCtx.rotate(angle);
    canvasCtx.drawImage(accessoryImg, -width / 2, -height / 2, width, height);
    canvasCtx.restore();
  }
});

// Start Mediapipe camera
const camera = new Camera(videoElement, {
  onFrame: async () => await faceMesh.send({ image: videoElement }),
  width: 420,
  height: 320,
});
camera.start();
