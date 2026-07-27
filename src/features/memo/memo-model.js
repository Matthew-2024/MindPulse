(function (global) {
  "use strict";

  var SEARCH_SYNONYMS = Object.freeze({
    "竞赛": ["比赛", "赛事", "国赛", "答辩", "参赛"],
    "作业": ["课程", "报告", "论文", "ddl", "截止"],
    "运动": ["健身", "跑步", "训练", "锻炼"],
    "考试": ["复习", "测验", "备考", "考核"],
    "求职": ["实习", "简历", "面试", "招聘"]
  });

  function nowOf(options) {
    return options && options.now || new Date().toISOString();
  }

  function makeId(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function cleanText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function makeItem(text, options) {
    return {
      id: options && options.id || makeId("item"),
      text: String(text == null ? "" : text),
      createdAt: nowOf(options),
      updatedAt: nowOf(options)
    };
  }

  function normalizeItem(item) {
    if (!item || typeof item !== "object") return null;
    return {
      id: cleanText(item.id) || makeId("item"),
      text: String(item.text == null ? "" : item.text),
      createdAt: cleanText(item.createdAt) || new Date().toISOString(),
      updatedAt: cleanText(item.updatedAt) || cleanText(item.createdAt) || new Date().toISOString()
    };
  }

  function createMemo(title, options) {
    var now = nowOf(options);
    return {
      id: options && options.id || makeId("memo"),
      title: cleanText(title) || "未命名笔记",
      category: cleanText(options && options.category) || "未分类",
      items: [],
      createdAt: now,
      updatedAt: now
    };
  }

  function normalizeMemo(memo) {
    if (!memo || typeof memo !== "object" || Array.isArray(memo)) return null;
    var createdAt = cleanText(memo.createdAt) || new Date().toISOString();
    return {
      id: cleanText(memo.id) || makeId("memo"),
      title: cleanText(memo.title) || "未命名笔记",
      category: cleanText(memo.category) || "未分类",
      items: (Array.isArray(memo.items) ? memo.items : []).map(normalizeItem).filter(Boolean),
      createdAt: createdAt,
      updatedAt: cleanText(memo.updatedAt) || createdAt
    };
  }

  function normalizeMemos(memos) {
    return (Array.isArray(memos) ? memos : []).map(normalizeMemo).filter(Boolean).sort(function (a, b) {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }

  function touchMemo(memo, items, options, title) {
    var normalized = normalizeMemo(memo) || createMemo("");
    return Object.assign({}, normalized, {
      title: title == null ? normalized.title : (cleanText(title) || "未命名笔记"),
      items: items,
      updatedAt: nowOf(options)
    });
  }

  function insertItem(memo, index, text, options) {
    var normalized = normalizeMemo(memo) || createMemo("");
    var items = normalized.items.slice();
    var position = Math.max(0, Math.min(Number(index) || 0, items.length));
    items.splice(position, 0, makeItem(text, options));
    return touchMemo(normalized, items, options);
  }

  function updateItem(memo, itemId, text, options) {
    var normalized = normalizeMemo(memo) || createMemo("");
    var items = normalized.items.map(function (item) {
      return item.id === itemId ? Object.assign({}, item, { text: String(text == null ? "" : text), updatedAt: nowOf(options) }) : item;
    });
    return touchMemo(normalized, items, options);
  }

  function removeItem(memo, itemId, options) {
    var normalized = normalizeMemo(memo) || createMemo("");
    return touchMemo(normalized, normalized.items.filter(function (item) { return item.id !== itemId; }), options);
  }

  function moveItem(memo, itemId, targetIndex, options) {
    var normalized = normalizeMemo(memo) || createMemo("");
    var items = normalized.items.slice();
    var currentIndex = items.findIndex(function (item) { return item.id === itemId; });
    if (currentIndex < 0) return normalized;
    var moved = items.splice(currentIndex, 1)[0];
    var position = Math.max(0, Math.min(Number(targetIndex) || 0, items.length));
    items.splice(position, 0, moved);
    return touchMemo(normalized, items, options);
  }

  function updateTitle(memo, title, options) {
    var normalized = normalizeMemo(memo) || createMemo("");
    return touchMemo(normalized, normalized.items.slice(), options, title);
  }

  function numberedItems(memo) {
    var normalized = normalizeMemo(memo) || createMemo("");
    return normalized.items.filter(function (item) { return cleanText(item.text); }).map(function (item, index) {
      return { id: item.id, text: cleanText(item.text), number: index + 1 };
    });
  }

  function suggestTerms(query) {
    var normalized = cleanText(query).toLowerCase();
    if (!normalized) return [];
    var direct = SEARCH_SYNONYMS[normalized];
    if (direct) return direct.slice();
    var key = Object.keys(SEARCH_SYNONYMS).find(function (candidate) {
      return SEARCH_SYNONYMS[candidate].some(function (term) { return term.toLowerCase() === normalized; });
    });
    return key ? [key].concat(SEARCH_SYNONYMS[key].filter(function (term) { return term.toLowerCase() !== normalized; })) : [];
  }

  function overlapScore(query, haystack) {
    var chars = Array.from(new Set(cleanText(query).replace(/\s/g, "")));
    if (chars.length < 2) return 0;
    var matched = chars.filter(function (char) { return haystack.indexOf(char) >= 0; }).length;
    return matched / chars.length;
  }

  function searchMemos(memos, query) {
    var normalizedQuery = cleanText(query).toLowerCase();
    var safeMemos = normalizeMemos(memos);
    if (!normalizedQuery) return safeMemos.map(function (memo) {
      return { memo: memo, score: 0, matchType: "all", reason: "全部笔记" };
    });
    var synonyms = suggestTerms(normalizedQuery);
    return safeMemos.map(function (memo) {
      var title = memo.title.toLowerCase();
      var itemText = numberedItems(memo).map(function (item) { return item.text.toLowerCase(); }).join(" ");
      var haystack = title + " " + itemText;
      if (title.indexOf(normalizedQuery) >= 0) return { memo: memo, score: 400, matchType: "title", reason: "标题命中" };
      if (itemText.indexOf(normalizedQuery) >= 0) return { memo: memo, score: 300, matchType: "item", reason: "事项命中" };
      var matchedTerms = synonyms.filter(function (term) { return haystack.indexOf(term.toLowerCase()) >= 0; });
      if (matchedTerms.length) {
        return { memo: memo, score: 200 + matchedTerms.length, matchType: "synonym", reason: "联想词：" + matchedTerms.join("/") };
      }
      var overlap = overlapScore(normalizedQuery, haystack);
      if (overlap >= 0.6) return { memo: memo, score: 100 + Math.round(overlap * 10), matchType: "fuzzy", reason: "模糊关联" };
      return null;
    }).filter(Boolean).sort(function (a, b) {
      return b.score - a.score || new Date(b.memo.updatedAt) - new Date(a.memo.updatedAt);
    });
  }

  global.MindPulseMemoModel = Object.freeze({
    SEARCH_SYNONYMS: SEARCH_SYNONYMS,
    createMemo: createMemo,
    normalizeMemo: normalizeMemo,
    normalizeMemos: normalizeMemos,
    insertItem: insertItem,
    updateItem: updateItem,
    removeItem: removeItem,
    moveItem: moveItem,
    updateTitle: updateTitle,
    numberedItems: numberedItems,
    suggestTerms: suggestTerms,
    searchMemos: searchMemos
  });
})(globalThis);
