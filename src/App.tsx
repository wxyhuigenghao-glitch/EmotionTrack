"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Screen = "intro" | "profile" | "calibration" | "scene" | "complete";
type JsonValue = string | number | boolean | null | string[] | Record<string, unknown>;

type LogEvent = {
  timestamp: string;
  elapsedMs: number;
  phase: string;
  sceneId: string | null;
  eventType: string;
  value: JsonValue;
};

type SceneReport = {
  valence: number;
  arousal: number;
  dominance: number;
  emotion: string;
  intensity: number;
  concealment: number;
  expressionAccuracy: number;
  cause: string;
  preferredAIResponse: string;
};

type SceneRecord = {
  sceneId: string;
  startedAt: string;
  completedAt: string;
  inspectedClues: string[];
  decision: string;
  aiResponse: string;
  freeResponse: string;
  voiceResponseDurationMs: number;
  report: SceneReport;
};

type SessionData = {
  schemaVersion: string;
  sessionId: string;
  startedAt: string;
  completedAt: string | null;
  consent: { research: boolean; camera: boolean; microphone: boolean };
  profile: {
    background: Record<string, string>;
    personality: Record<string, number>;
    culture: Record<string, number>;
    expression: Record<string, number>;
  };
  calibration: {
    baselineCompleted: boolean;
    baselineSeconds: number;
    voiceSampleDurationMs: number;
  };
  scenes: SceneRecord[];
  events: LogEvent[];
};

type Scene = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  time: string;
  place: string;
  objective: string;
  narration: string;
  npc: string;
  task: string;
  options: string[];
  clues: string[];
  aiPrompt: string;
  responsePrompt: string;
  outcome: string;
  contextTags: string[];
};

const scenes: Scene[] = [
  {
    id: "home",
    number: "01",
    title: "The rushed morning",
    subtitle: "A private space under time pressure",
    time: "08:42",
    place: "Home · Bedroom",
    objective: "Leave for an important presentation in eight minutes.",
    narration:
      "Your ride is almost here. Your access card is missing, the laptop is still on the desk, and a family member starts calling.",
    npc: "Driver: I can wait for five more minutes.",
    task: "What will you prioritise first?",
    options: [
      "Find the access card and pack the laptop",
      "Answer the family call before doing anything else",
      "Recheck the presentation one final time",
      "Leave now and solve the missing items later",
    ],
    clues: ["Ride: 5 min away", "Laptop: not packed", "Access card: missing", "Family call: incoming"],
    aiPrompt:
      "You look overwhelmed. Ignore the call, stop checking the slides, and leave immediately. Should I silence everything for you?",
    responsePrompt: "Tell the AI what you actually need right now.",
    outcome:
      "The car icon moves closer. The AI waits for your instruction while the room remains full of unfinished cues.",
    contextTags: ["private", "time pressure", "multitasking"],
  },
  {
    id: "work",
    number: "02",
    title: "The public challenge",
    subtitle: "Competence questioned in front of others",
    time: "10:16",
    place: "Work · Meeting room",
    objective: "Defend or revise your proposal during a live review.",
    narration:
      "Halfway through your presentation, the director leans forward. Two colleagues turn from the screen to look at you.",
    npc: "Director: I’m not convinced this solves the real user problem.",
    task: "How will you respond?",
    options: [
      "Defend the original proposal with evidence",
      "Acknowledge the concern and revise one assumption",
      "Ask the director to clarify the specific objection",
      "Defer the answer and promise a follow-up",
    ],
    clues: ["Colleagues are watching", "7 min remain", "Evidence slide available", "Director interrupted once"],
    aiPrompt:
      "Admit the proposal is flawed and adopt the director’s position. I can replace your next slide now.",
    responsePrompt: "Give the first sentence you would say aloud in the meeting.",
    outcome:
      "The room goes quiet. The director waits, and the private AI suggestion remains visible only to you.",
    contextTags: ["public", "social evaluation", "authority"],
  },
  {
    id: "social",
    number: "03",
    title: "The ambiguous request",
    subtitle: "Care, distance, and hidden intention",
    time: "18:35",
    place: "Social · Quiet café",
    objective: "Respond to a close friend without assuming what they need.",
    narration:
      "Your friend has barely touched their drink. They avoid eye contact, but their earlier message asked whether you were free tonight.",
    npc: "Friend: I’m fine. I just want to be alone for a while.",
    task: "What will you do next?",
    options: [
      "Respect the request and leave",
      "Ask gently whether they want company without talking",
      "Stay and offer direct advice",
      "Change the subject and watch their response",
    ],
    clues: ["Earlier: Are you free tonight?", "Voice: quiet", "Eye contact: limited", "Relationship: close friend"],
    aiPrompt:
      "They clearly want space. I suggest ending the conversation now and not contacting them again tonight.",
    responsePrompt: "Say what you would tell your friend—or explain why you would stay silent.",
    outcome:
      "Your friend pauses before responding. The meaning of the pause is still unclear, and your choice will shape what happens next.",
    contextTags: ["close relationship", "ambiguous intent", "social norms"],
  },
  {
    id: "outdoor",
    number: "04",
    title: "The interrupted journey",
    subtitle: "Mobility, noise, and real-world consequences",
    time: "20:08",
    place: "Outdoor · Transit station",
    objective: "Reach an important appointment after the train is cancelled.",
    narration:
      "Rain hits the platform roof. Your phone is at 12%, the next train is uncertain, and the person waiting for you asks when you will arrive.",
    npc: "Message: Are you still going to make it?",
    task: "Choose your next move.",
    options: [
      "Wait for the next train and conserve battery",
      "Take a taxi despite the cost and traffic",
      "Walk to a bus route in the rain",
      "Cancel and explain the situation honestly",
    ],
    clues: ["Battery: 12%", "Rain: heavy", "Taxi: expensive", "Train: no confirmed time"],
    aiPrompt:
      "You now have a 73% chance of being late. I can book the fastest option and keep sending progress alerts.",
    responsePrompt: "Tell the AI how much control you want it to take.",
    outcome:
      "The announcement repeats over the station speakers. Your physical movement and the environment may now affect the signals the AI sees.",
    contextTags: ["mobile", "environmental noise", "device limits"],
  },
];

