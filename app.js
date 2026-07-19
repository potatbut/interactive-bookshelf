const canvas = document.getElementById("libraryCanvas");
const canvasContext = canvas.getContext("2d");
const bookPreviewCanvas = document.getElementById("bookPreview");
const bookPreviewContext = bookPreviewCanvas.getContext("2d");
const decorPreviewCanvas = document.getElementById("decorPreview");
const decorPreviewContext = decorPreviewCanvas.getContext("2d");
const baseCanvasWidth = 1200;
const baseCanvasHeight = 850;
// Короткая обертка централизует получение элементов интерфейса по их id.
const getElementById = (elementId) => document.getElementById(elementId);
// Ограничивает число заданным диапазоном. Используется для координат, размеров и цветов.
const clampNumber = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));
// Экранирует внешний текст перед вставкой в HTML-шаблоны кнопок.
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

// Осветляет или затемняет HEX-цвет на указанную долю.
const adjustHexBrightness = (hexColor, adjustmentRatio) => {
  const numericColor = parseInt(hexColor.slice(1), 16),
    red = numericColor >> 16,
    green = (numericColor >> 8) & 255,
    blue = numericColor & 255;
  return (
    "#" +
    [red, green, blue]
      .map((channelValue) =>
        clampNumber(
          Math.round(channelValue * (1 + adjustmentRatio)),
          0,
          255,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
};
const emojis = {
  empty: [],
  romance: ["❤️", "💘", "🌹", "💌", "🦢"],
  fantasy: ["🐉", "🧚", "🦄", "🗡️", "🏰"],
  scifi: ["🚀", "🪐", "👽", "🤖", "✨"],
  mystery: ["🌙", "🔮", "🕯️", "🦇", "🗝️"],
};
const emojiOpenMojiCodes = {
  "❤️": "2764-FE0F",
  "💘": "1F498",
  "🌹": "1F339",
  "💌": "1F48C",
  "🦢": "1F9A2",
  "🐉": "1F409",
  "🧚": "1F9DA",
  "🦄": "1F984",
  "🗡️": "1F5E1-FE0F",
  "🏰": "1F3F0",
  "🚀": "1F680",
  "🪐": "1FA90",
  "👽": "1F47D",
  "🤖": "1F916",
  "✨": "2728",
  "🌙": "1F319",
  "🔮": "1F52E",
  "🕯️": "1F56F-FE0F",
  "🦇": "1F987",
  "🗝️": "1F5DD-FE0F",
  "🌿": "1F33F",
};
const legacyEmoji = {
  heart: "❤️",
  dragon: "🐉",
  stars: "✨",
  leaf: "🌿",
  moon: "🌙",
  none: "",
};
const decorAssets = {
  plant: { code: "1FAB4", fallback: "🪴", label: "Растение", search: "растение цветок горшок plant flower pot", width: 58, height: 65 },
  lamp: { code: "1F3EE", fallback: "🏮", label: "Лампа", search: "лампа фонарь свет lamp light lantern", width: 58, height: 74 },
  candle: { code: "1F56F", fallback: "🕯️", label: "Свеча", search: "свеча огонь candle fire cozy", width: 58, height: 65 },
  cat: { code: "1F408", fallback: "🐈", label: "Котик", search: "кот котик кошка cat pet", width: 62, height: 54 },
  vase: { code: "1F3FA", fallback: "🏺", label: "Ваза", search: "ваза кувшин vase jar flower", width: 58, height: 65 },
  clock: { code: "23F0", fallback: "⏰", label: "Часы", search: "часы будильник clock alarm time", width: 58, height: 58 },
};
const openMojiCatalogUrl = "https://cdn.jsdelivr.net/npm/openmoji@17.0.0/data/openmoji.json";
const openMojiSvgBaseUrl = "https://cdn.jsdelivr.net/npm/openmoji@17.0.0/color/svg/";
let openMojiCatalog = [];
const bookEmojiImages = {};
// Возвращает OpenMoji-код для emoji-символа, если он есть в стандартном наборе или каталоге.
function getOpenMojiCodeForEmoji(emoji) {
  if (!emoji) return "";
  return emojiOpenMojiCodes[emoji] || openMojiCatalog.find((asset) => asset.fallback === emoji)?.code || "";
}
// Собирает варианты имени SVG: у OpenMoji часть символов есть с FE0F, а часть без него.
function getOpenMojiCodeCandidates(code) {
  if (!code) return [];
  return [
    ...new Set([code, code.replace(/-FE0F/g, ""), code.includes("-FE0F") ? "" : `${code}-FE0F`].filter(Boolean)),
  ];
}
// Подключает fallback-загрузку для OpenMoji-картинок в кнопках выбора.
function attachOpenMojiFallbackImage(imageElement, code) {
  const codeCandidates = getOpenMojiCodeCandidates(code);
  let currentCodeIndex = 0;
  if (!codeCandidates.length) return;
  imageElement.onerror = () => {
    currentCodeIndex += 1;
    if (currentCodeIndex < codeCandidates.length) {
      imageElement.src = `${openMojiSvgBaseUrl}${codeCandidates[currentCodeIndex]}.svg`;
    }
  };
  imageElement.src = `${openMojiSvgBaseUrl}${codeCandidates[currentCodeIndex]}.svg`;
}
// Создает или возвращает OpenMoji-картинку для значка книги.
function getBookEmojiImage(code) {
  if (!code) return null;
  if (!bookEmojiImages[code]) {
    const codeCandidates = getOpenMojiCodeCandidates(code);
    let currentCodeIndex = 0;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      renderScene();
      renderBookPreview();
    };
    image.onerror = () => {
      currentCodeIndex += 1;
      if (currentCodeIndex < codeCandidates.length) {
        image.src = `${openMojiSvgBaseUrl}${codeCandidates[currentCodeIndex]}.svg`;
      }
    };
    image.src = `${openMojiSvgBaseUrl}${codeCandidates[currentCodeIndex]}.svg`;
    bookEmojiImages[code] = image;
  }
  return bookEmojiImages[code];
}
const decorImages = Object.fromEntries(
  Object.entries(decorAssets).map(([kind, asset]) => {
    const image = new Image();
    image.onload = () => renderScene();
    image.src = `assets/openmoji/${asset.code}.svg`;
    return [kind, image];
  }),
);
// Создает или возвращает уже загруженную картинку декора.
function getDecorImage(kind, src = null, code = null) {
  const asset = decorAssets[kind];
  const imageSource = src || asset?.src || (asset?.code || code ? `assets/openmoji/${asset?.code || code}.svg` : null);
  if (!imageSource) return null;
  if (!decorImages[kind]) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => renderScene();
    image.src = imageSource;
    decorImages[kind] = image;
  }
  return decorImages[kind];
}
const windowImages = {};
const windowViewAssets = {
  "1F304": { code: "1F304", label: "Горы", searchText: "mountain sunrise sun рассвет горы солнце", src: "assets/openmoji/1F304.svg" },
  "1F3D9": { code: "1F3D9", label: "Город", searchText: "city skyline street город небоскребы улица", src: "assets/openmoji/1F3D9.svg" },
  "1F303": { code: "1F303", label: "Ночь", searchText: "night stars city ночь звезды город", src: "assets/openmoji/1F303.svg" },
  "1F333": { code: "1F333", label: "Лес", searchText: "forest tree nature лес дерево природа", src: "assets/openmoji/1F333.svg" },
};
["1F304", "1F3D9", "1F303", "1F333"].forEach((code) => {
  const image = new Image();
  image.onload = () => renderScene();
  image.src = `assets/openmoji/${code}.svg`;
  windowImages[code] = image;
});
// Создает или возвращает картинку вида за окном.
function getWindowImage(code) {
  const asset = windowViewAssets[code];
  if (!asset) return null;
  if (!windowImages[code]) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => renderScene();
    image.src = asset.src || `${openMojiSvgBaseUrl}${asset.code}.svg`;
    windowImages[code] = image;
  }
  return windowImages[code];
}
const chairImages = Array.from({ length: 8 }, (_, i) => {
  const image = new Image();
  image.onload = () => renderScene();
  image.src = `assets/chairs/chair-${i + 1}.svg`;
  return image;
});
const seed = [
  ["#ba6b62", 30, 112, "❤️"],
  ["#647a6c", 38, 126, "🌿"],
  ["#d5a556", 27, 106, "✨"],
  ["#725b70", 32, 118, "🌙"],
  ["#c77e58", 42, 132, "🐉"],
  ["#5f8390", 29, 108, "🚀"],
  ["#9b704f", 35, 121, ""],
  ["#c9858b", 25, 98, "💘"],
  ["#7c9278", 40, 127, "🗝️"],
  ["#d29b56", 28, 104, "🏰"],
  ["#876776", 34, 119, "🔮"],
  ["#658395", 31, 113, "🪐"],
].map((b, i) => ({
  id: crypto.randomUUID(),
  type: "book",
  color: b[0],
  width: b[1],
  height: b[2],
  emoji: b[3],
  iconColor: "#fff3dc",
  title: `Книга ${i + 1}`,
  fontSize: 12,
  facing: i === 4 ? "cover" : "spine",
  row: i < 5 ? 0 : i < 9 ? 1 : 2,
  order: i,
}));
const defaults = {
  shelf: { color: "#9a6348", width: 680, height: 570, rows: 4, depth: 18 },
  room: {
    wall: "#eadfce",
    night: false,
    window: true,
    windowX: 18,
    windowWidth: 112,
    windowHeight: 150,
    windowY: 20,
    windowView: "1F304",
    chair: true,
    chairColor: "#778f82",
    chairSize: 100,
    chairTint: 0,
    zoom: 100,
    chairX: 82,
    chairY: 30,
    chairType: 0,
    chairFlip: false,
    rugShape: "oval",
    rugPattern: "plain",
    rugColor: "#c77d68",
    rugSize: 100,
    rugX: 52,
    rugY: 62,
  },
  items: seed,
  user: null,
  name: "моя полка",
  nameIcon: "📚",
};
let state = structuredClone(defaults),
  selectedId = null,
  editingId = null,
  editingDecorId = null,
  editingDecorDraft = null,
  selectedDecorKind = "plant",
  bookSettingsButtonBox = null,
  stageView = "shelf",
  drag = null,
  selectedSceneKind = null,
  chosenGenre = "empty",
  chosenEmoji = "",
  chosenEmojiCode = "",
  isBookEmojiSearchMode = false,
  chosenFacing = "spine",
  saveTimer;

