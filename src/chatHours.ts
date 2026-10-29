/**
 * Live-chat opening hours for the Atrium Chat tab.
 *
 * Hard-coded to match https://lettingsadviceservice.co.uk/livechat
 * (Europe/London). This can drift from Julie's Tawk Widget Scheduler —
 * the Chat UI also treats Tawk `offline` status as out-of-hours.
 *
 * Keep `src/ui/components/shared/chat-hours.js` in sync with this module.
 */

export const CHAT_HOURS_TIME_ZONE = 'Europe/London';

export type ChatDayName =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export interface ChatDayHours {
  open: string;
  close: string;
}

/** Null means closed all day. Times are HH:mm in Europe/London. */
export const CHAT_HOURS_SCHEDULE: Record<ChatDayName, ChatDayHours | null> = {
  Monday: { open: '10:00', close: '16:00' },
  Tuesday: { open: '10:00', close: '16:00' },
  Wednesday: { open: '10:00', close: '16:00' },
  Thursday: { open: '10:00', close: '16:00' },
  Friday: { open: '10:00', close: '16:00' },
  Saturday: { open: '10:00', close: '13:00' },
  Sunday: null,
};

export const CHAT_HOURS_DAY_NAMES: ChatDayName[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const CHAT_HOURS_SUMMARY = {
  weekdays: 'Mon-Fri: 10:00-16:00',
  saturday: 'Sat: 10:00-13:00',
  sunday: 'Sun: Closed',
} as const;

export interface ChatHoursStatus {
  isOpen: boolean;
  statusText: string;
  /** e.g. "closes at 16:00" or "opens tomorrow at 10:00" (empty when unknown). */
  nextChangeText: string;
}

export interface LondonWallParts {
  dayName: ChatDayName;
  dayIndex: number;
  hour: number;
  minute: number;
}

function parseHm(value: string): { hours: number; minutes: number } {
  const [hours, minutes] = value.split(':').map(Number);
  return { hours, minutes };
}

function minutesSinceMidnight(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

/** Read Europe/London weekday + clock via Intl (host-timezone safe). */
export function getLondonWallParts(now: Date = new Date()): LondonWallParts {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: CHAT_HOURS_TIME_ZONE,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((part) => [part.type, part.value]),
  );
  const dayName = parts.weekday as ChatDayName;
  const dayIndex = CHAT_HOURS_DAY_NAMES.indexOf(dayName);
  return {
    dayName,
    dayIndex: dayIndex >= 0 ? dayIndex : 0,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function getLondonDayName(now: Date = new Date()): ChatDayName {
  return getLondonWallParts(now).dayName;
}

export function isChatOpen(now: Date = new Date()): boolean {
  const wall = getLondonWallParts(now);
  const hours = CHAT_HOURS_SCHEDULE[wall.dayName];
  if (!hours) return false;

  const current = minutesSinceMidnight(wall.hour, wall.minute);
  const open = parseHm(hours.open);
  const close = parseHm(hours.close);
  const openMins = minutesSinceMidnight(open.hours, open.minutes);
  const closeMins = minutesSinceMidnight(close.hours, close.minutes);
  return current >= openMins && current < closeMins;
}

/**
 * Human-readable next open, matching Julie's site wording:
 * "today at 10:00" | "tomorrow at 10:00" | "Monday at 10:00"
 */
export function getNextOpenText(now: Date = new Date()): string | null {
  const wall = getLondonWallParts(now);
  const currentMins = minutesSinceMidnight(wall.hour, wall.minute);
  const todayHours = CHAT_HOURS_SCHEDULE[wall.dayName];

  if (todayHours) {
    const open = parseHm(todayHours.open);
    const openMins = minutesSinceMidnight(open.hours, open.minutes);
    if (currentMins < openMins) {
      return `today at ${todayHours.open}`;
    }
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const nextIndex = (wall.dayIndex + offset) % 7;
    const nextName = CHAT_HOURS_DAY_NAMES[nextIndex]!;
    const nextHours = CHAT_HOURS_SCHEDULE[nextName];
    if (!nextHours) continue;
    const label = offset === 1 ? 'tomorrow' : nextName;
    return `${label} at ${nextHours.open}`;
  }

  return null;
}

export function getChatHoursStatus(now: Date = new Date()): ChatHoursStatus {
  if (isChatOpen(now)) {
    const wall = getLondonWallParts(now);
    const hours = CHAT_HOURS_SCHEDULE[wall.dayName];
    return {
      isOpen: true,
      statusText: "We're online now",
      nextChangeText: hours ? `closes at ${hours.close}` : '',
    };
  }

  const nextOpen = getNextOpenText(now);
  return {
    isOpen: false,
    statusText: "We're offline",
    nextChangeText: nextOpen ? `opens ${nextOpen}` : '',
  };
}
