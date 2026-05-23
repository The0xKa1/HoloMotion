                                                       
                                                     
                                                         

                             
                
                       
                     
                     
                     
                 
                              
 

const PERFECT_THRESHOLD = 88;

export class ComboBurst {
          options                   ;
          lastBurst = 0;
          lastCombo = 0;
          lastComboTrigger = 0;
          bestCombo = 0;
          perfectFrames = 0;

  constructor(options                   ) {
    this.options = options;
    this.options.bus.on("score:update", (payload) => this.handle(payload));
  }

  reset()       {
    this.lastBurst = 0;
    this.lastCombo = 0;
    this.lastComboTrigger = 0;
    this.bestCombo = 0;
    this.perfectFrames = 0;
  }

  getStats()                                               {
    return { bestCombo: this.bestCombo, perfectFrames: this.perfectFrames };
  }

          handle(payload             )       {
    const now = performance.now();
    if (payload.combo > this.bestCombo) this.bestCombo = payload.combo;
    if (payload.score >= PERFECT_THRESHOLD) {
      this.perfectFrames += 1;
      this.options.onPerfectFrame?.();
    }

    if (payload.score >= PERFECT_THRESHOLD && now - this.lastBurst > 1100) {
      this.lastBurst = now;
      this.fireBurst();
      this.options.audio.perfect();
    }

    if (payload.combo >= this.lastCombo + 4 || (payload.combo >= 8 && now - this.lastComboTrigger > 1800)) {
      this.lastComboTrigger = now;
      this.fireCombo(payload.combo);
      this.options.audio.combo(payload.combo);
    }
    this.lastCombo = payload.combo;
  }

          fireBurst()       {
    this.replay(this.options.flash, "is-firing");
    this.replay(this.options.burst, "is-firing");
  }

          fireCombo(combo        )       {
    this.options.combo.textContent = `COMBO ×${String(combo).padStart(2, "0")}`;
    this.replay(this.options.combo, "is-firing");
  }

          replay(element             , className        )       {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }
}
