import type { MindPulseRecord } from "./types";

export interface ReportValue {
  value: number | null;
  state: "present" | "missing";
}

export interface NaturalDayReport {
  key: string;
  label: string;
  records: MindPulseRecord[];
  sleep: ReportValue;
  social: ReportValue;
}

function localKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function reportValue(values: number[]): ReportValue {
  const value = average(values);
  return { value, state: value === null ? "missing" : "present" };
}

export function aggregateNaturalDays(records: MindPulseRecord[] = [], now = new Date(), days = 7): NaturalDayReport[] {
  const groups = new Map<string, MindPulseRecord[]>();
  records.forEach((record) => {
    const timestamp = new Date(record.createdAt || "");
    if (Number.isNaN(timestamp.getTime())) return;
    const key = localKey(timestamp);
    groups.set(key, [...(groups.get(key) || []), record]);
  });
  const result: NaturalDayReport[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = localKey(date);
    const dayRecords = groups.get(key) || [];
    const sleep = dayRecords.map((record) => Number(record.sleepHours)).filter(Number.isFinite);
    const social = dayRecords.map((record) => Number(record.socialScore)).filter(Number.isFinite);
    result.push({
      key,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      records: dayRecords,
      sleep: reportValue(sleep),
      social: reportValue(social)
    });
  }
  return result;
}
