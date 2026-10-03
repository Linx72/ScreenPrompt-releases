const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const pipelineSteps = [
  {
    label: "STEP 01 · CAPTURE",
    kicker: "Входной сигнал",
    title: "Короткая запись вместо длинного объяснения",
    description:
      "Запишите проблему, остановите запись и сразу переходите к анализу. ScreenPrompt не предназначен для постоянного наблюдения за экраном.",
    output: ["recording.mp4", "18.4 sec", "display 1 · sharp-ocr"],
  },
  {
    label: "STEP 02 · UNDERSTAND",
    kicker: "Три слоя понимания",
    title: "Пиксели, структура интерфейса и ваш голос",
    description:
      "OCR читает видимый текст. Accessibility уточняет роли и подписи элементов. Whisper добавляет голосовое пояснение в нужную точку таймлайна.",
    output: ["signals.index", "36 events", "OCR 24 · AX 8 · voice 4"],
  },
  {
    label: "STEP 03 · EVIDENCE",
    kicker: "Проверяемый контекст",
    title: "Каждый вывод знает, откуда он взялся",
    description:
      "Состояния связываются по времени, повторения убираются, а чувствительный текст маскируется. Неуверенный вывод остаётся помеченным, а не превращается в факт.",
    output: ["evidence.timeline", "0.92 avg", "redact on · 3 masks"],
  },
  {
    label: "STEP 04 · DELIVER",
    kicker: "Готово для работы",
    title: "Промпт, таймлайн, индекс и безопасный скрипт",
    description:
      "ScreenPrompt собирает открытые текстовые артефакты. Их можно проверить вручную, передать coding-агенту или открыть через MCP — без скрытого автозапуска.",
    output: ["agent_prompt.md", "ready", "5 artifacts · safety checked"],
  },
];

const privacyModes = {
  local: {
    transfer: "без сети",
    label: "03 · RESULT",
    title: "Local prompt",
    detail: "images_sent_to_llm: 0",
    images: "0",
  },
  cloud: {
    transfer: "только redacted text",
    label: "03 · LLM",
    title: "Prompt provider",
    detail: "raw_media_sent: false",
    images: "0",
  },
};

let pipelineIndex = 0;
let pipelineTimer = null;
let pipelinePaused = reducedMotionQuery.matches;
let toastTimer = null;

function setMenu(open, restoreFocus = true) {
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  const header = document.querySelector("[data-header]");
  const backgroundRegions = [document.querySelector("main"), document.querySelector("footer")];
  if (!toggle || !menu || !header) return;

  toggle.setAttribute("aria-expanded", String(open));
  toggle.querySelector(".sr-only").textContent = open ? "Закрыть меню" : "Открыть меню";
  menu.classList.toggle("is-open", open);
  header.classList.toggle("is-menu-open", open);
  document.body.style.overflow = open ? "hidden" : "";
  backgroundRegions.forEach((region) => {
    if (region) region.inert = open;
  });

  if (open) {
    menu.querySelector("a")?.focus();
  } else if (restoreFocus) {
    toggle.focus();
  }
}

