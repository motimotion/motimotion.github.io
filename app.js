const comparisonExamples = [
  "tray",
  "balloon-1",
  "faucet-2",
  "poker",
  "bricks",
  "tablecloth-2"
].map((name) => ({
  id: name,
  label: titleCase(name),
  input: `assets/comparison/${name}/input.jpg`,
  reasoned: `assets/comparison/${name}/reasoned.jpg`,
  promptFile: `assets/comparison/${name}/prompt.jsonl`,
  clips: [
    ["MagicMotion", `assets/comparison/${name}/magic.mp4`],
    ["WanMove", `assets/comparison/${name}/wanmove.mp4`],
    ["w/o Reasoning", `assets/comparison/${name}/video.mp4`],
    ["w/o Motion Reasoning", `assets/comparison/${name}/video-p.mp4`],
    ["MotiMotion (Ours)", `assets/comparison/${name}/ours.mp4`]
  ]
}));

const resultExamples = [
  "bag", "balloon-1", "balloon-2", "balloon-3", "basketball", "bottle-1", "bottle-2",
  "bricks", "cars-1", "clock-2", "dice", "drop", "fan-2", "faucet-1", "faucet-2",
  "gears", "glass", "jenga", "lantern", "leafblower", "lighter", "magnet", "phone",
  "poker", "scissors-3", "seesaw", "spray-1", "spray-2", "stones", "toothpaste",
  "tablecloth-1", "tablecloth-2", "tray", "vacuum-1"
].map((name) => ({
  name,
  input: `assets/result/${name}/input.jpg`,
  reasoned: `assets/result/${name}/reasoned.jpg`,
  video: `assets/result/${name}/ours.mp4`,
  promptFile: `assets/bench/prompts/${name}.txt`
}));

const confidenceExamples = [
  {
    name: "Seesaw",
    input: "assets/result-conf/seesaw/reasoned.jpg",
    high: "assets/result-conf/seesaw/high.mp4",
    low: "assets/result-conf/seesaw/low.mp4",
    ratioClass: "ratio-wide"
  },
  {
    name: "Dominos-1",
    input: "assets/result-conf/dominos-1/reasoned.jpg",
    high: "assets/result-conf/dominos-1/high.mp4",
    low: "assets/result-conf/dominos-1/low.mp4",
    ratioClass: "ratio-wide"
  },
  {
    name: "Machine",
    input: "assets/result-conf/machine/reasoned.jpg",
    high: "assets/result-conf/machine/high.mp4",
    low: "assets/result-conf/machine/low.mp4",
    ratioClass: "ratio-tall"
  }
];

const benchmarkExamples = [
  "bag", "balloon-1", "balloon-2", "balloon-3", "balls-1", "balls-2", "basketball",
  "billiards", "bookshelf", "bottle-1", "bottle-2", "bowling", "bricks", "cars-1",
  "cars-2", "chicken", "clock-1", "clock-2", "dice", "dominos-1", "dominos-2",
  "dominos-3", "drop", "dryer", "extinguisher", "fan-1", "fan-2", "faucet-1",
  "faucet-2", "gears", "glass", "hourglass", "jenga", "lamp", "lantern",
  "leafblower", "lighter", "machine", "magnet", "mirror", "phone", "poker",
  "rope-1", "rope-2", "scissors-1", "scissors-2", "scissors-3", "seesaw",
  "slingshot", "spray-1", "spray-2", "stack-1", "stack-2", "stones", "stove",
  "tablecloth-1", "tablecloth-2", "tennis", "toothpaste", "tray", "vacuum-1",
  "vacuum-2"
].map((name) => ({
  name,
  image: `assets/bench/images/${name}.jpg`,
  promptFile: `assets/bench/prompts/${name}.txt`
}));

const comparisonContext = document.getElementById("comparison-context");
const comparisonGrid = document.getElementById("comparison-grid");
const moreResultsGrid = document.getElementById("more-results-grid");
const confGrid = document.getElementById("conf-grid");
const benchGrid = document.getElementById("bench-grid");
const comparisonDots = document.getElementById("comparison-dots");
const resultsDots = document.getElementById("results-dots");
const benchDots = document.getElementById("bench-dots");
const confDots = document.getElementById("conf-dots");
const comparisonPrevButton = document.getElementById("comparison-prev");
const comparisonNextButton = document.getElementById("comparison-next");
const resultsPrevButton = document.getElementById("results-prev");
const resultsNextButton = document.getElementById("results-next");
const benchPrevButton = document.getElementById("bench-prev");
const benchNextButton = document.getElementById("bench-next");
const confPrevButton = document.getElementById("conf-prev");
const confNextButton = document.getElementById("conf-next");
const textCache = new Map();
const RESULTS_PER_PAGE = 3;
const BENCH_PER_PAGE = 8;
let comparisonIndex = 0;
let resultsPage = 0;
let benchPage = 0;
let confIndex = 0;

