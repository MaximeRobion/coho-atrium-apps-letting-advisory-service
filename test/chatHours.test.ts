import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CHAT_HOURS_SUMMARY,
  getChatHoursStatus,
  getLondonDayName,
  getNextOpenText,
  isChatOpen,
} from '../src/chatHours.js';

/**
 * Build an instant whose Europe/London wall clock matches the given local parts.
 * Works across host timezones (same trick as the hours helper).
 */
function atLondon(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i += 1) {
    const wall = new Date(
      new Date(utc).toLocaleString('en-US', { timeZone: 'Europe/London' }),
    );
    const wanted = Date.UTC(year, month - 1, day, hour, minute, 0);
    const got = Date.UTC(
      wall.getFullYear(),
      wall.getMonth(),
      wall.getDate(),
      wall.getHours(),
      wall.getMinutes(),
      0,
    );
    utc += wanted - got;
  }
  return new Date(utc);
}

test('schedule summary matches Julie site footer copy', () => {
  assert.equal(CHAT_HOURS_SUMMARY.weekdays, 'Mon-Fri: 10:00-16:00');
  assert.equal(CHAT_HOURS_SUMMARY.saturday, 'Sat: 10:00-13:00');
  assert.equal(CHAT_HOURS_SUMMARY.sunday, 'Sun: Closed');
});

test('weekday: closed before 10:00 London', () => {
  // Thu 29 Oct 2026 — GMT (winter)
  const before = atLondon(2026, 10, 29, 9, 59);
  assert.equal(getLondonDayName(before), 'Thursday');
  assert.equal(isChatOpen(before), false);
  const status = getChatHoursStatus(before);
  assert.equal(status.isOpen, false);
  assert.equal(status.statusText, "We're offline");
  assert.equal(status.nextChangeText, 'opens today at 10:00');
});

test('weekday: open from 10:00 inclusive until 16:00 exclusive', () => {
  const open = atLondon(2026, 10, 29, 10, 0);
  assert.equal(isChatOpen(open), true);
  assert.match(getChatHoursStatus(open).nextChangeText, /^closes at 16:00$/);

  const mid = atLondon(2026, 10, 29, 12, 30);
  assert.equal(isChatOpen(mid), true);

  const lastMinute = atLondon(2026, 10, 29, 15, 59);
  assert.equal(isChatOpen(lastMinute), true);

  const closed = atLondon(2026, 10, 29, 16, 0);
  assert.equal(isChatOpen(closed), false);
  assert.equal(
    getChatHoursStatus(closed).nextChangeText,
    'opens tomorrow at 10:00',
  );
});

test('Saturday: open 10:00–13:00 London', () => {
  const satMorning = atLondon(2026, 10, 31, 9, 59);
  assert.equal(getLondonDayName(satMorning), 'Saturday');
  assert.equal(isChatOpen(satMorning), false);

  const satOpen = atLondon(2026, 10, 31, 10, 0);
  assert.equal(isChatOpen(satOpen), true);
  assert.equal(getChatHoursStatus(satOpen).nextChangeText, 'closes at 13:00');

  const satClosed = atLondon(2026, 10, 31, 13, 0);
  assert.equal(isChatOpen(satClosed), false);
  // Next open is Monday (Sunday closed)
  assert.equal(
    getChatHoursStatus(satClosed).nextChangeText,
    'opens Monday at 10:00',
  );
});

test('Sunday: closed; next open is Monday', () => {
  const sunday = atLondon(2026, 11, 1, 12, 0);
  assert.equal(getLondonDayName(sunday), 'Sunday');
  assert.equal(isChatOpen(sunday), false);
  assert.equal(getNextOpenText(sunday), 'tomorrow at 10:00');
  assert.equal(
    getChatHoursStatus(sunday).nextChangeText,
    'opens tomorrow at 10:00',
  );
});

test('Friday after close opens Saturday (not Monday)', () => {
  const fridayEve = atLondon(2026, 10, 30, 17, 0);
  assert.equal(getLondonDayName(fridayEve), 'Friday');
  assert.equal(isChatOpen(fridayEve), false);
  assert.equal(
    getChatHoursStatus(fridayEve).nextChangeText,
    'opens tomorrow at 10:00',
  );
});

test('BST summer weekday still uses London wall clock', () => {
  // Wed 15 Jul 2026 — BST (UTC+1)
  const before = atLondon(2026, 7, 15, 9, 59);
  assert.equal(isChatOpen(before), false);
  const open = atLondon(2026, 7, 15, 10, 0);
  assert.equal(isChatOpen(open), true);
  const closed = atLondon(2026, 7, 15, 16, 0);
  assert.equal(isChatOpen(closed), false);
});