function setPipelineStep(index, focusTab = false) {
  const pipeline = document.querySelector("[data-pipeline]");
  if (!pipeline) return;

  const tabs = [...pipeline.querySelectorAll("[data-step]")];
  const step = pipelineSteps[index];
  const label = pipeline.querySelector("[data-step-label]");
  const kicker = pipeline.querySelector("[data-scene-kicker]");
  const title = pipeline.querySelector("[data-scene-title]");
  const description = pipeline.querySelector("[data-scene-description]");
  const output = pipeline.querySelector("[data-scene-output]");
  const progress = pipeline.querySelector("[data-pipeline-progress]");

  pipelineIndex = index;
  tabs.forEach((tab, tabIndex) => {
    const selected = tabIndex === index;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  label.textContent = step.label;
  kicker.textContent = step.kicker;
  title.textContent = step.title;
  description.textContent = step.description;
  output.querySelector("span").textContent = step.output[0];
  output.querySelector("b").textContent = step.output[1];
  output.querySelector("small").textContent = step.output[2];
  progress.style.width = `${(index + 1) * 25}%`;

  if (focusTab) tabs[index].focus();
}

function stopPipelineTimer() {
  if (pipelineTimer) window.clearInterval(pipelineTimer);
  pipelineTimer = null;
}

function startPipelineTimer() {
  stopPipelineTimer();
  if (pipelinePaused || reducedMotionQuery.matches) return;
  pipelineTimer = window.setInterval(() => {
    setPipelineStep((pipelineIndex + 1) % pipelineSteps.length);
  }, 5200);
}

function syncMotionButton() {
  const button = document.querySelector("[data-motion-toggle]");
  if (!button) return;
  button.setAttribute("aria-pressed", String(pipelinePaused));
  button.querySelector("[data-motion-label]").textContent = pipelinePaused ? "Продолжить" : "Пауза";
}

function setPrivacyMode(mode) {
  const lab = document.querySelector("[data-privacy-lab]");
  if (!lab || !privacyModes[mode]) return;

  const tabs = [...lab.querySelectorAll("[data-privacy-mode]")];
  const destination = lab.querySelector("[data-privacy-destination]");
  const content = privacyModes[mode];

  tabs.forEach((tab) => {
    const selected = tab.dataset.privacyMode === mode;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  lab.querySelector("[data-privacy-transfer]").textContent = content.transfer;
  destination.querySelector("span").textContent = content.label;
  destination.querySelector("b").textContent = content.title;
  destination.querySelector("small").textContent = content.detail;
  lab.querySelector("[data-privacy-images]").textContent = content.images;
}

function showToast(message) {
  const toast = document.querySelector("[data-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function setupReveals() {
  const items = [...document.querySelectorAll(".reveal")];
  if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  document.documentElement.classList.add("motion-ready");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 },
  );
  items.forEach((item) => observer.observe(item));
}

function setupPlatformRecommendation() {
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  const normalized = platform.toLowerCase();
  let key = "";
  if (normalized.includes("mac")) key = "mac";
  if (normalized.includes("win")) key = "windows";

  if (!key) return;
  const item = document.querySelector(`[data-platform="${key}"]`);
  const primaryCta = document.querySelector("[data-platform-cta]");
  if (!item || !primaryCta) return;

  item.classList.add("is-recommended");
  const label = key === "mac" ? "Скачать для macOS" : "Скачать для Windows";
  primaryCta.querySelector("span").textContent = label;
}

function setupInteractions() {
  const header = document.querySelector("[data-header]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  const pipeline = document.querySelector("[data-pipeline]");
  const privacyLab = document.querySelector("[data-privacy-lab]");
  const copyButton = document.querySelector("[data-copy-button]");

  window.addEventListener(
    "scroll",
    () => header?.classList.toggle("is-scrolled", window.scrollY > 24),
    { passive: true },
  );

  menuToggle?.addEventListener("click", () => {
    setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  menu?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false, false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  const pipelineTabs = [...(pipeline?.querySelectorAll("[data-step]") || [])];
  pipelineTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      setPipelineStep(index);
      startPipelineTimer();
    });
    tab.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === "ArrowLeft") next = (index - 1 + pipelineTabs.length) % pipelineTabs.length;
      if (event.key === "ArrowRight") next = (index + 1) % pipelineTabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = pipelineTabs.length - 1;
      setPipelineStep(next, true);
      startPipelineTimer();
    });
  });

  pipeline?.querySelector("[data-motion-toggle]")?.addEventListener("click", () => {
    pipelinePaused = !pipelinePaused;
    syncMotionButton();
    if (pipelinePaused) stopPipelineTimer();
    else startPipelineTimer();
  });

  const privacyTabs = [...(privacyLab?.querySelectorAll("[data-privacy-mode]") || [])];
  privacyTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => setPrivacyMode(tab.dataset.privacyMode));
    tab.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "ArrowRight"
        ? (index + 1) % privacyTabs.length
        : (index - 1 + privacyTabs.length) % privacyTabs.length;
      setPrivacyMode(privacyTabs[next].dataset.privacyMode);
      privacyTabs[next].focus();
    });
  });

  copyButton?.addEventListener("click", async () => {
    const value = document.querySelector("[data-copy-value]")?.textContent || "";
    try {
      await navigator.clipboard.writeText(value);
      copyButton.querySelector("span").textContent = "Скопировано";
      showToast("Команда установки скопирована");
      window.setTimeout(() => {
        copyButton.querySelector("span").textContent = "Копировать";
      }, 2200);
    } catch {
      showToast("Не удалось скопировать — выделите команду вручную");
    }
  });
}

function handleReducedMotionChange(event) {
  pipelinePaused = event.matches;
  syncMotionButton();
  if (event.matches) stopPipelineTimer();
  else startPipelineTimer();
}

document.querySelector("[data-year]").textContent = String(new Date().getFullYear());
setupReveals();
setupPlatformRecommendation();
setupInteractions();
setPipelineStep(0);
syncMotionButton();
startPipelineTimer();
reducedMotionQuery.addEventListener?.("change", handleReducedMotionChange);