function titleCase(text) {
  return text
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildVideo(src, label) {
  const video = document.createElement("video");
  video.src = src;
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("aria-label", label);
  return video;
}

function buildImage(src, alt) {
  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  return image;
}

async function fetchText(path) {
  if (textCache.has(path)) {
    return textCache.get(path);
  }

  const response = await fetch(path);
  if (!response.ok) {
    return "";
  }

  const text = (await response.text()).trim();
  textCache.set(path, text);
  return text;
}

async function getPrompt(path) {
  return fetchText(path);
}

async function getComparisonPrompts(path) {
  const raw = await fetchText(path);
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return line;
    }
  });

  const normalize = (item) => {
    if (typeof item === "string") {
      return item;
    }
    if (item && typeof item === "object") {
      return item.prompt || item.text || item.content || JSON.stringify(item);
    }
    return "";
  };

  return {
    userPrompt: normalize(parsed[0]),
    predictedPrompt: normalize(parsed[1])
  };
}

function buildHoverMedia(src, alt, hoverLabel, kind = "image") {
  const frame = document.createElement("div");
  frame.className = "hover-media";
  frame.dataset.label = hoverLabel;

  const media = kind === "video" ? buildVideo(src, alt) : document.createElement("img");
  if (kind !== "video") {
    media.src = src;
    media.alt = alt;
  }

  frame.appendChild(media);
  return frame;
}

function paginateItems(items, page, perPage) {
  const totalPages = Math.ceil(items.length / perPage);
  const normalizedPage = ((page % totalPages) + totalPages) % totalPages;
  const start = normalizedPage * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: normalizedPage,
    totalPages
  };
}

function renderPagerDots(container, totalPages, activePage, onSelect, labelPrefix) {
  container.innerHTML = "";
  for (let i = 0; i < totalPages; i += 1) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `pager-dot${i === activePage ? " is-active" : ""}`;
    dot.setAttribute("aria-label", `${labelPrefix} ${i + 1}`);
    dot.setAttribute("aria-pressed", i === activePage ? "true" : "false");
    dot.addEventListener("click", () => onSelect(i));
    container.appendChild(dot);
  }
}

function buildExpandablePrompt(text) {
  const wrapper = document.createElement("div");
  wrapper.className = "expandable-note";

  const note = document.createElement("p");
  note.className = "panel-note panel-note-clamped";
  note.textContent = text;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "inline-toggle";
  toggle.textContent = "Show more";
  toggle.addEventListener("click", () => {
    const expanded = wrapper.classList.toggle("is-expanded");
    note.classList.toggle("panel-note-clamped", !expanded);
    toggle.textContent = expanded ? "Show less" : "Show more";
  });

  wrapper.append(note, toggle);
  return wrapper;
}

async function renderComparison(exampleId) {
  const example = comparisonExamples.find((item) => item.id === exampleId) || comparisonExamples[0];
  const { userPrompt, predictedPrompt } = await getComparisonPrompts(example.promptFile);
  comparisonIndex = comparisonExamples.findIndex((item) => item.id === example.id);
  renderPagerDots(
    comparisonDots,
    comparisonExamples.length,
    comparisonIndex,
    (page) => {
      comparisonIndex = page;
      void renderComparison(comparisonExamples[comparisonIndex].id);
    },
    "Comparison sample"
  );

  comparisonContext.innerHTML = "";
  comparisonGrid.innerHTML = "";

  const contextGrid = document.createElement("div");
  contextGrid.className = "context-grid fade-in";
  contextGrid.innerHTML = `
    <article class="media-card">
      <div class="media-card-body">
        <p class="media-label">User Input</p>
        <p class="panel-note">${userPrompt}</p>
      </div>
    </article>
    <article class="media-card">
      <div class="media-card-body">
        <p class="media-label">Reasoned Motion</p>
      </div>
    </article>
  `;

  contextGrid.children[0].prepend(
    buildImage(example.input, `${example.label} input with trajectories`)
  );
  contextGrid.children[1].prepend(
    buildImage(example.reasoned, `${example.label} reasoned motion visualization`)
  );
  contextGrid.children[1].querySelector(".media-card-body").appendChild(buildExpandablePrompt(predictedPrompt));

  comparisonContext.appendChild(contextGrid);

  example.clips.forEach(([label, src], index) => {
    const card = document.createElement("article");
    card.className = "result-card fade-in";
    card.style.animationDelay = `${index * 60}ms`;

    const media = buildVideo(src, `${example.label} ${label} result`);
    const body = document.createElement("div");
    body.className = "result-card-body";
    body.innerHTML = `<p class="clip-label">${label}</p>`;

    card.append(media, body);
    comparisonGrid.appendChild(card);
  });
}

