# Mute e2e audio

Green chore, owner request. Test browsers should never play pokedraft audio through the
developer's speakers.

## Scope

- `playwright.config.ts`. One `MUTED_CHROMIUM` constant passes `--mute-audio` to the two
  Chromium projects, `chromium` (`Desktop Chrome`) and `pixel-7` (`Pixel 7`). Both device
  descriptors report `defaultBrowserType` `chromium` in Playwright 1.64.0 and carry no
  `launchOptions` of their own, so the spread replaces nothing.
- `iphone-se`, `iphone-14`, `webkit-progress` and `webkit-wheel` run WebKit and are unchanged.

## Brief vs code

The brief says the owner hears the crowd and goal sounds from headless Chromium. Playwright
1.64.0 already adds `--mute-audio` to every headless Chromium launch, in `_innerDefaultArgs`
under `if (options.headless)` (`playwright-core/lib/coreBundle.js:44760` and `:44963`). It adds
nothing for a headed launch, which is what `--headed`, `--ui` and `--debug` use. The audio the
owner heard most likely came from one of those runs (a guess; the run that played it was not
observed). The fix is the same either way. The explicit switch mutes headed runs and is a
duplicate, with no effect, in headless runs.

## No RED test

Config only. Nothing in the unit or e2e suites can observe whether the speakers played sound, so
there is no guard that could fail first. Evidence is a scratch spec, not committed, that reads the
browser process command line with `ps` from inside a test. It ran with `CI=1` on the chromium and
pixel-7 projects.

Before, at `40221a8` (origin/main):

```
headless:
PROBE pixel-7 version=156.0.8078.4 mute-audio=true bin=chrome-headless-shell
PROBE chromium version=156.0.8078.4 mute-audio=true bin=chrome-headless-shell
--headed:
PROBE chromium version=156.0.8078.4 mute-audio=false bin=Google
PROBE pixel-7 version=156.0.8078.4 mute-audio=false bin=Google
```

After, with the config change:

```
--headed:
PROBE chromium version=156.0.8078.4 mute-audio=true bin=Google
PROBE pixel-7 version=156.0.8078.4 mute-audio=true bin=Google
headless:
PROBE chromium version=156.0.8078.4 mute-audio=true bin=chrome-headless-shell
PROBE pixel-7 version=156.0.8078.4 mute-audio=true bin=chrome-headless-shell
```

## Audio assertions under mute

`--mute-audio` mutes output only. The AudioContext still runs, and every spec that turns sound on
passed with `CI=1` on a fresh build at `010cf50`. `audio-polish`, `watch-live`,
`one-shared-timeline`, `platform-experience` and `manager-mode` on chromium and pixel-7 passed 34
of 34. `one-shared-timeline` logged `typed tones heard: electric,grass,grass,water,water,fire,ice`.
No assertion changed.

`smooth-movement.spec.ts` matched the grep for "crowd" only in the comment "a crowded moment", so
it was not run.

## WebKit

Playwright 1.64.0 has no mute switch or option for WebKit. The only "mute" hits in
`coreBundle.js` are the two Chromium switches, the recorder's internal `setMuted` and the
`AudioVolumeMute` key code. Nothing was hacked around it.

Whether headless WebKit plays to the speakers was checked and stayed inconclusive. A scratch
script started a zero-gain oscillator in each browser and read `pmset -g assertions`. Headless
WebKit opened a `BuiltInSpeakerDevice` output stream with its AudioContext running. Muted
Chromium opened the same stream, because Chromium mutes the samples and not the device, so the
check cannot tell muted from audible. WebKit audible output is inferred, not measured.

The exposure is zero today. Sound is off by default (`readJson(SOUND_KEY, false)` in
`src/components/wheel/sound.ts`), and the four specs that turn it on (`audio-polish`,
`one-shared-timeline`, `platform-experience`, `manager-mode`) run only in the chromium and
pixel-7 projects. A future spec that turns sound on in a WebKit project would play unmuted.

## Gates at `010cf50`

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on
  `playwright.config.ts`.
- Unit tests: 1,545 passed in 179 files.
- Playwright as above, 34 passed. The run rewrote `docs/reports/audio-polish/watch-live-390.png`
  and `docs/reports/one-shared-timeline/390-typed-callout.png`; both were reverted.

## NOT RUN

- A listening check on the owner's machine during a headed run.
- The full e2e suite and the WebKit projects (unchanged).
- Review and hosted CI, at the time of writing.
- The Wave 3 hand-off and implementation prompt were not read for this chore; it touches no
  product code.

## Decisions

- One shared constant spread into both Chromium projects, not the global `use`. A global
  `launchOptions.args` would also hand a Chromium switch to the four WebKit projects. How WebKit
  treats it was not tested.
- Keep the switch even though headless already has it. The switch costs one line and covers the
  headed runs where developers watch the browser.
