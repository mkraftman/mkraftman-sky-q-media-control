/**
 * mkraftman-sky-q-media-control
 * Custom card for Sky Q transport controls via remote.send_command.
 * Controls: record, rewind, play, pause, fast-forward, info.
 * Permanent Sky Q artwork background.
 */

class MkraftmanSkyQMediaControl extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._el = {};
    this._built = false;
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
    return 3;
  }

  getGridOptions() {
    return { rows: 3, columns: 12, min_rows: 3, min_columns: 6 };
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!this._config) return;

    if (!this._built) {
      this._build();
      return;
    }

    const entity = hass.states[this._config.entity];
    const prevEntity = prev && prev.states[this._config.entity];
    if (
      prevEntity &&
      prevEntity.last_updated === (entity && entity.last_updated) &&
      prevEntity.state === (entity && entity.state)
    ) {
      return;
    }

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
          background: #132532;
          transition: filter 0.3s, opacity 0.3s;
        }
        ha-card.off {
          filter: grayscale(1);
          opacity: 0.4;
        }

        /* background layers */
        .bg { position: absolute; inset: 0; }
        .bg-color {
          position: absolute; inset: 0;
          background-color: #132532;
        }
        .bg-image {
          position: absolute;
          right: 0; top: 0; bottom: 0;
          background-size: cover;
          background-position: center;
          background-image: url('/local/images/sky.png');
          opacity: 1;
        }
        .bg-gradient {
          position: absolute;
          right: 0; top: 0; bottom: 0;
          background: linear-gradient(to right, #132532 0%, transparent 100%);
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

        .name {
          font-size: 18px;
          font-weight: 500;
          opacity: 0.85;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--mc-fg);
          margin-bottom: 8px;
        }

        .status {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          opacity: 0.4;
          color: var(--mc-fg);
          text-transform: capitalize;
        }

        .controls {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 4px 0;
          gap: 4px;
          flex: 1;
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
        }
        .ctrl.rec .icon-circle {
          background: #C80000;
          font-size: 13px;
          letter-spacing: 0.5px;
        }
        .ctrl.info .icon-circle {
          background: #0050B0;
          font-size: 24px;
          font-style: italic;
          font-family: Georgia, serif;
        }
        .ctrl.pp ha-icon {
          --mdc-icon-size: 55px;
        }
      </style>

      <ha-card>
        <div class="bg">
          <div class="bg-color"></div>
          <div class="bg-image" id="bgImage"></div>
          <div class="bg-gradient" id="bgGrad"></div>
        </div>
        <div class="player">
          <div class="name" id="name"></div>
          <div class="status" id="status"></div>
          <div class="controls">
            <button class="ctrl rec" id="rec">
              <div class="icon-circle">REC</div>
            </button>
            <button class="ctrl" id="rw">
              <ha-icon icon="mdi:rewind"></ha-icon>
            </button>
            <button class="ctrl pp" id="pp">
              <ha-icon icon="mdi:play-pause"></ha-icon>
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
      status: shadow.getElementById("status"),
      bgImage: shadow.getElementById("bgImage"),
      bgGrad: shadow.getElementById("bgGrad"),
    };

    shadow.getElementById("rec").addEventListener("click", () => this._sendCommand("record"));
    shadow.getElementById("rw").addEventListener("click", () => this._sendCommand("rewind"));
    shadow.getElementById("pp").addEventListener("click", () => this._sendCommand("play"));
    shadow.getElementById("ff").addEventListener("click", () => this._sendCommand("fastforward"));
    shadow.getElementById("info").addEventListener("click", () => this._sendCommand("i"));

    this._built = true;
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

  _update() {
    if (!this._built || !this._hass || !this._config) return;

    const entity = this._hass.states[this._config.entity];
    const isOff = !entity || entity.state === "off" || entity.state === "unavailable";

    this._el.card.classList.toggle("off", isOff);

    const friendlyName = (entity && entity.attributes && entity.attributes.friendly_name) || this._config.entity;
    this._el.name.textContent = friendlyName;

    this._el.status.textContent = isOff ? (entity ? entity.state : "unavailable") : "";
    this._el.status.style.display = isOff ? "flex" : "none";
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
  description: "Transport controls for Sky Q via remote.send_command.",
});
