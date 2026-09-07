(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const STORAGE_KEY = "flowcraft.documents.v1";
  const ACTIVE_KEY = "flowcraft.active.v1";
  const SNAP_SIZE = 16;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const svgEl = (tag, attributes = {}) => {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  };
  const uid = (prefix = "id") => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
  const debounce = (fn, delay = 250) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const SHAPES = [
    { group: "基础流程", type: "start", label: "开始 / 结束", width: 132, height: 54 },
    { group: "基础流程", type: "process", label: "流程", width: 144, height: 64 },
    { group: "基础流程", type: "decision", label: "判断", width: 132, height: 86 },
    { group: "基础流程", type: "subprocess", label: "子流程", width: 150, height: 66 },
    { group: "信息与说明", type: "data", label: "数据", width: 148, height: 66 },
    { group: "信息与说明", type: "document", label: "文档", width: 148, height: 72 },
    { group: "信息与说明", type: "text", label: "文本", width: 140, height: 44 },
    { group: "信息与说明", type: "note", label: "注释", width: 150, height: 82 },
    { group: "容器", type: "lane", label: "泳道", width: 520, height: 240 },
  ];

  const THEMES = {
    teal: { name: "专业青", fill: "#ecfdf5", stroke: "#0f766e", text: "#134e4a", edge: "#5b6b6a", accent: "#f97316" },
    blue: { name: "产品蓝", fill: "#eff6ff", stroke: "#2563eb", text: "#1e3a8a", edge: "#64748b", accent: "#f59e0b" },
    graphite: { name: "石墨灰", fill: "#f8fafc", stroke: "#475569", text: "#0f172a", edge: "#64748b", accent: "#d97706" },
    coral: { name: "珊瑚橙", fill: "#fff7ed", stroke: "#ea580c", text: "#7c2d12", edge: "#78716c", accent: "#0f766e" },
    violet: { name: "协作紫", fill: "#f5f3ff", stroke: "#7c3aed", text: "#4c1d95", edge: "#6b7280", accent: "#ea580c" },
    forest: { name: "森林绿", fill: "#f0fdf4", stroke: "#15803d", text: "#14532d", edge: "#64748b", accent: "#b45309" },
  };

  const node = (type, x, y, text, overrides = {}) => {
    const shape = SHAPES.find((item) => item.type === type) || SHAPES[1];
    return {
      id: uid("node"),
      type,
      x,
      y,
      w: shape.width,
      h: shape.height,
      text: text || shape.label,
      groupId: null,
      style: {
        fill: type === "note" ? "#fff7d6" : "#ecfdf5",
        stroke: type === "text" ? "transparent" : "#0f766e",
        strokeWidth: type === "text" ? 0 : 2,
        textColor: "#134e4a",
        fontSize: 14,
        textAlign: "center",
      },
      ...overrides,
      style: {
        fill: type === "note" ? "#fff7d6" : "#ecfdf5",
        stroke: type === "text" ? "transparent" : "#0f766e",
        strokeWidth: type === "text" ? 0 : 2,
        textColor: "#134e4a",
        fontSize: 14,
        textAlign: "center",
        ...(overrides.style || {}),
      },
    };
  };

  const edge = (from, to, overrides = {}) => ({
    id: uid("edge"),
    from,
    to,
    type: "orthogonal",
    color: "#5b6b6a",
    width: 2,
    arrow: "end",
    label: "",
    ...overrides,
  });

  function productLoginTemplate() {
    const nodes = [
      node("start", 100, 180, "开始登录"),
      node("process", 300, 175, "输入账号与密码"),
      node("decision", 520, 164, "校验是否通过？"),
      node("process", 740, 95, "进入产品首页", { style: { fill: "#ecfdf5", stroke: "#0f766e", textColor: "#134e4a" } }),
      node("note", 735, 270, "提示错误并保留账号", { style: { fill: "#fff7ed", stroke: "#ea580c", textColor: "#7c2d12" } }),
      node("process", 515, 330, "重新输入密码"),
    ];
    const edges = [
      edge(nodes[0].id, nodes[1].id),
      edge(nodes[1].id, nodes[2].id),
      edge(nodes[2].id, nodes[3].id, { label: "是" }),
      edge(nodes[2].id, nodes[4].id, { label: "否", color: "#c2410c" }),
      edge(nodes[4].id, nodes[5].id, { color: "#c2410c" }),
      edge(nodes[5].id, nodes[1].id),
    ];
    return { nodes, edges };
  }

  function approvalTemplate() {
    const nodes = [
      node("start", 110, 190, "提交申请"),
      node("process", 300, 185, "直属主管审批"),
      node("decision", 520, 174, "是否通过？"),
      node("process", 735, 105, "财务复核"),
      node("start", 950, 110, "流程完成", { style: { fill: "#ecfdf5", stroke: "#15803d", textColor: "#14532d" } }),
      node("document", 735, 285, "退回并说明原因", { style: { fill: "#fff7ed", stroke: "#ea580c", textColor: "#7c2d12" } }),
    ];
    return { nodes, edges: [edge(nodes[0].id, nodes[1].id), edge(nodes[1].id, nodes[2].id), edge(nodes[2].id, nodes[3].id, { label: "通过" }), edge(nodes[3].id, nodes[4].id), edge(nodes[2].id, nodes[5].id, { label: "驳回", color: "#c2410c" })] };
  }

  function refundTemplate() {
    const nodes = [
      node("start", 90, 175, "用户申请退款"),
      node("process", 285, 170, "系统读取订单"),
      node("decision", 500, 159, "满足退款规则？"),
      node("subprocess", 720, 90, "原路退款"),
      node("start", 930, 96, "退款成功", { style: { fill: "#ecfdf5", stroke: "#15803d", textColor: "#14532d" } }),
      node("note", 720, 275, "告知不可退款原因", { style: { fill: "#fff7ed", stroke: "#ea580c", textColor: "#7c2d12" } }),
    ];
    return { nodes, edges: [edge(nodes[0].id, nodes[1].id), edge(nodes[1].id, nodes[2].id), edge(nodes[2].id, nodes[3].id, { label: "是" }), edge(nodes[3].id, nodes[4].id), edge(nodes[2].id, nodes[5].id, { label: "否", color: "#c2410c" })] };
  }

  function swimlaneTemplate() {
    const laneA = node("lane", 60, 70, "用户", { w: 880, h: 150, style: { fill: "#f8fafc", stroke: "#94a3b8", textColor: "#334155", strokeWidth: 1 } });
    const laneB = node("lane", 60, 220, "产品系统", { w: 880, h: 170, style: { fill: "#f0fdfa", stroke: "#94a3b8", textColor: "#334155", strokeWidth: 1 } });
    const nodes = [
      laneA,
      laneB,
      node("start", 150, 116, "发起操作"),
      node("process", 390, 112, "确认提交"),
      node("process", 390, 270, "记录请求"),
      node("decision", 625, 258, "处理成功？"),
      node("document", 805, 270, "返回处理结果"),
    ];
    return { nodes, edges: [edge(nodes[2].id, nodes[3].id), edge(nodes[3].id, nodes[4].id), edge(nodes[4].id, nodes[5].id), edge(nodes[5].id, nodes[6].id, { label: "完成" })] };
  }

  const TEMPLATES = [
    { id: "product-login", name: "登录与异常流程", category: "product", categoryName: "产品流程", uses: "2.4k 次使用", build: productLoginTemplate },
    { id: "approval", name: "通用审批流程", category: "approval", categoryName: "审批流程", uses: "1.8k 次使用", build: approvalTemplate },
    { id: "refund", name: "售后退款流程", category: "product", categoryName: "产品流程", uses: "1.2k 次使用", build: refundTemplate },
    { id: "swimlane", name: "跨角色泳道图", category: "lane", categoryName: "泳道图", uses: "986 次使用", build: swimlaneTemplate },
  ];

  const state = {
    documents: [],
    active: null,
    readonly: false,
    mode: "select",
    selectedIds: new Set(),
    selectedEdgeId: null,
    connectSource: null,
    clipboard: null,
    history: [],
    historyIndex: -1,
    dragging: null,
    resizing: null,
    panning: null,
    marquee: null,
    spacePressed: false,
    propertyTab: "style",
    templateFilter: "all",
  };

  const elements = {
    home: $("#home-view"),
    editor: $("#editor-view"),
    fileList: $("#file-list"),
    templateGrid: $("#template-grid"),
    fileSearch: $("#file-search"),
    shapeLibrary: $("#shape-library"),
    shapeSearch: $("#shape-search"),
    canvasWrap: $("#canvas-wrap"),
    svg: $("#diagram-canvas"),
    viewport: $("#viewport-group"),
    lanes: $("#lane-layer"),
    edges: $("#edge-layer"),
    nodes: $("#node-layer"),
    selections: $("#selection-layer"),
    empty: $("#canvas-empty"),
    properties: $("#property-content"),
    docName: $("#document-name"),
    saveStatus: $("#save-status"),
    zoomLabel: $("#zoom-label"),
    readonlyBanner: $("#readonly-banner"),
    toastRegion: $("#toast-region"),
    modalBackdrop: $("#modal-backdrop"),
  };

  function readDocuments() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      state.documents = Array.isArray(parsed) ? parsed : [];
    } catch {
      state.documents = [];
    }
    if (!state.documents.length) {
      const content = productLoginTemplate();
      state.documents.push(makeDocument("登录与异常流程", content));
      writeDocuments();
    }
  }

  function writeDocuments() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.documents));
  }

  function makeDocument(name = "未命名流程图", content = { nodes: [], edges: [] }) {
    const now = new Date().toISOString();
    return {
      id: uid("doc"),
      name,
      createdAt: now,
      updatedAt: now,
      theme: "teal",
      grid: true,
      snap: true,
      pageColor: "#f2f4f6",
      viewport: { x: 120, y: 90, scale: 1 },
      nodes: clone(content.nodes || []),
      edges: clone(content.edges || []),
    };
  }

  function documentSnapshot() {
    if (!state.active) return "";
    return JSON.stringify({
      nodes: state.active.nodes,
      edges: state.active.edges,
      theme: state.active.theme,
      grid: state.active.grid,
      snap: state.active.snap,
      pageColor: state.active.pageColor,
    });
  }

  function resetHistory() {
    state.history = [documentSnapshot()];
    state.historyIndex = 0;
    updateHistoryButtons();
  }

  function commitHistory() {
    if (!state.active || state.readonly) return;
    const snapshot = documentSnapshot();
    if (state.history[state.historyIndex] === snapshot) return;
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    if (state.history.length > 80) state.history.shift();
    state.historyIndex = state.history.length - 1;
    updateHistoryButtons();
    saveActive();
  }

  function applyHistory(index) {
    if (!state.active || index < 0 || index >= state.history.length) return;
    const snapshot = JSON.parse(state.history[index]);
    Object.assign(state.active, snapshot);
    state.historyIndex = index;
    clearSelection();
    renderEditor();
    saveActive();
  }

  function undo() { applyHistory(state.historyIndex - 1); }
  function redo() { applyHistory(state.historyIndex + 1); }
  function updateHistoryButtons() {
    $("#undo-button").disabled = state.readonly || state.historyIndex <= 0;
    $("#redo-button").disabled = state.readonly || state.historyIndex >= state.history.length - 1;
  }

  const saveActiveDebounced = debounce(() => {
    writeDocuments();
    elements.saveStatus.textContent = "已保存";
  }, 300);

  function saveActive() {
    if (!state.active || state.readonly) return;
    state.active.updatedAt = new Date().toISOString();
    const index = state.documents.findIndex((item) => item.id === state.active.id);
    if (index >= 0) state.documents[index] = state.active;
    else state.documents.unshift(state.active);
    elements.saveStatus.textContent = "保存中...";
    saveActiveDebounced();
  }

  function formatDate(iso) {
    const date = new Date(iso);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  }

  function templatePreview(template) {
    const content = template.build();
    const visible = content.nodes.filter((item) => item.type !== "lane").slice(0, 6);
    const minX = Math.min(...visible.map((item) => item.x));
    const minY = Math.min(...visible.map((item) => item.y));
    const maxX = Math.max(...visible.map((item) => item.x + item.w));
    const maxY = Math.max(...visible.map((item) => item.y + item.h));
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const nodeMap = new Map(content.nodes.map((item) => [item.id, item]));
    const lines = content.edges.slice(0, 6).map((item) => {
      const a = nodeMap.get(item.from);
      const b = nodeMap.get(item.to);
      if (!a || !b) return "";
      return `<path d="M ${a.x + a.w / 2} ${a.y + a.h / 2} L ${b.x + b.w / 2} ${b.y + b.h / 2}" fill="none" stroke="#94a3b8" stroke-width="5"/>`;
    }).join("");
    const blocks = visible.map((item) => {
      if (item.type === "decision") {
        return `<polygon points="${item.x + item.w / 2},${item.y} ${item.x + item.w},${item.y + item.h / 2} ${item.x + item.w / 2},${item.y + item.h} ${item.x},${item.y + item.h / 2}" fill="${item.style.fill}" stroke="${item.style.stroke}" stroke-width="5"/>`;
      }
      return `<rect x="${item.x}" y="${item.y}" width="${item.w}" height="${item.h}" rx="${item.type === "start" ? item.h / 2 : 8}" fill="${item.style.fill}" stroke="${item.style.stroke}" stroke-width="5"/>`;
    }).join("");
    return `<svg viewBox="${minX - 40} ${minY - 40} ${width + 80} ${height + 80}" aria-hidden="true">${lines}${blocks}</svg>`;
  }

  function renderTemplates() {
    const filtered = TEMPLATES.filter((item) => state.templateFilter === "all" || item.category === state.templateFilter);
    elements.templateGrid.innerHTML = filtered.map((item) => `
      <button class="template-card" type="button" data-template-id="${item.id}">
        <span class="template-preview">${templatePreview(item)}</span>
        <span class="template-meta">
          <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.uses)}</small></span>
          <span class="template-category">${escapeHtml(item.categoryName)}</span>
        </span>
      </button>
    `).join("");
  }

  function renderFiles() {
    const query = elements.fileSearch.value.trim().toLowerCase();
    const files = [...state.documents]
      .filter((item) => item.name.toLowerCase().includes(query))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (!files.length) {
      elements.fileList.innerHTML = `<div class="empty-files"><i data-lucide="folder-search"></i><h3>没有找到文件</h3><p>换一个关键词，或新建空白流程图。</p><button class="button primary" type="button" data-empty-new><i data-lucide="plus"></i><span>新建流程图</span></button></div>`;
      refreshIcons();
      return;
    }
    elements.fileList.innerHTML = files.map((item) => `
      <article class="file-row" data-file-id="${item.id}">
        <span class="file-icon" aria-hidden="true"><i data-lucide="workflow"></i></span>
        <div class="file-main">
          <button type="button" data-file-open title="打开 ${escapeHtml(item.name)}">${escapeHtml(item.name)}</button>
          <small>${item.nodes.length} 个节点 · ${item.edges.length} 条连线</small>
        </div>
        <span class="file-detail">${escapeHtml(THEMES[item.theme]?.name || "自定义主题")}</span>
        <span class="file-detail">${formatDate(item.updatedAt)}</span>
        <div class="file-actions">
          <button class="icon-button" type="button" data-file-rename aria-label="重命名 ${escapeHtml(item.name)}" title="重命名"><i data-lucide="pencil"></i></button>
          <button class="icon-button" type="button" data-file-duplicate aria-label="复制 ${escapeHtml(item.name)}" title="复制"><i data-lucide="copy"></i></button>
          <button class="icon-button" type="button" data-file-delete aria-label="删除 ${escapeHtml(item.name)}" title="删除"><i data-lucide="trash-2"></i></button>
        </div>
      </article>
    `).join("");
    refreshIcons();
  }

  function renderShapeLibrary(query = "") {
    const normalized = query.trim().toLowerCase();
    const groups = [...new Set(SHAPES.map((item) => item.group))];
    elements.shapeLibrary.innerHTML = groups.map((group) => {
      const items = SHAPES.filter((item) => item.group === group && item.label.toLowerCase().includes(normalized));
      if (!items.length) return "";
      return `<section class="shape-section"><h3>${group}</h3><div class="shape-grid">${items.map((item) => `
        <button class="shape-item" type="button" draggable="true" data-shape-type="${item.type}" title="点击添加，或拖入画布">
          ${miniShape(item.type)}<span>${item.label}</span>
        </button>`).join("")}</div></section>`;
    }).join("");
  }

  function miniShape(type) {
    const shapes = {
      start: '<svg viewBox="0 0 48 32" aria-hidden="true"><rect class="shape-mini" x="2" y="5" width="44" height="22" rx="11"/></svg>',
      process: '<svg viewBox="0 0 48 32" aria-hidden="true"><rect class="shape-mini" x="2" y="4" width="44" height="24" rx="3"/></svg>',
      decision: '<svg viewBox="0 0 48 32" aria-hidden="true"><polygon class="shape-mini" points="24,2 46,16 24,30 2,16"/></svg>',
      subprocess: '<svg viewBox="0 0 48 32" aria-hidden="true"><rect class="shape-mini" x="2" y="4" width="44" height="24" rx="2"/><path d="M8 4v24M40 4v24" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
      data: '<svg viewBox="0 0 48 32" aria-hidden="true"><polygon class="shape-mini" points="9,4 46,4 39,28 2,28"/></svg>',
      document: '<svg viewBox="0 0 48 32" aria-hidden="true"><path class="shape-mini" d="M2 3h44v22c-8 8-14-5-22 2S10 22 2 28z"/></svg>',
      text: '<svg viewBox="0 0 48 32" aria-hidden="true"><path d="M12 7h24M24 7v20M18 27h12" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
      note: '<svg viewBox="0 0 48 32" aria-hidden="true"><path class="shape-mini" d="M5 2h29l9 9v19H5z"/><path d="M34 2v9h9" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
      lane: '<svg viewBox="0 0 48 32" aria-hidden="true"><rect class="shape-mini" x="2" y="3" width="44" height="26" rx="2"/><path d="M13 3v26M13 16h33" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    };
    return shapes[type] || shapes.process;
  }

  function showHome() {
    closeAllDialogs();
    elements.editor.hidden = true;
    elements.home.hidden = false;
    state.active = null;
    state.readonly = false;
    clearSelection();
    renderFiles();
    document.title = "FlowCraft - 产品流程图工具";
    history.replaceState(null, "", location.pathname + location.search);
  }

  function openDocument(documentId, options = {}) {
    const source = options.document || state.documents.find((item) => item.id === documentId);
    if (!source) return;
    state.active = options.readonly ? clone(source) : source;
    state.readonly = Boolean(options.readonly);
    state.mode = "select";
    clearSelection();
    state.connectSource = null;
    elements.home.hidden = true;
    elements.editor.hidden = false;
    elements.readonlyBanner.hidden = !state.readonly;
    elements.docName.value = state.active.name;
    elements.docName.readOnly = state.readonly;
    $("#share-button").hidden = state.readonly;
    $("#open-export").hidden = false;
    $$("[data-mode]").forEach((button) => { button.disabled = state.readonly && button.dataset.mode !== "pan"; });
    resetHistory();
    setMode(state.readonly ? "pan" : "select");
    renderEditor();
    document.title = `${state.active.name} - FlowCraft`;
    if (!state.readonly) localStorage.setItem(ACTIVE_KEY, state.active.id);
    requestAnimationFrame(() => {
      if (options.fit !== false && state.active.nodes.length) fitToContent();
      elements.canvasWrap.focus({ preventScroll: true });
    });
  }

  function createBlank() {
    const doc = makeDocument();
    state.documents.unshift(doc);
    writeDocuments();
    openDocument(doc.id, { fit: false });
  }

  function createFromTemplate(templateId) {
    const template = TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    const doc = makeDocument(template.name, template.build());
    state.documents.unshift(doc);
    writeDocuments();
    openDocument(doc.id);
    toast(`已从“${template.name}”创建流程图`);
  }

  function renderEditor() {
    if (!state.active) return;
    elements.viewport.setAttribute("transform", `translate(${state.active.viewport.x} ${state.active.viewport.y}) scale(${state.active.viewport.scale})`);
    elements.svg.style.backgroundColor = state.active.pageColor || "#f2f4f6";
    $("#canvas-grid").style.display = state.active.grid ? "block" : "none";
    $("#toggle-grid").classList.toggle("is-active", state.active.grid);
    $("#toggle-grid").setAttribute("aria-pressed", String(state.active.grid));
    $("#toggle-snap").classList.toggle("is-active", state.active.snap);
    $("#toggle-snap").setAttribute("aria-pressed", String(state.active.snap));
    elements.zoomLabel.textContent = `${Math.round(state.active.viewport.scale * 100)}%`;
    elements.empty.hidden = state.active.nodes.length > 0;
    renderDiagram();
    renderProperties();
    updateArrangeButtons();
    updateHistoryButtons();
    refreshIcons();
  }

  function renderDiagram() {
    elements.lanes.replaceChildren();
    elements.edges.replaceChildren();
    elements.nodes.replaceChildren();
    elements.selections.replaceChildren();
    if (!state.active) return;
    const nodesById = new Map(state.active.nodes.map((item) => [item.id, item]));
    state.active.nodes.filter((item) => item.type === "lane").forEach((item) => elements.lanes.append(renderNode(item)));
    state.active.edges.forEach((item) => {
      const from = nodesById.get(item.from);
      const to = nodesById.get(item.to);
      if (from && to) elements.edges.append(renderEdge(item, from, to));
    });
    state.active.nodes.filter((item) => item.type !== "lane").forEach((item) => elements.nodes.append(renderNode(item)));
    renderSelection();
  }

  function renderNode(item) {
    const group = svgEl("g", { class: `node${state.readonly ? " readonly" : ""}`, "data-node-id": item.id, transform: `translate(${item.x} ${item.y})` });
    const common = { class: "node-shape", fill: item.style.fill, stroke: item.style.stroke, "stroke-width": item.style.strokeWidth, "vector-effect": "non-scaling-stroke" };
    let shape;
    switch (item.type) {
      case "start":
        shape = svgEl("rect", { ...common, width: item.w, height: item.h, rx: item.h / 2 });
        break;
      case "decision":
        shape = svgEl("polygon", { ...common, points: `${item.w / 2},0 ${item.w},${item.h / 2} ${item.w / 2},${item.h} 0,${item.h / 2}` });
        break;
      case "data":
        shape = svgEl("polygon", { ...common, points: `${item.w * .14},0 ${item.w},0 ${item.w * .86},${item.h} 0,${item.h}` });
        break;
      case "document":
        shape = svgEl("path", { ...common, d: `M0 0H${item.w}V${item.h * .78} C${item.w * .78} ${item.h * 1.06}, ${item.w * .58} ${item.h * .62}, ${item.w * .36} ${item.h * .87} C${item.w * .2} ${item.h * 1.05}, ${item.w * .09} ${item.h * .77}, 0 ${item.h * .9}Z` });
        break;
      case "note":
        shape = svgEl("path", { ...common, d: `M0 0H${item.w - 18}L${item.w} 18V${item.h}H0Z` });
        group.append(shape);
        group.append(svgEl("path", { d: `M${item.w - 18} 0V18H${item.w}`, fill: "none", stroke: item.style.stroke, "stroke-width": item.style.strokeWidth, "vector-effect": "non-scaling-stroke" }));
        shape = null;
        break;
      case "subprocess":
        shape = svgEl("rect", { ...common, width: item.w, height: item.h, rx: 4 });
        group.append(shape);
        group.append(svgEl("line", { x1: 12, y1: 0, x2: 12, y2: item.h, stroke: item.style.stroke, "stroke-width": item.style.strokeWidth, "vector-effect": "non-scaling-stroke" }));
        group.append(svgEl("line", { x1: item.w - 12, y1: 0, x2: item.w - 12, y2: item.h, stroke: item.style.stroke, "stroke-width": item.style.strokeWidth, "vector-effect": "non-scaling-stroke" }));
        shape = null;
        break;
      case "text":
        shape = svgEl("rect", { width: item.w, height: item.h, fill: "transparent", stroke: "transparent" });
        break;
      case "lane":
        shape = svgEl("rect", { ...common, width: item.w, height: item.h, rx: 4 });
        group.append(shape);
        group.append(svgEl("rect", { x: 0, y: 0, width: item.w, height: 34, fill: "rgba(148,163,184,.13)", stroke: "none" }));
        group.append(svgEl("line", { x1: 0, y1: 34, x2: item.w, y2: 34, stroke: item.style.stroke, "stroke-width": 1, "vector-effect": "non-scaling-stroke" }));
        shape = null;
        break;
      default:
        shape = svgEl("rect", { ...common, width: item.w, height: item.h, rx: 6 });
    }
    if (shape) group.append(shape);
    addNodeText(group, item);
    return group;
  }

  function addNodeText(group, item) {
    const text = svgEl("text", {
      x: item.w / 2,
      y: item.type === "lane" ? 22 : item.h / 2,
      fill: item.style.textColor,
      "font-size": item.style.fontSize,
      "font-weight": item.type === "lane" ? 700 : 600,
      "text-anchor": item.style.textAlign === "left" ? "start" : item.style.textAlign === "right" ? "end" : "middle",
      "dominant-baseline": "middle",
    });
    const maxChars = Math.max(5, Math.floor((item.w - 22) / (item.style.fontSize * .95)));
    const lines = wrapText(item.text, maxChars, item.type === "lane" ? 1 : 3);
    const lineHeight = item.style.fontSize * 1.35;
    const x = item.style.textAlign === "left" ? 12 : item.style.textAlign === "right" ? item.w - 12 : item.w / 2;
    const startY = (item.type === "lane" ? 22 : item.h / 2) - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      const tspan = svgEl("tspan", { x, y: startY + index * lineHeight });
      tspan.textContent = line;
      text.append(tspan);
    });
    group.append(text);
  }

  function wrapText(value, maxChars, maxLines) {
    const normalized = String(value || "").trim() || " ";
    const explicit = normalized.split(/\n/);
    const lines = [];
    explicit.forEach((part) => {
      if (/\s/.test(part)) {
        let current = "";
        part.split(/\s+/).forEach((word) => {
          const candidate = current ? `${current} ${word}` : word;
          if (candidate.length > maxChars && current) { lines.push(current); current = word; }
          else current = candidate;
        });
        if (current) lines.push(current);
      } else {
        for (let i = 0; i < part.length; i += maxChars) lines.push(part.slice(i, i + maxChars));
      }
    });
    if (lines.length > maxLines) {
      const clipped = lines.slice(0, maxLines);
      clipped[maxLines - 1] = clipped[maxLines - 1].slice(0, Math.max(1, maxChars - 1)) + "…";
      return clipped;
    }
    return lines;
  }

  function renderEdge(item, from, to) {
    const group = svgEl("g", { class: `edge${state.selectedEdgeId === item.id ? " is-selected" : ""}`, "data-edge-id": item.id });
    const anchors = getEdgeAnchors(from, to);
    const pathData = item.type === "straight"
      ? `M ${anchors.x1} ${anchors.y1} L ${anchors.x2} ${anchors.y2}`
      : orthogonalPath(anchors);
    const markerStart = item.arrow === "both" || item.arrow === "start" ? "url(#arrow-start)" : "";
    const markerEnd = item.arrow === "both" || item.arrow === "end" ? "url(#arrow-end)" : "";
    group.append(svgEl("path", { class: "edge-hit", d: pathData }));
    group.append(svgEl("path", { class: "edge-line", d: pathData, stroke: item.color, "stroke-width": item.width, "marker-start": markerStart, "marker-end": markerEnd, "vector-effect": "non-scaling-stroke" }));
    if (item.label) {
      const labelX = (anchors.x1 + anchors.x2) / 2;
      const labelY = (anchors.y1 + anchors.y2) / 2 - 8;
      const background = svgEl("rect", { x: labelX - item.label.length * 6 - 5, y: labelY - 10, width: item.label.length * 12 + 10, height: 20, rx: 3, fill: "white", stroke: "#dce1e7", "stroke-width": 1 });
      const label = svgEl("text", { x: labelX, y: labelY + 1, fill: item.color, "font-size": 12, "font-weight": 650, "text-anchor": "middle", "dominant-baseline": "middle" });
      label.textContent = item.label;
      group.append(background, label);
    }
    return group;
  }

  function getEdgeAnchors(from, to) {
    const fromCenter = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
    const toCenter = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return {
        x1: dx >= 0 ? from.x + from.w : from.x,
        y1: fromCenter.y,
        x2: dx >= 0 ? to.x : to.x + to.w,
        y2: toCenter.y,
      };
    }
    return {
      x1: fromCenter.x,
      y1: dy >= 0 ? from.y + from.h : from.y,
      x2: toCenter.x,
      y2: dy >= 0 ? to.y : to.y + to.h,
    };
  }

  function orthogonalPath({ x1, y1, x2, y2 }) {
    if (Math.abs(x2 - x1) >= Math.abs(y2 - y1)) {
      const middle = (x1 + x2) / 2;
      return `M ${x1} ${y1} H ${middle} V ${y2} H ${x2}`;
    }
    const middle = (y1 + y2) / 2;
    return `M ${x1} ${y1} V ${middle} H ${x2} V ${y2}`;
  }

  function renderSelection() {
    if (!state.active) return;
    const selected = state.active.nodes.filter((item) => state.selectedIds.has(item.id));
    selected.forEach((item) => {
      elements.selections.append(svgEl("rect", { class: "selection-box", x: item.x - 4, y: item.y - 4, width: item.w + 8, height: item.h + 8, rx: 5 }));
    });
    if (selected.length === 1 && !state.readonly) {
      const item = selected[0];
      elements.selections.append(svgEl("rect", { class: "resize-handle", "data-resize-node": item.id, x: item.x + item.w - 5, y: item.y + item.h - 5, width: 10, height: 10, rx: 1 }));
      [
        { dir: "top", x: item.x + item.w / 2, y: item.y - 20 },
        { dir: "right", x: item.x + item.w + 20, y: item.y + item.h / 2 },
        { dir: "bottom", x: item.x + item.w / 2, y: item.y + item.h + 20 },
        { dir: "left", x: item.x - 20, y: item.y + item.h / 2 },
      ].forEach((point) => {
        const quick = svgEl("g", { class: "quick-connect", "data-quick-connect": item.id, "data-direction": point.dir, transform: `translate(${point.x} ${point.y})` });
        quick.append(svgEl("circle", { r: 10 }), svgEl("line", { x1: -4, y1: 0, x2: 4, y2: 0 }), svgEl("line", { x1: 0, y1: -4, x2: 0, y2: 4 }));
        elements.selections.append(quick);
      });
    }
  }

  function clearSelection() {
    state.selectedIds.clear();
    state.selectedEdgeId = null;
    state.connectSource = null;
  }

  function setMode(mode) {
    if (state.readonly && mode !== "pan") mode = "pan";
    state.mode = mode;
    state.connectSource = null;
    elements.canvasWrap.classList.toggle("mode-pan", mode === "pan");
    elements.canvasWrap.classList.toggle("mode-connect", mode === "connect");
    $$("[data-mode]").forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $$("[data-mobile-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.mobileMode === mode));
    if (mode === "connect") toast("依次点击两个节点创建连线");
    renderDiagram();
  }

  function screenToWorld(clientX, clientY) {
    const rect = elements.svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - state.active.viewport.x) / state.active.viewport.scale,
      y: (clientY - rect.top - state.active.viewport.y) / state.active.viewport.scale,
    };
  }

  function snap(value) {
    return state.active.snap ? Math.round(value / SNAP_SIZE) * SNAP_SIZE : value;
  }

  function addShape(type, position) {
    if (state.readonly) return;
    const shape = SHAPES.find((item) => item.type === type) || SHAPES[1];
    const center = position || screenToWorld(elements.canvasWrap.getBoundingClientRect().left + elements.canvasWrap.clientWidth / 2, elements.canvasWrap.getBoundingClientRect().top + elements.canvasWrap.clientHeight / 2);
    const item = node(type, snap(center.x - shape.width / 2), snap(center.y - shape.height / 2), shape.label);
    if (type === "lane") {
      item.style = { fill: "#f8fafc", stroke: "#94a3b8", textColor: "#334155", strokeWidth: 1, fontSize: 14, textAlign: "center" };
      state.active.nodes.unshift(item);
    } else {
      const theme = THEMES[state.active.theme] || THEMES.teal;
      item.style.fill = type === "note" ? "#fff7d6" : type === "text" ? "transparent" : theme.fill;
      item.style.stroke = type === "text" ? "transparent" : theme.stroke;
      item.style.textColor = theme.text;
      state.active.nodes.push(item);
    }
    state.selectedIds = new Set([item.id]);
    state.selectedEdgeId = null;
    renderEditor();
    commitHistory();
  }

  function quickConnect(nodeId, direction) {
    if (state.readonly) return;
    const source = state.active.nodes.find((item) => item.id === nodeId);
    if (!source) return;
    const gap = 90;
    const newItem = node("process", source.x, source.y, "下一步");
    if (direction === "right") { newItem.x = source.x + source.w + gap; newItem.y = source.y + source.h / 2 - newItem.h / 2; }
    if (direction === "left") { newItem.x = source.x - newItem.w - gap; newItem.y = source.y + source.h / 2 - newItem.h / 2; }
    if (direction === "bottom") { newItem.x = source.x + source.w / 2 - newItem.w / 2; newItem.y = source.y + source.h + gap; }
    if (direction === "top") { newItem.x = source.x + source.w / 2 - newItem.w / 2; newItem.y = source.y - newItem.h - gap; }
    const theme = THEMES[state.active.theme] || THEMES.teal;
    newItem.style.fill = theme.fill;
    newItem.style.stroke = theme.stroke;
    newItem.style.textColor = theme.text;
    newItem.x = snap(newItem.x);
    newItem.y = snap(newItem.y);
    state.active.nodes.push(newItem);
    state.active.edges.push(edge(source.id, newItem.id, { color: theme.edge }));
    state.selectedIds = new Set([newItem.id]);
    renderEditor();
    commitHistory();
    openTextEditor(newItem.id, true);
  }

  function connectNodes(targetId) {
    if (!state.connectSource) {
      state.connectSource = targetId;
      state.selectedIds = new Set([targetId]);
      state.selectedEdgeId = null;
      renderEditor();
      return;
    }
    if (state.connectSource === targetId) return;
    const exists = state.active.edges.some((item) => item.from === state.connectSource && item.to === targetId);
    if (!exists) {
      const theme = THEMES[state.active.theme] || THEMES.teal;
      state.active.edges.push(edge(state.connectSource, targetId, { color: theme.edge }));
      commitHistory();
    }
    state.connectSource = targetId;
    state.selectedIds = new Set([targetId]);
    renderEditor();
  }

  function openTextEditor(nodeId, selectAll = false) {
    if (state.readonly) return;
    const item = state.active.nodes.find((entry) => entry.id === nodeId);
    if (!item) return;
    const dialog = $("#text-dialog");
    dialog.dataset.nodeId = nodeId;
    $("#node-text").value = item.text;
    openDialog(dialog);
    requestAnimationFrame(() => {
      $("#node-text").focus();
      if (selectAll) $("#node-text").select();
    });
  }

  function deleteSelection() {
    if (state.readonly || (!state.selectedIds.size && !state.selectedEdgeId)) return;
    if (state.selectedEdgeId) {
      state.active.edges = state.active.edges.filter((item) => item.id !== state.selectedEdgeId);
    }
    if (state.selectedIds.size) {
      const removed = new Set(state.selectedIds);
      state.active.nodes = state.active.nodes.filter((item) => !removed.has(item.id));
      state.active.edges = state.active.edges.filter((item) => !removed.has(item.from) && !removed.has(item.to));
    }
    clearSelection();
    renderEditor();
    commitHistory();
  }

  function selectedNodes() {
    return state.active ? state.active.nodes.filter((item) => state.selectedIds.has(item.id)) : [];
  }

  function copySelection() {
    const selected = selectedNodes();
    if (!selected.length) return;
    const ids = new Set(selected.map((item) => item.id));
    state.clipboard = {
      nodes: clone(selected),
      edges: clone(state.active.edges.filter((item) => ids.has(item.from) && ids.has(item.to))),
    };
    toast(`已复制 ${selected.length} 个节点`);
  }

  function pasteSelection() {
    if (state.readonly || !state.clipboard) return;
    const idMap = new Map();
    const pastedNodes = clone(state.clipboard.nodes).map((item) => {
      const oldId = item.id;
      item.id = uid("node");
      item.x += 32;
      item.y += 32;
      if (item.groupId) item.groupId = `${item.groupId}-copy-${Date.now().toString(36)}`;
      idMap.set(oldId, item.id);
      return item;
    });
    const pastedEdges = clone(state.clipboard.edges).map((item) => ({ ...item, id: uid("edge"), from: idMap.get(item.from), to: idMap.get(item.to) }));
    state.active.nodes.push(...pastedNodes);
    state.active.edges.push(...pastedEdges);
    state.selectedIds = new Set(pastedNodes.map((item) => item.id));
    renderEditor();
    commitHistory();
  }

  function arrange(action) {
    if (state.readonly) return;
    const items = selectedNodes();
    if (["group", "ungroup"].includes(action)) {
      if (action === "group" && items.length > 1) {
        const groupId = uid("group");
        items.forEach((item) => { item.groupId = groupId; });
      }
      if (action === "ungroup") items.forEach((item) => { item.groupId = null; });
      renderEditor();
      commitHistory();
      return;
    }
    if (action === "bring-front" || action === "send-back") {
      const ids = new Set(items.map((item) => item.id));
      const rest = state.active.nodes.filter((item) => !ids.has(item.id));
      state.active.nodes = action === "bring-front" ? [...rest, ...items] : [...items, ...rest];
      renderEditor();
      commitHistory();
      return;
    }
    if (items.length < 2) return;
    const bounds = selectionBounds(items);
    if (action === "align-left") items.forEach((item) => { item.x = bounds.x; });
    if (action === "align-center-x") items.forEach((item) => { item.x = bounds.x + bounds.w / 2 - item.w / 2; });
    if (action === "align-right") items.forEach((item) => { item.x = bounds.x + bounds.w - item.w; });
    if (action === "align-top") items.forEach((item) => { item.y = bounds.y; });
    if (action === "align-middle-y") items.forEach((item) => { item.y = bounds.y + bounds.h / 2 - item.h / 2; });
    if (action === "align-bottom") items.forEach((item) => { item.y = bounds.y + bounds.h - item.h; });
    if (action === "same-size") {
      const [reference] = items;
      items.slice(1).forEach((item) => { item.w = reference.w; item.h = reference.h; });
    }
    if (action === "distribute-x" && items.length > 2) {
      const sorted = [...items].sort((a, b) => a.x - b.x);
      const totalWidth = sorted.reduce((sum, item) => sum + item.w, 0);
      const gap = (bounds.w - totalWidth) / (sorted.length - 1);
      let cursor = bounds.x;
      sorted.forEach((item) => { item.x = cursor; cursor += item.w + gap; });
    }
    if (action === "distribute-y" && items.length > 2) {
      const sorted = [...items].sort((a, b) => a.y - b.y);
      const totalHeight = sorted.reduce((sum, item) => sum + item.h, 0);
      const gap = (bounds.h - totalHeight) / (sorted.length - 1);
      let cursor = bounds.y;
      sorted.forEach((item) => { item.y = cursor; cursor += item.h + gap; });
    }
    renderEditor();
    commitHistory();
  }

  function selectionBounds(items) {
    const x = Math.min(...items.map((item) => item.x));
    const y = Math.min(...items.map((item) => item.y));
    const maxX = Math.max(...items.map((item) => item.x + item.w));
    const maxY = Math.max(...items.map((item) => item.y + item.h));
    return { x, y, w: maxX - x, h: maxY - y };
  }

  function updateArrangeButtons() {
    const count = state.selectedIds.size;
    $$("[data-arrange]").forEach((button) => {
      const action = button.dataset.arrange;
      const needsThree = action.startsWith("distribute");
      const groupAction = action === "group" || action === "ungroup";
      button.disabled = state.readonly || (needsThree ? count < 3 : groupAction ? count < (action === "group" ? 2 : 1) : count < 2);
    });
  }

  function renderProperties() {
    if (!state.active) return;
    if (state.propertyTab === "page") {
      elements.properties.innerHTML = pagePropertiesHtml();
      bindPropertyControls();
      return;
    }
    const items = selectedNodes();
    const selectedEdge = state.active.edges.find((item) => item.id === state.selectedEdgeId);
    if (selectedEdge) {
      elements.properties.innerHTML = edgePropertiesHtml(selectedEdge);
      bindPropertyControls();
      return;
    }
    if (!items.length) {
      elements.properties.innerHTML = `<div class="property-empty"><i data-lucide="mouse-pointer-2"></i><h3>选择画布中的内容</h3><p>选中节点或连线后，可以在这里修改样式与层级。</p></div>`;
      refreshIcons();
      return;
    }
    const reference = items[0];
    elements.properties.innerHTML = `
      <p class="selection-summary">已选择 ${items.length} 个${items.length > 1 ? "节点" : SHAPES.find((shape) => shape.type === reference.type)?.label || "节点"}</p>
      <section class="property-section">
        <h3>外观</h3>
        <div class="property-row"><label for="prop-fill">填充色</label><input id="prop-fill" class="property-control" type="color" data-node-prop="fill" value="${safeColor(reference.style.fill, "#ffffff")}" ${state.readonly ? "disabled" : ""}></div>
        <div class="property-row"><label for="prop-stroke">边框色</label><input id="prop-stroke" class="property-control" type="color" data-node-prop="stroke" value="${safeColor(reference.style.stroke, "#0f766e")}" ${state.readonly ? "disabled" : ""}></div>
        <div class="property-row"><label for="prop-stroke-width">边框粗细</label><select id="prop-stroke-width" class="property-control" data-node-prop="strokeWidth" ${state.readonly ? "disabled" : ""}><option value="1" ${reference.style.strokeWidth == 1 ? "selected" : ""}>1 px</option><option value="2" ${reference.style.strokeWidth == 2 ? "selected" : ""}>2 px</option><option value="3" ${reference.style.strokeWidth == 3 ? "selected" : ""}>3 px</option></select></div>
      </section>
      <section class="property-section">
        <h3>文字</h3>
        <div class="property-row"><label for="prop-text-color">文字颜色</label><input id="prop-text-color" class="property-control" type="color" data-node-prop="textColor" value="${safeColor(reference.style.textColor, "#111827")}" ${state.readonly ? "disabled" : ""}></div>
        <div class="property-row"><label for="prop-font-size">字号</label><input id="prop-font-size" class="property-control" type="number" min="10" max="32" step="1" data-node-prop="fontSize" value="${reference.style.fontSize}" ${state.readonly ? "disabled" : ""}></div>
        <div class="property-row"><span class="property-label">对齐</span><div class="segmented">${["left", "center", "right"].map((value) => `<button type="button" data-node-align="${value}" class="${reference.style.textAlign === value ? "is-active" : ""}" aria-label="${value === "left" ? "左对齐" : value === "right" ? "右对齐" : "居中对齐"}" ${state.readonly ? "disabled" : ""}><i data-lucide="align-${value === "center" ? "center" : value}"></i></button>`).join("")}</div></div>
      </section>
      <section class="property-section">
        <h3>排列</h3>
        <div class="layer-actions"><button class="mini-action" type="button" data-layer="bring-front" ${state.readonly ? "disabled" : ""}><i data-lucide="bring-to-front"></i>置于顶层</button><button class="mini-action" type="button" data-layer="send-back" ${state.readonly ? "disabled" : ""}><i data-lucide="send-to-back"></i>置于底层</button><button class="mini-action" type="button" data-duplicate ${state.readonly ? "disabled" : ""}><i data-lucide="copy-plus"></i>创建副本</button><button class="mini-action danger" type="button" data-delete-selected ${state.readonly ? "disabled" : ""}><i data-lucide="trash-2"></i>删除</button></div>
      </section>`;
    bindPropertyControls();
  }

  function edgePropertiesHtml(item) {
    return `<p class="selection-summary">已选择 1 条连线</p>
      <section class="property-section"><h3>线条</h3>
        <div class="property-row"><label for="edge-color">线条颜色</label><input id="edge-color" class="property-control" type="color" data-edge-prop="color" value="${safeColor(item.color, "#64748b")}" ${state.readonly ? "disabled" : ""}></div>
        <div class="property-row"><label for="edge-width">线条粗细</label><select id="edge-width" class="property-control" data-edge-prop="width" ${state.readonly ? "disabled" : ""}><option value="1" ${item.width == 1 ? "selected" : ""}>1 px</option><option value="2" ${item.width == 2 ? "selected" : ""}>2 px</option><option value="3" ${item.width == 3 ? "selected" : ""}>3 px</option></select></div>
        <div class="property-row"><label for="edge-type">连线类型</label><select id="edge-type" class="property-control" data-edge-prop="type" ${state.readonly ? "disabled" : ""}><option value="orthogonal" ${item.type === "orthogonal" ? "selected" : ""}>折线</option><option value="straight" ${item.type === "straight" ? "selected" : ""}>直线</option></select></div>
        <div class="property-row"><label for="edge-arrow">箭头</label><select id="edge-arrow" class="property-control" data-edge-prop="arrow" ${state.readonly ? "disabled" : ""}><option value="none" ${item.arrow === "none" ? "selected" : ""}>无</option><option value="end" ${item.arrow === "end" ? "selected" : ""}>末端</option><option value="start" ${item.arrow === "start" ? "selected" : ""}>起点</option><option value="both" ${item.arrow === "both" ? "selected" : ""}>双向</option></select></div>
        <div class="property-row"><label for="edge-label">说明文字</label><input id="edge-label" class="property-control" type="text" maxlength="16" data-edge-prop="label" value="${escapeHtml(item.label || "")}" ${state.readonly ? "disabled" : ""}></div>
      </section>
      <section class="property-section"><button class="mini-action danger" type="button" data-delete-selected ${state.readonly ? "disabled" : ""}><i data-lucide="trash-2"></i>删除连线</button></section>`;
  }

  function pagePropertiesHtml() {
    return `<section class="property-section"><h3>主题</h3><div class="theme-grid">${Object.entries(THEMES).map(([id, theme]) => `<button type="button" class="theme-swatch ${state.active.theme === id ? "is-active" : ""}" data-theme="${id}" ${state.readonly ? "disabled" : ""}><span class="theme-colors"><i style="background:${theme.fill}"></i><i style="background:${theme.stroke}"></i><i style="background:${theme.accent}"></i></span><small>${theme.name}</small></button>`).join("")}</div></section>
      <section class="property-section"><h3>画布</h3>
        <div class="property-row"><label for="page-color">背景色</label><input id="page-color" class="property-control" type="color" data-page-prop="pageColor" value="${safeColor(state.active.pageColor, "#f2f4f6")}" ${state.readonly ? "disabled" : ""}></div>
        <label class="checkbox-row"><input type="checkbox" data-page-prop="grid" ${state.active.grid ? "checked" : ""} ${state.readonly ? "disabled" : ""}>显示网格</label>
        <label class="checkbox-row"><input type="checkbox" data-page-prop="snap" ${state.active.snap ? "checked" : ""} ${state.readonly ? "disabled" : ""}>吸附到网格</label>
      </section>
      <section class="property-section"><h3>文档概览</h3><div class="property-row"><span class="property-label">节点</span><strong>${state.active.nodes.length}</strong></div><div class="property-row"><span class="property-label">连线</span><strong>${state.active.edges.length}</strong></div></section>`;
  }

  function safeColor(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
  }

  function bindPropertyControls() {
    refreshIcons();
  }

  function updateNodeProperty(property, value) {
    selectedNodes().forEach((item) => {
      item.style[property] = ["strokeWidth", "fontSize"].includes(property) ? Number(value) : value;
    });
    renderDiagram();
    saveActive();
  }

  function updateEdgeProperty(property, value) {
    const item = state.active.edges.find((entry) => entry.id === state.selectedEdgeId);
    if (!item) return;
    item[property] = property === "width" ? Number(value) : value;
    renderDiagram();
    saveActive();
  }

  function applyTheme(themeId) {
    if (state.readonly || !THEMES[themeId]) return;
    const theme = THEMES[themeId];
    state.active.theme = themeId;
    state.active.nodes.forEach((item) => {
      if (item.type === "lane") return;
      if (item.type === "note") {
        item.style.fill = "#fff7d6";
        item.style.stroke = theme.accent;
        item.style.textColor = theme.text;
      } else if (item.type === "text") {
        item.style.fill = "transparent";
        item.style.stroke = "transparent";
        item.style.textColor = theme.text;
      } else {
        item.style.fill = theme.fill;
        item.style.stroke = theme.stroke;
        item.style.textColor = theme.text;
      }
    });
    state.active.edges.forEach((item) => { item.color = theme.edge; });
    renderEditor();
    commitHistory();
    toast(`已应用“${theme.name}”主题`);
  }

  function setZoom(scale, center) {
    if (!state.active) return;
    const oldScale = state.active.viewport.scale;
    const newScale = clamp(scale, .25, 2.5);
    const rect = elements.svg.getBoundingClientRect();
    const cx = center?.x ?? rect.width / 2;
    const cy = center?.y ?? rect.height / 2;
    const worldX = (cx - state.active.viewport.x) / oldScale;
    const worldY = (cy - state.active.viewport.y) / oldScale;
    state.active.viewport.x = cx - worldX * newScale;
    state.active.viewport.y = cy - worldY * newScale;
    state.active.viewport.scale = newScale;
    elements.viewport.setAttribute("transform", `translate(${state.active.viewport.x} ${state.active.viewport.y}) scale(${newScale})`);
    elements.zoomLabel.textContent = `${Math.round(newScale * 100)}%`;
  }

  function fitToContent() {
    if (!state.active?.nodes.length) {
      state.active.viewport = { x: elements.canvasWrap.clientWidth / 2, y: elements.canvasWrap.clientHeight / 2, scale: 1 };
      renderEditor();
      return;
    }
    const bounds = selectionBounds(state.active.nodes);
    const padding = 90;
    const width = elements.canvasWrap.clientWidth;
    const height = elements.canvasWrap.clientHeight;
    const scale = clamp(Math.min((width - padding * 2) / Math.max(bounds.w, 1), (height - padding * 2) / Math.max(bounds.h, 1)), .35, 1.25);
    state.active.viewport.scale = scale;
    state.active.viewport.x = width / 2 - (bounds.x + bounds.w / 2) * scale;
    state.active.viewport.y = height / 2 - (bounds.y + bounds.h / 2) * scale;
    renderEditor();
  }

  function toast(message, type = "success") {
    const item = document.createElement("div");
    item.className = `toast ${type === "error" ? "error" : ""}`;
    item.innerHTML = `<i data-lucide="${type === "error" ? "circle-alert" : "circle-check"}"></i><span>${escapeHtml(message)}</span>`;
    elements.toastRegion.append(item);
    refreshIcons();
    setTimeout(() => item.remove(), 3600);
  }

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
  }

  function openDialog(dialog) {
    if (!dialog.open) dialog.showModal();
    elements.modalBackdrop.hidden = false;
  }

  function closeDialog(dialog) {
    if (dialog?.open) dialog.close();
    if (!$("dialog[open]")) elements.modalBackdrop.hidden = true;
  }

  function closeAllDialogs() {
    $$("dialog[open]").forEach((dialog) => dialog.close());
    elements.modalBackdrop.hidden = true;
  }

  function buildShareUrl() {
    const snapshot = clone(state.active);
    delete snapshot.id;
    snapshot.viewport = { x: 100, y: 80, scale: 1 };
    const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return `${location.href.split("#")[0]}#share=${btoa(binary)}`;
  }

  function loadSharedFromHash() {
    if (!location.hash.startsWith("#share=")) return false;
    try {
      const binary = atob(location.hash.slice(7));
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const snapshot = JSON.parse(new TextDecoder().decode(bytes));
      snapshot.id = uid("shared");
      openDocument(snapshot.id, { document: snapshot, readonly: true });
      return true;
    } catch {
      toast("分享链接已损坏或不完整", "error");
      return false;
    }
  }

  function copyText(value) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
    const input = document.createElement("textarea");
    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    return Promise.resolve();
  }

  function exportBounds() {
    if (!state.active.nodes.length) return { x: 0, y: 0, w: 960, h: 540 };
    const bounds = selectionBounds(state.active.nodes);
    return { x: bounds.x - 48, y: bounds.y - 48, w: bounds.w + 96, h: bounds.h + 96 };
  }

  function buildExportSvg() {
    const bounds = exportBounds();
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(bounds.w)}" height="${Math.ceil(bounds.h)}" viewBox="${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}"><defs><marker id="arrow-end" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker><marker id="arrow-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M10 0L0 5L10 10z" fill="context-stroke"/></marker></defs><rect x="${bounds.x}" y="${bounds.y}" width="${bounds.w}" height="${bounds.h}" fill="white"/><g>${elements.lanes.innerHTML}${elements.edges.innerHTML}${elements.nodes.innerHTML}</g></svg>`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportDiagram(type) {
    if (!state.active.nodes.length) {
      toast("画布还是空的，先添加节点再导出", "error");
      return;
    }
    const svgSource = buildExportSvg();
    const safeName = state.active.name.replace(/[\\/:*?"<>|]/g, "-") || "流程图";
    if (type === "svg") {
      downloadBlob(new Blob([svgSource], { type: "image/svg+xml;charset=utf-8" }), `${safeName}.svg`);
      toast("SVG 已导出");
    } else if (type === "png") {
      const image = new Image();
      const blob = new Blob([svgSource], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2;
        canvas.width = image.width * scale;
        canvas.height = image.height * scale;
        const context = canvas.getContext("2d");
        context.scale(scale, scale);
        context.drawImage(image, 0, 0);
        canvas.toBlob((png) => {
          if (png) downloadBlob(png, `${safeName}.png`);
          URL.revokeObjectURL(url);
          toast("PNG 已导出");
        }, "image/png");
      };
      image.onerror = () => { URL.revokeObjectURL(url); toast("PNG 导出失败，请改用 SVG", "error"); };
      image.src = url;
    } else if (type === "pdf") {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast("浏览器阻止了打印窗口，请允许弹出窗口", "error");
        return;
      }
      printWindow.opener = null;
      printWindow.document.write(`<title>${escapeHtml(state.active.name)}</title><style>@page{size:landscape;margin:12mm}body{margin:0;display:grid;place-items:center;min-height:100vh}svg{max-width:100%;max-height:92vh}</style>${svgSource}<script>onload=()=>setTimeout(()=>print(),250)<\/script>`);
      printWindow.document.close();
    }
    closeDialog($("#export-dialog"));
  }

  function pointerDown(event) {
    if (!state.active) return;
    const quick = event.target.closest("[data-quick-connect]");
    if (quick) {
      event.stopPropagation();
      quickConnect(quick.dataset.quickConnect, quick.dataset.direction);
      return;
    }
    const resize = event.target.closest("[data-resize-node]");
    if (resize && !state.readonly) {
      const item = state.active.nodes.find((nodeItem) => nodeItem.id === resize.dataset.resizeNode);
      if (!item) return;
      const start = screenToWorld(event.clientX, event.clientY);
      state.resizing = { item, start, width: item.w, height: item.h };
      window.addEventListener("pointermove", pointerMove);
      window.addEventListener("pointerup", pointerUp, { once: true });
      event.preventDefault();
      return;
    }
    const nodeElement = event.target.closest("[data-node-id]");
    if (nodeElement) {
      const nodeId = nodeElement.dataset.nodeId;
      if (state.mode === "connect" && !state.readonly) {
        connectNodes(nodeId);
        return;
      }
      if (state.readonly || state.mode === "pan" || state.spacePressed) {
        startPan(event);
        return;
      }
      const item = state.active.nodes.find((entry) => entry.id === nodeId);
      if (!item) return;
      if (event.shiftKey) {
        if (state.selectedIds.has(nodeId)) state.selectedIds.delete(nodeId);
        else state.selectedIds.add(nodeId);
      } else if (!state.selectedIds.has(nodeId)) {
        if (item.groupId) state.selectedIds = new Set(state.active.nodes.filter((entry) => entry.groupId === item.groupId).map((entry) => entry.id));
        else state.selectedIds = new Set([nodeId]);
      }
      state.selectedEdgeId = null;
      const start = screenToWorld(event.clientX, event.clientY);
      state.dragging = { start, positions: selectedNodes().map((entry) => ({ id: entry.id, x: entry.x, y: entry.y })), moved: false };
      window.addEventListener("pointermove", pointerMove);
      window.addEventListener("pointerup", pointerUp, { once: true });
      renderEditor();
      event.preventDefault();
      return;
    }
    const edgeElement = event.target.closest("[data-edge-id]");
    if (edgeElement && !state.readonly && state.mode === "select") {
      state.selectedEdgeId = edgeElement.dataset.edgeId;
      state.selectedIds.clear();
      renderEditor();
      return;
    }
    if (state.mode === "pan" || state.spacePressed || state.readonly) {
      startPan(event);
      return;
    }
    clearSelection();
    const start = screenToWorld(event.clientX, event.clientY);
    state.marquee = { start, current: start };
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp, { once: true });
    renderEditor();
  }

  function startPan(event) {
    state.panning = { clientX: event.clientX, clientY: event.clientY, x: state.active.viewport.x, y: state.active.viewport.y };
    elements.canvasWrap.classList.add("is-dragging");
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp, { once: true });
    event.preventDefault();
  }

  function pointerMove(event) {
    if (state.dragging) {
      const point = screenToWorld(event.clientX, event.clientY);
      const dx = point.x - state.dragging.start.x;
      const dy = point.y - state.dragging.start.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) state.dragging.moved = true;
      state.dragging.positions.forEach((position) => {
        const item = state.active.nodes.find((entry) => entry.id === position.id);
        if (item) { item.x = snap(position.x + dx); item.y = snap(position.y + dy); }
      });
      renderDiagram();
      return;
    }
    if (state.resizing) {
      const point = screenToWorld(event.clientX, event.clientY);
      state.resizing.item.w = snap(Math.max(72, state.resizing.width + point.x - state.resizing.start.x));
      state.resizing.item.h = snap(Math.max(40, state.resizing.height + point.y - state.resizing.start.y));
      renderDiagram();
      return;
    }
    if (state.panning) {
      state.active.viewport.x = state.panning.x + event.clientX - state.panning.clientX;
      state.active.viewport.y = state.panning.y + event.clientY - state.panning.clientY;
      elements.viewport.setAttribute("transform", `translate(${state.active.viewport.x} ${state.active.viewport.y}) scale(${state.active.viewport.scale})`);
      return;
    }
    if (state.marquee) {
      state.marquee.current = screenToWorld(event.clientX, event.clientY);
      renderDiagram();
      const x = Math.min(state.marquee.start.x, state.marquee.current.x);
      const y = Math.min(state.marquee.start.y, state.marquee.current.y);
      const w = Math.abs(state.marquee.current.x - state.marquee.start.x);
      const h = Math.abs(state.marquee.current.y - state.marquee.start.y);
      elements.selections.append(svgEl("rect", { class: "selection-box", x, y, width: w, height: h, fill: "rgba(14,116,144,.06)" }));
    }
  }

  function pointerUp() {
    window.removeEventListener("pointermove", pointerMove);
    if (state.dragging) {
      const moved = state.dragging.moved;
      state.dragging = null;
      if (moved) commitHistory();
    }
    if (state.resizing) {
      state.resizing = null;
      commitHistory();
    }
    if (state.panning) {
      state.panning = null;
      elements.canvasWrap.classList.remove("is-dragging");
      saveActive();
    }
    if (state.marquee) {
      const x = Math.min(state.marquee.start.x, state.marquee.current.x);
      const y = Math.min(state.marquee.start.y, state.marquee.current.y);
      const maxX = Math.max(state.marquee.start.x, state.marquee.current.x);
      const maxY = Math.max(state.marquee.start.y, state.marquee.current.y);
      state.selectedIds = new Set(state.active.nodes.filter((item) => item.x >= x && item.y >= y && item.x + item.w <= maxX && item.y + item.h <= maxY).map((item) => item.id));
      state.marquee = null;
      renderEditor();
    } else {
      renderEditor();
    }
  }

  function wheelCanvas(event) {
    if (!state.active) return;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const rect = elements.svg.getBoundingClientRect();
      setZoom(state.active.viewport.scale * (event.deltaY > 0 ? .9 : 1.1), { x: event.clientX - rect.left, y: event.clientY - rect.top });
      saveActive();
    } else if (state.mode === "pan" || event.shiftKey) {
      event.preventDefault();
      state.active.viewport.x -= event.deltaX || event.deltaY;
      state.active.viewport.y -= event.deltaY;
      renderEditor();
      saveActive();
    }
  }

  function handleKeyDown(event) {
    const activeTag = document.activeElement?.tagName;
    const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(activeTag) || $("dialog[open]");
    if (event.key === "Escape") {
      if ($("dialog[open]")) closeAllDialogs();
      else { clearSelection(); setMode(state.readonly ? "pan" : "select"); renderEditor(); }
      return;
    }
    if (editing || !state.active) return;
    const command = event.ctrlKey || event.metaKey;
    if (command && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
    if (command && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
    if (command && event.key.toLowerCase() === "c") { event.preventDefault(); copySelection(); return; }
    if (command && event.key.toLowerCase() === "v") { event.preventDefault(); pasteSelection(); return; }
    if (command && event.key.toLowerCase() === "g") { event.preventDefault(); arrange(event.shiftKey ? "ungroup" : "group"); return; }
    if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteSelection(); return; }
    if (event.key === "Enter" && state.selectedIds.size === 1) { event.preventDefault(); openTextEditor([...state.selectedIds][0]); return; }
    if (event.key === " ") { event.preventDefault(); state.spacePressed = true; elements.canvasWrap.classList.add("mode-pan"); return; }
    if (!command && event.key.toLowerCase() === "v") setMode("select");
    if (!command && event.key.toLowerCase() === "h") setMode("pan");
    if (!command && event.key.toLowerCase() === "c" && !state.readonly) setMode("connect");
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && state.selectedIds.size && !state.readonly) {
      event.preventDefault();
      const distance = event.shiftKey ? SNAP_SIZE : 1;
      selectedNodes().forEach((item) => {
        if (event.key === "ArrowLeft") item.x -= distance;
        if (event.key === "ArrowRight") item.x += distance;
        if (event.key === "ArrowUp") item.y -= distance;
        if (event.key === "ArrowDown") item.y += distance;
      });
      renderEditor();
      commitHistory();
    }
  }

  function duplicateSelected() {
    copySelection();
    pasteSelection();
  }

  function bindEvents() {
    $("#new-blank").addEventListener("click", createBlank);
    $("#browse-templates").addEventListener("click", () => $("#template-section").scrollIntoView({ behavior: "smooth", block: "start" }));
    $("#back-home").addEventListener("click", showHome);
    $("#open-shortcuts").addEventListener("click", () => openDialog($("#shortcuts-dialog")));
    elements.fileSearch.addEventListener("input", renderFiles);
    elements.shapeSearch.addEventListener("input", (event) => renderShapeLibrary(event.target.value));

    document.addEventListener("click", (event) => {
      const templateTab = event.target.closest("[data-template-filter]");
      if (templateTab) {
        state.templateFilter = templateTab.dataset.templateFilter;
        $$("[data-template-filter]").forEach((button) => { const active = button === templateTab; button.classList.toggle("is-active", active); button.setAttribute("aria-selected", String(active)); });
        renderTemplates();
      }
      const template = event.target.closest("[data-template-id]");
      if (template) createFromTemplate(template.dataset.templateId);
      if (event.target.closest("[data-empty-new]")) createBlank();
      const fileRow = event.target.closest("[data-file-id]");
      if (fileRow) handleFileAction(event, fileRow.dataset.fileId);
      const shapeItem = event.target.closest("[data-shape-type]");
      if (shapeItem && !event.defaultPrevented) addShape(shapeItem.dataset.shapeType);
      const modeButton = event.target.closest("[data-mode]");
      if (modeButton) setMode(modeButton.dataset.mode);
      const mobileMode = event.target.closest("[data-mobile-mode]");
      if (mobileMode) setMode(mobileMode.dataset.mobileMode);
      const arrangeButton = event.target.closest("[data-arrange]");
      if (arrangeButton) arrange(arrangeButton.dataset.arrange);
      const propertyTab = event.target.closest("[data-property-tab]");
      if (propertyTab) {
        state.propertyTab = propertyTab.dataset.propertyTab;
        $$("[data-property-tab]").forEach((button) => { const active = button === propertyTab; button.classList.toggle("is-active", active); button.setAttribute("aria-selected", String(active)); });
        renderProperties();
      }
      const nodeAlign = event.target.closest("[data-node-align]");
      if (nodeAlign) { updateNodeProperty("textAlign", nodeAlign.dataset.nodeAlign); commitHistory(); renderProperties(); }
      const layer = event.target.closest("[data-layer]");
      if (layer) arrange(layer.dataset.layer);
      if (event.target.closest("[data-duplicate]")) duplicateSelected();
      if (event.target.closest("[data-delete-selected]")) deleteSelection();
      const themeButton = event.target.closest("[data-theme]");
      if (themeButton) applyTheme(themeButton.dataset.theme);
      const closeButton = event.target.closest("[data-dialog-close]");
      if (closeButton) closeDialog($("#" + closeButton.dataset.dialogClose));
      const exportButton = event.target.closest("[data-export]");
      if (exportButton) exportDiagram(exportButton.dataset.export);
      const mobilePanel = event.target.closest("[data-mobile-panel]");
      if (mobilePanel) toggleMobilePanel(mobilePanel.dataset.mobilePanel);
      if (event.target.closest("[data-close-panel]")) $$(".side-panel.is-open").forEach((panel) => panel.classList.remove("is-open"));
    });

    elements.shapeLibrary.addEventListener("dragstart", (event) => {
      const item = event.target.closest("[data-shape-type]");
      if (!item) return;
      event.dataTransfer.setData("text/flowcraft-shape", item.dataset.shapeType);
      event.dataTransfer.effectAllowed = "copy";
    });
    elements.canvasWrap.addEventListener("dragover", (event) => { if (!state.readonly) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } });
    elements.canvasWrap.addEventListener("drop", (event) => {
      if (state.readonly) return;
      event.preventDefault();
      const type = event.dataTransfer.getData("text/flowcraft-shape");
      if (type) addShape(type, screenToWorld(event.clientX, event.clientY));
    });

    elements.svg.addEventListener("pointerdown", pointerDown);
    elements.svg.addEventListener("dblclick", (event) => {
      const nodeElement = event.target.closest("[data-node-id]");
      if (nodeElement) openTextEditor(nodeElement.dataset.nodeId);
    });
    elements.canvasWrap.addEventListener("wheel", wheelCanvas, { passive: false });
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", (event) => { if (event.key === " ") { state.spacePressed = false; if (state.mode !== "pan") elements.canvasWrap.classList.remove("mode-pan"); } });

    elements.docName.addEventListener("input", (event) => {
      if (!state.active || state.readonly) return;
      state.active.name = event.target.value || "未命名流程图";
      document.title = `${state.active.name} - FlowCraft`;
      saveActive();
    });
    elements.docName.addEventListener("change", renderFiles);

    $("#text-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const dialog = $("#text-dialog");
      const item = state.active.nodes.find((entry) => entry.id === dialog.dataset.nodeId);
      if (item) item.text = $("#node-text").value.trim() || SHAPES.find((shape) => shape.type === item.type)?.label || "节点";
      closeDialog(dialog);
      renderEditor();
      commitHistory();
    });

    elements.properties.addEventListener("input", (event) => {
      if (event.target.dataset.nodeProp) updateNodeProperty(event.target.dataset.nodeProp, event.target.value);
      if (event.target.dataset.edgeProp) updateEdgeProperty(event.target.dataset.edgeProp, event.target.value);
      if (event.target.dataset.pageProp === "pageColor") { state.active.pageColor = event.target.value; renderEditor(); saveActive(); }
    });
    elements.properties.addEventListener("change", (event) => {
      if (event.target.dataset.nodeProp || event.target.dataset.edgeProp || event.target.dataset.pageProp === "pageColor") commitHistory();
      if (["grid", "snap"].includes(event.target.dataset.pageProp)) {
        state.active[event.target.dataset.pageProp] = event.target.checked;
        renderEditor();
        commitHistory();
      }
    });

    $("#toggle-grid").addEventListener("click", () => { if (!state.readonly) { state.active.grid = !state.active.grid; renderEditor(); commitHistory(); } });
    $("#toggle-snap").addEventListener("click", () => { if (!state.readonly) { state.active.snap = !state.active.snap; renderEditor(); commitHistory(); } });
    $("#undo-button").addEventListener("click", undo);
    $("#redo-button").addEventListener("click", redo);
    $("#zoom-in").addEventListener("click", () => { setZoom(state.active.viewport.scale * 1.15); saveActive(); });
    $("#zoom-out").addEventListener("click", () => { setZoom(state.active.viewport.scale / 1.15); saveActive(); });
    $("#zoom-reset").addEventListener("click", () => { setZoom(1); saveActive(); });
    $("#zoom-fit").addEventListener("click", fitToContent);
    $("#open-export").addEventListener("click", () => openDialog($("#export-dialog")));
    $("#share-button").addEventListener("click", () => {
      $("#share-url").value = buildShareUrl();
      $("#share-feedback").textContent = "";
      openDialog($("#share-dialog"));
    });
    $("#copy-share-url").addEventListener("click", () => copyText($("#share-url").value).then(() => { $("#share-feedback").textContent = "链接已复制到剪贴板"; }));
    $("#copy-as-own").addEventListener("click", () => {
      const copy = clone(state.active);
      copy.id = uid("doc");
      copy.name = `${copy.name} - 副本`;
      copy.createdAt = new Date().toISOString();
      copy.updatedAt = copy.createdAt;
      state.documents.unshift(copy);
      writeDocuments();
      history.replaceState(null, "", location.href.split("#")[0]);
      openDocument(copy.id);
      toast("已创建可编辑副本");
    });
    elements.modalBackdrop.addEventListener("click", closeAllDialogs);
    $$("dialog").forEach((dialog) => dialog.addEventListener("close", () => { if (!$("dialog[open]")) elements.modalBackdrop.hidden = true; }));
    window.addEventListener("hashchange", () => { if (location.hash.startsWith("#share=")) loadSharedFromHash(); });
    window.addEventListener("resize", debounce(() => { if (state.active) renderEditor(); }, 100));
  }

  function handleFileAction(event, fileId) {
    const file = state.documents.find((item) => item.id === fileId);
    if (!file) return;
    if (event.target.closest("[data-file-open]")) openDocument(fileId);
    if (event.target.closest("[data-file-rename]")) {
      const next = window.prompt("输入新的文件名", file.name);
      if (next?.trim()) { file.name = next.trim(); file.updatedAt = new Date().toISOString(); writeDocuments(); renderFiles(); }
    }
    if (event.target.closest("[data-file-duplicate]")) {
      const duplicate = clone(file);
      duplicate.id = uid("doc");
      duplicate.name = `${file.name} - 副本`;
      duplicate.createdAt = new Date().toISOString();
      duplicate.updatedAt = duplicate.createdAt;
      state.documents.unshift(duplicate);
      writeDocuments();
      renderFiles();
      toast("已创建文件副本");
    }
    if (event.target.closest("[data-file-delete]")) {
      if (window.confirm(`确定删除“${file.name}”吗？此操作只会删除当前浏览器中的文件。`)) {
        state.documents = state.documents.filter((item) => item.id !== fileId);
        writeDocuments();
        renderFiles();
        toast("文件已删除");
      }
    }
  }

  function toggleMobilePanel(which) {
    const target = which === "shape" ? $("#shape-panel") : $("#property-panel");
    $$(".side-panel").forEach((panel) => { if (panel !== target) panel.classList.remove("is-open"); });
    target.classList.toggle("is-open");
  }

  function init() {
    readDocuments();
    renderTemplates();
    renderFiles();
    renderShapeLibrary();
    bindEvents();
    refreshIcons();
    if (!loadSharedFromHash()) showHome();
  }

  init();
})();
