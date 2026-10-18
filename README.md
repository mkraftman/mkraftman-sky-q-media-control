# Mkraftman Sky Q Media Control

Custom HACS Lovelace card for Sky Q transport controls via `remote.send_command`.

## Features

- Play/pause, rewind, fast-forward buttons (commands sent via `remote.send_command`)
- Record button (red circle with white "REC" text)
- Info button (blue circle with white "i")
- Matching style to mkraftman-media-control

With the optional `media_entity` (the HACS [Sky Q media player](https://github.com/RogerSelwyn/Home_Assistant_SkyQ_MediaPlayer)):

- Channel / programme text:

  | Watching | Top row left | Top row right | Title | Third line |
  |---|---|---|---|---|
  | Live TV | Channel name | Channel number | Programme | `S1 · E3` when available |
  | Recording or on demand | Sky Q | | Programme (if reported) | `S1 · E3` when available |
  | App (Netflix, YouTube...) | Sky Q | | App name | |
  | Standby | Media player name | | | |

- Text spacing follows mkraftman-media-control: the third line tightens the line spacing so the card height never changes
- Programme artwork with colour-extracted background and gradient fade (falls back to the Sky Q artwork)
- Play/pause icon reflects the actual state
- REC button glows when the programme being watched is recording (needs the Sky Q integration's "Get live record status" option). After pressing REC the card asks HA to re-check the box at 1.5 s and 4 s, so the glow appears without waiting for the 10 s poll
- Card greys out in standby. If the media player is unavailable the card stays usable with the plain layout

## Installation

1. Add this repository to HACS as a custom repository
2. Install the card
3. Add to your dashboard

## Configuration

```yaml
type: custom:mkraftman-sky-q-media-control
entity: remote.sky_q_living_room              # required: buttons send commands here
media_entity: media_player.sky_q_living_room  # optional: text, artwork and state
```

## Releasing

Bump the version in `VERSION` (e.g. `1.0.1`) and push to `main`. The release workflow creates the matching `vX.Y.Z` tag and GitHub release with `dist/mkraftman-sky-q-media-control.js` attached. Pushing a `vX.Y.Z` tag directly also still works.
