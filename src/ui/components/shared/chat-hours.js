/* Chat hours helper — keep in sync with src/chatHours.ts.
   Mirrors https://lettingsadviceservice.co.uk/livechat (Europe/London).
   Uses Intl parts so host timezone does not skew HH:mm labels. */

var CHAT_HOURS_TIME_ZONE = 'Europe/London';
var CHAT_HOURS_SCHEDULE = {
  Monday: { open: '10:00', close: '16:00' },
  Tuesday: { open: '10:00', close: '16:00' },
  Wednesday: { open: '10:00', close: '16:00' },
  Thursday: { open: '10:00', close: '16:00' },
  Friday: { open: '10:00', close: '16:00' },
  Saturday: { open: '10:00', close: '13:00' },
  Sunday: null,
};
var CHAT_HOURS_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
var CHAT_HOURS_SUMMARY = {
  weekdays: 'Mon-Fri: 10:00-16:00',
  saturday: 'Sat: 10:00-13:00',
  sunday: 'Sun: Closed',
};

function chatHoursParseHm(value) {
  var parts = value.split(':');
  return { hours: Number(parts[0]), minutes: Number(parts[1]) };
}

function chatHoursMinutes(hours, minutes) {
  return hours * 60 + minutes;
}

function getLondonWallParts(now) {
  var fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: CHAT_HOURS_TIME_ZONE,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  var parts = {};
  fmt.formatToParts(now).forEach(function (part) {
    parts[part.type] = part.value;
  });
  var dayName = parts.weekday;
  var dayIndex = CHAT_HOURS_DAY_NAMES.indexOf(dayName);
  return {
    dayName: dayName,
    dayIndex: dayIndex >= 0 ? dayIndex : 0,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function getChatHoursStatus(now) {
  if (typeof FORCE_CHAT_OPEN !== 'undefined' && FORCE_CHAT_OPEN) {
    return {
      isOpen: true,
      statusText: "We're online now",
      nextChangeText: 'dev force-open',
    };
  }

  var instant = now || new Date();
  var wall = getLondonWallParts(instant);
  var hours = CHAT_HOURS_SCHEDULE[wall.dayName];
  var currentMins = chatHoursMinutes(wall.hour, wall.minute);

  if (hours) {
    var open = chatHoursParseHm(hours.open);
    var close = chatHoursParseHm(hours.close);
    var openMins = chatHoursMinutes(open.hours, open.minutes);
    var closeMins = chatHoursMinutes(close.hours, close.minutes);
    if (currentMins >= openMins && currentMins < closeMins) {
      return {
        isOpen: true,
        statusText: "We're online now",
        nextChangeText: 'closes at ' + hours.close,
      };
    }
  }

  var nextOpen = null;
  if (hours) {
    var todayOpen = chatHoursParseHm(hours.open);
    var todayOpenMins = chatHoursMinutes(todayOpen.hours, todayOpen.minutes);
    if (currentMins < todayOpenMins) {
      nextOpen = 'today at ' + hours.open;
    }
  }

  if (!nextOpen) {
    for (var offset = 1; offset <= 7; offset += 1) {
      var nextIndex = (wall.dayIndex + offset) % 7;
      var nextName = CHAT_HOURS_DAY_NAMES[nextIndex];
      var nextHours = CHAT_HOURS_SCHEDULE[nextName];
      if (!nextHours) continue;
      var label = offset === 1 ? 'tomorrow' : nextName;
      nextOpen = label + ' at ' + nextHours.open;
      break;
    }
  }

  return {
    isOpen: false,
    statusText: "We're offline",
    nextChangeText: nextOpen ? 'opens ' + nextOpen : '',
  };
}
