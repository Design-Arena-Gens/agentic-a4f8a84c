"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function toBase64Url(str) {
  if (typeof window === "undefined") return "";
  return btoa(unescape(encodeURIComponent(str)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", ".");
}
function fromBase64Url(str) {
  if (!str) return "";
  try {
    const b64 = str.replaceAll("-", "+").replaceAll("_", "/").replaceAll(".", "=");
    return decodeURIComponent(escape(atob(b64)));
  } catch (e) { return ""; }
}

const initialProject = () => ({
  model: "veo-3.1",
  title: "Untitled Project",
  description: "",
  aspectRatio: "16:9",
  durationSec: 30,
  fps: 24,
  seed: "",
  characters: [],
  locations: [],
  scenes: [],
  cinematography: {
    look: { grade: "Kodak 5219 emulation", saturation: "medium", contrast: "medium-high", filmGrain: "subtle" },
    cameraBody: "ARRI Alexa Mini LF",
    lensSet: "Cooke S4/i Primes",
    colorPalette: "Teal & Orange",
    references: []
  },
  constraints: {
    safety: "Avoid harmful content; maintain brand-safe output.",
    content: "No explicit content. No violence beyond PG-13.",
    brand: "Cinematic, polished, premium texture."
  },
  output: { format: "json", version: "1.0" }
});

function reducer(state, action) {
  switch (action.type) {
    case "set":
      return { ...state, ...action.payload };
    case "title":
      return { ...state, title: action.value };
    case "description":
      return { ...state, description: action.value };
    case "aspect":
      return { ...state, aspectRatio: action.value };
    case "duration":
      return { ...state, durationSec: Number(action.value) || 0 };
    case "fps":
      return { ...state, fps: Number(action.value) || 24 };
    case "seed":
      return { ...state, seed: action.value };

    case "add_character":
      return { ...state, characters: [...state.characters, { id: uid("char"), name: "", role: "", description: "", appearance: "", wardrobe: "", voice: "", personality: "", consistencyTags: [] }] };
    case "update_character": {
      const { id, key, value } = action;
      return { ...state, characters: state.characters.map(c => c.id === id ? { ...c, [key]: value } : c) };
    }
    case "remove_character":
      return { ...state, characters: state.characters.filter(c => c.id !== action.id) };

    case "add_location":
      return { ...state, locations: [...state.locations, { id: uid("loc"), name: "", description: "", timeOfDay: "day", weather: "clear" }] };
    case "update_location": {
      const { id, key, value } = action;
      return { ...state, locations: state.locations.map(l => l.id === id ? { ...l, [key]: value } : l) };
    }
    case "remove_location":
      return { ...state, locations: state.locations.filter(l => l.id !== action.id) };

    case "add_scene":
      return { ...state, scenes: [...state.scenes, { id: uid("scn"), name: "Scene", synopsis: "", locationId: state.locations[0]?.id || "", continuityNotes: "", shots: [] }] };
    case "update_scene": {
      const { id, key, value } = action;
      return { ...state, scenes: state.scenes.map(s => s.id === id ? { ...s, [key]: value } : s) };
    }
    case "remove_scene":
      return { ...state, scenes: state.scenes.filter(s => s.id !== action.id) };

    case "add_shot": {
      const { sceneId } = action;
      return {
        ...state,
        scenes: state.scenes.map(s => s.id === sceneId ? {
          ...s,
          shots: [...s.shots, {
            id: uid("sht"),
            description: "",
            durationSec: 3,
            characters: [],
            action: "",
            dialogue: "",
            camera: { framing: "medium", movement: "static", angle: "eye-level", lensMm: 35, focus: "subject", shutter: "180?", iso: 800, whiteBalance: "5600K" },
            lighting: { style: "soft key, moody fill", key: "key 45?", fill: "gentle", rim: "subtle", practicals: "warm practicals", colorTemp: "3200K", source: "softbox" },
            composition: { ruleOfThirds: true, symmetry: false, depth: "foreground elements" },
            vfx: { notes: "" },
            audio: { musicCue: "cinematic underscore", sfx: "", ambience: "" },
            transition: { type: "cut", toSceneId: "" }
          }]
        } : s)
      };
    }
    case "update_shot": {
      const { sceneId, shotId, key, value } = action;
      return {
        ...state,
        scenes: state.scenes.map(s => s.id === sceneId ? {
          ...s,
          shots: s.shots.map(sh => sh.id === shotId ? { ...sh, [key]: value } : sh)
        } : s)
      };
    }
    case "remove_shot": {
      const { sceneId, shotId } = action;
      return {
        ...state,
        scenes: state.scenes.map(s => s.id === sceneId ? { ...s, shots: s.shots.filter(sh => sh.id !== shotId) } : s)
      };
    }

    case "set_cine":
      return { ...state, cinematography: { ...state.cinematography, ...action.value } };
    case "set_cine_look":
      return { ...state, cinematography: { ...state.cinematography, look: { ...state.cinematography.look, ...action.value } } };

    case "auto_structure":
      return autoStructure(state, action.text);

    case "hydrate":
      return action.value || state;

    default:
      return state;
  }
}

function autoStructure(state, text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const next = { ...state };
  if (!next.characters.length) next.characters = [];
  if (!next.locations.length) next.locations = [];
  if (!next.scenes.length) next.scenes = [];

  let currentSceneId = null;
  let currentShotId = null;
  for (const raw of lines) {
    const line = raw;
    const lower = line.toLowerCase();
    if (lower.startsWith("title:")) { next.title = line.split(":").slice(1).join(":").trim(); continue; }
    if (lower.startsWith("description:")) { next.description = line.split(":").slice(1).join(":").trim(); continue; }

    if (lower.startsWith("character:")) {
      const name = line.split(":").slice(1).join(":").trim();
      next.characters.push({ id: uid("char"), name, role: "", description: "", appearance: "", wardrobe: "", voice: "", personality: "", consistencyTags: [] });
      continue;
    }
    if (lower.startsWith("location:")) {
      const name = line.split(":").slice(1).join(":").trim();
      const id = uid("loc");
      next.locations.push({ id, name, description: "", timeOfDay: "day", weather: "clear" });
      continue;
    }
    if (lower.startsWith("scene")) {
      const id = uid("scn");
      currentSceneId = id; currentShotId = null;
      next.scenes.push({ id, name: line.replace(/^scene\s*/i, '').trim() || `Scene ${next.scenes.length + 1}` , synopsis: "", locationId: next.locations[0]?.id || "", continuityNotes: "", shots: [] });
      continue;
    }
    if (lower.startsWith("shot")) {
      if (!currentSceneId) {
        const scnId = uid("scn");
        next.scenes.push({ id: scnId, name: `Scene ${next.scenes.length + 1}`, synopsis: "", locationId: next.locations[0]?.id || "", continuityNotes: "", shots: [] });
        currentSceneId = scnId;
      }
      const shotId = uid("sht");
      currentShotId = shotId;
      const sceneIndex = next.scenes.findIndex(s => s.id === currentSceneId);
      next.scenes[sceneIndex].shots.push({
        id: shotId,
        description: line.replace(/^shot\s*/i, '').trim(),
        durationSec: 3,
        characters: [],
        action: "",
        dialogue: "",
        camera: { framing: "medium", movement: "static", angle: "eye-level", lensMm: 35, focus: "subject", shutter: "180?", iso: 800, whiteBalance: "5600K" },
        lighting: { style: "soft key, moody fill", key: "key 45?", fill: "gentle", rim: "subtle", practicals: "warm practicals", colorTemp: "3200K", source: "softbox" },
        composition: { ruleOfThirds: true, symmetry: false, depth: "foreground elements" },
        vfx: { notes: "" },
        audio: { musicCue: "cinematic underscore", sfx: "", ambience: "" },
        transition: { type: "cut", toSceneId: "" }
      });
      continue;
    }
    // Heuristics
    if (currentShotId && /\b(dolly|pan|tilt|handheld|steadicam|gimbal)\b/i.test(line)) {
      const sIdx = next.scenes.findIndex(s => s.id === currentSceneId);
      const shIdx = next.scenes[sIdx].shots.findIndex(sh => sh.id === currentShotId);
      next.scenes[sIdx].shots[shIdx].camera.movement = line.toLowerCase();
      continue;
    }
    if (currentShotId && /\bcu\b|close[- ]up|medium|wide/i.test(line)) {
      const sIdx = next.scenes.findIndex(s => s.id === currentSceneId);
      const shIdx = next.scenes[sIdx].shots.findIndex(sh => sh.id === currentShotId);
      next.scenes[sIdx].shots[shIdx].camera.framing = line;
      continue;
    }
    if (currentShotId && /\bcut to|fade|dissolve|wipe\b/i.test(line)) {
      const sIdx = next.scenes.findIndex(s => s.id === currentSceneId);
      const shIdx = next.scenes[sIdx].shots.findIndex(sh => sh.id === currentShotId);
      next.scenes[sIdx].shots[shIdx].transition.type = line;
      continue;
    }
    if (currentSceneId && !currentShotId) {
      const sIdx = next.scenes.findIndex(s => s.id === currentSceneId);
      next.scenes[sIdx].synopsis = (next.scenes[sIdx].synopsis ? next.scenes[sIdx].synopsis + ' ' : '') + line;
      continue;
    }
    if (currentShotId) {
      const sIdx = next.scenes.findIndex(s => s.id === currentSceneId);
      const shIdx = next.scenes[sIdx].shots.findIndex(sh => sh.id === currentShotId);
      if (/^\(/.test(line) || /dialogue:/i.test(line)) {
        next.scenes[sIdx].shots[shIdx].dialogue += (next.scenes[sIdx].shots[shIdx].dialogue ? "\n" : "") + line.replace(/dialogue:/i, '').trim();
      } else if (/^music:/i.test(line)) {
        next.scenes[sIdx].shots[shIdx].audio.musicCue = line.split(":").slice(1).join(":").trim();
      } else if (/^action:/i.test(line)) {
        next.scenes[sIdx].shots[shIdx].action += (next.scenes[sIdx].shots[shIdx].action ? "\n" : "") + line.split(":").slice(1).join(":").trim();
      } else {
        next.scenes[sIdx].shots[shIdx].description += (next.scenes[sIdx].shots[shIdx].description ? " " : "") + line;
      }
      continue;
    }
  }
  return next;
}

function validateProject(p) {
  const warnings = [];
  if (!p.title?.trim()) warnings.push("Project title is empty.");
  if (!p.scenes.length) warnings.push("Add at least one scene.");
  p.scenes.forEach((s, si) => {
    if (!s.shots.length) warnings.push(`Scene ${si + 1} has no shots.`);
    s.shots.forEach((sh, shi) => {
      if (!sh.description?.trim() && !sh.action?.trim()) warnings.push(`Scene ${si + 1} Shot ${shi + 1} has no description.`);
    });
  });
  // Character consistency check
  const charIds = new Set(p.characters.map(c => c.id));
  p.scenes.forEach((s, si) => s.shots.forEach((sh, shi) => {
    (sh.characters || []).forEach(ch => { if (!charIds.has(ch)) warnings.push(`Scene ${si + 1} Shot ${shi + 1} references missing character.`); });
  }));
  return warnings;
}

export default function Page() {
  const [state, dispatch] = useReducer(reducer, undefined, initialProject);
  const [ideas, setIdeas] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Hydrate from URL hash if any
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      const json = fromBase64Url(hash);
      if (json) {
        try { dispatch({ type: "hydrate", value: JSON.parse(json) }); }
        catch {}
      }
    }
  }, []);

  const jsonOutput = useMemo(() => JSON.stringify(state, null, 2), [state]);
  const warnings = useMemo(() => validateProject(state), [state]);

  function shareLink() {
    if (typeof window === "undefined") return;
    const enc = toBase64Url(JSON.stringify(state));
    const url = `${window.location.origin}${window.location.pathname}#${enc}`;
    navigator.clipboard?.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 1200);
  }
  function copyJson() {
    navigator.clipboard?.writeText(jsonOutput);
    setCopied(true); setTimeout(() => setCopied(false), 1200);
  }
  function downloadJson() {
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.title || 'veo-prompt'}.json`;
    a.click();
    setDownloaded(true); setTimeout(() => setDownloaded(false), 1200);
  }

  return (
    <div className="grid">
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Idea Intake ? Structure</div>
          <div className="chips">
            <span className="chip">Auto-structure</span>
            <span className="chip">Heuristics</span>
          </div>
        </div>
        <div className="panel-body">
          <div className="split">
            <div>
              <div className="field">
                <div className="label">Project Title</div>
                <input className="input" value={state.title} onChange={e => dispatch({ type: 'title', value: e.target.value })} placeholder="e.g., City of Lights" />
              </div>
              <div className="field">
                <div className="label">One-line Description</div>
                <input className="input" value={state.description} onChange={e => dispatch({ type: 'description', value: e.target.value })} placeholder="Premium, cinematic short with consistent protagonists" />
              </div>
              <div className="row">
                <div className="field" style={{flex:1}}>
                  <div className="label">Aspect Ratio</div>
                  <select className="select" value={state.aspectRatio} onChange={e => dispatch({ type: 'aspect', value: e.target.value })}>
                    <option>16:9</option>
                    <option>9:16</option>
                    <option>1:1</option>
                    <option>2.39:1</option>
                  </select>
                </div>
                <div className="field" style={{flex:1}}>
                  <div className="label">Duration (sec)</div>
                  <input type="number" className="input" value={state.durationSec} onChange={e => dispatch({ type: 'duration', value: e.target.value })} />
                </div>
                <div className="field" style={{flex:1}}>
                  <div className="label">FPS</div>
                  <input type="number" className="input" value={state.fps} onChange={e => dispatch({ type: 'fps', value: e.target.value })} />
                </div>
                <div className="field" style={{flex:1}}>
                  <div className="label">Seed (optional)</div>
                  <input className="input" value={state.seed} onChange={e => dispatch({ type: 'seed', value: e.target.value })} />
                </div>
              </div>
            </div>
            <div>
              <div className="field">
                <div className="label">Messy Ideas (paste anything)</div>
                <textarea className="textarea" value={ideas} onChange={e => setIdeas(e.target.value)} placeholder={`Examples:\nTitle: Neon Runner\nDescription: High-energy night chase in rain, Blade Runner vibes\nCharacter: Aya, the runner\nLocation: Tokyo backstreets, rain-slick neon\nScene 1: Aya darts through market\nShot: Wide establishing, neon signs, rain\nShot: Medium Aya sprinting, gimbal follow\nShot: CU sneakers splash in puddles\n`}></textarea>
              </div>
              <div className="row">
                <button className="btn" onClick={() => dispatch({ type: 'auto_structure', text: ideas })}>Auto-Structure</button>
                <button className="btn ghost" onClick={() => { setIdeas(""); }}>Clear</button>
              </div>
            </div>
          </div>

          <div className="hr" />

          <div className="section">
            <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div className="panel-title">Characters</div>
              <button className="btn secondary" onClick={() => dispatch({ type: 'add_character' })}>Add Character</button>
            </div>
            <div className="row">
              {state.characters.map((c) => (
                <div key={c.id} className="panel" style={{flex:1,minWidth:280}}>
                  <div className="panel-body">
                    <div className="field"><div className="label">Name</div><input className="input" value={c.name} onChange={e => dispatch({ type: 'update_character', id:c.id, key:'name', value:e.target.value })} /></div>
                    <div className="field"><div className="label">Role</div><input className="input" value={c.role} onChange={e => dispatch({ type: 'update_character', id:c.id, key:'role', value:e.target.value })} /></div>
                    <div className="field"><div className="label">Appearance</div><input className="input" value={c.appearance} onChange={e => dispatch({ type: 'update_character', id:c.id, key:'appearance', value:e.target.value })} /></div>
                    <div className="field"><div className="label">Wardrobe</div><input className="input" value={c.wardrobe} onChange={e => dispatch({ type: 'update_character', id:c.id, key:'wardrobe', value:e.target.value })} /></div>
                    <div className="field"><div className="label">Personality</div><input className="input" value={c.personality} onChange={e => dispatch({ type: 'update_character', id:c.id, key:'personality', value:e.target.value })} /></div>
                    <div className="row">
                      <button className="btn danger" onClick={() => dispatch({ type: 'remove_character', id:c.id })}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div className="panel-title">Locations</div>
              <button className="btn secondary" onClick={() => dispatch({ type: 'add_location' })}>Add Location</button>
            </div>
            <div className="row">
              {state.locations.map((l) => (
                <div key={l.id} className="panel" style={{flex:1,minWidth:260}}>
                  <div className="panel-body">
                    <div className="field"><div className="label">Name</div><input className="input" value={l.name} onChange={e => dispatch({ type: 'update_location', id:l.id, key:'name', value:e.target.value })} /></div>
                    <div className="field"><div className="label">Description</div><input className="input" value={l.description} onChange={e => dispatch({ type: 'update_location', id:l.id, key:'description', value:e.target.value })} /></div>
                    <div className="row">
                      <div className="field" style={{flex:1}}><div className="label">Time of Day</div><select className="select" value={l.timeOfDay} onChange={e => dispatch({ type: 'update_location', id:l.id, key:'timeOfDay', value:e.target.value })}><option>day</option><option>night</option><option>dusk</option><option>dawn</option></select></div>
                      <div className="field" style={{flex:1}}><div className="label">Weather</div><select className="select" value={l.weather} onChange={e => dispatch({ type: 'update_location', id:l.id, key:'weather', value:e.target.value })}><option>clear</option><option>rain</option><option>fog</option><option>snow</option></select></div>
                    </div>
                    <div className="row"><button className="btn danger" onClick={() => dispatch({ type: 'remove_location', id:l.id })}>Remove</button></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div className="panel-title">Scenes & Shots</div>
              <button className="btn secondary" onClick={() => dispatch({ type: 'add_scene' })}>Add Scene</button>
            </div>
            <div className="row" style={{flexDirection:'column', gap:12}}>
              {state.scenes.map((s) => (
                <div key={s.id} className="panel" style={{width:'100%'}}>
                  <div className="panel-body">
                    <div className="row">
                      <div className="field" style={{flex:1}}>
                        <div className="label">Scene Name</div>
                        <input className="input" value={s.name} onChange={e => dispatch({ type:'update_scene', id:s.id, key:'name', value:e.target.value })} />
                      </div>
                      <div className="field" style={{flex:1}}>
                        <div className="label">Location</div>
                        <select className="select" value={s.locationId} onChange={e => dispatch({ type:'update_scene', id:s.id, key:'locationId', value:e.target.value })}>
                          <option value="">Select...</option>
                          {state.locations.map(l => <option key={l.id} value={l.id}>{l.name || l.id}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="field"><div className="label">Synopsis</div><input className="input" value={s.synopsis} onChange={e => dispatch({ type:'update_scene', id:s.id, key:'synopsis', value:e.target.value })} /></div>
                    <div className="field"><div className="label">Continuity Notes</div><input className="input" value={s.continuityNotes} onChange={e => dispatch({ type:'update_scene', id:s.id, key:'continuityNotes', value:e.target.value })} /></div>

                    <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
                      <div className="small">Shots: {s.shots.length}</div>
                      <div className="row">
                        <button className="btn" onClick={() => dispatch({ type:'add_shot', sceneId:s.id })}>Add Shot</button>
                        <button className="btn danger" onClick={() => dispatch({ type:'remove_scene', id:s.id })}>Remove Scene</button>
                      </div>
                    </div>

                    <div className="row" style={{flexDirection:'column', gap:10}}>
                      {s.shots.map((sh) => (
                        <div key={sh.id} className="panel" style={{width:'100%', background:'var(--muted)'}}>
                          <div className="panel-body">
                            <div className="row">
                              <div className="field" style={{flex:2}}>
                                <div className="label">Description</div>
                                <input className="input" value={sh.description} onChange={e => dispatch({ type:'update_shot', sceneId:s.id, shotId:sh.id, key:'description', value:e.target.value })} />
                              </div>
                              <div className="field" style={{flex:1}}>
                                <div className="label">Duration (sec)</div>
                                <input type="number" className="input" value={sh.durationSec} onChange={e => dispatch({ type:'update_shot', sceneId:s.id, shotId:sh.id, key:'durationSec', value:Number(e.target.value)||0 })} />
                              </div>
                            </div>
                            <div className="row">
                              <div className="field" style={{flex:1}}>
                                <div className="label">Camera Framing</div>
                                <select className="select" value={sh.camera.framing} onChange={e => dispatch({ type:'update_shot', sceneId:s.id, shotId:sh.id, key:'camera', value:{...sh.camera, framing:e.target.value} })}>
                                  <option>wide</option><option>medium</option><option>close-up</option><option>extreme close-up</option>
                                </select>
                              </div>
                              <div className="field" style={{flex:1}}>
                                <div className="label">Movement</div>
                                <select className="select" value={sh.camera.movement} onChange={e => dispatch({ type:'update_shot', sceneId:s.id, shotId:sh.id, key:'camera', value:{...sh.camera, movement:e.target.value} })}>
                                  <option>static</option><option>dolly</option><option>pan</option><option>tilt</option><option>handheld</option><option>gimbal</option>
                                </select>
                              </div>
                              <div className="field" style={{flex:1}}>
                                <div className="label">Angle</div>
                                <select className="select" value={sh.camera.angle} onChange={e => dispatch({ type:'update_shot', sceneId:s.id, shotId:sh.id, key:'camera', value:{...sh.camera, angle:e.target.value} })}>
                                  <option>eye-level</option><option>low-angle</option><option>high-angle</option><option>dutch</option>
                                </select>
                              </div>
                              <div className="field" style={{flex:1}}>
                                <div className="label">Lens (mm)</div>
                                <input type="number" className="input" value={sh.camera.lensMm} onChange={e => dispatch({ type:'update_shot', sceneId:s.id, shotId:sh.id, key:'camera', value:{...sh.camera, lensMm:Number(e.target.value)||35} })} />
                              </div>
                            </div>
                            <div className="row">
                              <div className="field" style={{flex:1}}><div className="label">Lighting Style</div><input className="input" value={sh.lighting.style} onChange={e => dispatch({ type:'update_shot', sceneId:s.id, shotId:sh.id, key:'lighting', value:{...sh.lighting, style:e.target.value} })} /></div>
                              <div className="field" style={{flex:1}}><div className="label">Composition Depth</div><input className="input" value={sh.composition.depth} onChange={e => dispatch({ type:'update_shot', sceneId:s.id, shotId:sh.id, key:'composition', value:{...sh.composition, depth:e.target.value} })} /></div>
                            </div>
                            <div className="row">
                              <div className="field" style={{flex:1}}><div className="label">Action</div><input className="input" value={sh.action} onChange={e => dispatch({ type:'update_shot', sceneId:s.id, shotId:sh.id, key:'action', value:e.target.value })} /></div>
                              <div className="field" style={{flex:1}}><div className="label">Dialogue</div><input className="input" value={sh.dialogue} onChange={e => dispatch({ type:'update_shot', sceneId:s.id, shotId:sh.id, key:'dialogue', value:e.target.value })} /></div>
                            </div>
                            <div className="row">
                              <div className="field" style={{flex:1}}>
                                <div className="label">Characters in Shot</div>
                                <select multiple className="select" value={sh.characters} onChange={e => {
                                  const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                                  dispatch({ type:'update_shot', sceneId:s.id, shotId:sh.id, key:'characters', value:opts });
                                }}>
                                  {state.characters.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
                                </select>
                              </div>
                              <div className="field" style={{flex:1}}>
                                <div className="label">Transition</div>
                                <select className="select" value={sh.transition.type} onChange={e => dispatch({ type:'update_shot', sceneId:s.id, shotId:sh.id, key:'transition', value:{...sh.transition, type:e.target.value} })}>
                                  <option>cut</option><option>fade</option><option>dissolve</option><option>wipe</option>
                                </select>
                              </div>
                            </div>
                            <div className="row" style={{justifyContent:'flex-end'}}>
                              <button className="btn danger" onClick={() => dispatch({ type:'remove_shot', sceneId:s.id, shotId:sh.id })}>Remove Shot</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="panel-title">Global Cinematography</div>
            <div className="row">
              <div className="field" style={{flex:1}}><div className="label">Camera Body</div><input className="input" value={state.cinematography.cameraBody} onChange={e => dispatch({ type:'set_cine', value:{ cameraBody: e.target.value } })} /></div>
              <div className="field" style={{flex:1}}><div className="label">Lens Set</div><input className="input" value={state.cinematography.lensSet} onChange={e => dispatch({ type:'set_cine', value:{ lensSet: e.target.value } })} /></div>
              <div className="field" style={{flex:1}}><div className="label">Color Palette</div><input className="input" value={state.cinematography.colorPalette} onChange={e => dispatch({ type:'set_cine', value:{ colorPalette: e.target.value } })} /></div>
            </div>
            <div className="row">
              <div className="field" style={{flex:1}}><div className="label">Grade</div><input className="input" value={state.cinematography.look.grade} onChange={e => dispatch({ type:'set_cine_look', value:{ grade: e.target.value } })} /></div>
              <div className="field" style={{flex:1}}><div className="label">Saturation</div><input className="input" value={state.cinematography.look.saturation} onChange={e => dispatch({ type:'set_cine_look', value:{ saturation: e.target.value } })} /></div>
              <div className="field" style={{flex:1}}><div className="label">Contrast</div><input className="input" value={state.cinematography.look.contrast} onChange={e => dispatch({ type:'set_cine_look', value:{ contrast: e.target.value } })} /></div>
              <div className="field" style={{flex:1}}><div className="label">Film Grain</div><input className="input" value={state.cinematography.look.filmGrain} onChange={e => dispatch({ type:'set_cine_look', value:{ filmGrain: e.target.value } })} /></div>
            </div>
          </div>

          <div className="section">
            <div className="panel-title">Constraints</div>
            <div className="row">
              <div className="field" style={{flex:1}}><div className="label">Safety</div><input className="input" value={state.constraints.safety} onChange={e => dispatch({ type:'set', payload:{ constraints:{ ...state.constraints, safety:e.target.value } } })} /></div>
              <div className="field" style={{flex:1}}><div className="label">Content</div><input className="input" value={state.constraints.content} onChange={e => dispatch({ type:'set', payload:{ constraints:{ ...state.constraints, content:e.target.value } } })} /></div>
              <div className="field" style={{flex:1}}><div className="label">Brand</div><input className="input" value={state.constraints.brand} onChange={e => dispatch({ type:'set', payload:{ constraints:{ ...state.constraints, brand:e.target.value } } })} /></div>
            </div>
          </div>

          <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
            <div className="small">Warnings: {warnings.length ? warnings.join(' ? ') : 'None'}</div>
            <div className="row">
              <button className="btn" onClick={copyJson}>{copied ? 'Copied!' : 'Copy JSON'}</button>
              <button className="btn secondary" onClick={downloadJson}>{downloaded ? 'Saved!' : 'Download JSON'}</button>
              <button className="btn ghost" onClick={shareLink}>Share Link</button>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Structured JSON Prompt</div>
          <div className="small">Model: {state.model}</div>
        </div>
        <div className="panel-body scroll">
          <pre className="code">{jsonOutput}</pre>
          <div className="hr" />
          <div className="small">Tip: Use Copy or Download to integrate with your Veo 3.1 pipeline.</div>
        </div>
      </div>
    </div>
  );
}