// Дополняет старые сохранения новыми полями, чтобы обновления приложения не ломали существующие библиотеки.
function migrateSavedState(savedState) {
  const data = savedState;
  data.shelf = { ...defaults.shelf, ...data.shelf };
  data.room = { ...defaults.room, ...data.room };
  if (data.room.rug && !data.room.rugShape) {
    data.room.rugShape = data.room.rug === "none" ? "none" : "oval";
    data.room.rugPattern = data.room.rug === "stripe" ? "stripe" : "plain";
  }
  data.items = (data.items || []).map((savedItem, itemIndex) => {
    const { w: legacyWidth, h: legacyHeight, ...itemWithoutLegacyDimensions } = savedItem;
    if (savedItem.type === "book")
      return {
        fontSize: 12,
        facing: "spine",
        emoji: legacyEmoji[savedItem.icon] ?? savedItem.emoji ?? "📖",
        ...itemWithoutLegacyDimensions,
        width: savedItem.width ?? legacyWidth ?? 34,
        height: savedItem.height ?? legacyHeight ?? 118,
        emojiCode: savedItem.emojiCode ?? getOpenMojiCodeForEmoji(savedItem.emoji ?? legacyEmoji[savedItem.icon] ?? ""),
        order: savedItem.order ?? itemIndex,
      };
    const asset = decorAssets[savedItem.kind] || decorAssets.plant;
    return {
      size: 100,
      tint: 0,
      offsetX: 0,
      offsetY: 0,
      ...itemWithoutLegacyDimensions,
      width: savedItem.width ?? legacyWidth ?? asset.width,
      height: savedItem.height ?? legacyHeight ?? asset.height,
      order: savedItem.order ?? itemIndex,
    };
  });
  data.name ||= "моя полка";
  data.nameIcon ||= "📚";
  return data;
}
// Сохраняет всю сцену текущего пользователя и запоминает активный профиль.
function saveLibraryState() {
  const key = state.user
    ? `virtual-library:${state.user}`
    : "virtual-library:guest";
  localStorage.setItem(key, JSON.stringify(state));
  if (state.user)
    localStorage.setItem("virtual-library:active-user", state.user);
  getElementById("saveState").innerHTML = "<i></i> сохранено";
}
// Откладывает запись в localStorage, чтобы частые движения ползунков не создавали лишние операции.
function scheduleStateSave() {
  getElementById("saveState").textContent = "сохраняю…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveLibraryState, 300);
}
// Перерисовывает интерфейс после изменения состояния и при необходимости показывает уведомление.
function commitStateChange(message) {
  scheduleStateSave();
  renderScene();
  renderBookPreview();
  renderDecorPreview();
  renderBookCatalogs();
  if (message) {
    getElementById("canvasHint").textContent = message;
    getElementById("canvasHint").classList.add("show");
    setTimeout(() => getElementById("canvasHint").classList.remove("show"), 1300);
  }
}
// Показывает подтверждение внутри страницы вместо браузерного confirm().
function showConfirmPopup({ title, text, okText = "Да" }) {
  return new Promise((resolve) => {
    const dialog = getElementById("confirmDialog"),
      form = getElementById("confirmForm"),
      cancelButton = getElementById("confirmCancelBtn"),
      okButton = getElementById("confirmOkBtn");
    getElementById("confirmTitle").textContent = title;
    getElementById("confirmText").textContent = text;
    okButton.textContent = okText;
    const cleanup = (result) => {
      form.onsubmit = null;
      cancelButton.onclick = null;
      dialog.oncancel = null;
      dialog.onclose = null;
      resolve(result);
    };
    form.onsubmit = (submitEvent) => {
      submitEvent.preventDefault();
      dialog.onclose = null;
      dialog.close();
      cleanup(true);
    };
    cancelButton.onclick = () => {
      dialog.onclose = null;
      dialog.close();
      cleanup(false);
    };
    dialog.oncancel = () => cleanup(false);
    dialog.onclose = () => {
      if (form.onsubmit) cleanup(false);
    };
    dialog.showModal();
  });
}
// Загружает библиотеку активного пользователя или гостевое состояние и синхронизирует интерфейс.
function loadLibraryState(user = null) {
  let activeUser = user ?? localStorage.getItem("virtual-library:active-user");
  if (!activeUser) {
    const knownUsers = Object.keys(localStorage)
      .filter((key) => key.startsWith("virtual-library-auth:"))
      .map((key) => key.slice("virtual-library-auth:".length));
    if (knownUsers.length === 1) {
      activeUser = knownUsers[0];
      localStorage.setItem("virtual-library:active-user", activeUser);
    }
  }
  const raw = localStorage.getItem(
    activeUser ? `virtual-library:${activeUser}` : "virtual-library:guest",
  );
  state = migrateSavedState(raw ? JSON.parse(raw) : structuredClone(defaults));
  state.user = activeUser;
  synchronizeRoomControls();
  updateProfileDisplay();
  updateLibraryName();
  renderScene();
  renderBookPreview();
  renderDecorPreview();
  renderBookCatalogs();
}
// Возвращает правильную русскую форму слова для переданного числа.
function chooseRussianPlural(number, singularForm, fewForm, manyForm) {
  return number % 10 === 1 && number % 100 !== 11
    ? singularForm
    : number % 10 >= 2 && number % 10 <= 4 && (number % 100 < 10 || number % 100 >= 20)
      ? fewForm
      : manyForm;
}
// Находит жанровую группу для эмодзи книги, чтобы форма редактирования открывала правильный список.
function findGenreByEmoji(emoji) {
  return (
    Object.entries(emojis).find(([, genreEmojis]) => genreEmojis.includes(emoji))?.[0] ||
    "empty"
  );
}
// Обновляет имя и букву аватара в правой части шапки.
function updateProfileDisplay() {
  const displayedUserName = state.user || "гость";
  getElementById("profileName").textContent = displayedUserName;
  getElementById("avatar").textContent = displayedUserName[0].toUpperCase();
}
// Синхронизирует название библиотеки в шапке и в заголовке вкладки браузера.
function updateLibraryName() {
  getElementById("libraryName").textContent = state.name || "моя полка";
  getElementById("brandMark").textContent = state.nameIcon || "📚";
  document.title = `${state.nameIcon || "📚"} ${state.name || "моя полка"}`;
}
// Возвращает текущий коэффициент приближения рабочей сцены.
function getCanvasZoomRatio() {
  return (state.room.zoom || 100) / 100;
}
// Масштабирует рабочую сцену через пересчет размеров, а не через CSS-растягивание картинки.
function updateCanvasZoom() {
  const zoomRatio = getCanvasZoomRatio(),
    canvasFrame = document.querySelector(".canvas-frame"),
    zoomedCanvasWidth = baseCanvasWidth * zoomRatio,
    zoomedCanvasHeight = baseCanvasHeight * zoomRatio;
  canvasFrame.style.width = `${zoomedCanvasWidth}px`;
  canvasFrame.style.minWidth = `${zoomedCanvasWidth}px`;
  canvasFrame.style.height = `${zoomedCanvasHeight}px`;
  canvasFrame.style.minHeight = `${zoomedCanvasHeight}px`;
  canvasFrame.style.flexBasis = `${zoomedCanvasHeight}px`;
  resizeLibraryCanvas();
}
// Переключает центральную рабочую область между canvas-стеллажом и алфавитным каталогом книг.
function setStageView(nextStageView) {
  stageView = nextStageView;
  const isCatalogVisible = stageView === "catalog";
  document.querySelector(".canvas-frame").hidden = isCatalogVisible;
  getElementById("stageBookCatalog").hidden = !isCatalogVisible;
  getElementById("dragHintText").hidden = isCatalogVisible;
  document
    .querySelectorAll("[data-stage-view]")
    .forEach((stageViewButton) =>
      stageViewButton.classList.toggle("active", stageViewButton.dataset.stageView === stageView),
    );
  document.querySelector(".zoom-controls").hidden = isCatalogVisible;
  if (isCatalogVisible) renderBookCatalogs();
  else updateCanvasZoom();
}
// Возвращает все книги пользователя в алфавитном порядке без изменения порядка на полках.
function getBooksSortedAlphabetically() {
  return state.items
    .filter((item) => item.type === "book")
    .sort((firstBook, secondBook) =>
      (firstBook.title || "").localeCompare(secondBook.title || "", "ru", { sensitivity: "base" }),
    );
}
// Создает HTML одной карточки книги для бокового списка и большого каталога.
function createBookCatalogCardMarkup(book) {
  const title = book.title || "Без названия",
    emojiCode = book.emojiCode || getOpenMojiCodeForEmoji(book.emoji),
    meta = `${book.facing === "cover" ? "обложкой" : "корешком"} · ${book.width}×${book.height}px`;
  return `<button class="book-list-card ${book.id === selectedId ? "active" : ""}" data-book-id="${escapeHtml(book.id)}" type="button">
    <span class="book-list-color" style="background:${escapeHtml(book.color)}"></span>
    <span>
      <span class="book-list-title">${escapeHtml(title)}</span>
      <span class="book-list-meta">${escapeHtml(meta)}</span>
    </span>
    ${emojiCode ? `<img data-openmoji-code="${escapeHtml(emojiCode)}" alt="" />` : "<span></span>"}
  </button>`;
}
// Перерисовывает алфавитный список книг в левой панели и над сценой.
function renderBookCatalogs() {
  const sortedBooks = getBooksSortedAlphabetically(),
    emptyMarkup = '<p class="book-list-empty">Пока книг нет. Добавьте первую — и она появится здесь по алфавиту.</p>',
    catalogMarkup = sortedBooks.length ? sortedBooks.map(createBookCatalogCardMarkup).join("") : emptyMarkup;
  [getElementById("sidebarBookList"), getElementById("stageBookList")].forEach((bookListElement) => {
    bookListElement.innerHTML = catalogMarkup;
    bookListElement
      .querySelectorAll("[data-openmoji-code]")
      .forEach((imageElement) => attachOpenMojiFallbackImage(imageElement, imageElement.dataset.openmojiCode));
    bookListElement.querySelectorAll("[data-book-id]").forEach(
      (bookButton) =>
        (bookButton.onclick = () => {
          const book = state.items.find((item) => item.id === bookButton.dataset.bookId && item.type === "book");
          if (book) startBookEditing(book);
        }),
    );
  });
}

// Заполняет элементы управления актуальными настройками комнаты и стеллажа.
function synchronizeRoomControls() {
  const shelfSettings = state.shelf,
    roomSettings = state.room;
  [
    ["shelfColor", shelfSettings.color],
    ["shelfWidth", shelfSettings.width],
    ["shelfHeight", shelfSettings.height],
    ["shelfRows", shelfSettings.rows],
    ["shelfDepth", shelfSettings.depth],
    ["wallColor", roomSettings.wall],
    ["rugColor", roomSettings.rugColor],
    ["rugSize", roomSettings.rugSize],
    ["windowWidth", roomSettings.windowWidth],
    ["windowHeight", roomSettings.windowHeight],
    ["windowY", roomSettings.windowY],
    ["chairColor", roomSettings.chairColor],
    ["chairSize", roomSettings.chairSize],
    ["chairTint", roomSettings.chairTint],
    ["chairX", roomSettings.chairX],
  ].forEach(([controlId, controlValue]) => (getElementById(controlId).value = controlValue));
  updateCanvasZoom();
  getElementById("showWindow").checked = roomSettings.window;
  getElementById("showChair").checked = roomSettings.chair;
  getElementById("chairFlip").checked = roomSettings.chairFlip;
  getElementById("nightMode").checked = roomSettings.night;
  document
    .querySelectorAll("[data-chair-type]")
    .forEach((chairButton) =>
      chairButton.classList.toggle("active", +chairButton.dataset.chairType === roomSettings.chairType),
    );
  document
    .querySelectorAll("[data-window-view]")
    .forEach((windowViewButton) =>
      windowViewButton.classList.toggle("active", windowViewButton.dataset.windowView === roomSettings.windowView),
    );
  document
    .querySelectorAll("[data-rug-shape]")
    .forEach((rugShapeButton) =>
      rugShapeButton.classList.toggle("active", rugShapeButton.dataset.rugShape === roomSettings.rugShape),
    );
  document
    .querySelectorAll("[data-rug-pattern]")
    .forEach((rugPatternButton) =>
      rugPatternButton.classList.toggle("active", rugPatternButton.dataset.rugPattern === roomSettings.rugPattern),
    );
  updateControlOutputs();
}
// Обновляет числовые подписи рядом с ползунками и счетчик книг.
function updateControlOutputs() {
  const shelfSettings = state.shelf,
    roomSettings = state.room;
  getElementById("shelfWidthOut").value = `${shelfSettings.width} px`;
  getElementById("shelfHeightOut").value = `${shelfSettings.height} px`;
  getElementById("shelfRowsOut").value = shelfSettings.rows;
  getElementById("shelfDepthOut").value = `${shelfSettings.depth} px`;
  getElementById("shelfColorText").textContent = shelfSettings.color.toUpperCase();
  getElementById("wallColorText").textContent = roomSettings.wall.toUpperCase();
  getElementById("rugColorText").textContent = roomSettings.rugColor.toUpperCase();
  getElementById("chairColorText").textContent = roomSettings.chairColor.toUpperCase();
  getElementById("rugSizeOut").value = `${roomSettings.rugSize}%`;
  getElementById("windowWidthOut").value = `${roomSettings.windowWidth} px`;
  getElementById("windowHeightOut").value = `${roomSettings.windowHeight} px`;
  getElementById("windowYOut").value = `${Math.round(roomSettings.windowY)}%`;
  getElementById("windowY").value = roomSettings.windowY;
  getElementById("chairSizeOut").value = `${roomSettings.chairSize}%`;
  getElementById("chairTintOut").value = `${roomSettings.chairTint}%`;
  getElementById("zoomOut").value = `${roomSettings.zoom || 100}%`;
  getElementById("chairXOut").value = `${Math.round(roomSettings.chairX)}%`;
  getElementById("chairX").value = roomSettings.chairX;
  getElementById("bookColorText").textContent = getElementById("bookColor").value.toUpperCase();
  getElementById("iconColorText").textContent = getElementById("iconColor").value.toUpperCase();
  getElementById("decorColorText").textContent = getElementById("decorColor").value.toUpperCase();
  getElementById("decorSizeOut").value = `${getElementById("decorSize").value}%`;
  getElementById("decorTintOut").value = `${getElementById("decorTint").value}%`;
  getElementById("decorOffsetXOut").value = `${getElementById("decorOffsetX").value}%`;
  getElementById("decorOffsetYOut").value = `${getElementById("decorOffsetY").value}%`;
  getElementById("bookWidthOut").value = `${getElementById("bookWidth").value} px`;
  getElementById("bookHeightOut").value = `${getElementById("bookHeight").value} px`;
  getElementById("bookFontSizeOut").value = `${getElementById("bookFontSize").value} px`;
  const bookCount = state.items.filter((item) => item.type === "book").length;
  getElementById("objectCount").textContent = `${bookCount} ${chooseRussianPlural(bookCount, "книга", "книги", "книг")}`;
}

// Собирает из левой панели единый объект с настройками создаваемой или редактируемой книги.
function readBookFormValues() {
  return {
    title: getElementById("bookTitle").value || "Без названия",
    color: getElementById("bookColor").value,
    iconColor: getElementById("iconColor").value,
    width: +getElementById("bookWidth").value,
    height: +getElementById("bookHeight").value,
    fontSize: +getElementById("bookFontSize").value,
    facing: chosenFacing,
    emoji: chosenEmoji,
    emojiCode: chosenEmojiCode || getOpenMojiCodeForEmoji(chosenEmoji),
  };
}
// Заполняет форму и предпросмотр значениями выбранной книги.
function populateBookForm(book) {
  getElementById("bookTitle").value = book.title;
  getElementById("bookColor").value = book.color;
  getElementById("iconColor").value = book.iconColor;
  getElementById("bookWidth").value = book.width;
  getElementById("bookHeight").value = book.height;
  getElementById("bookFontSize").value = book.fontSize || 12;
  chosenFacing = book.facing || "spine";
  chosenEmoji = book.emoji ?? legacyEmoji[book.icon] ?? "";
  chosenEmojiCode = book.emojiCode || getOpenMojiCodeForEmoji(chosenEmoji);
  chosenGenre = findGenreByEmoji(chosenEmoji);
  isBookEmojiSearchMode = false;
  getElementById("bookEmojiSearchField").hidden = true;
  document
    .querySelectorAll("[data-facing]")
    .forEach((facingButton) =>
      facingButton.classList.toggle(
        "active",
        facingButton.dataset.facing === chosenFacing,
      ),
    );
  document
    .querySelectorAll(".genre-choice")
    .forEach((genreButton) =>
      genreButton.classList.toggle("active", genreButton.dataset.genre === chosenGenre),
    );
  renderEmojiDrawer();
  updateControlOutputs();
  renderBookPreview();
}
// Применяет изменения формы к книге в реальном времени и обновляет предпросмотр.
function handleBookFormInput() {
  updateControlOutputs();
  renderBookPreview();
  if (editingId) {
    const book = state.items.find((item) => item.id === editingId);
    if (book) Object.assign(book, readBookFormValues());
    commitStateChange();
  }
}
// Переводит панель книг в режим редактирования конкретной книги.
function startBookEditing(book) {
  editingId = selectedId = book.id;
  populateBookForm(book);
  getElementById("bookPanelTitle").textContent = "Редактирование";
  getElementById("bookModeLabel").textContent = "ВЫБРАННАЯ КНИГА";
  getElementById("addBookBtn").textContent = "✓ Готово";
  getElementById("cancelEditBtn").hidden = false;
  openEditorTab("books");
  closeBookContextMenu();
  renderBookCatalogs();
  renderScene();
}
// Завершает редактирование и возвращает панель к созданию новой книги.
function stopBookEditing() {
  editingId = null;
  getElementById("bookPanelTitle").textContent = "Новая книга";
  getElementById("bookModeLabel").textContent = "КОЛЛЕКЦИЯ";
  getElementById("addBookBtn").textContent = "＋ Добавить на полку";
  getElementById("cancelEditBtn").hidden = true;
  renderBookPreview();
  renderBookCatalogs();
}
// Добавляет новую книгу или завершает текущую сессию редактирования.
function addBookOrFinishEditing() {
  if (editingId) {
    stopBookEditing();
    commitStateChange("Изменения сохранены ✦");
    return;
  }
  const book = {
    id: crypto.randomUUID(),
    type: "book",
    ...readBookFormValues(),
  };
  Object.assign(book, findAutomaticShelfPlacement(book));
  state.items.push(book);
  commitStateChange("Добавлено на полку ✦");
}
// Удаляет книгу или декор по идентификатору и закрывает связанные редакторы.
function deleteLibraryItem(itemId) {
  state.items = state.items.filter((item) => item.id !== itemId);
  if (editingId === itemId) stopBookEditing();
  if (editingDecorId === itemId) cancelDecorEditing();
  selectedId = null;
  selectedSceneKind = null;
  getElementById("deleteSelectedBtn").disabled = true;
  closeBookContextMenu();
  commitStateChange("Предмет удален");
}
// Спрашивает подтверждение и удаляет текущий выбранный предмет из комнаты.
async function requestSelectedItemDeletion() {
  if (
    selectedId &&
    (await showConfirmPopup({
      title: "Удалить предмет?",
      text: "Выбранный предмет исчезнет из комнаты.",
      okText: "Удалить",
    }))
  )
    deleteLibraryItem(selectedId);
}

