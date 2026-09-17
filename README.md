# SPEED GPS

A GPS speedometer that records where you were fast, not just how fast you were.

Built with Expo (SDK 54) and React Native for iOS.

<p>
  <img src="screenshot/Simulator%20Screenshot%20-%20iPhone%2017%20-%202026-09-17%20at%2008.49.04.png" width="24%" />
  <img src="screenshot/Simulator%20Screenshot%20-%20iPhone%2017%20-%202026-09-17%20at%2008.49.15.png" width="24%" />
  <img src="screenshot/Simulator%20Screenshot%20-%20iPhone%2017%20-%202026-09-17%20at%2008.49.19.png" width="24%" />
  <img src="screenshot/Simulator%20Screenshot%20-%20iPhone%2017%20-%202026-09-17%20at%2008.49.25.png" width="24%" />
</p>

## What it does

**Live cockpit** — an analogue dial driven by GPS. The needle sweeps and the
digital readout climbs one number at a time over the same second, so the two
never disagree. Car, motorcycle, bicycle and running each get their own scale,
and the speed floor that filters GPS jitter follows the vehicle, so a jogger is
not rounded down to zero.

**Route recording** — start and stop a trip; the path is drawn on the map
coloured by how fast you were on each stretch, relative to the current gauge. A
bicycle at 50 km/h reads hot where a car at the same speed still reads cool.

**Trip summary** — distance, time, moving time, pace, elevation and top and
average speed in all three units at once. A saved trip is a record, so it does
not depend on which unit happened to be selected when you open it.

**Drive score** — acceleration between fixes is measured in m/s². Anything past
3 counts as harsh, the threshold used in insurance telematics, and braking is
weighted more heavily than acceleration. Each event is kept with its position
and drawn on the route.

**Progress** — levels and achievements computed from the trips on the device.
Experience comes from distance, with a bonus per trip and drive score folded in,
so ground covered carelessly earns less than ground covered smoothly.

**Speed warning** — set a limit and the app speaks and vibrates once as you
cross it. It arms again only after you drop back under, so sitting just over the
limit does not nag.

## Demo mode

Settings → Demo drive feeds the app simulated fixes so everything can be shown
without driving.

- **Scripted run** follows a real 18.9 km Bangkok route, easing towards each
  road's typical speed — slow around the monument circle, open on the expressway
- **Drive by hand** exposes a throttle to drag

The route is committed as data, so there is no key, no network and no billing at
runtime. A banner stays on screen throughout and every trip recorded this way is
flagged, so simulated data is never mistaken for a real drive.

## Running it

```bash
npm install
npx expo start
```

Then open the project in Expo Go on a device on the same network, or press `i`
for the iOS simulator.

```bash
npx expo run:ios     # native build, needed for the app icon and haptics
npx tsc --noEmit     # typecheck
npx expo lint
```

## Notes

- Map labels follow the device language. For an English demo, set the device to
  English; the app itself is English throughout.
- Haptics only fire on a real device — the simulator has none. Speech works in
  both.
- The map uses whichever provider the platform supplies: Apple Maps on iOS,
  Google Maps on Android. No API key is required.

See [AGENTS.md](AGENTS.md) for the traps worth knowing before changing the code.