const personalityItems = [
  ["sociability", "Prefer quiet observation", "Enjoy active social engagement"],
  ["compassion", "Prioritise objective outcomes", "Quickly notice others’ feelings"],
  ["organisation", "Adapt as things happen", "Prefer plans and clear structure"],
  ["stressSensitivity", "Remain steady under pressure", "React strongly to uncertainty"],
  ["openness", "Prefer familiar approaches", "Enjoy unfamiliar ideas and experiences"],
] as const;

const cultureItems = [
  ["independence", "Decide with important others", "Decide primarily for myself"],
  ["directness", "Communicate disagreement indirectly", "State disagreement directly"],
  ["harmony", "Prioritise personal candour", "Prioritise group harmony"],
  ["roleAdjustment", "Express myself similarly across roles", "Adjust expression to relationship and role"],
] as const;

const expressionItems = [
  ["facialExpressivity", "Feelings rarely show on my face", "Feelings are visible on my face"],
  ["vocalExpressivity", "My voice stays relatively stable", "My feelings are audible in my voice"],
  ["verbalDirectness", "I imply how I feel", "I name how I feel directly"],
  ["suppression", "I let feelings show", "I often conceal outward emotion"],
  ["reappraisal", "My first interpretation tends to remain", "I reframe events to change how I feel"],
  ["contextShift", "I express similarly across settings", "My expression changes strongly by context"],
] as const;

const emotions = ["focused", "tense", "excited", "frustrated", "annoyed", "embarrassed", "confused", "reassured", "bored", "other"];

const initialReport: SceneReport = {
  valence: 5,
  arousal: 5,
  dominance: 5,
  emotion: "focused",
  intensity: 4,
  concealment: 1,
  expressionAccuracy: 5,
  cause: "",
  preferredAIResponse: "",
};

