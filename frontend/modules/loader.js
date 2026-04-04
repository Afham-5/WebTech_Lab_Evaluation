// ==================== COMPONENT LOADER ====================
// Loads HTML partial files into the page

const COMPONENTS = [
  { file: "components/navbar.html", target: "#app", position: "beforeend" },
  { file: "components/hero.html", target: "#app", position: "beforeend" },
  { file: "components/planner.html", target: "#app", position: "beforeend" },
  { file: "components/trips.html", target: "#app", position: "beforeend" },
  { file: "components/modal.html", target: "#app", position: "beforeend" },
  { file: "components/tips.html", target: "#app", position: "beforeend" },
  { file: "components/footer.html", target: "#app", position: "beforeend" },
];

export async function loadComponents() {
  const results = await Promise.all(
    COMPONENTS.map((c) => fetch(c.file).then((r) => r.text()))
  );

  results.forEach((html, i) => {
    const target = document.querySelector(COMPONENTS[i].target);
    target.insertAdjacentHTML(COMPONENTS[i].position, html);
  });
}