// Подгоняет внутреннее разрешение Canvas под его CSS-размер и плотность пикселей экрана.
function resizeLibraryCanvas() {
  if (document.querySelector(".canvas-frame").hidden) return;
  const pixelRatio = Math.min(devicePixelRatio, 2);
  canvas.width = canvas.clientWidth * pixelRatio;
  canvas.height = canvas.clientHeight * pixelRatio;
  canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  renderScene();
}
// Рассчитывает размеры и координаты основных областей сцены для текущего вьюпорта.
function calculateSceneLayout() {
  const zoomRatio = getCanvasZoomRatio(),
    canvasWidth = canvas.clientWidth || baseCanvasWidth * zoomRatio,
    canvasHeight = canvas.clientHeight || baseCanvasHeight * zoomRatio,
    floorLineY = canvasHeight * 0.84,
    sceneScale = zoomRatio,
    shelfWidth = state.shelf.width * sceneScale,
    shelfHeight = state.shelf.height * sceneScale;
  return {
    canvasWidth,
    canvasHeight,
    sceneScale,
    shelfWidth,
    shelfHeight,
    shelfX: canvasWidth * 0.5 - shelfWidth / 2,
    shelfY: floorLineY - shelfHeight,
    shelfRowHeight: (shelfHeight - 34 * sceneScale) / state.shelf.rows,
    floorLineY,
  };
}
// Дает рабочий layout даже тогда, когда canvas временно скрыт каталогом книг.
function getSceneLayoutForAutomaticPlacement() {
  if (canvas.clientWidth && canvas.clientHeight) return calculateSceneLayout();
  const zoomRatio = getCanvasZoomRatio(),
    canvasWidth = baseCanvasWidth * zoomRatio,
    canvasHeight = baseCanvasHeight * zoomRatio,
    floorLineY = canvasHeight * 0.84,
    sceneScale = zoomRatio,
    shelfWidth = state.shelf.width * sceneScale,
    shelfHeight = state.shelf.height * sceneScale;
  return {
    canvasWidth,
    canvasHeight,
    sceneScale,
    shelfWidth,
    shelfHeight,
    shelfX: canvasWidth * 0.5 - shelfWidth / 2,
    shelfY: floorLineY - shelfHeight,
    shelfRowHeight: (shelfHeight - 34 * sceneScale) / state.shelf.rows,
    floorLineY,
  };
}
// Рисует залитый прямоугольник с закругленными углами.
function fillRoundedRectangle(context, x, y, width, height, radius, fillColor) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = fillColor;
  context.fill();
}
// Выполняет полную перерисовку комнаты, мебели, стеллажа и предметов.
function renderScene() {
  const sceneLayout = calculateSceneLayout(),
    roomSettings = state.room;
  roomSettings._windowBox = roomSettings._chairBox = roomSettings._rugBox = null;
  canvasContext.clearRect(0, 0, sceneLayout.canvasWidth, sceneLayout.canvasHeight);
  const wallGradient = canvasContext.createLinearGradient(0, 0, 0, sceneLayout.canvasHeight);
  wallGradient.addColorStop(0, roomSettings.night ? adjustHexBrightness(roomSettings.wall, -0.35) : adjustHexBrightness(roomSettings.wall, 0.08));
  wallGradient.addColorStop(1, roomSettings.night ? adjustHexBrightness(roomSettings.wall, -0.12) : roomSettings.wall);
  canvasContext.fillStyle = wallGradient;
  canvasContext.fillRect(0, 0, sceneLayout.canvasWidth, sceneLayout.canvasHeight);
  drawRoomBackground(sceneLayout);
  drawShelf(sceneLayout);
  drawLibraryItems(sceneLayout);
  if (roomSettings.chair) drawChair(sceneLayout);
  drawDropPlaceholder(sceneLayout);
  drawSelectedSceneHighlight(sceneLayout);
  drawCanvasBookSettingsButton();
  if (drag?.active && drag.type === "item") drawDraggedItem(sceneLayout);
  updateControlOutputs();
}
// Рисует стены, пол, коврик и окно; одновременно сохраняет области объектов для перетаскивания.
function drawRoomBackground(sceneLayout) {
  const roomSettings = state.room;
  canvasContext.fillStyle = roomSettings.night ? "#3f3b3c" : adjustHexBrightness(roomSettings.wall, -0.08);
  canvasContext.fillRect(0, sceneLayout.floorLineY, sceneLayout.canvasWidth, sceneLayout.canvasHeight - sceneLayout.floorLineY);
  canvasContext.strokeStyle = roomSettings.night ? "#575052" : adjustHexBrightness(roomSettings.wall, -0.16);
  canvasContext.beginPath();
  canvasContext.moveTo(0, sceneLayout.floorLineY);
  canvasContext.lineTo(sceneLayout.canvasWidth, sceneLayout.floorLineY);
  canvasContext.stroke();
  if (roomSettings.rugShape !== "none") drawRug(sceneLayout);
  if (roomSettings.window) {
    const windowHeight = roomSettings.windowHeight * sceneLayout.sceneScale,
      windowWidth = roomSettings.windowWidth * sceneLayout.sceneScale,
      windowX = clampNumber(((sceneLayout.canvasWidth - windowWidth) * roomSettings.windowX) / 100, 12, sceneLayout.canvasWidth - windowWidth - 12),
      windowY = clampNumber(((sceneLayout.floorLineY - windowHeight - 15) * roomSettings.windowY) / 100, 18, sceneLayout.floorLineY - windowHeight - 15);
    roomSettings._windowBox = { x: windowX, y: windowY, w: windowWidth, h: windowHeight };
    canvasContext.shadowColor = "rgba(50,35,25,.18)";
    canvasContext.shadowBlur = 14;
    fillRoundedRectangle(canvasContext, windowX, windowY, windowWidth, windowHeight, 7, roomSettings.night ? "#243343" : "#a9ccdd");
    canvasContext.shadowBlur = 0;
    const windowViewImage = getWindowImage(roomSettings.windowView);
    if (windowViewImage?.complete && windowViewImage.naturalWidth) {
      canvasContext.save();
      canvasContext.globalAlpha = roomSettings.night ? 0.72 : 0.86;
      canvasContext.drawImage(windowViewImage, windowX + 5, windowY + 5, windowWidth - 10, windowHeight - 10);
      canvasContext.restore();
    }
    canvasContext.fillStyle = "#f6eee3";
    canvasContext.fillRect(windowX - 6, windowY - 6, windowWidth + 12, 7);
    canvasContext.fillRect(windowX - 6, windowY + windowHeight - 1, windowWidth + 12, 7);
    canvasContext.fillRect(windowX + windowWidth / 2 - 3, windowY, 6, windowHeight);
    canvasContext.fillRect(windowX, windowY + windowHeight / 2 - 3, windowWidth, 6);
    if (roomSettings.night) {
      canvasContext.fillStyle = "#f6df98";
      canvasContext.beginPath();
      canvasContext.arc(windowX + 25, windowY + 27, 9, 0, 7);
      canvasContext.fill();
    }
  }
}
// Рисует коврик с выбранной формой и узором и запоминает его область для свободного перемещения.
function drawRug(sceneLayout) {
  const roomSettings = state.room,
    rugScale = roomSettings.rugSize / 100,
    rugRadiusX = Math.min(300, sceneLayout.canvasWidth * 0.27) * rugScale,
    rugRadiusY = 105 * rugScale,
    rugCenterX = (sceneLayout.canvasWidth * roomSettings.rugX) / 100,
    floorSpace = sceneLayout.canvasHeight - sceneLayout.floorLineY,
    rugCenterY = clampNumber(
      sceneLayout.floorLineY + (floorSpace * roomSettings.rugY) / 100,
      sceneLayout.floorLineY + rugRadiusY * 0.38,
      sceneLayout.canvasHeight - rugRadiusY * 0.38,
    );
  roomSettings._rugBox = {
    x: rugCenterX - rugRadiusX,
    y: rugCenterY - rugRadiusY * 0.38,
    w: rugRadiusX * 2,
    h: rugRadiusY * 0.76,
  };
  canvasContext.save();
  canvasContext.beginPath();
  if (roomSettings.rugShape === "rect")
    canvasContext.roundRect(rugCenterX - rugRadiusX, rugCenterY - rugRadiusY * 0.32, rugRadiusX * 2, rugRadiusY * 0.64, 18);
  else canvasContext.ellipse(rugCenterX, rugCenterY, rugRadiusX, rugRadiusY * 0.34, 0, 0, 7);
  canvasContext.fillStyle = roomSettings.night
    ? adjustHexBrightness(roomSettings.rugColor, -0.25)
    : roomSettings.rugColor;
  canvasContext.fill();
  canvasContext.clip();
  canvasContext.strokeStyle = "rgba(255,242,220,.42)";
  canvasContext.fillStyle = "rgba(255,242,220,.38)";
  if (roomSettings.rugPattern === "stripe") {
    canvasContext.lineWidth = 14;
    for (let stripeX = rugCenterX - rugRadiusX; stripeX < rugCenterX + rugRadiusX; stripeX += 36) {
      canvasContext.beginPath();
      canvasContext.moveTo(stripeX, rugCenterY - rugRadiusY);
      canvasContext.lineTo(stripeX, rugCenterY + rugRadiusY);
      canvasContext.stroke();
    }
  }
  if (roomSettings.rugPattern === "dots") {
    for (let dotX = rugCenterX - rugRadiusX; dotX < rugCenterX + rugRadiusX; dotX += 35)
      for (let dotY = rugCenterY - rugRadiusY; dotY < rugCenterY + rugRadiusY; dotY += 28) {
        canvasContext.beginPath();
        canvasContext.arc(dotX, dotY, 5, 0, 7);
        canvasContext.fill();
      }
  }
  canvasContext.restore();
}
// Рисует выбранный SVG-вариант кресла с масштабом, оттенком и отражением.
function drawChair(sceneLayout) {
  const roomSettings = state.room,
    chairScale = roomSettings.chairSize / 100,
    chairImage = chairImages[roomSettings.chairType || 0],
    chairAspectRatio = chairImage?.naturalWidth ? chairImage.naturalHeight / chairImage.naturalWidth : 1.08,
    chairWidth = 155 * chairScale,
    chairHeight = chairWidth * chairAspectRatio,
    chairX = clampNumber(((sceneLayout.canvasWidth - chairWidth) * roomSettings.chairX) / 100, 8, sceneLayout.canvasWidth - chairWidth - 8),
    floorSpace = sceneLayout.canvasHeight - sceneLayout.floorLineY,
    maximumChairLift = chairHeight * 0.8,
    chairFloorInset = chairHeight * 0.18,
    chairBaselineY = clampNumber(
      sceneLayout.floorLineY + (floorSpace * roomSettings.chairY) / 100,
      sceneLayout.floorLineY - maximumChairLift,
      sceneLayout.canvasHeight - 8,
    ),
    chairY = chairBaselineY - chairHeight + chairFloorInset;
  roomSettings._chairBox = { x: chairX, y: chairY, w: chairWidth, h: chairHeight };
  if (!chairImage?.complete || !chairImage.naturalWidth) return;
  canvasContext.save();
  canvasContext.shadowColor = "rgba(45,30,24,.24)";
  canvasContext.shadowBlur = 12;
  canvasContext.shadowOffsetY = 7;
  const tintStrength = (roomSettings.chairTint ?? 0) / 100;
  if (tintStrength)
    canvasContext.filter = `sepia(${tintStrength}) saturate(${1 + tintStrength * 3.8}) hue-rotate(${getHexColorHue(roomSettings.chairColor) - 35}deg)`;
  if (roomSettings.chairFlip) {
    canvasContext.translate(chairX + chairWidth, chairY);
    canvasContext.scale(-1, 1);
    canvasContext.drawImage(chairImage, 0, 0, chairWidth, chairHeight);
  } else canvasContext.drawImage(chairImage, chairX, chairY, chairWidth, chairHeight);
  canvasContext.restore();
}
// Рисует каркас стеллажа, внутренние секции и объемные грани полок.
function drawShelf(sceneLayout) {
  const shelfSettings = state.shelf,
    shelfThickness = shelfSettings.depth * sceneLayout.sceneScale,
    sideWidth = 23 * sceneLayout.sceneScale,
    shelfColor = shelfSettings.color;
  canvasContext.save();
  canvasContext.shadowColor = "rgba(55,34,25,.28)";
  canvasContext.shadowBlur = 24;
  canvasContext.shadowOffsetY = 15;
  fillRoundedRectangle(canvasContext, sceneLayout.shelfX, sceneLayout.shelfY, sceneLayout.shelfWidth, sceneLayout.shelfHeight, 6 * sceneLayout.sceneScale, adjustHexBrightness(shelfColor, -0.14));
  canvasContext.shadowBlur = 0;
  fillRoundedRectangle(
    canvasContext,
    sceneLayout.shelfX + sideWidth,
    sceneLayout.shelfY + sideWidth,
    sceneLayout.shelfWidth - sideWidth * 2,
    sceneLayout.shelfHeight - sideWidth * 2,
    2,
    adjustHexBrightness(shelfColor, -0.38),
  );
  const innerTopY = sceneLayout.shelfY + sideWidth;
  for (let rowIndex = 0; rowIndex < shelfSettings.rows; rowIndex++) {
    const rowTopY = innerTopY + rowIndex * sceneLayout.shelfRowHeight;
    canvasContext.fillStyle = rowIndex % 2 ? adjustHexBrightness(shelfColor, -0.3) : adjustHexBrightness(shelfColor, -0.34);
    canvasContext.fillRect(sceneLayout.shelfX + sideWidth, rowTopY, sceneLayout.shelfWidth - sideWidth * 2, sceneLayout.shelfRowHeight - shelfThickness * 0.5);
    const shelfGradient = canvasContext.createLinearGradient(
      0,
      rowTopY + sceneLayout.shelfRowHeight - shelfThickness,
      0,
      rowTopY + sceneLayout.shelfRowHeight + shelfThickness * 0.35,
    );
    shelfGradient.addColorStop(0, adjustHexBrightness(shelfColor, 0.08));
    shelfGradient.addColorStop(0.55, shelfColor);
    shelfGradient.addColorStop(1, adjustHexBrightness(shelfColor, -0.22));
    canvasContext.fillStyle = shelfGradient;
    canvasContext.fillRect(sceneLayout.shelfX + 5, rowTopY + sceneLayout.shelfRowHeight - shelfThickness, sceneLayout.shelfWidth - 10, shelfThickness);
    canvasContext.fillStyle = adjustHexBrightness(shelfColor, 0.17);
    canvasContext.fillRect(sceneLayout.shelfX + 5, rowTopY + sceneLayout.shelfRowHeight - shelfThickness, sceneLayout.shelfWidth - 10, Math.max(2, shelfThickness * 0.16));
  }
  const sideGradient = canvasContext.createLinearGradient(sceneLayout.shelfX, 0, sceneLayout.shelfX + sideWidth, 0);
  sideGradient.addColorStop(0, adjustHexBrightness(shelfColor, -0.12));
  sideGradient.addColorStop(1, adjustHexBrightness(shelfColor, 0.08));
  canvasContext.fillStyle = sideGradient;
  canvasContext.fillRect(sceneLayout.shelfX, sceneLayout.shelfY, sideWidth, sceneLayout.shelfHeight);
  canvasContext.fillRect(sceneLayout.shelfX + sceneLayout.shelfWidth - sideWidth, sceneLayout.shelfY, sideWidth, sceneLayout.shelfHeight);
  canvasContext.fillStyle = adjustHexBrightness(shelfColor, 0.12);
  canvasContext.fillRect(sceneLayout.shelfX, sceneLayout.shelfY, sceneLayout.shelfWidth, sideWidth);
  canvasContext.restore();
}
// Возвращает фактическую ширину предмета с учетом обложки книги или масштаба декора.
function getItemDisplayWidth(item) {
  if (item.type === "decor") return (item.width || decorAssets[item.kind]?.width || 58) * ((item.size || 100) / 100);
  return item.facing === "cover" ? Math.max(90, item.height * 0.72) : item.width || 52;
}
// Возвращает фактическую высоту предмета с учетом масштаба декора.
function getItemDisplayHeight(item) {
  return (
    (item.height || decorAssets[item.kind]?.height || 65) * (item.type === "decor" ? (item.size || 100) / 100 : 1)
  );
}
// Возвращает версию предмета для отрисовки: для декора в режиме редактирования берет черновик.
function getRenderableItem(item) {
  return item.id === editingDecorId && editingDecorDraft
    ? { ...item, ...editingDecorDraft }
    : item;
}
// Ищет для новой книги первый свободный зазор на полках; если места нет, помечает ее как напольную.
function findAutomaticShelfPlacement(item) {
  const sceneLayout = getSceneLayoutForAutomaticPlacement(),
    itemWidth = getItemDisplayWidth(item) * sceneLayout.sceneScale,
    itemHeight = getItemDisplayHeight(item) * sceneLayout.sceneScale,
    shelfContentLeft = sceneLayout.shelfX + 29 * sceneLayout.sceneScale,
    shelfContentRight = sceneLayout.shelfX + sceneLayout.shelfWidth - 25 * sceneLayout.sceneScale,
    shelfContentWidth = shelfContentRight - shelfContentLeft,
    itemGap = 5 * sceneLayout.sceneScale,
    existingPlacements = calculateItemPlacements(sceneLayout);
  if (itemHeight > sceneLayout.shelfRowHeight - 5 * sceneLayout.sceneScale || itemWidth > shelfContentWidth) {
    return { row: state.shelf.rows, order: Date.now() };
  }
  for (let rowIndex = 0; rowIndex < state.shelf.rows; rowIndex++) {
    const rowItems = state.items
      .map((candidateItem) => ({ item: candidateItem, bounds: existingPlacements.get(candidateItem.id) }))
      .filter(({ bounds }) => bounds && bounds.row === rowIndex && !bounds.floor)
      .sort((firstPlacement, secondPlacement) => firstPlacement.bounds.x - secondPlacement.bounds.x);
    const possibleSlots = [];
    let freeStartX = shelfContentLeft;
    rowItems.forEach((placement, placementIndex) => {
      const freeEndX = placement.bounds.x - itemGap;
      possibleSlots.push({ x: freeStartX, width: freeEndX - freeStartX, insertionIndex: placementIndex });
      freeStartX = Math.max(freeStartX, placement.bounds.x + placement.bounds.w + itemGap);
    });
    possibleSlots.push({
      x: freeStartX,
      width: shelfContentRight - freeStartX,
      insertionIndex: rowItems.length,
    });
    const freeSlot = possibleSlots.find((slot) => slot.width >= itemWidth);
    if (!freeSlot) continue;
    const shelfAvailableWidth = Math.max(1, shelfContentWidth - itemWidth),
      shelfXPercent = ((freeSlot.x - shelfContentLeft) / shelfAvailableWidth) * 100,
      previousItem = rowItems[freeSlot.insertionIndex - 1]?.item,
      nextItem = rowItems[freeSlot.insertionIndex]?.item;
    let order = 0;
    if (previousItem && nextItem) order = (previousItem.order + nextItem.order) / 2;
    else if (previousItem) order = previousItem.order + 1;
    else if (nextItem) order = nextItem.order - 1;
    return { row: rowIndex, shelfXPercent, order };
  }
  return { row: state.shelf.rows, order: Date.now() };
}
// Раскладывает предметы по рядам; все, что не помещается по ширине или высоте, переносит на пол.
function calculateItemPlacements(sceneLayout) {
  const itemPlacements = new Map(),
    floorItems = state.items.filter((item) => !Number.isFinite(item.row) || item.row < 0 || item.row >= state.shelf.rows),
    shelfContentLeft = sceneLayout.shelfX + 29 * sceneLayout.sceneScale,
    shelfContentRight = sceneLayout.shelfX + sceneLayout.shelfWidth - 25 * sceneLayout.sceneScale;
  for (let rowIndex = 0; rowIndex < state.shelf.rows; rowIndex++) {
    let horizontalCursor = sceneLayout.shelfX + 29 * sceneLayout.sceneScale;
    const rowItems = state.items
      .filter(
        (item) =>
          item.row === rowIndex,
      )
      .sort((firstItem, secondItem) => firstItem.order - secondItem.order);
    for (const item of rowItems) {
      const renderableItem = getRenderableItem(item),
        itemWidth = getItemDisplayWidth(renderableItem) * sceneLayout.sceneScale,
        itemHeight = getItemDisplayHeight(renderableItem) * sceneLayout.sceneScale,
        isTooTall = itemHeight > sceneLayout.shelfRowHeight - 5 * sceneLayout.sceneScale,
        isTooWide = itemWidth > shelfContentRight - shelfContentLeft,
        freeShelfX = item.shelfXPercent == null
          ? horizontalCursor
          : shelfContentLeft + ((shelfContentRight - shelfContentLeft - itemWidth) * item.shelfXPercent) / 100,
        itemX = clampNumber(freeShelfX, shelfContentLeft, shelfContentRight - itemWidth);
      if (isTooTall || isTooWide) {
        floorItems.push(item);
        continue;
      }
      const rowTopY = sceneLayout.shelfY + 23 * sceneLayout.sceneScale + rowIndex * sceneLayout.shelfRowHeight,
        rowBottomY =
          sceneLayout.shelfY +
          23 * sceneLayout.sceneScale +
          (rowIndex + 1) * sceneLayout.shelfRowHeight -
          state.shelf.depth * sceneLayout.sceneScale,
        freeVerticalSpace = Math.max(0, rowBottomY - rowTopY - itemHeight),
        itemY =
          item.type === "decor" && item.shelfYPercent != null
            ? rowBottomY - itemHeight - (freeVerticalSpace * item.shelfYPercent) / 100
            :
        sceneLayout.shelfY +
        23 * sceneLayout.sceneScale +
        (rowIndex + 1) * sceneLayout.shelfRowHeight -
        state.shelf.depth * sceneLayout.sceneScale -
        itemHeight;
      itemPlacements.set(item.id, {
        x: itemX,
        y: itemY,
        w: itemWidth,
        h: itemHeight,
        row: rowIndex,
      });
      horizontalCursor = Math.max(horizontalCursor, itemX + itemWidth + 5 * sceneLayout.sceneScale);
    }
  }
  let floorX = 18 * sceneLayout.sceneScale,
    floorBaselineY = sceneLayout.floorLineY,
    maximumFloorItemHeight = 0;
  for (const item of floorItems) {
    const renderableItem = getRenderableItem(item),
      itemWidth = getItemDisplayWidth(renderableItem) * sceneLayout.sceneScale,
      itemHeight = getItemDisplayHeight(renderableItem) * sceneLayout.sceneScale;
    if (floorX + itemWidth > sceneLayout.canvasWidth - 18 * sceneLayout.sceneScale) {
      floorX = 18 * sceneLayout.sceneScale;
      floorBaselineY += maximumFloorItemHeight + 10 * sceneLayout.sceneScale;
      maximumFloorItemHeight = 0;
    }
    itemPlacements.set(item.id, {
      x: floorX,
      y: floorBaselineY - itemHeight,
      w: itemWidth,
      h: itemHeight,
      row: -1,
      floor: true,
    });
    floorX += itemWidth + 7 * sceneLayout.sceneScale;
    maximumFloorItemHeight = Math.max(maximumFloorItemHeight, itemHeight);
  }
  return itemPlacements;
}
// Обновляет hit-box'ы предметов без перерисовки, чтобы клик всегда проверял актуальные координаты.
function refreshItemHitBoxes(sceneLayout) {
  const itemPlacements = calculateItemPlacements(sceneLayout);
  state.items.forEach((item) => {
    const itemBounds = itemPlacements.get(item.id);
    if (itemBounds) item._box = itemBounds;
  });
  return itemPlacements;
}
// Рисует все размещенные книги и предметы декора в рассчитанном порядке.
function drawLibraryItems(sceneLayout) {
  const itemPlacements = refreshItemHitBoxes(sceneLayout);
  [...state.items]
    .sort(
      (firstItem, secondItem) =>
        firstItem.row - secondItem.row || firstItem.order - secondItem.order,
    )
    .forEach((item) => {
      if (item.id === drag?.id && drag.active) return;
      const itemBounds = itemPlacements.get(item.id);
      if (!itemBounds) return;
      item._box = itemBounds;
      canvasContext.save();
      if (item.id === selectedId) {
        canvasContext.shadowColor = "rgba(255,238,165,.95)";
        canvasContext.shadowBlur = 15;
      }
      drawLibraryItem(getRenderableItem(item), itemBounds, sceneLayout);
      if (item.id === selectedId) drawSelectedItemOutline(itemBounds);
      canvasContext.restore();
    });
}
// Рисует явный контур выбранной книги или декора поверх их собственной тени.
function drawSelectedItemOutline(itemBounds) {
  canvasContext.save();
  canvasContext.strokeStyle = "rgba(255,238,165,.62)";
  canvasContext.lineWidth = 2;
  canvasContext.shadowColor = "rgba(255,238,165,.35)";
  canvasContext.shadowBlur = 9;
  canvasContext.beginPath();
  canvasContext.roundRect(itemBounds.x - 5, itemBounds.y - 5, itemBounds.w + 10, itemBounds.h + 10, 8);
  canvasContext.stroke();
  canvasContext.restore();
}
// Рисует шестеренку прямо на Canvas, чтобы она не зависела от HTML-слоев и скролла.
function drawCanvasBookSettingsButton() {
  bookSettingsButtonBox = null;
  if (drag?.active) return;
  const selectedBook = state.items.find((item) => item.id === selectedId && item.type === "book");
  if (!selectedBook?._box) return;
  const bookBounds = selectedBook._box,
    buttonRadius = 14,
    buttonCenterX = bookBounds.x + bookBounds.w / 2,
    buttonCenterY = Math.max(buttonRadius + 6, bookBounds.y - buttonRadius - 8);
  bookSettingsButtonBox = {
    x: buttonCenterX - buttonRadius,
    y: buttonCenterY - buttonRadius,
    w: buttonRadius * 2,
    h: buttonRadius * 2,
  };
  canvasContext.save();
  canvasContext.shadowColor = "rgba(40,25,20,.35)";
  canvasContext.shadowBlur = 12;
  canvasContext.shadowOffsetY = 5;
  canvasContext.beginPath();
  canvasContext.arc(buttonCenterX, buttonCenterY, buttonRadius, 0, Math.PI * 2);
  canvasContext.fillStyle = "rgba(50,43,39,.94)";
  canvasContext.fill();
  canvasContext.shadowBlur = 0;
  canvasContext.strokeStyle = "rgba(255,255,255,.85)";
  canvasContext.lineWidth = 1.4;
  canvasContext.stroke();
  canvasContext.fillStyle = "#fff";
  canvasContext.font = "18px serif";
  canvasContext.textAlign = "center";
  canvasContext.textBaseline = "middle";
  canvasContext.fillText("⚙", buttonCenterX, buttonCenterY + 1);
  canvasContext.restore();
}
// Проверяет, нажали ли на canvas-шестеренку выбранной книги.
function findBookSettingsButtonAtPoint(canvasPoint) {
  if (!bookSettingsButtonBox) return null;
  const isInsideButton =
    canvasPoint.x >= bookSettingsButtonBox.x &&
    canvasPoint.x <= bookSettingsButtonBox.x + bookSettingsButtonBox.w &&
    canvasPoint.y >= bookSettingsButtonBox.y &&
    canvasPoint.y <= bookSettingsButtonBox.y + bookSettingsButtonBox.h;
  if (!isInsideButton) return null;
  return state.items.find((item) => item.id === selectedId && item.type === "book") || null;
}
// Рисует подсказку места, куда предмет встанет после отпускания на полке.
function drawDropPlaceholder(sceneLayout) {
  if (!drag?.active || drag.type !== "item") return;
  const draggedItem = state.items.find((item) => item.id === drag.id);
  if (!draggedItem) return;
  const targetRow = getShelfRowAtPoint({ x: drag.x, y: drag.y }, sceneLayout);
  if (targetRow < 0) return;
  const itemWidth = getItemDisplayWidth(draggedItem) * sceneLayout.sceneScale,
    itemHeight = getItemDisplayHeight(draggedItem) * sceneLayout.sceneScale,
    shelfContentLeft = sceneLayout.shelfX + 29 * sceneLayout.sceneScale,
    shelfContentRight = sceneLayout.shelfX + sceneLayout.shelfWidth - 25 * sceneLayout.sceneScale,
    insertionX = clampNumber(
      drag.x - drag.dx,
      shelfContentLeft,
      shelfContentRight - itemWidth,
    ),
    rowBaseY =
      sceneLayout.shelfY +
      23 * sceneLayout.sceneScale +
      (targetRow + 1) * sceneLayout.shelfRowHeight -
      state.shelf.depth * sceneLayout.sceneScale,
    rowTopY = sceneLayout.shelfY + 23 * sceneLayout.sceneScale + targetRow * sceneLayout.shelfRowHeight,
    placeholderY = draggedItem.type === "decor"
      ? clampNumber(drag.y - drag.dy, rowTopY, rowBaseY - itemHeight)
      : rowBaseY - itemHeight;
  canvasContext.save();
  canvasContext.globalAlpha = 0.7;
  canvasContext.strokeStyle = "#f7d877";
  canvasContext.fillStyle = "rgba(247,216,119,.18)";
  canvasContext.lineWidth = 2;
  fillRoundedRectangle(
    canvasContext,
    insertionX,
    placeholderY,
    itemWidth,
    itemHeight,
    5,
    "rgba(247,216,119,.18)",
  );
  canvasContext.strokeRect(insertionX, placeholderY, itemWidth, itemHeight);
  canvasContext.restore();
}
// Подсвечивает выбранный объект комнаты или сам стеллаж.
function drawSelectedSceneHighlight(sceneLayout) {
  if (!selectedSceneKind) return;
  const roomSettings = state.room;
  const selectedBounds =
    selectedSceneKind === "shelf"
      ? { x: sceneLayout.shelfX, y: sceneLayout.shelfY, w: sceneLayout.shelfWidth, h: sceneLayout.shelfHeight }
      : roomSettings[`_${selectedSceneKind}Box`];
  if (!selectedBounds) return;
  canvasContext.save();
  canvasContext.strokeStyle = "rgba(255,238,165,.58)";
  canvasContext.lineWidth = 2;
  canvasContext.shadowColor = "rgba(255,238,165,.32)";
  canvasContext.shadowBlur = 9;
  canvasContext.beginPath();
  canvasContext.roundRect(selectedBounds.x - 5, selectedBounds.y - 5, selectedBounds.w + 10, selectedBounds.h + 10, 10);
  canvasContext.stroke();
  canvasContext.restore();
}
// Выбирает подходящий отрисовщик для одной книги или одного предмета декора.
function drawLibraryItem(item, itemBounds, sceneLayout, isDragging = false) {
  if (item.type === "book") drawBook(canvasContext, item, itemBounds, sceneLayout.sceneScale, isDragging);
  else drawDecor(item, itemBounds, sceneLayout);
}
// Рисует перетаскиваемый предмет поверх сцены непосредственно под указателем.
function drawDraggedItem(sceneLayout) {
  const item = state.items.find((candidateItem) => candidateItem.id === drag.id);
  if (!item) return;
  const renderableItem = getRenderableItem(item),
    itemWidth = getItemDisplayWidth(renderableItem) * sceneLayout.sceneScale,
    itemHeight = getItemDisplayHeight(renderableItem) * sceneLayout.sceneScale,
    draggedItemBounds = {
      x: drag.x - drag.dx,
      y: drag.y - drag.dy,
      w: itemWidth,
      h: itemHeight,
    };
  canvasContext.save();
  canvasContext.globalAlpha = 0.94;
  canvasContext.shadowColor = "rgba(35,22,18,.4)";
  canvasContext.shadowBlur = 22;
  canvasContext.shadowOffsetY = 13;
  drawLibraryItem(renderableItem, draggedItemBounds, sceneLayout, true);
  canvasContext.restore();
  item._dragBox = draggedItemBounds;
}
// Сокращает текст многоточием, пока он не начнет помещаться в указанную ширину.
function truncateTextToWidth(context, text, maxWidth) {
  let value = text;
  if (context.measureText(value).width <= maxWidth) return value;
  while (value.length > 2 && context.measureText(value + "…").width > maxWidth)
    value = value.slice(0, -1);
  return value + "…";
}
// Делит название на несколько строк для обложки, чтобы оно не превращалось в многоточие.
function wrapTextIntoLines(context, text, maxWidth, maximumLines = 3) {
  const sourceText = text.trim() || "Без названия",
    words = sourceText.split(/\s+/).filter(Boolean),
    lines = [];
  let currentLine = "";
  let wasTruncated = false;
  for (const word of words.length ? words : [text]) {
    const candidateLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidateLine).width <= maxWidth) {
      currentLine = candidateLine;
      continue;
    }
    if (currentLine) lines.push(currentLine);
    currentLine = word;
    while (context.measureText(currentLine).width > maxWidth && currentLine.length > 1) {
      let fragment = currentLine;
      while (fragment.length > 1 && context.measureText(fragment).width > maxWidth)
        fragment = fragment.slice(0, -1);
      lines.push(fragment);
      currentLine = currentLine.slice(fragment.length);
      if (lines.length === maximumLines) {
        wasTruncated = Boolean(currentLine);
        break;
      }
    }
    if (lines.length === maximumLines) {
      wasTruncated = true;
      break;
    }
  }
  if (currentLine && lines.length < maximumLines) lines.push(currentLine);
  if (wasTruncated && lines.length) {
    let lastLine = lines[lines.length - 1];
    while (lastLine.length > 1 && context.measureText(`${lastLine}…`).width > maxWidth)
      lastLine = lastLine.slice(0, -1);
    lines[lines.length - 1] = `${lastLine}…`;
  }
  return lines.slice(0, maximumLines);
}
// Рисует значок книги через OpenMoji SVG вместо системного emoji-шрифта.
function drawBookOpenMojiIcon(context, book, centerX, centerY, iconSize) {
  const emojiCode = book.emojiCode || getOpenMojiCodeForEmoji(book.emoji),
    emojiImage = getBookEmojiImage(emojiCode);
  if (emojiImage?.complete && emojiImage.naturalWidth) {
    context.drawImage(emojiImage, centerX - iconSize / 2, centerY - iconSize / 2, iconSize, iconSize);
    return;
  }
}
// Рисует книгу корешком или обложкой, включая название, эмодзи, тени и объемные грани.
function drawBook(context, book, bookBounds, scale = 1, isDragging = false) {
  context.save();
  context.shadowColor = "rgba(35,22,18,.24)";
  context.shadowBlur = isDragging ? 15 : 6;
  context.shadowOffsetX = 3;
  fillRoundedRectangle(context, bookBounds.x, bookBounds.y, bookBounds.w, bookBounds.h, Math.max(2, 3 * scale), book.color);
  context.shadowBlur = 0;
  if (book.facing === "cover") {
    context.fillStyle = adjustHexBrightness(book.color, 0.17);
    context.fillRect(bookBounds.x + 5 * scale, bookBounds.y, 5 * scale, bookBounds.h);
    context.fillStyle = adjustHexBrightness(book.color, -0.18);
    context.fillRect(bookBounds.x, bookBounds.y + bookBounds.h - 7 * scale, bookBounds.w, 5 * scale);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `${Math.max(10, (book.fontSize || 12) * scale)}px Manrope`;
    context.fillStyle = book.iconColor;
    const titleLines = wrapTextIntoLines(context, book.title, bookBounds.w - 18 * scale, 3),
      lineHeight = Math.max(11, (book.fontSize || 12) * scale * 1.12),
      titleBlockTop = bookBounds.y + bookBounds.h * 0.18;
    titleLines.forEach((line, lineIndex) =>
      context.fillText(
        line,
        bookBounds.x + bookBounds.w / 2,
        titleBlockTop + lineIndex * lineHeight,
      ),
    );
    const coverIconSize = Math.min(34 * scale, bookBounds.w * 0.42);
    drawBookOpenMojiIcon(context, book, bookBounds.x + bookBounds.w / 2, bookBounds.y + bookBounds.h * (titleLines.length > 1 ? 0.68 : 0.55), coverIconSize);
  } else {
    context.fillStyle = adjustHexBrightness(book.color, 0.18);
    context.fillRect(bookBounds.x + 4 * scale, bookBounds.y, 3 * scale, bookBounds.h);
    context.fillStyle = adjustHexBrightness(book.color, -0.18);
    context.fillRect(bookBounds.x, bookBounds.y + bookBounds.h - 7 * scale, bookBounds.w, 4 * scale);
    context.save();
    context.translate(bookBounds.x + bookBounds.w / 2, bookBounds.y + bookBounds.h * 0.56);
    context.rotate(-Math.PI / 2);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `${Math.max(7, (book.fontSize || 12) * scale)}px Manrope`;
    context.fillStyle = book.iconColor;
    context.fillText(truncateTextToWidth(context, book.title, bookBounds.h * 0.6), 0, 0);
    context.restore();
    context.textAlign = "center";
    context.textBaseline = "middle";
    const spineIconSize = Math.min(19 * scale, bookBounds.w * 0.62);
    drawBookOpenMojiIcon(context, book, bookBounds.x + bookBounds.w / 2, bookBounds.y + bookBounds.h * 0.18, spineIconSize);
  }
  context.restore();
}
// Преобразует HEX-цвет в угол цветового тона для Canvas-фильтров.
function getHexColorHue(hexColor) {
  const red = parseInt(hexColor.slice(1, 3), 16) / 255,
    green = parseInt(hexColor.slice(3, 5), 16) / 255,
    blue = parseInt(hexColor.slice(5, 7), 16) / 255,
    maximumChannel = Math.max(red, green, blue),
    minimumChannel = Math.min(red, green, blue),
    channelDifference = maximumChannel - minimumChannel;
  if (!channelDifference) return 0;
  const hueSegment =
    maximumChannel === red
      ? ((green - blue) / channelDifference) % 6
      : maximumChannel === green
        ? (blue - red) / channelDifference + 2
        : (red - green) / channelDifference + 4;
  return (hueSegment * 60 + 360) % 360;
}
// Рисует изображение целиком внутри прямоугольника без нарушения пропорций.
function drawContainedImage(context, image, bounds) {
  const imageRatio = image.naturalWidth / image.naturalHeight,
    boundsRatio = bounds.w / bounds.h,
    offsetX = ((bounds.offsetX || 0) / 100) * bounds.w,
    offsetY = ((bounds.offsetY || 0) / 100) * bounds.h;
  let drawWidth = bounds.w,
    drawHeight = bounds.h;
  if (imageRatio > boundsRatio) drawHeight = bounds.w / imageRatio;
  else drawWidth = bounds.h * imageRatio;
  context.drawImage(
    image,
    bounds.x + (bounds.w - drawWidth) / 2 + offsetX,
    bounds.y + (bounds.h - drawHeight) / 2 + offsetY,
    drawWidth,
    drawHeight,
  );
}
// Рисует OpenMoji-декор с масштабированием, сохранением пропорций и цветовым фильтром.
function drawDecor(decorItem, decorBounds, sceneLayout, targetContext = canvasContext) {
  targetContext.save();
  targetContext.shadowColor = "rgba(35,22,18,.24)";
  targetContext.shadowBlur = 7;
  targetContext.shadowOffsetY = 4;
  const image = getDecorImage(decorItem.kind, decorItem.src, decorItem.code);
  const tintStrength = (decorItem.tint || 0) / 100;
  if (tintStrength)
    targetContext.filter = `sepia(${tintStrength}) saturate(${1 + tintStrength * 4}) hue-rotate(${getHexColorHue(decorItem.color || "#e4a65f") - 35}deg)`;
  if (image?.complete && image.naturalWidth) {
    drawContainedImage(targetContext, image, {
      ...decorBounds,
      offsetX: decorItem.offsetX || 0,
      offsetY: decorItem.offsetY || 0,
    });
    targetContext.restore();
    return;
  }
  targetContext.font = `${Math.min(decorBounds.w, decorBounds.h) * 0.8}px serif`;
  targetContext.textAlign = "center";
  targetContext.textBaseline = "bottom";
  targetContext.fillText(
    decorAssets[decorItem.kind]?.fallback || "✨",
    decorBounds.x + decorBounds.w / 2 + ((decorItem.offsetX || 0) / 100) * decorBounds.w,
    decorBounds.y + decorBounds.h + ((decorItem.offsetY || 0) / 100) * decorBounds.h,
  );
  targetContext.restore();
}
// Перерисовывает миниатюру книги в панели редактора.
function renderBookPreview() {
  const pixelRatio = Math.min(devicePixelRatio, 2),
    previewBounds = bookPreviewCanvas.getBoundingClientRect();
  if (previewBounds.width) {
    bookPreviewCanvas.width = previewBounds.width * pixelRatio;
    bookPreviewCanvas.height = previewBounds.height * pixelRatio;
    bookPreviewContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }
  const previewWidth = bookPreviewCanvas.clientWidth,
    previewHeight = bookPreviewCanvas.clientHeight;
  bookPreviewContext.clearRect(0, 0, previewWidth, previewHeight);
  const book = readBookFormValues(),
    previewScale = Math.min(1.05, (previewHeight - 24) / book.height),
    bookWidth = getItemDisplayWidth(book) * previewScale,
    bookHeight = book.height * previewScale,
    bookBounds = {
      x: (previewWidth - bookWidth) / 2,
      y: (previewHeight - bookHeight) / 2,
      w: bookWidth,
      h: bookHeight,
    };
  bookPreviewContext.shadowColor = "rgba(55,35,25,.22)";
  bookPreviewContext.shadowBlur = 16;
  bookPreviewContext.shadowOffsetY = 8;
  drawBook(bookPreviewContext, book, bookBounds, previewScale);
  bookPreviewContext.shadowBlur = 0;
}
// Возвращает редактируемый декор либо временный объект из значений формы.
function getCurrentDecor() {
  const asset = decorAssets[selectedDecorKind] || decorAssets.plant;
  return editingDecorId
    ? editingDecorDraft || state.items.find((item) => item.id === editingDecorId)
    : {
        kind: selectedDecorKind,
        code: asset.code,
        color: getElementById("decorColor").value,
        width: asset.width,
        height: asset.height,
        src: asset.src,
        size: +getElementById("decorSize").value,
        tint: +getElementById("decorTint").value,
        offsetX: +getElementById("decorOffsetX").value,
        offsetY: +getElementById("decorOffsetY").value,
      };
}
// Перерисовывает миниатюру выбранного декора в левой панели.
function renderDecorPreview() {
  const previewBounds = decorPreviewCanvas.getBoundingClientRect(),
    pixelRatio = Math.min(devicePixelRatio, 2);
  if (!previewBounds.width) return;
  decorPreviewCanvas.width = previewBounds.width * pixelRatio;
  decorPreviewCanvas.height = previewBounds.height * pixelRatio;
  decorPreviewContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const previewWidth = decorPreviewCanvas.clientWidth,
    previewHeight = decorPreviewCanvas.clientHeight;
  decorPreviewContext.clearRect(0, 0, previewWidth, previewHeight);
  const decorItem = getCurrentDecor(),
    decorSize =
      (Math.min(previewHeight - 18, 82) * (decorItem.size || 100)) / 100,
    decorBounds = {
      x: (previewWidth - decorSize) / 2,
      y: previewHeight - decorSize - 8,
      w: decorSize,
      h: decorSize,
    };
  drawDecor(decorItem, decorBounds, { sceneScale: 1 }, decorPreviewContext);
}

