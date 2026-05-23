                                                       
                                                         

                           
                
                         
                     
                                  
 

export class Timeline {
          options                 ;
          progress = 0;

  constructor(options                 ) {
    this.options = options;
    this.options.bus.on("score:update", (payload) => this.update(payload));
    this.render();
  }

  setLabel(text        )       {
    this.options.label.textContent = text;
  }

          update(payload             )       {
    this.progress = payload.progress;
    this.render();
  }

          render()       {
    this.options.container.innerHTML = "";

    for (let index = 0; index < 18; index += 1) {
      const frameProgress = index / 17;
      const energy = 18 + Math.round((Math.sin(frameProgress * Math.PI * 2 - Math.PI / 5) + 1) * 22);
      const distance = Math.abs(frameProgress - this.progress);
      const button = document.createElement("button");
      button.className = `timeline-frame ${distance < 0.035 ? "is-active" : ""}`;
      button.type = "button";
      button.style.setProperty("--energy", `${energy}px`);
      button.style.setProperty("--timeline-color", energy > 52 ? "rgba(255, 180, 72, 0.58)" : "rgba(40, 217, 202, 0.52)");
      button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span>`;
      button.addEventListener("click", () => this.options.onScrub(frameProgress));
      this.options.container.appendChild(button);
    }
  }
}