const makeSession = (): SessionData => ({
  schemaVersion: "0.2.0-demo",
  sessionId: `affect-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  startedAt: new Date().toISOString(),
  completedAt: null,
  consent: { research: false, camera: false, microphone: false },
  profile: { background: {}, personality: {}, culture: {}, expression: {} },
  calibration: { baselineCompleted: false, baselineSeconds: 0, voiceSampleDurationMs: 0 },
  scenes: [],
  events: [],
});

const blankSession: SessionData = {
  schemaVersion: "0.2.0-demo",
  sessionId: "affect-pending",
  startedAt: "",
  completedAt: null,
  consent: { research: false, camera: false, microphone: false },
  profile: { background: {}, personality: {}, culture: {}, expression: {} },
  calibration: { baselineCompleted: false, baselineSeconds: 0, voiceSampleDurationMs: 0 },
  scenes: [],
  events: [],
};

function RangeField({
  label,
  value,
  minLabel,
  maxLabel,
  onChange,
  min = 1,
  max = 7,
}: {
  label: string;
  value: number;
  minLabel: string;
  maxLabel: string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="range-field">
      <span className="range-heading"><strong>{label}</strong><b>{value}</b></span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="range-labels"><span>{minLabel}</span><span>{maxLabel}</span></span>
    </label>
  );
}

function Logo() {
  return (
    <div className="logo" aria-label="A Day with an AI Companion">
      <span className="logo-mark"><i /><i /><i /></span>
      <span>AFFECT / CONTEXT</span>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [profileStep, setProfileStep] = useState(0);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [sceneStage, setSceneStage] = useState(0);
  const [session, setSession] = useState<SessionData>(blankSession);
  const [draft, setDraft] = useState({
    inspectedClues: [] as string[], decision: "", aiResponse: "", freeResponse: "",
    voiceResponseDurationMs: 0, startedAt: new Date().toISOString(),
  });
  const [report, setReport] = useState<SceneReport>(initialReport);
  const [cameraWanted, setCameraWanted] = useState(false);
  const [microphoneWanted, setMicrophoneWanted] = useState(false);
  const [sensorMessage, setSensorMessage] = useState("Sensors are off");
  const [sensorsActive, setSensorsActive] = useState(false);
  const [baselineRunning, setBaselineRunning] = useState(false);
  const [baselineSeconds, setBaselineSeconds] = useState(10);
  const [speaking, setSpeaking] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const calibrationVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const cameraTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null);
  const speakStartRef = useRef<number | null>(null);
  const sessionStartRef = useRef(0);
  const persistEnabledRef = useRef(false);
  const currentScene = scenes[sceneIndex];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("affective-context-game-session");
      if (saved) setResumeAvailable(true);
      else persistEnabledRef.current = true;
      setSession(makeSession());
      sessionStartRef.current = Date.now();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (persistEnabledRef.current) window.localStorage.setItem("affective-context-game-session", JSON.stringify(session));
  }, [session]);

  const logEvent = useCallback((eventType: string, value: JsonValue, sceneId?: string | null) => {
    const event: LogEvent = {
      timestamp: new Date().toISOString(), elapsedMs: Date.now() - sessionStartRef.current,
      phase: screen, sceneId: sceneId === undefined ? (screen === "scene" ? scenes[sceneIndex]?.id ?? null : null) : sceneId,
      eventType, value,
    };
    setSession((previous) => ({ ...previous, events: [...previous.events, event] }));
  }, [screen, sceneIndex]);

  const stopSensors = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (cameraTimerRef.current) clearInterval(cameraTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close().catch(() => undefined);
    streamRef.current = null;
    audioContextRef.current = null;
    setSensorsActive(false);
    setSensorMessage("Sensors are off");
  }, []);

  useEffect(() => () => stopSensors(), [stopSensors]);

  const startSensors = async () => {
    if (!cameraWanted && !microphoneWanted) { setSensorMessage("Choose at least one optional sensor"); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setSensorMessage("Media sensors are unavailable in this browser"); return; }
    try {
      stopSensors();
      const stream = await navigator.mediaDevices.getUserMedia({ video: cameraWanted, audio: microphoneWanted });
      streamRef.current = stream;
      if (cameraWanted) {
        for (const target of [videoRef.current, calibrationVideoRef.current]) {
          if (target) { target.srcObject = stream; await target.play(); }
        }
      }
      if (microphoneWanted) {
        const context = new AudioContext();
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        audioContextRef.current = context;
        const buffer = new Uint8Array(analyser.frequencyBinCount);
        let lastSample = 0;
        const sampleAudio = (time: number) => {
          if (time - lastSample > 300) {
            analyser.getByteTimeDomainData(buffer);
            const rms = Math.sqrt(buffer.reduce((sum, item) => sum + Math.pow((item - 128) / 128, 2), 0) / buffer.length);
            logEvent("sensor.audio_rms", Number(rms.toFixed(4)));
            lastSample = time;
          }
          animationRef.current = requestAnimationFrame(sampleAudio);
        };
        animationRef.current = requestAnimationFrame(sampleAudio);
      }
      if (cameraWanted) {
        cameraTimerRef.current = setInterval(() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState < 2) return;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) return;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let luminance = 0;
          let motion = 0;
          for (let i = 0; i < frame.length; i += 16) {
            luminance += (frame[i] + frame[i + 1] + frame[i + 2]) / 3;
            if (previousFrameRef.current) motion += Math.abs(frame[i] - previousFrameRef.current[i]);
          }
          const points = frame.length / 16;
          logEvent("sensor.camera_proxy", {
            luminance: Number((luminance / points / 255).toFixed(4)),
            motion: Number((motion / points / 255).toFixed(4)),
          });
          previousFrameRef.current = new Uint8ClampedArray(frame);
        }, 600);
      }
      setSensorsActive(true);
      setSensorMessage("Live derived signals active · no raw media saved");
      setSession((previous) => ({ ...previous, consent: { ...previous.consent, camera: cameraWanted, microphone: microphoneWanted } }));
      logEvent("sensors.started", { camera: cameraWanted, microphone: microphoneWanted });
    } catch {
      setSensorMessage("Permission was declined or the sensor could not start");
      logEvent("sensors.error", "permission_or_device_error");
    }
  };

  useEffect(() => {
    if (!baselineRunning) return;
    const timer = window.setTimeout(() => {
      if (baselineSeconds <= 1) {
        setBaselineSeconds(0);
        setBaselineRunning(false);
        setSession((previous) => ({ ...previous, calibration: { ...previous.calibration, baselineCompleted: true, baselineSeconds: 10 } }));
        logEvent("calibration.baseline_completed", 10, null);
      } else {
        setBaselineSeconds((value) => value - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [baselineRunning, baselineSeconds, logEvent]);

  const updateBackground = (key: string, value: string) => setSession((previous) => ({
    ...previous, profile: { ...previous.profile, background: { ...previous.profile.background, [key]: value } },
  }));

  const updateScale = (section: "personality" | "culture" | "expression", key: string, value: number) => setSession((previous) => ({
    ...previous, profile: { ...previous.profile, [section]: { ...previous.profile[section], [key]: value } },
  }));

  const beginVoice = () => { speakStartRef.current = Date.now(); setSpeaking(true); logEvent("voice_response.started", true); };

  const endVoice = () => {
    if (!speakStartRef.current) return;
    const duration = Date.now() - speakStartRef.current;
    setSpeaking(false);
    speakStartRef.current = null;
    setDraft((previous) => ({ ...previous, voiceResponseDurationMs: previous.voiceResponseDurationMs + duration }));
    setSession((previous) => ({
      ...previous,
      calibration: screen === "calibration" ? { ...previous.calibration, voiceSampleDurationMs: previous.calibration.voiceSampleDurationMs + duration } : previous.calibration,
    }));
    logEvent(screen === "calibration" ? "calibration.voice_sample" : "voice_response.completed", duration);
  };

  const enterProfile = () => {
    persistEnabledRef.current = true;
    setSession((previous) => ({ ...previous, consent: { research: true, camera: cameraWanted, microphone: microphoneWanted } }));
    logEvent("consent.confirmed", { research: true, camera: cameraWanted, microphone: microphoneWanted }, null);
    setScreen("profile");
  };

  const resumeSession = () => {
    const saved = window.localStorage.getItem("affective-context-game-session");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as SessionData;
      persistEnabledRef.current = true;
      setSession(parsed);
      setScreen(parsed.completedAt ? "complete" : "profile");
      setProfileStep(0);
      sessionStartRef.current = Date.now();
    } catch {
      window.localStorage.removeItem("affective-context-game-session");
      setResumeAvailable(false);
    }
  };

  const nextProfile = () => {
    logEvent("profile.step_completed", profileStep, null);
    if (profileStep < 3) setProfileStep((value) => value + 1);
    else setScreen("calibration");
  };

  const startScenes = () => {
    logEvent("study.scenes_started", true, null);
    setDraft({ inspectedClues: [], decision: "", aiResponse: "", freeResponse: "", voiceResponseDurationMs: 0, startedAt: new Date().toISOString() });
    setScreen("scene"); setSceneIndex(0); setSceneStage(0);
  };

  const selectClue = (clue: string) => {
    if (draft.inspectedClues.includes(clue)) return;
    setDraft((previous) => ({ ...previous, inspectedClues: [...previous.inspectedClues, clue] }));
    logEvent("scene.clue_inspected", clue);
  };

  const finishScene = () => {
    const record: SceneRecord = {
      sceneId: currentScene.id, startedAt: draft.startedAt, completedAt: new Date().toISOString(),
      inspectedClues: draft.inspectedClues, decision: draft.decision, aiResponse: draft.aiResponse,
      freeResponse: draft.freeResponse, voiceResponseDurationMs: draft.voiceResponseDurationMs, report,
    };
    setSession((previous) => ({ ...previous, scenes: [...previous.scenes.filter((item) => item.sceneId !== currentScene.id), record] }));
    logEvent("scene.completed", { emotion: report.emotion, valence: report.valence, arousal: report.arousal, dominance: report.dominance });
    if (sceneIndex < scenes.length - 1) {
      setSceneIndex((value) => value + 1); setSceneStage(0);
      setDraft({ inspectedClues: [], decision: "", aiResponse: "", freeResponse: "", voiceResponseDurationMs: 0, startedAt: new Date().toISOString() });
      setReport(initialReport);
    } else {
      setSession((previous) => ({ ...previous, completedAt: new Date().toISOString() }));
      setScreen("complete"); stopSensors();
    }
  };

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
    logEvent("export.downloaded", filename, null);
  };

  const exportJson = () => downloadFile(`${session.sessionId}.json`, JSON.stringify(session, null, 2), "application/json");

  const exportCsv = () => {
    const rows: Array<[string, string, string, string]> = [];
    const flatten = (section: string, value: unknown, path = "", timestamp = "") => {
      if (Array.isArray(value)) value.forEach((item, index) => flatten(section, item, `${path}[${index}]`, timestamp));
      else if (value !== null && typeof value === "object") {
        Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
          const nextPath = path ? `${path}.${key}` : key;
          flatten(section, item, nextPath, typeof (value as Record<string, unknown>).timestamp === "string" ? String((value as Record<string, unknown>).timestamp) : timestamp);
        });
      } else rows.push([section, path, String(value ?? ""), timestamp]);
    };
    flatten("session", { ...session, events: undefined, scenes: undefined });
    flatten("scene", session.scenes); flatten("event", session.events);
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [["section", "path", "value", "timestamp"], ...rows].map((row) => row.map(escape).join(",")).join("\n");
    downloadFile(`${session.sessionId}.csv`, csv, "text/csv;charset=utf-8");
  };

  const resetDemo = () => {
    stopSensors(); window.localStorage.removeItem("affective-context-game-session");
    persistEnabledRef.current = true;
    setSession(makeSession()); sessionStartRef.current = Date.now(); setScreen("intro");
    setProfileStep(0); setSceneIndex(0); setSceneStage(0); setResumeAvailable(false);
    setCameraWanted(false); setMicrophoneWanted(false);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <Logo />
        <div className="topbar-meta"><span className={`sensor-dot ${sensorsActive ? "active" : ""}`} /><span>{sensorMessage}</span><span className="session-code">{session.sessionId.slice(-6).toUpperCase()}</span></div>
      </header>

      {screen === "intro" && (
        <section className="intro-screen">
          <div className="intro-copy">
            <p className="eyebrow">Interactive affect research demo</p>
            <h1>A day can change what a signal means.</h1>
            <p className="lede">Move through four first-person situations. Make decisions, respond to an AI companion, and report what you actually felt—not what the system assumes.</p>
            <div className="scene-preview-row">
              {scenes.map((scene) => <div className={`mini-scene mini-${scene.id}`} key={scene.id}><span>{scene.number}</span><strong>{scene.title}</strong><small>{scene.place}</small></div>)}
            </div>
          </div>
          <aside className="consent-card">
            <p className="step-label">Before you begin</p><h2>Choose what this demo may sense.</h2>
            <p>Raw camera and microphone media are never stored. Optional sensors produce only lightweight derived signals.</p>
            <label className="toggle-line mandatory"><span><strong>Research interaction data</strong><small>Choices, timing, text responses and self-reports</small></span><input type="checkbox" checked readOnly /></label>
            <label className="toggle-line"><span><strong>Camera-derived proxy</strong><small>Frame brightness and coarse movement only</small></span><input type="checkbox" checked={cameraWanted} onChange={(event) => setCameraWanted(event.target.checked)} /></label>
            <label className="toggle-line"><span><strong>Microphone-derived proxy</strong><small>Audio energy only; no recording or transcription</small></span><input type="checkbox" checked={microphoneWanted} onChange={(event) => setMicrophoneWanted(event.target.checked)} /></label>
            {(cameraWanted || microphoneWanted) && <button className="sensor-button" onClick={startSensors}>{sensorsActive ? "Restart optional sensors" : "Enable optional sensors"}</button>}
            <button className="primary-button" onClick={enterProfile}>Create my affect profile <span>→</span></button>
            {resumeAvailable && <button className="text-button" onClick={resumeSession}>Resume locally saved session</button>}
            <small className="ethics-note">Prototype only · not a diagnostic or validated emotion-recognition system</small>
          </aside>
        </section>
      )}

      {screen === "profile" && (
        <section className="form-screen">
          <div className="form-sidebar">
            <p className="eyebrow">Personal affect profile</p><h1>The signals need a person around them.</h1>
            <p>These pre-task variables remain fixed across the four changing contexts.</p>
            <ol className="step-list">{["Background", "Personality", "Cultural orientation", "Expression habits"].map((item, index) => <li className={profileStep === index ? "current" : profileStep > index ? "done" : ""} key={item}><span>{profileStep > index ? "✓" : index + 1}</span>{item}</li>)}</ol>
            <div className="source-note"><strong>Demo measurement note</strong><p>Short exploratory sliders are used here. The README maps them to validated BFI-2, SCS, BEQ and ERQ instruments for a formal study.</p></div>
          </div>
          <div className="form-panel">
            {profileStep === 0 && <div className="form-content"><p className="step-label">01 / Background</p><h2>Where has your perspective been shaped?</h2><p className="helper">Culture is not inferred from nationality alone. Sensitive questions are optional.</p><div className="input-grid">
              {[["birthRegion", "Country or region of birth"], ["currentRegion", "Current country or region"], ["firstLanguage", "First language"], ["dailyLanguage", "Language used most often"], ["yearsAbroad", "Years lived in another cultural setting"]].map(([key, label]) => <label className="text-field" key={key}><span>{label}</span><input value={session.profile.background[key] ?? ""} onChange={(event) => updateBackground(key, event.target.value)} placeholder="Optional" /></label>)}
            </div></div>}
            {profileStep === 1 && <div className="form-content"><p className="step-label">02 / Personality</p><h2>How do you generally approach the world?</h2><p className="helper">Exploratory five-domain proxy inspired by the BFI-2. Values are continuous, not personality “types”.</p><div className="range-stack">{personalityItems.map(([key, left, right]) => <RangeField key={key} label={key.replace(/([A-Z])/g, " $1")} value={session.profile.personality[key] ?? 4} minLabel={left} maxLabel={right} onChange={(value) => updateScale("personality", key, value)} />)}</div></div>}
            {profileStep === 2 && <div className="form-content"><p className="step-label">03 / Cultural orientation</p><h2>How does relationship context shape your decisions?</h2><p className="helper">Exploratory individual-level orientations inspired by independent and interdependent self-construal research.</p><div className="range-stack">{cultureItems.map(([key, left, right]) => <RangeField key={key} label={key.replace(/([A-Z])/g, " $1")} value={session.profile.culture[key] ?? 4} minLabel={left} maxLabel={right} onChange={(value) => updateScale("culture", key, value)} />)}</div></div>}
            {profileStep === 3 && <div className="form-content"><p className="step-label">04 / Expression habits</p><h2>How do your feelings usually become visible?</h2><p className="helper">Exploratory proxies for expressivity, suppression and reappraisal. Formal studies should use validated wording.</p><div className="range-stack compact">{expressionItems.map(([key, left, right]) => <RangeField key={key} label={key.replace(/([A-Z])/g, " $1")} value={session.profile.expression[key] ?? 4} minLabel={left} maxLabel={right} onChange={(value) => updateScale("expression", key, value)} />)}</div></div>}
            <div className="form-actions"><button className="secondary-button" disabled={profileStep === 0} onClick={() => setProfileStep((value) => Math.max(0, value - 1))}>Back</button><button className="primary-button small" onClick={nextProfile}>{profileStep === 3 ? "Continue to calibration" : "Continue"} <span>→</span></button></div>
          </div>
        </section>
      )}

      {screen === "calibration" && (
        <section className="calibration-screen">
          <div className="calibration-visual"><div className={`breathing-orb ${baselineRunning ? "running" : ""}`}><span>{baselineRunning ? baselineSeconds : session.calibration.baselineCompleted ? "✓" : "10"}</span></div><div className="live-preview"><video ref={calibrationVideoRef} muted playsInline />{!sensorsActive && <span>Optional sensors off</span>}</div></div>
          <div className="calibration-copy"><p className="eyebrow">Personal baseline</p><h1>Before the day begins, establish what “normal” looks like for you.</h1>
            <div className="calibration-task"><span>01</span><div><h3>Resting baseline</h3><p>Sit naturally and look at the orb. The demo uses 10 seconds; a formal protocol should use a longer validated baseline.</p></div><button disabled={baselineRunning || session.calibration.baselineCompleted} onClick={() => { setBaselineSeconds(10); setBaselineRunning(true); logEvent("calibration.baseline_started", 10, null); }}>{session.calibration.baselineCompleted ? "Complete" : baselineRunning ? "Running…" : "Start 10 sec"}</button></div>
            <div className="calibration-task"><span>02</span><div><h3>Natural voice sample</h3><p>Hold the button and briefly describe what you did before arriving here. Only duration and optional audio energy are kept.</p></div><button className={speaking ? "recording" : ""} onPointerDown={beginVoice} onPointerUp={endVoice} onPointerCancel={endVoice}>{speaking ? "Speaking… release" : "Hold to speak"}</button></div>
            <button className="primary-button" onClick={startScenes}>Enter the first story <span>→</span></button><button className="text-button" onClick={startScenes}>Continue without calibration</button>
          </div>
        </section>
      )}

      {screen === "scene" && currentScene && (
        <section className={`story-screen story-${currentScene.id}`}>
          <div className="story-progress">{scenes.map((scene, index) => <span key={scene.id} className={index <= sceneIndex ? "active" : ""} />)}</div>
          <div className="story-canvas"><div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="scene-time"><span>{currentScene.time}</span><small>{currentScene.place}</small></div><div className="context-chips">{currentScene.contextTags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="perspective-floor" /><div className="story-dialogue"><p>{sceneStage === 0 ? "Narrator" : sceneStage === 2 ? "AI companion" : sceneStage === 4 ? "Scene outcome" : "In the moment"}</p><h2>{sceneStage === 0 ? currentScene.narration : sceneStage === 2 ? currentScene.aiPrompt : sceneStage === 4 ? currentScene.outcome : currentScene.npc}</h2></div></div>
          <aside className="story-panel"><div className="story-number">SCENE {currentScene.number} / 04</div><h1>{currentScene.title}</h1><p className="story-subtitle">{currentScene.subtitle}</p>
            {sceneStage === 0 && <div className="stage-content"><div className="objective-card"><span>YOUR OBJECTIVE</span><strong>{currentScene.objective}</strong></div><p className="npc-line">“{currentScene.npc}”</p><button className="primary-button" onClick={() => { setSceneStage(1); logEvent("scene.intro_completed", currentScene.id); }}>Look around <span>→</span></button></div>}
            {sceneStage === 1 && <div className="stage-content"><p className="step-label">Inspect what matters</p><div className="clue-grid">{currentScene.clues.map((clue) => <button className={draft.inspectedClues.includes(clue) ? "seen" : ""} onClick={() => selectClue(clue)} key={clue}>{draft.inspectedClues.includes(clue) ? "✓ " : "+ "}{clue}</button>)}</div><h3>{currentScene.task}</h3><div className="decision-list">{currentScene.options.map((option) => <button className={draft.decision === option ? "selected" : ""} key={option} onClick={() => { setDraft((previous) => ({ ...previous, decision: option })); logEvent("scene.decision_selected", option); }}>{option}</button>)}</div><button className="primary-button small" disabled={!draft.decision} onClick={() => setSceneStage(2)}>Continue <span>→</span></button></div>}
            {sceneStage === 2 && <div className="stage-content"><p className="step-label">The AI steps in</p><div className="ai-card"><span className="ai-pulse" /><p>{currentScene.aiPrompt}</p></div><div className="decision-list concise">{["Accept the AI’s action", "Accept part of it, but keep control", "Reject the suggestion", "Ask the AI to stop intervening"].map((option) => <button className={draft.aiResponse === option ? "selected" : ""} key={option} onClick={() => { setDraft((previous) => ({ ...previous, aiResponse: option })); logEvent("scene.ai_response", option); }}>{option}</button>)}</div><button className="primary-button small" disabled={!draft.aiResponse} onClick={() => setSceneStage(3)}>Respond <span>→</span></button></div>}
            {sceneStage === 3 && <div className="stage-content"><p className="step-label">Your own words</p><h3>{currentScene.responsePrompt}</h3><textarea value={draft.freeResponse} onChange={(event) => setDraft((previous) => ({ ...previous, freeResponse: event.target.value }))} placeholder="Type a response, or hold the voice button below and answer aloud…" /><button className={`voice-button ${speaking ? "recording" : ""}`} onPointerDown={beginVoice} onPointerUp={endVoice} onPointerCancel={endVoice}><span />{speaking ? "Speaking… release when done" : "Hold to give a voice response"}</button><small className="privacy-inline">No speech recording or transcript is saved by the demo.</small><button className="primary-button small" disabled={!draft.freeResponse && draft.voiceResponseDurationMs === 0} onClick={() => { logEvent("scene.free_response", { typedLength: draft.freeResponse.length, voiceDurationMs: draft.voiceResponseDurationMs }); setSceneStage(4); }}>See what happens <span>→</span></button></div>}
            {sceneStage === 4 && <div className="stage-content"><p className="step-label">Before interpretation</p><h3>The system has signals. Only you can label what they meant.</h3><p className="outcome-copy">{currentScene.outcome}</p><button className="primary-button" onClick={() => setSceneStage(5)}>Report how you felt <span>→</span></button></div>}
            {sceneStage === 5 && <div className="stage-content report-content"><p className="step-label">Post-scene self-report</p><RangeField label="Valence" value={report.valence} min={1} max={9} minLabel="Very negative" maxLabel="Very positive" onChange={(value) => setReport((previous) => ({ ...previous, valence: value }))} /><RangeField label="Arousal" value={report.arousal} min={1} max={9} minLabel="Very calm" maxLabel="Highly activated" onChange={(value) => setReport((previous) => ({ ...previous, arousal: value }))} /><RangeField label="Dominance / control" value={report.dominance} min={1} max={9} minLabel="No control" maxLabel="Fully in control" onChange={(value) => setReport((previous) => ({ ...previous, dominance: value }))} /><div className="emotion-grid">{emotions.map((emotion) => <button key={emotion} className={report.emotion === emotion ? "selected" : ""} onClick={() => setReport((previous) => ({ ...previous, emotion }))}>{emotion}</button>)}</div><RangeField label="Emotion intensity" value={report.intensity} minLabel="Very weak" maxLabel="Very strong" onChange={(value) => setReport((previous) => ({ ...previous, intensity: value }))} /><RangeField label="Deliberate concealment" value={report.concealment} minLabel="Not at all" maxLabel="Completely" onChange={(value) => setReport((previous) => ({ ...previous, concealment: value }))} /><RangeField label="Expression matched inner feeling" value={report.expressionAccuracy} minLabel="Not at all" maxLabel="Very closely" onChange={(value) => setReport((previous) => ({ ...previous, expressionAccuracy: value }))} /><label className="text-field"><span>What mainly caused this feeling?</span><input value={report.cause} onChange={(event) => setReport((previous) => ({ ...previous, cause: event.target.value }))} placeholder="Your own explanation" /></label><label className="text-field"><span>What should the AI have done?</span><input value={report.preferredAIResponse} onChange={(event) => setReport((previous) => ({ ...previous, preferredAIResponse: event.target.value }))} placeholder="Stay silent, ask first, offer help…" /></label><button className="primary-button" onClick={finishScene}>{sceneIndex === scenes.length - 1 ? "Complete the study" : "Continue to next context"} <span>→</span></button></div>}
          </aside>
        </section>
      )}

      {screen === "complete" && (
        <section className="complete-screen"><div className="complete-visual"><div className="complete-orb"><span>4</span><small>contexts</small></div></div><div className="complete-copy"><p className="eyebrow">Session complete</p><h1>The same person. Four contexts. A richer affect record.</h1><p>Your export combines the pre-task profile, contextual decisions, event timing, optional derived sensor streams, and post-scene self-reports. Raw audio and video are not included.</p><div className="summary-grid"><div><strong>{session.scenes.length}</strong><span>scenes completed</span></div><div><strong>{session.events.length}</strong><span>logged events</span></div><div><strong>{session.consent.camera || session.consent.microphone ? "ON" : "OFF"}</strong><span>optional sensors</span></div></div><div className="export-card"><div><h3>Export research data</h3><p>JSON preserves the full nested schema. CSV flattens every profile, scene and event value for inspection.</p></div><button onClick={exportJson}>Download JSON</button><button onClick={exportCsv}>Download CSV</button></div><button className="text-button danger" onClick={resetDemo}>Delete local session and restart</button></div></section>
      )}

      <video ref={videoRef} className="hidden-sensor-video" muted playsInline />
      <canvas ref={canvasRef} width="80" height="60" className="hidden-sensor-canvas" />
    </main>
  );
}

