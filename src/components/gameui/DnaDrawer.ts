interface DnaDrawerOptions {
  drawer: HTMLElement;
  backdrop: HTMLElement;
  trigger: HTMLElement;
  closeButton: HTMLElement;
}

export class DnaDrawer {
  private options: DnaDrawerOptions;
  private isOpen = false;

  constructor(options: DnaDrawerOptions) {
    this.options = options;
    this.options.trigger.addEventListener("click", () => this.toggle());
    this.options.closeButton.addEventListener("click", () => this.close());
    this.options.backdrop.addEventListener("click", () => this.close());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isOpen) this.close();
    });
  }

  open(): void {
    this.isOpen = true;
    this.options.drawer.classList.add("is-open");
    this.options.backdrop.classList.add("is-open");
  }

  close(): void {
    this.isOpen = false;
    this.options.drawer.classList.remove("is-open");
    this.options.backdrop.classList.remove("is-open");
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }
}
