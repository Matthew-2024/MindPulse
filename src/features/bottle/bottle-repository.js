(function (global) {
  "use strict";

  var SEA_KEY = "mindpulse:bottleSea";
  var DEMO_BOTTLES = Object.freeze([
    { id: "demo_bottle_1", ownerId: "demo-sea-1", alias: "匿名同学 07", content: "最近在准备比赛，明明做了很多还是担心不够好。", createdAt: "2026-07-24T12:00:00.000Z", demo: true },
    { id: "demo_bottle_2", ownerId: "demo-sea-2", alias: "匿名同学 12", content: "论文进度有点慢，今晚想先完成最小的一段。", createdAt: "2026-07-25T10:00:00.000Z", demo: true },
    { id: "demo_bottle_3", ownerId: "demo-sea-3", alias: "匿名同学 19", content: "这周睡得不太稳，希望有人提醒我不用一次解决所有事。", createdAt: "2026-07-26T08:00:00.000Z", demo: true }
  ]);

  function cleanText(value, maxLength) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, maxLength || 600);
  }

  function safeRead(storage, key) {
    try {
      var parsed = JSON.parse(storage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function safeWrite(storage, key, value) {
    storage.setItem(key, JSON.stringify(value));
  }

  function makeId(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function normalizeBottle(value) {
    if (!value || typeof value !== "object") return null;
    var content = cleanText(value.content);
    if (!content) return null;
    return {
      id: cleanText(value.id, 80) || makeId("bottle"),
      ownerId: cleanText(value.ownerId, 80),
      alias: cleanText(value.alias, 30) || "匿名同学",
      content: content,
      createdAt: cleanText(value.createdAt, 40) || new Date().toISOString(),
      demo: Boolean(value.demo)
    };
  }

  function createLocalBottleRepository(storage, rawOptions) {
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
      throw new TypeError("A storage adapter with getItem/setItem is required");
    }
    var options = rawOptions || {};
    var random = typeof options.random === "function" ? options.random : Math.random;
    var now = typeof options.now === "function" ? options.now : function () { return new Date().toISOString(); };

    function seaBottles() {
      return safeRead(storage, SEA_KEY).map(normalizeBottle).filter(Boolean);
    }

    function allBottles() {
      return DEMO_BOTTLES.map(function (item) { return Object.assign({}, item); }).concat(seaBottles());
    }

    function listOwnBottles(profileId) {
      var id = cleanText(profileId, 80);
      return seaBottles().filter(function (bottle) { return bottle.ownerId === id; }).sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    function createBottle(profileId, content) {
      var ownerId = cleanText(profileId, 80);
      var cleanContent = cleanText(content);
      if (!ownerId || !cleanContent) return null;
      var bottle = {
        id: makeId("bottle"),
        ownerId: ownerId,
        alias: "匿名同学",
        content: cleanContent,
        createdAt: now(),
        demo: false
      };
      var sea = seaBottles();
      sea.push(bottle);
      safeWrite(storage, SEA_KEY, sea);
      return Object.assign({}, bottle);
    }

    function drawBottle(profileId) {
      var ownerId = cleanText(profileId, 80);
      var candidates = allBottles().filter(function (bottle) { return bottle.ownerId !== ownerId; });
      if (!candidates.length) return null;
      var index = Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)));
      return Object.assign({}, candidates[index]);
    }

    function findBottle(bottleId) {
      var id = cleanText(bottleId, 80);
      return allBottles().find(function (bottle) { return bottle.id === id; }) || null;
    }

    function repliesKey(ownerId) {
      return "mindpulse:" + ownerId + ":bottleReplies";
    }

    function replyToBottle(profileId, bottleId, content) {
      var senderId = cleanText(profileId, 80);
      var cleanContent = cleanText(content);
      var bottle = findBottle(bottleId);
      if (!senderId || !cleanContent || !bottle || bottle.ownerId === senderId) return null;
      var reply = {
        id: makeId("reply"),
        bottleId: bottle.id,
        senderId: senderId,
        alias: "匿名回应者",
        content: cleanContent,
        createdAt: now()
      };
      var key = repliesKey(bottle.ownerId);
      var replies = safeRead(storage, key);
      replies.push(reply);
      safeWrite(storage, key, replies);
      return Object.assign({}, reply, { senderId: undefined });
    }

    function listRepliesForOwnBottle(profileId, bottleId) {
      var ownerId = cleanText(profileId, 80);
      var bottle = findBottle(bottleId);
      if (!bottle || bottle.ownerId !== ownerId) return [];
      return safeRead(storage, repliesKey(ownerId)).filter(function (reply) {
        return reply && reply.bottleId === bottle.id && cleanText(reply.content);
      }).map(function (reply) {
        return {
          id: cleanText(reply.id, 80),
          bottleId: bottle.id,
          alias: "匿名回应者",
          content: cleanText(reply.content),
          createdAt: cleanText(reply.createdAt, 40)
        };
      });
    }

    return Object.freeze({
      listOwnBottles: listOwnBottles,
      createBottle: createBottle,
      drawBottle: drawBottle,
      replyToBottle: replyToBottle,
      listRepliesForOwnBottle: listRepliesForOwnBottle
    });
  }

  global.MindPulseBottleRepository = Object.freeze({
    DEMO_BOTTLES: DEMO_BOTTLES,
    createLocalBottleRepository: createLocalBottleRepository
  });
})(globalThis);