// Ищет верхний предмет библиотеки под указанной точкой Canvas.
function findItemAtPoint(canvasPoint) {
  return [...state.items]
    .reverse()
    .find(
      (candidateItem) =>
        candidateItem._box &&
        canvasPoint.x >= candidateItem._box.x &&
        canvasPoint.x <= candidateItem._box.x + candidateItem._box.w &&
        canvasPoint.y >= candidateItem._box.y &&
        canvasPoint.y <= candidateItem._box.y + candidateItem._box.h,
    );
}
// Ищет перемещаемый объект комнаты — кресло, окно или коврик — под точкой Canvas.
function findSceneObjectAtPoint(canvasPoint) {
  const roomSettings = state.room,
    sceneObjects = [
      ["chair", roomSettings._chairBox],
      ["window", roomSettings._windowBox],
      ["rug", roomSettings._rugBox],
    ];
  return sceneObjects.find(
    ([, objectBounds]) =>
      objectBounds && canvasPoint.x >= objectBounds.x && canvasPoint.x <= objectBounds.x + objectBounds.w && canvasPoint.y >= objectBounds.y && canvasPoint.y <= objectBounds.y + objectBounds.h,
  );
}
// Переводит координаты pointer-события из окна браузера в локальные координаты Canvas.
function getCanvasPointerPosition(pointerEvent) {
  const canvasBounds = canvas.getBoundingClientRect();
  return {
    x: pointerEvent.clientX - canvasBounds.left,
    y: pointerEvent.clientY - canvasBounds.top,
  };
}
// Возвращает номер полки под курсором или -1, если указатель вне стеллажа.
function getShelfRowAtPoint(canvasPoint, sceneLayout) {
  const isInsideShelf =
    canvasPoint.x >= sceneLayout.shelfX &&
    canvasPoint.x <= sceneLayout.shelfX + sceneLayout.shelfWidth &&
    canvasPoint.y >= sceneLayout.shelfY &&
    canvasPoint.y <= sceneLayout.shelfY + sceneLayout.shelfHeight;
  if (!isInsideShelf) return -1;
  return clampNumber(
    Math.floor((canvasPoint.y - (sceneLayout.shelfY + 23 * sceneLayout.sceneScale)) / sceneLayout.shelfRowHeight),
    0,
    state.shelf.rows - 1,
  );
}
// Находит X-координату подсветки вставки среди уже стоящих предметов ряда.
function getDropInsertionX(targetRow, pointerX, sceneLayout) {
  const rowItems = state.items
    .filter((item) => item.id !== drag?.id && item.row === targetRow && item._box && !item._box.floor)
    .sort((firstItem, secondItem) => firstItem.order - secondItem.order);
  const insertionTarget = rowItems.find(
    (item) => pointerX < item._box.x + item._box.w / 2,
  );
  if (insertionTarget) return insertionTarget._box.x - 3 * sceneLayout.sceneScale;
  const lastItem = rowItems.at(-1);
  return lastItem
    ? lastItem._box.x + lastItem._box.w + 5 * sceneLayout.sceneScale
    : sceneLayout.shelfX + 29 * sceneLayout.sceneScale;
}
// Считает новое значение order так, чтобы предмет остался именно в выбранном месте ряда.
function calculateDroppedItemOrder(item, targetRow, pointerX) {
  const rowItems = state.items
    .filter((candidateItem) => candidateItem.id !== item.id && candidateItem.row === targetRow && candidateItem._box && !candidateItem._box.floor)
    .sort((firstItem, secondItem) => firstItem.order - secondItem.order);
  const insertionIndex = rowItems.findIndex(
    (peerItem) => pointerX < peerItem._box.x + peerItem._box.w / 2,
  );
  if (!rowItems.length) return 0;
  if (insertionIndex === 0) return rowItems[0].order - 1;
  if (insertionIndex === -1) return rowItems.at(-1).order + 1;
  return (rowItems[insertionIndex - 1].order + rowItems[insertionIndex].order) / 2;
}
// Проверяет попадание в общий прямоугольник стеллажа.
function isPointInsideShelf(canvasPoint, sceneLayout) {
  return (
    canvasPoint.x >= sceneLayout.shelfX &&
    canvasPoint.x <= sceneLayout.shelfX + sceneLayout.shelfWidth &&
    canvasPoint.y >= sceneLayout.shelfY &&
    canvasPoint.y <= sceneLayout.shelfY + sceneLayout.shelfHeight
  );
}
// Начинает выбор или потенциальное перетаскивание предмета либо объекта комнаты.
canvas.addEventListener("pointerdown", (pointerEvent) => {
  const sceneLayout = calculateSceneLayout();
  refreshItemHitBoxes(sceneLayout);
  drawCanvasBookSettingsButton();
  const canvasPoint = getCanvasPointerPosition(pointerEvent),
    clickedBookSettingsButton = findBookSettingsButtonAtPoint(canvasPoint),
    clickedItem = findItemAtPoint(canvasPoint),
    clickedSceneObject = !clickedItem && findSceneObjectAtPoint(canvasPoint),
    clickedShelf = !clickedItem && !clickedSceneObject && isPointInsideShelf(canvasPoint, sceneLayout);
  if (clickedBookSettingsButton) {
    openBookContextMenu(clickedBookSettingsButton);
    return;
  }
  closeBookContextMenu();
  hideItemSettingsButton();
  selectedId = clickedItem?.id || null;
  selectedSceneKind = clickedSceneObject?.[0] || (clickedShelf ? "shelf" : null);
  getElementById("deleteSelectedBtn").disabled = !selectedId;
  if (clickedItem) {
    selectedSceneKind = null;
    openEditorTab(clickedItem.type === "book" ? "books" : "decor");
    renderScene();
    if (clickedItem.type === "book") showBookSettingsButton(clickedItem);
    else startDecorEditing(clickedItem);
    drag = {
      type: "item",
      id: clickedItem.id,
      x: canvasPoint.x,
      y: canvasPoint.y,
      dx: canvasPoint.x - clickedItem._box.x,
      dy: canvasPoint.y - clickedItem._box.y,
      startX: canvasPoint.x,
      startY: canvasPoint.y,
      active: false,
    };
    canvas.setPointerCapture(pointerEvent.pointerId);
  } else if (clickedSceneObject) {
    const [sceneObjectKind, objectBounds] = clickedSceneObject;
    openEditorTab("room");
    drag = {
      type: "scene",
      kind: sceneObjectKind,
      x: canvasPoint.x,
      y: canvasPoint.y,
      dx: canvasPoint.x - objectBounds.x,
      dy: canvasPoint.y - objectBounds.y,
      startX: canvasPoint.x,
      startY: canvasPoint.y,
      active: false,
    };
    canvas.setPointerCapture(pointerEvent.pointerId);
  } else if (clickedShelf) {
    openEditorTab("shelf");
  }
  if (!clickedItem) renderScene();
});
// Активирует drag после небольшого смещения и обновляет положение объекта под курсором.
canvas.addEventListener("pointermove", (pointerEvent) => {
  const canvasPoint = getCanvasPointerPosition(pointerEvent);
  if (!drag) return;
  drag.x = canvasPoint.x;
  drag.y = canvasPoint.y;
  if (Math.hypot(canvasPoint.x - drag.startX, canvasPoint.y - drag.startY) > 4) drag.active = true;
  if (drag.active) {
    hideItemSettingsButton();
    closeBookContextMenu();
    if (drag.type === "scene") updateDraggedSceneObject(canvasPoint);
    renderScene();
  }
});
// Завершает перетаскивание либо обрабатывает обычный клик по книге или декору.
canvas.addEventListener("pointerup", (pointerEvent) => {
  if (!drag) return;
  const canvasPoint = getCanvasPointerPosition(pointerEvent),
    sceneLayout = calculateSceneLayout(),
    wasMoved = drag.active,
    completedDrag = drag;
  if (completedDrag.type === "scene") {
    drag = null;
    if (wasMoved) commitStateChange();
    else renderScene();
    return;
  }
  const item = state.items.find(
    (candidateItem) => candidateItem.id === completedDrag.id,
  );
  if (!item) {
    drag = null;
    renderScene();
    return;
  }
  const draggedItemHeight = getItemDisplayHeight(item) * sceneLayout.sceneScale,
    draggedItemTopY = completedDrag.y - completedDrag.dy,
    decorCenterPoint = { x: canvasPoint.x, y: draggedItemTopY + draggedItemHeight / 2 },
    targetRow = item.type === "decor"
      ? getShelfRowAtPoint(decorCenterPoint, sceneLayout)
      : getShelfRowAtPoint(canvasPoint, sceneLayout);
  if (wasMoved && targetRow >= 0) {
    const itemWidth = getItemDisplayWidth(item) * sceneLayout.sceneScale,
      itemHeight = getItemDisplayHeight(item) * sceneLayout.sceneScale,
      shelfContentLeft = sceneLayout.shelfX + 29 * sceneLayout.sceneScale,
      shelfContentRight = sceneLayout.shelfX + sceneLayout.shelfWidth - 25 * sceneLayout.sceneScale,
      shelfAvailableWidth = Math.max(1, shelfContentRight - shelfContentLeft - itemWidth),
      droppedItemX = clampNumber(completedDrag.x - completedDrag.dx, shelfContentLeft, shelfContentRight - itemWidth);
    item.row = targetRow;
    item.shelfXPercent = ((droppedItemX - shelfContentLeft) / shelfAvailableWidth) * 100;
    if (item.type === "decor") {
      const rowTopY = sceneLayout.shelfY + 23 * sceneLayout.sceneScale + targetRow * sceneLayout.shelfRowHeight,
        rowBottomY =
          sceneLayout.shelfY +
          23 * sceneLayout.sceneScale +
          (targetRow + 1) * sceneLayout.shelfRowHeight -
          state.shelf.depth * sceneLayout.sceneScale,
        freeVerticalSpace = Math.max(1, rowBottomY - rowTopY - itemHeight),
        droppedItemY = clampNumber(completedDrag.y - completedDrag.dy, rowTopY, rowBottomY - itemHeight);
      item.shelfYPercent = ((rowBottomY - itemHeight - droppedItemY) / freeVerticalSpace) * 100;
    }
    item.order = calculateDroppedItemOrder(item, targetRow, canvasPoint.x);
  }
  drag = null;
  if (wasMoved) commitStateChange();
  else if (item.type === "book") {
    renderScene();
    showBookSettingsButton(item);
  } else {
    renderScene();
  }
});
// Пересчитывает процентные координаты свободно перемещаемого окна, кресла или коврика.
function updateDraggedSceneObject(canvasPoint) {
  const sceneLayout = calculateSceneLayout(),
    roomSettings = state.room;
  if (drag.kind === "window") {
    const windowBounds = roomSettings._windowBox;
    roomSettings.windowX = clampNumber(((canvasPoint.x - drag.dx) / (sceneLayout.canvasWidth - windowBounds.w)) * 100, 0, 100);
    roomSettings.windowY = clampNumber(((canvasPoint.y - drag.dy) / (sceneLayout.floorLineY - windowBounds.h - 15)) * 100, 0, 100);
  } else if (drag.kind === "chair") {
    const chairBounds = roomSettings._chairBox;
    roomSettings.chairX = clampNumber(((canvasPoint.x - drag.dx) / (sceneLayout.canvasWidth - chairBounds.w)) * 100, 0, 100);
    const floorSpace = sceneLayout.canvasHeight - sceneLayout.floorLineY,
      maximumChairLift = chairBounds.h * 0.8,
      chairFloorInset = chairBounds.h * 0.18,
      chairBaselineY = clampNumber(canvasPoint.y - drag.dy + chairBounds.h - chairFloorInset, sceneLayout.floorLineY - maximumChairLift, sceneLayout.canvasHeight - 8);
    roomSettings.chairY = clampNumber(
      ((chairBaselineY - sceneLayout.floorLineY) / floorSpace) * 100,
      0,
      100,
    );
  } else {
    const rugBounds = roomSettings._rugBox;
    roomSettings.rugX = clampNumber(((canvasPoint.x - drag.dx + rugBounds.w / 2) / sceneLayout.canvasWidth) * 100, 0, 100);
    const floorSpace = sceneLayout.canvasHeight - sceneLayout.floorLineY,
      rugCenterY = clampNumber(
        canvasPoint.y - drag.dy + rugBounds.h / 2,
        sceneLayout.floorLineY + rugBounds.h / 2,
        sceneLayout.canvasHeight - rugBounds.h / 2,
      );
    roomSettings.rugY = clampNumber(
      ((rugCenterY - sceneLayout.floorLineY) / floorSpace) * 100,
      0,
      100,
    );
  }
}
// Показывает кнопку настроек над выбранной книгой.
function showBookSettingsButton(book) {
  selectedId = book.id;
  getElementById("itemSettingsBtn").hidden = true;
  renderScene();
}
// Скрывает плавающую кнопку настроек книги.
function hideItemSettingsButton() {
  getElementById("itemSettingsBtn").hidden = true;
  bookSettingsButtonBox = null;
}
// Открывает меню редактирования и удаления рядом с выбранной книгой.
function openBookContextMenu(book) {
  if (!book) return;
  selectedId = book.id;
  getElementById("bookMenuTitle").textContent = book.title;
  const menu = getElementById("bookMenu");
  menu.hidden = false;
  const bookBounds = book._box;
  menu.style.left = `${clampNumber(bookBounds.x + bookBounds.w + 8, 8, canvas.clientWidth - 160)}px`;
  menu.style.top = `${clampNumber(bookBounds.y, 8, canvas.clientHeight - 110)}px`;
  renderScene();
}
getElementById("itemSettingsBtn").onclick = () =>
  openBookContextMenu(
    state.items.find((item) => item.id === selectedId),
  );
