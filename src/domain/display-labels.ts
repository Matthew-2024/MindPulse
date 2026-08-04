export const actionLabels: Record<string, string> = {
  help: "联系支持",
  checkin: "补充记录",
  ask: "补充记录",
  light_intervention: "做一个小行动",
  contact_support: "联系一个人",
  breathe: "呼吸放松",
  walk: "走动十分钟",
  journal: "写下最重的一件事",
  sleep: "为今晚留点恢复时间",
  focus: "专心做一件小事",
  friend: "联系可信任的人",
  self_check: "再次记录状态",
  ordinary_intervention: "普通行动"
};

export const modeLabels: Record<string, string> = {
  help: "先求助",
  ask: "先补充记录",
  action: "可以先做小事"
};

export const reasonLabels: Record<string, string> = {
  DATA_INSUFFICIENT: "记录还不够",
  BASELINE_DEVIATION: "和你平时不太一样",
  LOW_SLEEP_REPEATED: "最近几次睡得比较少",
  LOW_CONNECTION_REPEATED: "最近几次不太想和人联系",
  NEGATIVE_MOOD_REPEATED: "最近几次心情都比较沉",
  TEXT_CRISIS_SIGNAL: "文字里出现了危险提示",
  SAFETY_HOLD: "之前的求助提醒还在",
  SINGLE_WAVE: "一次短暂波动",
  STABLE_BASELINE: "和你平时差不多"
};

export function actionLabel(action: string) {
  return actionLabels[action] || action;
}

export function modeLabel(mode: string) {
  return modeLabels[mode] || mode;
}

export function reasonLabel(code: string) {
  return reasonLabels[code] || code;
}
