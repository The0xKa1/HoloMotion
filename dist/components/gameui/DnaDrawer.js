                            
                      
                        
                       
                           
 

export class DnaDrawer {
          options                  ;
          isOpen = false;

  constructor(options                  ) {
    this.options = options;
    this.options.trigger.addEventListener("click", () => this.toggle());
    this.options.closeButton.addEventListener("click", () => this.close());
    this.options.backdrop.addEventListener("click", () => this.close());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isOpen) this.close();
    });
  }

  open()       {
    this.isOpen = true;
    this.options.drawer.classList.add("is-open");
    this.options.backdrop.classList.add("is-open");
  }

  close()       {
    this.isOpen = false;
    this.options.drawer.classList.remove("is-open");
    this.options.backdrop.classList.remove("is-open");
  }

  toggle()       {
    if (this.isOpen) this.close();
    else this.open();
  }
}