// Закрывает контекстное меню книги.
function closeBookContextMenu() {
  getElementById("bookMenu").hidden = true;
}
// Открывает панель декора и заполняет ее параметрами выбранного предмета.
function startDecorEditing(item) {
  editingDecorId = item.id;
  selectedId = item.id;
  selectedSceneKind = null;
  selectedDecorKind = item.kind;
  editingDecorDraft = { ...item };
  getElementById("decorColor").value = item.color || "#e4a65f";
  getElementById("decorSize").value = item.size || 100;
  getElementById("decorTint").value = item.tint || 0;
  getElementById("decorOffsetX").value = item.offsetX || 0;
  getElementById("decorOffsetY").value = item.offsetY || 0;
  getElementById("decorModeLabel").textContent = "ВЫБРАННЫЙ ПРЕДМЕТ";
  getElementById("decorPanelTitle").textContent = "Редактирование";
  getElementById("finishDecorEditBtn").hidden = false;
  openEditorTab("decor");
  updateDecorChoiceButtons();
  updateControlOutputs();
  requestAnimationFrame(renderDecorPreview);
  renderScene();
}
// Завершает редактирование декора и возвращает панель в режим добавления.
function finishDecorEditing() {
  if (editingDecorId && editingDecorDraft) {
    const item = state.items.find((candidateItem) => candidateItem.id === editingDecorId);
    if (item) Object.assign(item, editingDecorDraft);
  }
  editingDecorId = null;
  editingDecorDraft = null;
  getElementById("decorModeLabel").textContent = "УЮТНЫЕ МЕЛОЧИ";
  getElementById("decorPanelTitle").textContent = "Декор";
  getElementById("finishDecorEditBtn").hidden = true;
  commitStateChange("Декор обновлен ✦");
}
// Закрывает редактор декора без применения черновика.
function cancelDecorEditing() {
  editingDecorId = null;
  editingDecorDraft = null;
  getElementById("decorModeLabel").textContent = "УЮТНЫЕ МЕЛОЧИ";
  getElementById("decorPanelTitle").textContent = "Декор";
  getElementById("finishDecorEditBtn").hidden = true;
  renderDecorPreview();
}
// Нормализует одну запись OpenMoji из внешнего каталога в формат нашего декора.
function normalizeOpenMojiCatalogItem(openMojiItem) {
  const code = openMojiItem.hexcode || openMojiItem.hex || openMojiItem.code;
  if (!code) return null;
  const label = openMojiItem.annotation || openMojiItem.description || openMojiItem.name || openMojiItem.emoji || code,
    searchText = [
      label,
      openMojiItem.tags,
      openMojiItem.openmoji_tags,
      openMojiItem.group,
      openMojiItem.subgroups,
      openMojiItem.emoji,
      code,
    ]
      .flat()
      .filter(Boolean)
      .join(" ");
  return {
    kind: `openmoji-${code}`,
    code,
    label,
    fallback: openMojiItem.emoji || "✦",
    searchText,
    src: `${openMojiSvgBaseUrl}${code}.svg`,
    width: 58,
    height: 58,
  };
}
// Загружает полный каталог OpenMoji; без сети приложение остается на локальном наборе.
async function loadOpenMojiCatalog() {
  try {
    const response = await fetch(openMojiCatalogUrl);
    if (!response.ok) throw new Error("OpenMoji catalog is unavailable");
    const rawCatalog = await response.json();
    const catalogItems = Array.isArray(rawCatalog)
      ? rawCatalog
      : rawCatalog.openmojis || rawCatalog.data || [];
    openMojiCatalog = catalogItems
      .map(normalizeOpenMojiCatalogItem)
      .filter(Boolean);
  } catch {
    openMojiCatalog = [];
  }
}
// Рисует кнопки декора из локального набора или из результатов поиска по OpenMoji.
function renderDecorGrid(searchQuery = "") {
  const decorGrid = getElementById("decorGrid"),
    normalizedSearchQuery = searchQuery.trim().toLowerCase(),
    localDecorItems = Object.entries(decorAssets).map(([kind, asset]) => ({
      kind,
      ...asset,
      label: asset.label || kind,
      searchText: `${asset.label || kind} ${asset.search || ""} ${asset.fallback || ""}`,
    })),
    localVisibleDecorItems = localDecorItems.filter((asset) => !asset.remoteOnly),
    searchableDecorItems = normalizedSearchQuery && openMojiCatalog.length
      ? [...localVisibleDecorItems, ...openMojiCatalog]
      : localVisibleDecorItems,
    matchingDecorItems = normalizedSearchQuery
      ? searchableDecorItems.filter((asset) => asset.searchText.toLowerCase().includes(normalizedSearchQuery)).slice(0, 60)
      : searchableDecorItems;
  decorGrid.innerHTML = matchingDecorItems
    .map(
      (asset) =>
        `<button data-decor="${escapeHtml(asset.kind)}" data-search="${escapeHtml(asset.searchText)}" type="button">
          <img src="${escapeHtml(asset.src || `assets/openmoji/${asset.code}.svg`)}" alt="" /><b>${escapeHtml(asset.label)}</b>
        </button>`,
    )
    .join("");
  matchingDecorItems.forEach((asset) => {
    decorAssets[asset.kind] = {
      ...decorAssets[asset.kind],
      code: asset.code,
      fallback: asset.fallback,
      label: asset.label,
      search: asset.searchText,
      src: asset.src,
      width: asset.width,
      height: asset.height,
      remoteOnly: asset.kind.startsWith("openmoji-"),
    };
  });
  updateDecorChoiceButtons();
}
// Возвращает результаты OpenMoji для поисковых пикеров; без запроса отдает пустой список.
function getOpenMojiSearchResults(searchQuery, limit = 60) {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  if (!normalizedSearchQuery || !openMojiCatalog.length) return [];
  return openMojiCatalog
    .filter((asset) => asset.searchText.toLowerCase().includes(normalizedSearchQuery))
    .slice(0, limit);
}
// Рисует глобальный поиск эмодзи для книги вместо стандартного жанрового drawer.
function renderBookEmojiSearchResults(searchQuery = "") {
  const emojiDrawer = getElementById("emojiDrawer"),
    matchingEmojis = getOpenMojiSearchResults(searchQuery, 80);
  emojiDrawer.innerHTML = matchingEmojis
    .map(
      (asset) =>
        `<button type="button" data-emoji="${escapeHtml(asset.fallback)}" data-emoji-code="${escapeHtml(asset.code)}" class="${asset.fallback === chosenEmoji ? "active" : ""}" aria-label="${escapeHtml(asset.label)}">
          <img data-openmoji-code="${escapeHtml(asset.code)}" alt="" />
        </button>`,
    )
    .join("");
  emojiDrawer.classList.toggle("open", Boolean(searchQuery.trim()));
  emojiDrawer
    .querySelectorAll("[data-openmoji-code]")
    .forEach((imageElement) => attachOpenMojiFallbackImage(imageElement, imageElement.dataset.openmojiCode));
  emojiDrawer.querySelectorAll("[data-emoji]").forEach(
    (emojiButton) =>
      (emojiButton.onclick = () => {
        chosenEmoji = emojiButton.dataset.emoji;
        chosenEmojiCode = emojiButton.dataset.emojiCode || getOpenMojiCodeForEmoji(chosenEmoji);
        getBookEmojiImage(chosenEmojiCode);
        renderBookEmojiSearchResults(getElementById("bookEmojiSearch").value);
        handleBookFormInput();
      }),
  );
}
// Рисует варианты вида за окном: стандартные без поиска и OpenMoji-результаты при поиске.
function renderWindowViewGrid(searchQuery = "") {
  const windowViewGrid = getElementById("windowViewGrid"),
    normalizedSearchQuery = searchQuery.trim().toLowerCase(),
    standardWindowViews = Object.values(windowViewAssets),
    matchingViews = normalizedSearchQuery
      ? [
          ...standardWindowViews.filter((asset) => asset.searchText.toLowerCase().includes(normalizedSearchQuery)),
          ...getOpenMojiSearchResults(normalizedSearchQuery, 60),
        ]
      : standardWindowViews;
  windowViewGrid.innerHTML = matchingViews
    .map((asset) => {
      const code = asset.code;
      windowViewAssets[code] = {
        ...windowViewAssets[code],
        code,
        label: asset.label,
        searchText: asset.searchText,
        src: asset.src || `${openMojiSvgBaseUrl}${code}.svg`,
      };
      return `<button type="button" data-window-view="${escapeHtml(code)}" data-search="${escapeHtml(asset.searchText)}" class="${state.room.windowView === code ? "active" : ""}">
        <img src="${escapeHtml(windowViewAssets[code].src)}" alt="" />${escapeHtml(asset.label)}
      </button>`;
    })
    .join("");
}
// Подсвечивает в панели кнопку того декора, который создается или редактируется.
function updateDecorChoiceButtons() {
  document
    .querySelectorAll("[data-decor]")
    .forEach((decorButton) =>
      decorButton.classList.toggle("active", decorButton.dataset.decor === selectedDecorKind),
    );
}
// Применяет цвет, размер и силу оттенка к выбранному декору в реальном времени.
function handleDecorFormInput() {
  if (editingDecorId && editingDecorDraft) {
    editingDecorDraft.color = getElementById("decorColor").value;
    editingDecorDraft.size = +getElementById("decorSize").value;
    editingDecorDraft.tint = +getElementById("decorTint").value;
    editingDecorDraft.offsetX = +getElementById("decorOffsetX").value;
    editingDecorDraft.offsetY = +getElementById("decorOffsetY").value;
    updateControlOutputs();
    renderScene();
    renderDecorPreview();
  } else {
    updateControlOutputs();
    renderDecorPreview();
  }
}

