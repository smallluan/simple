class MButton extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }
  connectedCallback() {
    this.render()
  }

  render() {
    this.shadowRoot.innerHTML = `
    <style>
      .container {
        border-radius: 6px;
        box-shadow: none;
        background: rgb(0,191,255);
        color: white;
        border: none;
        transition: all .1s ease-in-out;
        &:active {
        scale: .90;
        }
      }
      .default-theme {
        background: rgb(0,191,255);
        color: white;
      }
      .size-small {
        font-size: 12px;
      }
      .size-normal {
        font-size: 16px;
      }
    </style>
      <button class="container default-theme">
        <slot>默认文字</slot>
      </button>
    `
  }
}

customElements.define('m-button', MButton)
