// Exercise media commands without installing a browser or additional test libraries.
// This checks controller behavior; it does not replace browser playback validation.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

function controller(file, name, options) {
  const slots = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: initial };
      return slots[i];
    },
    useEffect() {},
  };
  const context = {
    exports: {},
    require: id => {
      if (id === 'react') return react;
      if (id === '@components/Toast') return { toast: { warning: message => { throw new Error(message); } } };
      throw new Error(`Unexpected import: ${id}`);
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/pages/AdPlacementPage/hooks', file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return () => { cursor = 0; return context.exports[name](options); };
}

function media() {
  const element = () => ({
    currentTime: 0, duration: 10, paused: true, ended: false, volume: 1, muted: false,
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; },
  });
  return { source: { current: element() }, ad: { current: element() }, guide: { current: element() } };
}

const settings = {
  sourceVideo: 'master.mp4', greenScreenVideo: 'ad.mp4', guideAudio: '',
  adTrimStart: 0.5, adTrimEnd: 2.5, resolvedAdTrimEnd: 2.5, startAt: 1,
  pauseSource: true, guidePauseSource: true, guideMode: 'prelude', adVideoDelay: 0.5,
  guidePlaybackRate: 1.5, mode: 'plain-overlay', voiceoverEnabled: false,
  sourceVolumeDuringAd: 0.25, sourceVolumeDuringGuide: 0.25, guideVolumeTransitionDuration: 0.5,
  guidePlaybackDuration: 2, voiceoverLeadDuration: 2, guideDuration: 3,
};
const main = media();
const mainRender = controller('useTimelinePreview.ts', 'useTimelinePreview', {
  settings, media: main, timelinePreviewEnabled: true, guideCurrentTime: 0,
  getGuideDuckMultiplier: () => 1, setSourcePreviewPlaying: () => {},
});
main.source.current.currentTime = 1;
main.source.current.paused = false;
mainRender().startPausedAdPreviewIfNeeded();
assert.equal(mainRender().previewPhase, 'ad');
assert.equal(main.source.current.paused, true);
assert.equal(main.ad.current.currentTime, 0.5);
assert.equal(main.ad.current.paused, false);
main.ad.current.currentTime = 2.5;
mainRender().finishAdRangeIfNeeded();
assert.equal(mainRender().previewPhase, 'done');
assert.equal(main.source.current.paused, false);
mainRender().stopTimelinePreview();
assert.equal(mainRender().previewPhase, 'idle');
assert.equal(main.ad.current.currentTime, 0.5);

const subtitle = media();
const subtitleRender = controller('useSubtitlePreview.ts', 'useSubtitlePreview', {
  settings: { ...settings, guideAudio: 'lead.wav', guideMode: 'voiceover', voiceoverEnabled: true },
  media: subtitle, otherMedia: main,
  layers: { sourceAudio: false, guideAudio: false, adAudio: true },
  adAudioEnabled: true, adVolume: 1, getGuideDuckMultiplier: () => 1,
  prepareGuideAudio: () => {},
});
subtitleRender().startDedicatedSubtitlePreview();
assert.equal(subtitleRender().subtitlePreviewPhase, 'lead');
assert.equal(subtitle.guide.current.muted, true);
assert.equal(subtitle.guide.current.paused, false); // Muted layers still advance time.
assert.equal(subtitle.source.current.currentTime, 1);
subtitle.guide.current.currentTime = 0.75;
subtitleRender().updateDedicatedSubtitleTime(subtitle.guide.current);
assert.equal(subtitleRender().subtitlePreviewPhase, 'ad');
assert.equal(subtitle.ad.current.muted, true); // Voiceover overrides the ad audio switch.
subtitleRender().toggleDedicatedSubtitlePreview();
assert.equal(subtitleRender().subtitlePreviewPlaying, false);
assert.equal(subtitle.ad.current.paused, true);
subtitleRender().toggleDedicatedSubtitlePreview();
assert.equal(subtitleRender().subtitlePreviewPlaying, true);
assert.equal(subtitle.ad.current.paused, false);
assert.equal(subtitle.source.current.paused, true);
subtitle.ad.current.currentTime = 2.5;
subtitleRender().finishDedicatedAdPreview();
assert.equal(subtitleRender().subtitlePreviewPhase, 'done');
assert.equal(subtitle.guide.current.paused, true);
assert.equal(mainRender().previewPhase, 'idle');
console.log('Preview pause/resume, trim end, muted layers and independent phases passed');
