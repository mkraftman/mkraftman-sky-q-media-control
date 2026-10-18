/**
 * mkraftman-sky-q-media-control
 * Custom card for Sky Q transport controls via remote.send_command.
 * Controls: record, rewind, play/pause, fast-forward, info.
 *
 * Optional `media_entity` (the HACS Sky Q media_player) adds channel /
 * programme text, programme artwork with colour-extracted background,
 * a state-aware play/pause icon and a recording indicator. Buttons always
 * send commands through `entity` (remote.*).
 */

const SKYQ_DEFAULT_BG = "#132532";
const SKYQ_DEFAULT_ART = "/local/images/sky.png";
const SKYQ_BRAND = "Sky Q";

class MkraftmanSkyQMediaControl extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._el = {};
    this._built = false;
    this._customBg = null;
    this._customFg = null;
    this._lastPicture = null;
    this._colorGeneration = 0;
  }

  static getStubConfig() {
    return { entity: "remote.sky_q_living_room" };
  }

  setConfig(config) {
    if (!config.entity) throw new Error("Please define an entity");
    this._config = config;
    if (this._built) this._update();
    else if (this._hass) this._build();
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return { rows: 4, columns: 12, min_rows: 4, min_columns: 6 };
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!this._config) return;

    if (!this._built) {
      this._build();
      return;
    }

    const changed = (id) => {
      if (!id) return false;
      const p = prev && prev.states[id];
      const c = hass.states[id];
      if (!p || !c) return p !== c;
      return p.last_updated !== c.last_updated || p.state !== c.state;
    };
    if (!changed(this._config.entity) && !changed(this._config.media_entity)) return;

    this._update();
  }

  _build() {
    if (this._built || !this._hass || !this._config) return;

    const shadow = this.shadowRoot;
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          --mc-fg: var(--primary-text-color, #fff);
        }
        ha-card {
          position: relative;
          overflow: hidden;
          height: 100%;
          box-sizing: border-box;
          background: ${SKYQ_DEFAULT_BG};
          transition: filter 0.3s, opacity 0.3s;
        }
        ha-card.off {
          filter: grayscale(1);
          opacity: 0.4;
        }

        /* background layers */
        .bg { position: absolute; inset: 0; overflow: hidden; }
        .bg-color {
          position: absolute; inset: 0;
          background-color: ${SKYQ_DEFAULT_BG};
          transition: background-color 0.8s ease;
        }
        .bg-image {
          position: absolute;
          right: 0; top: 0; bottom: 0;
          background-size: cover;
          background-position: center;
          background-image: url('${SKYQ_DEFAULT_ART}');
          opacity: 1;
          transition: opacity 0.8s ease;
        }
        .bg-gradient {
          position: absolute;
          right: 0; top: 0; bottom: 0;
          background: linear-gradient(to right, ${SKYQ_DEFAULT_BG} 0%, transparent 100%);
          opacity: 1;
        }

        .player {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          padding: 16px;
          height: 100%;
          box-sizing: border-box;
          color: var(--mc-fg);
        }

        /* top row - same rules as mkraftman-media-control */
        .top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .name {
          font-size: 18px;
          font-weight: 500;
          opacity: 0.85;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--mc-fg);
          flex: 1;
          min-width: 0;
        }
        .name-right {
          font-size: 18px;
          font-weight: 500;
          opacity: 0.85;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--mc-fg);
          flex-shrink: 0;
          max-width: 50%;
          text-align: right;
        }

        /* media info */
        .info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          min-height: 0;
        }
        .title {
          font-size: 22px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--mc-fg);
          margin-bottom: 2px;
        }
        .episode {
          font-size: 18px;
          font-weight: 500;
          opacity: 0.85;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--mc-fg);
        }
        /* tightened spacing only when the third line is shown, so the card
           height stays the same as with two lines */
        .three-line .top { margin-bottom: 0; }
        .three-line .title { margin-bottom: 0; line-height: 1.2; }
        .three-line .name,
        .three-line .name-right,
        .three-line .episode { line-height: 1.2; }

        .controls {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 4px 0;
          gap: 4px;
        }
        .ctrl {
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          flex: 1;
          max-width: 72px;
          transition: background-color 0.15s;
          color: var(--mc-fg);
          -webkit-tap-highlight-color: transparent;
          outline: none;
        }
        .ctrl ha-icon {
          --mdc-icon-size: 40px;
          color: var(--mc-fg);
        }
        .ctrl .icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          user-select: none;
          border: 1px solid white;
          box-sizing: border-box;
          transition: box-shadow 0.3s;
        }
        .ctrl.rec .icon-circle {
          background: #C80000;
          font-size: 13px;
          letter-spacing: 0.5px;
        }
        .ctrl.rec.recording .icon-circle {
          box-shadow: 0 0 6px 2px rgba(255, 40, 40, 0.9), 0 0 14px 4px rgba(255, 0, 0, 0.5);
        }
        .ctrl.info .icon-circle {
          background: #0050B0;
          font-size: 24px;
          font-style: italic;
          font-family: Georgia, serif;
        }
        .ctrl.pp {
          max-width: 132px;
        }
        .ctrl.pp ha-icon {
          --mdc-icon-size: 65px;
        }
      </style>

      <ha-card>
        <div class="bg">
          <div class="bg-color" id="bgColor"></div>
          <div class="bg-image" id="bgImage"></div>
          <div class="bg-gradient" id="bgGrad"></div>
        </div>
        <div class="player">
          <div class="top">
            <span class="name" id="name"></span>
            <span class="name-right" id="nameRight"></span>
          </div>
          <div class="info">
            <div class="title" id="title">&nbsp;</div>
            <div class="episode" id="episode"></div>
          </div>
          <div class="controls">
            <button class="ctrl rec" id="rec">
              <div class="icon-circle">REC</div>
            </button>
            <button class="ctrl" id="rw">
              <ha-icon icon="mdi:rewind"></ha-icon>
            </button>
            <button class="ctrl pp" id="pp">
              <ha-icon icon="mdi:play-pause" id="ppIcon"></ha-icon>
            </button>
            <button class="ctrl" id="ff">
              <ha-icon icon="mdi:fast-forward"></ha-icon>
            </button>
            <button class="ctrl info" id="info">
              <div class="icon-circle">i</div>
            </button>
          </div>
        </div>
      </ha-card>
    `;

    this._el = {
      card: shadow.querySelector("ha-card"),
      name: shadow.getElementById("name"),
      nameRight: shadow.getElementById("nameRight"),
      title: shadow.getElementById("title"),
      episode: shadow.getElementById("episode"),
      bgColor: shadow.getElementById("bgColor"),
      bgImage: shadow.getElementById("bgImage"),
      bgGrad: shadow.getElementById("bgGrad"),
      rec: shadow.getElementById("rec"),
      ppIcon: shadow.getElementById("ppIcon"),
    };

    shadow.getElementById("rec").addEventListener("click", () => this._sendCommand("record"));
    shadow.getElementById("rw").addEventListener("click", () => this._sendCommand("rewind"));
    shadow.getElementById("pp").addEventListener("click", () => this._sendCommand("play"));
    shadow.getElementById("ff").addEventListener("click", () => this._sendCommand("fastforward"));
    shadow.getElementById("info").addEventListener("click", () => this._sendCommand("i"));

    this._built = true;
    this._applyColors();
    this._update();
    this._updateBgSize();

    // ResizeObserver for artwork sizing
    this._resizeObserver = new ResizeObserver(() => {
      this._updateBgSize();
    });
    this._resizeObserver.observe(this._el.card);
  }

  _updateBgSize() {
    if (!this._el.card || !this._el.bgImage) return;
    const h = this._el.card.offsetHeight;
    if (h > 0) {
      this._el.bgImage.style.width = h + "px";
      this._el.bgGrad.style.width = h + "px";
    }
  }

  /**
   * Work out what to show. Returns { left, right, title, episode, isOff,
   * playState, recording, picture }.
   */
  _resolveView() {
    const remote = this._hass.states[this._config.entity];
    const mediaId = this._config.media_entity;
    const media = mediaId ? this._hass.states[mediaId] : null;
    const remoteName =
      (remote && remote.attributes && remote.attributes.friendly_name) || this._config.entity;

    const view = {
      left: remoteName,
      right: "",
      title: "",
      episode: "",
      isOff: false,
      playState: null,
      recording: false,
      picture: null,
    };

    // No media entity configured: original behaviour (remote only).
    if (!mediaId) {
      view.isOff = !remote || remote.state === "off" || remote.state === "unavailable";
      return view;
    }

    // Media entity missing / unavailable / unknown: the Sky Q integration has
    // lost contact, but the remote may still work - show the plain card,
    // not greyed out, so the buttons stay usable.
    if (!media || media.state === "unavailable" || media.state === "unknown") {
      view.left = (media && media.attributes.friendly_name) || remoteName;
      return view;
    }

    const a = media.attributes;
    const friendly = a.friendly_name || remoteName;

    // Standby
    if (media.state === "off") {
      view.left = friendly;
      view.isOff = true;
      return view;
    }

    view.playState = media.state; // playing / paused
    view.picture = a.entity_picture_local || a.entity_picture || null;
    const type = a.skyq_media_type;
    view.recording = type === "liverec";

    if (type === "app") {
      // Apps on the box (Netflix, YouTube...): media_title carries the app name.
      view.left = SKYQ_BRAND;
      view.title = a.media_title || "";
      return view;
    }

    const isLive = (type === "live" || type === "liverec") && a.skyq_channelno;
    if (isLive) {
      view.left = a.media_channel || a.media_title || SKYQ_BRAND;
      view.right = String(a.skyq_channelno);
    } else {
      // Recording (pvr) or on demand
      view.left = SKYQ_BRAND;
    }
    // The integration reports the channel in media_title and the programme
    // in media_series_title.
    view.title = a.media_series_title || "";
    view.episode = this._formatEpisode(a.media_season, a.media_episode);
    return view;
  }

  _formatEpisode(season, episode) {
    const parts = [];
    if (season) parts.push("S" + season);
    if (episode) parts.push("E" + episode);
    return parts.join(" \u00B7 ");
  }

  _update() {
    if (!this._built || !this._hass || !this._config) return;
    const el = this._el;
    const v = this._resolveView();

    el.card.classList.toggle("off", v.isOff);

    // Top row
    el.name.textContent = v.left;
    el.nameRight.textContent = v.right;
    el.nameRight.style.display = v.right ? "" : "none";

    // Title line - space always reserved so the card height doesn't change
    const hasTitle = !!v.title;
    el.title.textContent = hasTitle ? v.title : "\u00A0";
    el.title.style.visibility = hasTitle ? "visible" : "hidden";

    // Third line
    const showEpisode = hasTitle && !!v.episode;
    el.episode.textContent = showEpisode ? v.episode : "";
    el.episode.style.display = showEpisode ? "" : "none";
    el.card.classList.toggle("three-line", showEpisode);

    // Play / pause icon (command is always the Sky "play" toggle)
    const ppIcon = v.playState === "playing" ? "mdi:pause"
      : (v.playState === "paused" ? "mdi:play" : "mdi:play-pause");
    el.ppIcon.setAttribute("icon", ppIcon);

    // Recording indicator
    el.rec.classList.toggle("recording", v.recording);

    // Artwork + colours
    if (v.picture !== this._lastPicture) {
      this._lastPicture = v.picture;
      if (v.picture) {
        el.bgImage.style.backgroundImage = "url('" + v.picture + "')";
        this._extractColors(v.picture);
      } else {
        el.bgImage.style.backgroundImage = "url('" + SKYQ_DEFAULT_ART + "')";
        this._clearColors();
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Background colour extraction (same method as mkraftman-media-control) */
  /* ------------------------------------------------------------------ */

  _applyColors() {
    const el = this._el;
    if (!el.bgColor) return;
    const bg = this._customBg || SKYQ_DEFAULT_BG;
    const fg = this._customFg || "var(--primary-text-color, #fff)";
    el.bgColor.style.backgroundColor = bg;
    el.bgGrad.style.background = "linear-gradient(to right, " + bg + " 0%, transparent 100%)";
    this.style.setProperty("--mc-fg", fg);
  }

  _clearColors() {
    this._colorGeneration++;
    this._customBg = null;
    this._customFg = null;
    this._applyColors();
  }

  _extractColors(url) {
    // Invalidate any extraction still loading, and reset to defaults until
    // this one completes.
    this._clearColors();
    const gen = this._colorGeneration;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (gen !== this._colorGeneration) return;
      try {
        const c = document.createElement("canvas");
        const ctx = c.getContext("2d");
        c.width = 16;
        c.height = 16;
        ctx.drawImage(img, 0, 0, 16, 16);
        const d = ctx.getImageData(0, 0, 16, 16).data;

        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (lum > 30 && lum < 220) {
            r += d[i];
            g += d[i + 1];
            b += d[i + 2];
            n++;
          }
        }
        if (n === 0) return;

        const dr = Math.round((r / n) * 0.35);
        const dg = Math.round((g / n) * 0.35);
        const db = Math.round((b / n) * 0.35);

        this._customBg = "rgb(" + dr + "," + dg + "," + db + ")";
        const brightness = (dr * 299 + dg * 587 + db * 114) / 1000;
        this._customFg = brightness > 128 ? "#111" : "#fff";
        this._applyColors();
      } catch (_) {
        /* canvas taint or other - ignore */
      }
    };
    img.onerror = () => {};
    img.src = url;
  }

  _sendCommand(command) {
    if (!this._hass || !this._config) return;
    this._hass.callService("remote", "send_command", {
      entity_id: this._config.entity,
      command: command,
    });
  }

  connectedCallback() {
    if (this._hass && this._config && !this._built) {
      this._build();
    }
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }
}

customElements.define("mkraftman-sky-q-media-control", MkraftmanSkyQMediaControl);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "mkraftman-sky-q-media-control",
  name: "Mkraftman Sky Q Media Control",
  description: "Transport controls for Sky Q via remote.send_command, with optional channel/programme info from the Sky Q media player.",
});