// Переключает левую панель редактора на указанный раздел.
function openEditorTab(name) {
  document
    .querySelectorAll(".tab,.control-panel")
    .forEach((tabOrPanel) => tabOrPanel.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${name}"]`).classList.add("active");
  document.querySelector(`[data-panel="${name}"]`).classList.add("active");
  if (name === "books") requestAnimationFrame(renderBookPreview);
  if (name === "bookList") renderBookCatalogs();
  if (name === "decor") requestAnimationFrame(renderDecorPreview);
}
// Формирует набор эмодзи для выбранного жанра и подключает обработчики выбора.
function renderEmojiDrawer() {
  const emojiDrawer = getElementById("emojiDrawer"),
    genreEmojis = emojis[chosenGenre] || [];
  if (!genreEmojis.length) {
    emojiDrawer.innerHTML = "";
    emojiDrawer.classList.remove("open");
    return;
  }
  emojiDrawer.innerHTML = genreEmojis
    .map(
      (emoji) => {
        const emojiCode = getOpenMojiCodeForEmoji(emoji);
        return `<button type="button" data-emoji="${escapeHtml(emoji)}" data-emoji-code="${escapeHtml(emojiCode)}" class="${emoji === chosenEmoji ? "active" : ""}" aria-label="Выбрать ${escapeHtml(emoji)}">
          <img data-openmoji-code="${escapeHtml(emojiCode)}" alt="" />
        </button>`;
      },
    )
    .join("");
  emojiDrawer.classList.add("open");
  emojiDrawer
    .querySelectorAll("[data-openmoji-code]")
    .forEach((imageElement) => attachOpenMojiFallbackImage(imageElement, imageElement.dataset.openmojiCode));
  emojiDrawer.querySelectorAll("[data-emoji]").forEach(
    (emojiButton) =>
      (emojiButton.onclick = () => {
        chosenEmoji = emojiButton.dataset.emoji;
        chosenEmojiCode = emojiButton.dataset.emojiCode || getOpenMojiCodeForEmoji(chosenEmoji);
        getBookEmojiImage(chosenEmojiCode);
        renderEmojiDrawer();
        handleBookFormInput();
      }),
  );
}

// --- Подключение элементов интерфейса к состоянию приложения ---
// Кнопки вкладок переключают видимый раздел левой панели.
document
  .querySelectorAll(".tab")
  .forEach(
    (tabButton) =>
      (tabButton.onclick = () => openEditorTab(tabButton.dataset.tab)),
  );
document
  .querySelectorAll("[data-stage-view]")
  .forEach(
    (stageViewButton) =>
      (stageViewButton.onclick = () => setStageView(stageViewButton.dataset.stageView)),
  );
// Выбор жанра обновляет доступный набор эмодзи для книги.
document.querySelectorAll(".genre-choice").forEach(
  (genreButton) =>
    (genreButton.onclick = () => {
      chosenGenre = genreButton.dataset.genre;
      chosenEmoji = emojis[chosenGenre]?.[0] || "";
      chosenEmojiCode = getOpenMojiCodeForEmoji(chosenEmoji);
      getBookEmojiImage(chosenEmojiCode);
      isBookEmojiSearchMode = false;
      getElementById("bookEmojiSearchField").hidden = true;
      getElementById("bookEmojiSearch").value = "";
      document
        .querySelectorAll(".genre-choice")
        .forEach((candidateButton) =>
          candidateButton.classList.toggle("active", candidateButton === genreButton),
        );
      renderEmojiDrawer();
      handleBookFormInput();
    }),
);
getElementById("bookEmojiSearchToggle").onclick = () => {
  isBookEmojiSearchMode = true;
  chosenGenre = "empty";
  document
    .querySelectorAll(".genre-choice")
    .forEach((candidateButton) =>
      candidateButton.classList.toggle("active", candidateButton.id === "bookEmojiSearchToggle"),
    );
  getElementById("bookEmojiSearchField").hidden = false;
  getElementById("bookEmojiSearch").focus();
  renderBookEmojiSearchResults(getElementById("bookEmojiSearch").value);
};
getElementById("bookEmojiSearch").oninput = (inputEvent) =>
  renderBookEmojiSearchResults(inputEvent.target.value);
// Выбор ориентации определяет, показывать книгу корешком или обложкой.
document.querySelectorAll("[data-facing]").forEach(
  (facingButton) =>
    (facingButton.onclick = () => {
      chosenFacing = facingButton.dataset.facing;
      document
        .querySelectorAll("[data-facing]")
        .forEach((candidateButton) =>
          candidateButton.classList.toggle("active", candidateButton === facingButton),
        );
      handleBookFormInput();
    }),
);
// Нажатие на карточку декора сразу создает соответствующий предмет на полке.
getElementById("decorGrid").onclick = (clickEvent) => {
  const decorButton = clickEvent.target.closest("[data-decor]");
  if (!decorButton) return;
  selectedDecorKind = decorButton.dataset.decor;
  const asset = decorAssets[selectedDecorKind] || decorAssets.plant;
  updateDecorChoiceButtons();
  const decorItem = {
    id: crypto.randomUUID(),
    type: "decor",
    kind: selectedDecorKind,
    code: asset.code,
    src: asset.src,
    color: getElementById("decorColor").value,
    width: asset.width,
    height: asset.height,
    size: +getElementById("decorSize").value,
    tint: +getElementById("decorTint").value,
    offsetX: +getElementById("decorOffsetX").value,
    offsetY: +getElementById("decorOffsetY").value,
  };
  Object.assign(decorItem, findAutomaticShelfPlacement(decorItem));
  state.items.push(decorItem);
  commitStateChange("Декор появился на полке ✦");
};
// Кнопки коврика меняют форму и узор, сохраняя остальные параметры.
document.querySelectorAll("[data-rug-shape]").forEach(
  (rugShapeButton) =>
    (rugShapeButton.onclick = () => {
      state.room.rugShape = rugShapeButton.dataset.rugShape;
      document
        .querySelectorAll("[data-rug-shape]")
        .forEach((candidateButton) =>
          candidateButton.classList.toggle("active", candidateButton === rugShapeButton),
        );
      commitStateChange();
    }),
);
document.querySelectorAll("[data-rug-pattern]").forEach(
  (rugPatternButton) =>
    (rugPatternButton.onclick = () => {
      state.room.rugPattern = rugPatternButton.dataset.rugPattern;
      document
        .querySelectorAll("[data-rug-pattern]")
        .forEach((candidateButton) =>
          candidateButton.classList.toggle("active", candidateButton === rugPatternButton),
        );
      commitStateChange();
    }),
);
// Выбор вида за окном меняет OpenMoji-иллюстрацию в комнате.
getElementById("windowViewGrid").onclick = (clickEvent) => {
  const windowViewButton = clickEvent.target.closest("[data-window-view]");
  if (!windowViewButton) return;
  state.room.windowView = windowViewButton.dataset.windowView;
  document
    .querySelectorAll("[data-window-view]")
    .forEach((candidateButton) =>
      candidateButton.classList.toggle("active", candidateButton === windowViewButton),
    );
  commitStateChange();
};
// Поиск вида за окном использует тот же глобальный каталог OpenMoji.
getElementById("windowViewSearch").oninput = (inputEvent) => {
  renderWindowViewGrid(inputEvent.target.value);
};
// Кнопки кресел выбирают один из доступных SVG-вариантов.
document.querySelectorAll("[data-chair-type]").forEach(
  (chairButton) =>
    (chairButton.onclick = () => {
      state.room.chairType = +chairButton.dataset.chairType;
      document
        .querySelectorAll("[data-chair-type]")
        .forEach((candidateButton) =>
          candidateButton.classList.toggle("active", candidateButton === chairButton),
        );
      commitStateChange();
    }),
);
// Поля стеллажа записывают значения непосредственно в настройки стеллажа.
[
  ["shelfColor", "color"],
  ["shelfWidth", "width"],
  ["shelfHeight", "height"],
  ["shelfRows", "rows"],
  ["shelfDepth", "depth"],
].forEach(
  ([controlId, settingName]) =>
    (getElementById(controlId).oninput = (inputEvent) => {
      state.shelf[settingName] =
        inputEvent.target.type === "color"
          ? inputEvent.target.value
          : +inputEvent.target.value;
      commitStateChange();
    }),
);
// Поля окружения изменяют цвет, размер и положение объектов комнаты.
[
  ["wallColor", "wall"],
  ["rugColor", "rugColor"],
  ["rugSize", "rugSize"],
  ["windowWidth", "windowWidth"],
  ["windowHeight", "windowHeight"],
  ["windowY", "windowY"],
  ["chairColor", "chairColor"],
  ["chairSize", "chairSize"],
  ["chairTint", "chairTint"],
  ["chairX", "chairX"],
].forEach(
  ([controlId, settingName]) =>
    (getElementById(controlId).oninput = (inputEvent) => {
      state.room[settingName] =
        inputEvent.target.type === "color"
          ? inputEvent.target.value
          : +inputEvent.target.value;
      commitStateChange();
    }),
);
// Переключатели включают и выключают отдельные объекты и эффекты комнаты.
[
  ["showWindow", "window"],
  ["showChair", "chair"],
  ["chairFlip", "chairFlip"],
  ["nightMode", "night"],
].forEach(
  ([controlId, settingName]) =>
    (getElementById(controlId).onchange = (changeEvent) => {
      state.room[settingName] = changeEvent.target.checked;
      commitStateChange();
    }),
);
[
  "bookTitle",
  "bookColor",
  "iconColor",
  "bookWidth",
  "bookHeight",
  "bookFontSize",
].forEach(
  (controlId) => (getElementById(controlId).oninput = handleBookFormInput),
);
getElementById("decorColor").oninput = handleDecorFormInput;
getElementById("decorSize").oninput = handleDecorFormInput;
getElementById("decorTint").oninput = handleDecorFormInput;
getElementById("decorOffsetX").oninput = handleDecorFormInput;
getElementById("decorOffsetY").oninput = handleDecorFormInput;
getElementById("resetDecorTintBtn").onclick = () => {
  getElementById("decorTint").value = 0;
  handleDecorFormInput();
};
getElementById("resetChairTintBtn").onclick = () => {
  state.room.chairTint = 0;
  getElementById("chairTint").value = 0;
  commitStateChange();
};
// Поиск по декору смотрит по всему загруженному каталогу OpenMoji, а без сети — по локальному набору.
getElementById("decorSearch").oninput = (inputEvent) => {
  renderDecorGrid(inputEvent.target.value);
};
getElementById("finishDecorEditBtn").onclick = finishDecorEditing;
getElementById("zoomOutBtn").onclick = () => {
  state.room.zoom = clampNumber((state.room.zoom || 100) - 10, 55, 180);
  updateCanvasZoom();
  updateControlOutputs();
  scheduleStateSave();
};
getElementById("zoomInBtn").onclick = () => {
  state.room.zoom = clampNumber((state.room.zoom || 100) + 10, 55, 180);
  updateCanvasZoom();
  updateControlOutputs();
  scheduleStateSave();
};
getElementById("addBookBtn").onclick = addBookOrFinishEditing;
getElementById("cancelEditBtn").onclick = stopBookEditing;
getElementById("editBookBtn").onclick = () => {
  const selectedBook = state.items.find((item) => item.id === selectedId);
  if (selectedBook) startBookEditing(selectedBook);
};
getElementById("deleteBookBtn").onclick = async () => {
  if (
    await showConfirmPopup({
      title: "Удалить книгу?",
      text: "Книга исчезнет со стеллажа.",
      okText: "Удалить",
    })
  )
    deleteLibraryItem(selectedId);
};
getElementById("deleteSelectedBtn").onclick = requestSelectedItemDeletion;
document.addEventListener("keydown", (keyboardEvent) => {
  const activeElement = document.activeElement,
    isTyping =
      activeElement &&
      ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
  if (keyboardEvent.key !== "Delete" || isTyping || drag || !selectedId) return;
  keyboardEvent.preventDefault();
  requestSelectedItemDeletion();
});
getElementById("deleteAllBtn").onclick = async () => {
  if (!state.items.length) return;
  if (
    await showConfirmPopup({
      title: "Удалить все?",
      text: "Все книги и предметы декора исчезнут. Это действие нельзя отменить.",
      okText: "Удалить все",
    })
  ) {
    state.items = [];
    selectedId = null;
    selectedSceneKind = null;
    editingId = null;
    cancelDecorEditing();
    hideItemSettingsButton();
    closeBookContextMenu();
    getElementById("deleteSelectedBtn").disabled = true;
    commitStateChange("Все предметы удалены");
  }
};
getElementById("resetBtn").onclick = async () => {
  if (
    await showConfirmPopup({
      title: "Сбросить комнату?",
      text: "Комната вернется к первоначальному виду, а текущие настройки будут заменены.",
      okText: "Сбросить",
    })
  ) {
    const user = state.user,
      name = state.name,
      nameIcon = state.nameIcon;
    state = structuredClone(defaults);
    state.user = user;
    state.name = name;
    state.nameIcon = nameIcon;
    selectedId = null;
    selectedSceneKind = null;
    stopBookEditing();
    cancelDecorEditing();
    synchronizeRoomControls();
    updateLibraryName();
    commitStateChange("Комната обновлена");
  }
};
getElementById("profileBtn").onclick = () => getElementById("authDialog").showModal();
getElementById("renameLibraryBtn").onclick = () => {
  getElementById("libraryEmoji").value = state.nameIcon || "📚";
  getElementById("libraryTitleInput").value = state.name || "моя полка";
  getElementById("libraryNameDialog").showModal();
};
// Быстрые варианты эмодзи в попапе названия.
document.querySelectorAll("[data-library-emoji]").forEach(
  (emojiButton) =>
    (emojiButton.onclick = () => {
      getElementById("libraryEmoji").value = emojiButton.dataset.libraryEmoji;
    }),
);
// Диалог названия сохраняет эмодзи, текст и сразу обновляет title страницы.
getElementById("libraryNameForm").onsubmit = (submitEvent) => {
  submitEvent.preventDefault();
  const name = getElementById("libraryTitleInput").value.trim(),
    icon = getElementById("libraryEmoji").value.trim();
  if (!name) return;
  state.name = name.slice(0, 36);
  state.nameIcon = (icon || "📚").slice(0, 2);
  updateLibraryName();
  getElementById("libraryNameDialog").close();
  commitStateChange("Название обновлено ✦");
};
// Небольшой отладочный API для консоли: помогает понять, какой объект видит hit-test под курсором.
window.debugLibrary = {
  state: () => state,
  boxes: () =>
    state.items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      kind: item.kind,
      box: item._box,
    })),
  hitTest: (clientX, clientY) => {
    const sceneLayout = calculateSceneLayout();
    refreshItemHitBoxes(sceneLayout);
    const canvasBounds = canvas.getBoundingClientRect(),
      canvasPoint = { x: clientX - canvasBounds.left, y: clientY - canvasBounds.top },
      item = findItemAtPoint(canvasPoint),
      sceneObject = !item && findSceneObjectAtPoint(canvasPoint);
    return {
      canvasPoint,
      item,
      sceneObject: sceneObject?.[0] || null,
      shelf: isPointInsideShelf(canvasPoint, sceneLayout),
    };
  },
};
// Получает SHA-256-хеш пароля для локального прототипа авторизации.
async function hashPassword(value) {
  const bytes = new TextEncoder().encode(`my-shelf:v1:${value}`),
    hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
// Форма входа создает локального пользователя либо проверяет сохраненный пароль.
getElementById("authForm").onsubmit = async (submitEvent) => {
  submitEvent.preventDefault();
  const userName = getElementById("username").value.trim().toLowerCase(),
    password = getElementById("password").value;
  if (!userName || password.length < 4) return;
  const passwordStorageKey = `virtual-library-auth:${userName}`,
    passwordHash = await hashPassword(password),
    savedPasswordHash = localStorage.getItem(passwordStorageKey);
  if (savedPasswordHash && savedPasswordHash !== passwordHash) {
    getElementById("password").setCustomValidity("Неверный пароль");
    getElementById("password").reportValidity();
    return;
  }
  getElementById("password").setCustomValidity("");
  localStorage.setItem(passwordStorageKey, passwordHash);
  localStorage.setItem("virtual-library:active-user", userName);
  loadLibraryState(userName);
  getElementById("authDialog").close();
  commitStateChange(`Добро пожаловать, ${userName}!`);
};
// При изменении размера окна все Canvas-превью пересчитывают физический размер.
window.addEventListener("resize", () => {
  resizeLibraryCanvas();
  renderBookPreview();
  renderDecorPreview();
});
// Первичная инициализация: наполняем интерфейс, загружаем пользователя и рисуем сцену.
renderEmojiDrawer();
renderDecorGrid();
renderWindowViewGrid();
loadLibraryState();
renderWindowViewGrid(getElementById("windowViewSearch").value);
renderBookCatalogs();
setStageView(stageView);
loadOpenMojiCatalog().then(() => {
  renderDecorGrid(getElementById("decorSearch").value);
  renderWindowViewGrid(getElementById("windowViewSearch").value);
  renderBookCatalogs();
  if (isBookEmojiSearchMode) renderBookEmojiSearchResults(getElementById("bookEmojiSearch").value);
});
requestAnimationFrame(() => {
  resizeLibraryCanvas();
  renderBookPreview();
  renderDecorPreview();
});






