import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  generateAlternativeTimeline,
  generateLorenzTrajectory,
  TimelineData,
} from "@/app/components/AlternativeTimeline";
import { generateFinancialEventAnalysis } from "@/lib/claude";
import { PlayCircle } from "lucide-react";

interface MarkerStatistics {
  [key: string]: string | number;
}

interface LorenzParams {
  [key: string]: {
    inflation_rate: number;
    interest_rate: number;
    gdp_growth_rate: number;
  };
}

interface MarkerData {
  timepoint: number;
  title: string;
  date: string;
  statistics: MarkerStatistics;
}

const FinancialButterflyEffect = () => {
  // Refs for Three.js scene management
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectRef = useRef<THREE.Object3D | null>(null);
  const markersRef = useRef<THREE.Mesh[]>([]);
  const navigateToTimepointRef = useRef<((months: number) => void) | null>(
    null
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [event, setEvent] = useState("");
  const [butterflyMode] = useState(true);
  const [originalParams] = useState({
    inflationRate: 50,
    interestRate: 5,
    gdpGrowthRate: 1.5,
  });
  const [parameters, setParameters] = useState({
    inflationRate: 50,
    interestRate: 5,
    gdpGrowthRate: 1.5,
  });
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [currentTimePoint, setCurrentTimePoint] = useState(0);
  const [isCameraMoving, setIsCameraMoving] = useState(false);
  const [cameraTargetPosition, setCameraTargetPosition] =
    useState<THREE.Vector3>(new THREE.Vector3());
  const [cameraTargetLookAt, setCameraTargetLookAt] = useState<THREE.Vector3>(
    new THREE.Vector3()
  );
  const [hoveredMarker, setHoveredMarker] = useState<MarkerData | null>(null);

  // Initialization UseEffect (runs once)
  useEffect(() => {
    if (!mountRef.current || sceneRef.current) return;

    console.log("Initializing Three.js Scene...");

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000819);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 30;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const lights = [
      { color: 0x4444ff, position: [10, 10, 10] },
      { color: 0x44ff44, position: [-10, -10, 10] },
    ];

    lights.forEach((light) => {
      const pointLight = new THREE.PointLight(light.color, 1);
      pointLight.position.set(
        light.position[0],
        light.position[1],
        light.position[2]
      );
      scene.add(pointLight);
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    const animate = () => {
      requestAnimationFrame(animate);

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      console.log("Cleaning up Three.js Scene...");
      window.removeEventListener("resize", handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  useEffect(() => {
    if (!isCameraMoving || !cameraRef.current || !controlsRef.current) return;

    console.log("Animating Camera Movement...");

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const lerpFactor = 0.05;

    const animateCamera = () => {
      if (!isCameraMoving) return;

      requestAnimationFrame(animateCamera);

      camera.position.lerp(cameraTargetPosition, lerpFactor);
      controls.target.lerp(cameraTargetLookAt, lerpFactor);
      controls.update();

      if (
        camera.position.distanceTo(cameraTargetPosition) < 0.1 &&
        controls.target.distanceTo(cameraTargetLookAt) < 0.1
      ) {
        setIsCameraMoving(false);
        console.log("Camera reached target position.");
        controls.enabled = true;
      }
    };

    controls.enabled = true;
    animateCamera();
  }, [isCameraMoving, cameraTargetPosition, cameraTargetLookAt]);

  const getMarkersOnLorenzPath = (
    points: Array<{ x: number; y: number; z: number }>,
    numMarkers: number
  ) => {
    const markerPoints = [];
    const step = Math.floor(points.length / (numMarkers - 1));

    for (let i = 0; i < numMarkers; i++) {
      const index = Math.min(i * step, points.length - 1);
      const point = points[index];
      // Scale the points to match the visualization scale
      markerPoints.push(
        new THREE.Vector3(point.x * 2, point.y * 2, point.z * 2)
      );
    }

    return markerPoints;
  };

  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const points = generateLorenzTrajectory(parameters);

    console.log("Generated Lorenz Points:", points);
    if (
      !Array.isArray(points) ||
      points.some((p) => isNaN(p.x) || isNaN(p.y) || isNaN(p.z))
    ) {
      console.error("Invalid points detected:", points);
      return;
    }

    // Clear previous objects
    if (objectRef.current) {
      scene.remove(objectRef.current);
      if (objectRef.current instanceof THREE.Points) {
        objectRef.current.geometry.dispose();
        objectRef.current.material.dispose();
      }
    }

    // Clear previous markers
    markersRef.current.forEach((marker) => {
      scene.remove(marker);
      marker.geometry.dispose();
    });
    markersRef.current = [];

    // Create new visualization object
    let newObject3D: THREE.Object3D;
    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);
    if (butterflyMode) {
      // Butterfly particle effect
      const geometry = new THREE.BufferGeometry();

      const colors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const point = points[i % points.length];
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;

        const color = new THREE.Color();
        color.setHSL(i / particleCount, 1.0, 0.5);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.6,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
      });

      newObject3D = new THREE.Points(geometry, material);
    } else {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(p.x, p.y, p.z))
      );
      const material = new THREE.LineBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.6,
      });
      newObject3D = new THREE.Line(geometry, material);
    }

    newObject3D.scale.set(2, 2, 2);
    scene.add(newObject3D);

    objectRef.current = newObject3D;

    console.log("POINTS: ", points);
    const timelinePoints = getMarkersOnLorenzPath(points, 5);

    console.log("TIMELINE POINTS", timelinePoints);

    // Create new markers
    const markers = timelinePoints.map((point, index) => {
      const markerGeometry = new THREE.SphereGeometry(0.8);
      const markerMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.8,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(point);

      const markerData: MarkerData = {
        timepoint: index * 3,
        title: `${index * 3} Months`,
        date: `${index * 3} Months from start`,
        statistics: timeline?.alternativeEvents[index]?.statistics || {},
      };

      marker.userData = markerData;
      scene.add(marker);
      return marker;
    });

    markersRef.current = markers;

    // Recreate navigation function
    const navigateToTimepoint = (months: number) => {
      const markerIndex = months / 3;
      if (markerIndex < 0 || markerIndex >= markers.length) {
        console.log("Invalid month:", months);
        return;
      }

      const targetMarker = markers[markerIndex];
      const targetPos = targetMarker.position.clone();

      // Calculate camera position relative to the marker
      const radius = 40; // Distance from the marker
      const cameraOffset = new THREE.Vector3(
        radius * Math.cos(Math.PI / 4), // Adjust angle for better view
        radius * 0.5, // Slightly above the marker
        radius * Math.sin(Math.PI / 4) // Adjust angle for better view
      );

      const newCameraPosition = targetPos.clone().add(cameraOffset);

      // Set camera target and position
      setCameraTargetPosition(newCameraPosition);
      setCameraTargetLookAt(targetPos);
      setIsCameraMoving(true);
    };

    navigateToTimepointRef.current = navigateToTimepoint;

    // Keyboard and hover effects setup
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        const next = Math.min(currentTimePoint + 3, 9);
        setCurrentTimePoint(next);
        navigateToTimepoint(next);
      } else if (event.key === "ArrowLeft") {
        const prev = Math.max(currentTimePoint - 3, 0);
        setCurrentTimePoint(prev);
        navigateToTimepoint(prev);
      }
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (!camera || !renderer) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(markers);

      if (intersects.length > 0) {
        const marker = intersects[0].object;
        setHoveredMarker(marker.userData as MarkerData);
        marker.scale.set(1.2, 1.2, 1.2);
      } else {
        setHoveredMarker(null);
        markers.forEach((marker) => marker.scale.set(1, 1, 1));
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    rendererRef.current?.domElement.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      rendererRef.current?.domElement.removeEventListener(
        "mousemove",
        onMouseMove
      );
    };
  }, [parameters, butterflyMode, timeline, currentTimePoint]);

  // Update Timeline When Event or Parameters Change
  useEffect(() => {
    if (originalParams && parameters) {
      const newTimeline = generateAlternativeTimeline(
        event,
        originalParams,
        parameters
      );
      setTimeline(newTimeline);
    }
  }, [event, originalParams, parameters]);

  const handleParameterChange = (
    param: keyof typeof parameters,
    value: number
  ) => {
    setParameters((prev) => ({
      ...prev,
      [param]: value,
    }));
  };

  function setMarkerData(params: LorenzParams) {
    const markers = markersRef.current;
    Object.entries(params).forEach(([month, data]) => {
      const index = parseInt(month) / 3;
      if (markers[index]) {
        // Update the marker's userData with the new parameters
        markers[index].userData = {
          ...markers[index].userData,
          statistics: {
            "Inflation Rate": `${data.inflation_rate}%`,
            "Interest Rate": `${data.interest_rate}%`,
            "GDP Growth Rate": `${data.gdp_growth_rate}%`,
          },
          parameters: data, // Store raw values for potential use
        };
      }
    });
  }

  const navigateTimeline = (direction: "prev" | "next") => {
    if (!markersRef.current.length) return;

    let nextTimePoint = currentTimePoint;

    if (
      direction === "next" &&
      currentTimePoint < markersRef.current.length - 1
    ) {
      nextTimePoint += 1;
    } else if (direction === "prev" && currentTimePoint > 0) {
      nextTimePoint -= 1;
    } else {
      return;
    }

    const targetMarker = markersRef.current[nextTimePoint];
    const targetPos = targetMarker.position.clone();

    const radius = 40;
    const cameraOffset = new THREE.Vector3(
      radius * Math.cos(Math.PI / 4),
      radius * 0.5,
      radius * Math.sin(Math.PI / 4)
    );

    const newCameraPosition = targetPos.clone().add(cameraOffset);

    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }

    setCameraTargetPosition(newCameraPosition);
    setCameraTargetLookAt(targetPos);
    setIsCameraMoving(true);
    setCurrentTimePoint(nextTimePoint);
  };

  const startTimeline = () => {
    if (!markersRef.current.length) {
      console.error("No markers found, cannot start timeline");
      return;
    }

    console.log("Starting timeline...");

    const firstMarker = markersRef.current[0];
    const targetPos = firstMarker.position.clone();

    // Calculate camera position relative to the marker
    const radius = 40; // Distance from the marker
    const cameraOffset = new THREE.Vector3(
      radius * Math.cos(Math.PI / 4),
      radius * 0.5,
      radius * Math.sin(Math.PI / 4)
    );

    const newCameraPosition = targetPos.clone().add(cameraOffset);

    if (controlsRef.current) {
      // Update OrbitControls target
      controlsRef.current.target.copy(targetPos);
      // Don't disable controls during movement
      controlsRef.current.enabled = true;
      controlsRef.current.update();
    }

    setCameraTargetPosition(newCameraPosition);
    setCameraTargetLookAt(targetPos);
    setIsCameraMoving(true);
    setCurrentTimePoint(0);
  };

  return (
    <div className="relative w-screen h-screen bg-[#000819] overflow-hidden">
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      <div className="absolute top-6 left-6 w-80">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 text-white">
          <h1 className="text-2xl font-bold mb-2">The Butterfly Effect</h1>
          <p className="text-sm text-gray-300 mb-4">
            Navigate through time using arrow keys
          </p>
          <div className="space-y-4">
            <div>
              {/* <Label className="text-sm text-gray-300">Event</Label> */}
              <div className="relative flex ml-3">
                {/* <Input
                  placeholder="Enter a financial event in history..."
                  value={event}
                  onChange={(e) => setEvent(e.target.value)}
                  className="bg-black/30 border-gray-700"
                /> */}
                <Button
                  onClick={async () => {
                    const analyses = await generateFinancialEventAnalysis(
                      parameters
                    );
                    console.log(analyses);
                    // Set marker data to these.
                    setMarkerData(analyses);
                    startTimeline();
                  }}
                >
                  Submit Parameters / Run <PlayCircle />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 w-80">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4">
          <div className="space-y-3">
            {Object.entries(parameters).map(([key, value]) => (
              <div key={key}>
                <Label className="text-sm text-gray-300">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </Label>
                <Slider
                  value={[value]}
                  onValueChange={(v) => {
                    handleParameterChange(key as keyof typeof parameters, v[0]);
                  }}
                  min={0}
                  max={
                    key === "inflationRate"
                      ? 100
                      : key === "interestRate"
                      ? 20
                      : 5
                  }
                  step={0.1}
                  className="my-1"
                />
                <div className="text-right text-sm text-gray-400">
                  {value.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateTimeline("prev")}
            className="text-white"
          >
            ←
          </Button>
          <div className="text-white text-sm">{currentTimePoint} Months</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateTimeline("next")}
            className="text-white"
          >
            →
          </Button>
        </div>
      </div>

      {hoveredMarker && (
        <div className="absolute top-6 right-6 w-96">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-2">
              {hoveredMarker.title}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Time:</span>
                <span>{hoveredMarker.date}</span>
              </div>
              {/* Add null check before Object.entries */}
              {hoveredMarker.statistics &&
                Object.entries(hoveredMarker.statistics).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-gray-300">
                    <span>{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialButterflyEffect;
