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
import { Loader2, PlayCircle } from "lucide-react";
import MarkerDataGraph from "@/app/components/MarkerDataGraph";
import { generateNarrative } from "@/lib/claude";

const MONTH_NUM = 10;

interface MarkerStatistics {
  [key: string]: string | number;
}

export interface EconomicNarrative {
  timepoint: number; // The month number (3, 6, 9, etc.)
  event: string; // Main event description
  impact: string; // Immediate impact of the event
  consequences: string[]; // Array of consequential effects
  systemicEffects: string; // Broader economic implications
  marketSentiment: string; // How markets might react
  policyImplications: string; // Policy-related implications
}

interface LorenzParams {
  [key: string]: {
    inflation_rate: number;
    interest_rate: number;
    gdp_growth_rate: number;
  };
}

export interface MarkerData {
  timepoint: number;
  title: string;
  date: string;
  statistics: MarkerStatistics;
}

const FinancialButterflyEffect = () => {
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

  const [narrative, setNarrative] = useState<Record<
    string,
    EconomicNarrative
  > | null>(null);

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [cameraTargetPosition, setCameraTargetPosition] =
    useState<THREE.Vector3>(new THREE.Vector3());
  const [cameraTargetLookAt, setCameraTargetLookAt] = useState<THREE.Vector3>(
    new THREE.Vector3()
  );
  const [hoveredMarker, setHoveredMarker] = useState<MarkerData | null>(null);
  const [markerStates, setMarkerStates] = useState<MarkerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!mountRef.current || sceneRef.current) return;

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
      window.removeEventListener("resize", handleResize);
      if (mountRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  useEffect(() => {
    if (markerStates.length > 0) {
      const fetchNarrative = async () => {
        try {
          const generatedNarrative = await generateNarrative({
            markerState: markerStates,
          });
          setNarrative(generatedNarrative);
          setIsLoading(false);
        } catch (error) {
          console.error("Error generating narrative:", error);
          setIsLoading(false);
        }
      };

      fetchNarrative();
    }
  }, [markerStates]);

  useEffect(() => {
    if (!isCameraMoving || !controlsRef.current) return;

    const controls = controlsRef.current;
    const lerpFactor = 0.05; // Adjust this value to change transition speed

    const animateCamera = () => {
      if (!isCameraMoving) return;

      controls.target.lerp(cameraTargetLookAt, lerpFactor);
      controls.update();

      if (controls.target.distanceTo(cameraTargetLookAt) < 0.01) {
        setIsCameraMoving(false);
      } else {
        requestAnimationFrame(animateCamera);
      }
    };

    animateCamera();
  }, [isCameraMoving, cameraTargetLookAt]);

  const getMarkersOnLorenzPath = (
    points: Array<{ x: number; y: number; z: number }>,
    numMarkers: number
  ) => {
    const markerPoints = [];
    const step = Math.floor(points.length / (numMarkers - 1));

    for (let i = 0; i < numMarkers; i++) {
      const index = Math.min(i * step, points.length - 1);
      const point = points[index];
      markerPoints.push(
        new THREE.Vector3(point.x * 2, point.y * 2, point.z * 2)
      );
    }

    return markerPoints;
  };

  function generateFinancialParameters(
    timeMonths: number,
    initialParams: {
      inflationRate: number;
      interestRate: number;
      gdpGrowthRate: number;
    }
  ) {
    const sigma = 10 * (1 + initialParams.inflationRate / 100);
    const rho = 28 * (1 + initialParams.interestRate / 20);
    const beta = 2.66 * (1 + initialParams.gdpGrowthRate / 5);

    let x = initialParams.inflationRate;
    let y = initialParams.interestRate;
    let z = initialParams.gdpGrowthRate;

    const dt = 0.001;
    const timeCompression = 2;
    const steps = Math.floor(timeMonths * 30 * dt * timeCompression);

    const history: Array<[number, number, number]> = [];
    const historyLength = 10;

    for (let i = 0; i < steps; i++) {
      const dx = sigma * (y - x) * dt;
      const dy = (x * (rho - z) - y) * dt;
      const dz = (x * y - beta * z) * dt;

      x += dx;
      y += dy;
      z += dz;

      history.push([x, y, z]);
      if (history.length > historyLength) {
        history.shift();
      }
    }

    return {
      inflation_rate: Math.max(
        0,
        Math.min(
          initialParams.inflationRate * 1.5,
          x * (0.8 + timeMonths * 0.05)
        )
      ), // Allows for max 50% change per 3 months
      interest_rate: Math.max(
        0,
        Math.min(
          initialParams.interestRate * 1.5,
          y * (0.9 + timeMonths * 0.03)
        )
      ),
      gdp_growth_rate: Math.max(
        -5,
        Math.min(5, z * (0.95 + timeMonths * 0.02))
      ),
    };
  }

  function generateTimeSeriesParameters() {
    const timePoints = [3, 6, 9, 12, 15, 18, 21, 24, 27];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};

    timePoints.forEach((month) => {
      result[month.toString()] = generateFinancialParameters(month, parameters);
    });

    return result;
  }

  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const points = generateLorenzTrajectory(parameters);

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

    const timelinePoints = getMarkersOnLorenzPath(points, MONTH_NUM);

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

      const radius = 40; // Distance from the marker
      const cameraOffset = new THREE.Vector3(
        radius * Math.cos(Math.PI / 4), // Adjust angle for better view
        radius * 0.5, // Slightly above the marker
        radius * Math.sin(Math.PI / 4) // Adjust angle for better view
      );

      const newCameraPosition = targetPos.clone().add(cameraOffset);

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
        const intersectedObject = intersects[0].object;
        // Type cast to Mesh
        const marker = intersectedObject as THREE.Mesh<
          THREE.SphereGeometry,
          THREE.MeshPhongMaterial
        >;
        const markerIndex = markersRef.current.findIndex((m) => m === marker);

        if (markerIndex !== -1) {
          setHoveredMarker(markerStates[markerIndex]);
          marker.scale.set(1.2, 1.2, 1.2);
        }
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
  }, [parameters, butterflyMode, timeline, currentTimePoint, markerStates]);

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
    const newMarkerStates: MarkerData[] = [...markerStates];

    Object.entries(params).forEach(([month, data]) => {
      const index = parseInt(month) / 3;
      if (markers[index]) {
        const markerData: MarkerData = {
          timepoint: parseInt(month),
          title: `${month} Months`,
          date: `${month} Months from start`,
          statistics: {
            "Inflation Rate": `${data.inflation_rate}%`,
            "Interest Rate": `${data.interest_rate}%`,
            "GDP Growth Rate": `${data.gdp_growth_rate}%`,
          },
        };

        markers[index].userData = {
          ...markers[index].userData,
          ...markerData,
          parameters: data,
        };

        newMarkerStates[index] = markerData;

        const marker = markers[index];
        const material = marker.material as THREE.MeshPhongMaterial;
        const hue = Math.max(0, 1 - data.inflation_rate / 20);
        const color = new THREE.Color().setHSL(hue, 1, 0.5);
        material.color = color;
        material.emissive = color;
        material.emissiveIntensity = 0.8;
      }
    });

    setMarkerStates(newMarkerStates);
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
    setHoveredMarker(markerStates[nextTimePoint]);

    // Set the target position for the controls
    setCameraTargetLookAt(targetMarker.position);
    setIsCameraMoving(true);
    setCurrentTimePoint(nextTimePoint);
  };

  const startTimeline = () => {
    if (!markersRef.current.length) return;

    const firstMarker = markersRef.current[0];
    setCameraTargetLookAt(firstMarker.position);
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
              <div className="relative flex ml-3">
                <Button
                  onClick={async () => {
                    setIsLoading(true);

                    try {
                      const analyses = generateTimeSeriesParameters();
                      setMarkerData(analyses);
                      startTimeline();
                    } finally {
                    }
                  }}
                  disabled={isLoading}
                  className="relative flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Submit Parameters / Run <PlayCircle />
                    </>
                  )}
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
                      ? 10
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
      <div className="absolute top-6 right-6 flex gap-2">
        <MarkerDataGraph markerStates={markerStates} narrative={narrative} />
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
          <div className="text-white text-sm">
            {currentTimePoint * 3} Months
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateTimeline("next")}
            className="text-white"
          >
            →
          </Button>

          {/* Display Narrative Subtitle for Current Month */}
          <p className="text-gray-300 text-xs text-center w-64">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(narrative as any)?.[
              `Month${currentTimePoint * 3}` as keyof typeof narrative
            ]?.Event || "No major economic event recorded."}
          </p>
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
