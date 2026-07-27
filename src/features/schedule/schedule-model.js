(function (global) {
  "use strict";

  function cleanText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function makeId() {
    return "schedule_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function validDate(value) {
    if (!value) return null;
    var date = value instanceof Date ? new Date(value) : new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function startOfLocalDay(value) {
    var date = validDate(value) || new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function dateKey(value) {
    var date = validDate(value);
    if (!date) return "";
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function startOfWeek(value) {
    var date = startOfLocalDay(value);
    var offset = date.getDay() === 0 ? -6 : 1 - date.getDay();
    date.setDate(date.getDate() + offset);
    return date;
  }

  function parseLocalDue(dueDate, dueTime) {
    var match = String(dueDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    var timeMatch = String(dueTime || "23:59").match(/^(\d{1,2}):(\d{2})$/);
    var hours = timeMatch ? Math.min(23, Math.max(0, Number(timeMatch[1]))) : 23;
    var minutes = timeMatch ? Math.min(59, Math.max(0, Number(timeMatch[2]))) : 59;
    var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hours, minutes, 0, 0);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }

  function createScheduleItem(input, options) {
    input = input || {};
    options = options || {};
    var now = options.now || new Date().toISOString();
    var dueAt = input.dueAt && validDate(input.dueAt) ? new Date(input.dueAt).toISOString() : parseLocalDue(input.dueDate, input.dueTime);
    return {
      id: cleanText(options.id || input.id) || makeId(),
      title: cleanText(input.title) || "未命名待办",
      note: cleanText(input.note),
      dueAt: dueAt,
      done: Boolean(input.done),
      createdAt: cleanText(input.createdAt) || now,
      updatedAt: now
    };
  }

  function normalizeItem(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    var due = validDate(item.dueAt);
    var now = new Date().toISOString();
    return {
      id: cleanText(item.id) || makeId(),
      title: cleanText(item.title) || "未命名待办",
      note: cleanText(item.note),
      dueAt: due ? due.toISOString() : null,
      done: Boolean(item.done),
      createdAt: cleanText(item.createdAt) || now,
      updatedAt: cleanText(item.updatedAt) || cleanText(item.createdAt) || now
    };
  }

  function normalizeItems(items) {
    return (Array.isArray(items) ? items : []).map(normalizeItem).filter(Boolean).sort(function (a, b) {
      if (!a.dueAt && !b.dueAt) return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt) - new Date(b.dueAt);
    });
  }

  function itemsInRange(items, from, days, options) {
    var start = startOfLocalDay(from);
    var span = Math.max(1, Number(days) || 1);
    var end = new Date(start);
    end.setDate(end.getDate() + span - 1);
    end.setHours(23, 59, 59, 999);
    var includeUndated = options && options.includeUndated;
    return normalizeItems(items).filter(function (item) {
      if (item.done) return false;
      if (!item.dueAt) return Boolean(includeUndated);
      var due = new Date(item.dueAt);
      return due >= start && due <= end;
    });
  }

  function groupItems(items, view, anchor) {
    var normalized = normalizeItems(items);
    if (view === "week") {
      var monday = startOfWeek(anchor);
      return Array.from({ length: 7 }, function (_, index) {
        var day = new Date(monday);
        day.setDate(day.getDate() + index);
        var key = dateKey(day);
        return { key: key, label: key, date: day.toISOString(), items: normalized.filter(function (item) { return dateKey(item.dueAt) === key; }) };
      });
    }
    var grouped = {};
    normalized.forEach(function (item) {
      if (!item.dueAt) return;
      var key = view === "year" ? dateKey(item.dueAt).slice(0, 4) : dateKey(item.dueAt).slice(0, 7);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return Object.keys(grouped).sort().map(function (key) { return { key: key, label: key, items: grouped[key] }; });
  }

  function upsertItem(items, nextItem) {
    var normalized = normalizeItems(items);
    var item = normalizeItem(nextItem);
    if (!item) return normalized;
    var index = normalized.findIndex(function (candidate) { return candidate.id === item.id; });
    if (index >= 0) normalized[index] = item;
    else normalized.push(item);
    return normalizeItems(normalized);
  }

  global.MindPulseScheduleModel = Object.freeze({
    createScheduleItem: createScheduleItem,
    normalizeItems: normalizeItems,
    itemsInRange: itemsInRange,
    groupItems: groupItems,
    upsertItem: upsertItem,
    startOfLocalDay: startOfLocalDay,
    startOfWeek: startOfWeek,
    dateKey: dateKey
  });
})(globalThis);