async function renderResults() {
  moreResultsGrid.innerHTML = "";
  const paged = paginateItems(resultExamples, resultsPage, RESULTS_PER_PAGE);
  resultsPage = paged.page;
  renderPagerDots(
    resultsDots,
    paged.totalPages,
    resultsPage,
    (page) => {
      resultsPage = page;
      void renderResults();
    },
    "Results page"
  );
  const items = await Promise.all(
    paged.items.map(async (item) => ({
      ...item,
      prompt: await getPrompt(item.promptFile)
    }))
  );

  items.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "media-card fade-in";
    card.style.animationDelay = `${index * 50}ms`;

    const media = document.createElement("div");
    media.className = "gallery-card-main";
    media.appendChild(buildHoverMedia(item.input, `${titleCase(item.name)} input`, "Input"));
    media.appendChild(buildHoverMedia(item.reasoned, `${titleCase(item.name)} reasoned trajectories`, "Reasoned Motion"));
    media.appendChild(buildHoverMedia(item.video, `${titleCase(item.name)} MotiMotion result`, "Generated Result", "video"));

    const body = document.createElement("div");
    body.className = "media-card-body";
    body.innerHTML = `
      <p class="media-label">${titleCase(item.name)}</p>
      <p class="panel-note">${item.prompt}</p>
    `;

    card.append(media, body);
    moreResultsGrid.appendChild(card);
  });
}

function renderConfidence() {
  confGrid.innerHTML = "";
  confIndex = ((confIndex % confidenceExamples.length) + confidenceExamples.length) % confidenceExamples.length;
  renderPagerDots(
    confDots,
    confidenceExamples.length,
    confIndex,
    (page) => {
      confIndex = page;
      renderConfidence();
    },
    "Confidence sample"
  );

  const item = confidenceExamples[confIndex];
  confGrid.classList.remove("ratio-wide", "ratio-tall");
  confGrid.classList.add(item.ratioClass);
  [
    ["Reasoned Motion", item.input, "image"],
    ["High Confidence", item.high, "video"],
    ["Low Confidence", item.low, "video"]
  ].forEach(([label, src, kind], index) => {
    const card = document.createElement("article");
    card.className = "conf-card fade-in";
    card.style.animationDelay = `${index * 70}ms`;

    const media = kind === "video"
      ? buildHoverMedia(src, `${item.name} ${label}`, label, "video")
      : buildHoverMedia(src, `${item.name} ${label}`, label);
    card.append(media);
    confGrid.appendChild(card);
  });
}

async function renderBenchmark() {
  benchGrid.innerHTML = "";
  const paged = paginateItems(benchmarkExamples, benchPage, BENCH_PER_PAGE);
  benchPage = paged.page;
  renderPagerDots(
    benchDots,
    paged.totalPages,
    benchPage,
    (page) => {
      benchPage = page;
      void renderBenchmark();
    },
    "Benchmark page"
  );
  const items = await Promise.all(
    paged.items.map(async (item) => ({
      ...item,
      prompt: await getPrompt(item.promptFile)
    }))
  );

  items.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "bench-card fade-in";
    card.style.animationDelay = `${index * 35}ms`;

    const body = document.createElement("div");
    body.className = "bench-card-body";
    body.innerHTML = `
      <p class="media-label">${titleCase(item.name)}</p>
      <p class="panel-note">${item.prompt}</p>
    `;

    card.append(
      buildImage(item.image, `${titleCase(item.name)} benchmark scene`),
      body
    );
    benchGrid.appendChild(card);
  });
}

async function init() {
  void renderComparison(comparisonExamples[comparisonIndex].id);
  renderConfidence();
  await Promise.all([renderResults(), renderBenchmark()]);
}

void init();

resultsPrevButton.addEventListener("click", () => {
  resultsPage -= 1;
  void renderResults();
});

resultsNextButton.addEventListener("click", () => {
  resultsPage += 1;
  void renderResults();
});

benchPrevButton.addEventListener("click", () => {
  benchPage -= 1;
  void renderBenchmark();
});

benchNextButton.addEventListener("click", () => {
  benchPage += 1;
  void renderBenchmark();
});

confPrevButton.addEventListener("click", () => {
  confIndex -= 1;
  renderConfidence();
});

confNextButton.addEventListener("click", () => {
  confIndex += 1;
  renderConfidence();
});

comparisonPrevButton.addEventListener("click", () => {
  comparisonIndex = (comparisonIndex - 1 + comparisonExamples.length) % comparisonExamples.length;
  void renderComparison(comparisonExamples[comparisonIndex].id);
});

comparisonNextButton.addEventListener("click", () => {
  comparisonIndex = (comparisonIndex + 1) % comparisonExamples.length;
  void renderComparison(comparisonExamples[comparisonIndex].id);
});
