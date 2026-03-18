# mkraftman-sky-q-media-control

Custom HACS Lovelace card for Sky Q transport controls via `remote.send_command`.

## Features

- Play, pause, rewind, fast-forward buttons
- Record button (red circle with white "REC" text)
- Info button (blue circle with white "i")
- Permanent Sky Q artwork background with gradient fade
- Matching style to mkraftman-media-control

## Installation

1. Add this repository to HACS as a custom repository
2. Install the card
3. Add to your dashboard

## Configuration

```yaml
type: custom:mkraftman-sky-q-media-control
entity: remote.sky_q_living_room
```
