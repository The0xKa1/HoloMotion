                                                         

                                                   

export class ConnectionIndicator {
          text             ;
          dot             ;

  constructor(text             , dot             ) {
    this.text = text;
    this.dot = dot;
  }

  set(text        , kind                )       {
    this.text.textContent = text;
    this.dot.classList.toggle("is-busy", kind === "busy");
    this.dot.classList.toggle("is-offline", kind === "offline");
  }
}

export function renderDnaList(host             , exercise                )       {
  host.innerHTML = "";
  Object.entries(exercise.params).forEach(([key, value]) => {
    const row = document.createElement("div");
    row.innerHTML = `<dt>${key}</dt><dd title="${value}">${value}</dd>`;
    host.appendChild(row);
  });
}

export function beatsPerMinute(motion        , speed        )         {
  const base = motion === "bounce" ? 110 : motion === "throw" ? 86 : motion === "flow" ? 64 : 92;
  return base * speed * 1.4;
}
