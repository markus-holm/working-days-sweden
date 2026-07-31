/**
 * swedish-holidays.js
 * Calculates Swedish public holidays and traditional free days for any year.
 * No dependencies. Works in browser and Node.js.
 *
 * Usage:
 *   const { getHolidays, isHoliday, getHolidayName } = SwedishHolidays;
 *
 *   getHolidays(2026)
 *   // => [ { date: "2026-01-01", name: "Nyårsdagen", type: "public" }, ... ]
 *
 *   isHoliday("2026-12-25")   // => true
 *   isHoliday("2026-12-27")   // => false
 *
 *   getHolidayName("2026-06-06")  // => "Nationaldagen"
 *   getHolidayName("2026-07-01")  // => null
 */

var SwedishHolidays = (function () {

  // ─── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Format a Date as "YYYY-MM-DD".
   * @param {Date} date
   * @returns {string}
   */
  function toDateString(date) {
    var y  = date.getFullYear();
    var m  = String(date.getMonth() + 1).padStart("2", "0");
    var d  = String(date.getDate()).padStart("2", "0");
    return y + "-" + m + "-" + d;
  }

  /**
   * Add (or subtract) a number of days to a Date.
   * @param {Date}   date
   * @param {number} days  Positive = forward, negative = backward.
   * @returns {Date}
   */
  function addDays(date, days) {
    return new Date(date.getTime() + days * 86400000);
  }

  // ─── Easter (Meeus / Jones / Butcher algorithm) ───────────────────────────

  /**
   * Calculate Easter Sunday for a given year.
   * Works for all years in the Gregorian calendar (1583–).
   *
   * Algorithm: Meeus/Jones/Butcher
   * Reference: https://en.wikipedia.org/wiki/Date_of_Easter#Anonymous_Gregorian_algorithm
   *
   * @param {number} year  Four-digit year, e.g. 2026.
   * @returns {Date}       Easter Sunday at midnight local time.
   */
  function easterSunday(year) {
    var a  = year % 19;
    var b  = Math.floor(year / 100);
    var c  = year % 100;
    var d  = Math.floor(b / 4);
    var e  = b % 4;
    var f  = Math.floor((b + 8) / 25);
    var g  = Math.floor((b - f + 1) / 3);
    var h  = (19 * a + b - d - g + 15) % 30;
    var i  = Math.floor(c / 4);
    var k  = c % 4;
    var l  = (32 + 2 * e + 2 * i - h - k) % 7;
    var m  = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);      // 1-based
    var day   = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  // ─── Moveable date finders ────────────────────────────────────────────────

  /**
   * Midsommarafton = the Friday between June 19–25.
   * @param {number} year
   * @returns {Date}
   */
  function midsommarafton(year) {
    for (var d = 19; d <= 25; d++) {
      var dt = new Date(year, 5, d);          // month 5 = June (0-based)
      if (dt.getDay() === 5) return dt;       // 5 = Friday
    }
  }

  /**
   * Alla helgons dag = the Saturday between October 31 – November 6.
   * @param {number} year
   * @returns {Date}
   */
  function allaHelgonsdag(year) {
    for (var d = 31; d <= 37; d++) {
      var month = d > 31 ? 10 : 9;           // 9 = Oct, 10 = Nov (0-based)
      var day   = d > 31 ? d - 31 : d;
      var dt    = new Date(year, month, day);
      if (dt.getDay() === 6) return dt;       // 6 = Saturday
    }
  }

  // ─── Main export: getHolidays ─────────────────────────────────────────────

  /**
   * Return all Swedish public holidays and traditional free days for a year.
   *
   * Types:
   *   "public"      – Röd dag (official public holiday, Lag om allmänna helgdagar).
   *   "traditional" – Traditionally free at most workplaces (Julafton, Nyårsafton,
   *                   Midsommarafton) but not legally mandated as public holidays.
   *
   * @param {number} year  Four-digit year.
   * @returns {Array<{date: string, name: string, type: string}>}
   *          Sorted ascending by date.
   */
  function getHolidays(year) {
    var easter = easterSunday(year);
    var mid    = midsommarafton(year);
    var ah     = allaHelgonsdag(year);

    var days = [
      // ── Fixed public holidays ────────────────────────────────────────────
      { date: year + "-01-01", name: "Nyårsdagen",             type: "public" },
      { date: year + "-01-06", name: "Trettondagen",           type: "public" },
      { date: year + "-05-01", name: "Första maj",             type: "public" },
      { date: year + "-06-06", name: "Nationaldagen",          type: "public" },
      { date: year + "-12-25", name: "Juldagen",               type: "public" },
      { date: year + "-12-26", name: "Annandag jul",           type: "public" },

      // ── Easter-relative public holidays ──────────────────────────────────
      // Långfredagen:        Easter − 2 days
      { date: toDateString(addDays(easter, -2)),  name: "Långfredagen",           type: "public" },
      // Påskdagen:           Easter Sunday itself
      { date: toDateString(easter),               name: "Påskdagen",              type: "public" },
      // Annandag påsk:       Easter + 1 day (Easter Monday)
      { date: toDateString(addDays(easter,  1)),  name: "Annandag påsk",          type: "public" },
      // Kristi himmelsfärdsdag: Easter + 39 days (always a Thursday)
      { date: toDateString(addDays(easter, 39)),  name: "Kristi himmelsfärdsdag", type: "public" },
      // Pingstdagen:         Easter + 49 days (Whit Sunday)
      { date: toDateString(addDays(easter, 49)),  name: "Pingstdagen",            type: "public" },

      // ── Moveable public holidays ──────────────────────────────────────────
      // Midsommardagen: Saturday after Midsommarafton
      { date: toDateString(addDays(mid, 1)),  name: "Midsommardagen",   type: "public" },
      // Alla helgons dag: Saturday Oct 31 – Nov 6
      { date: toDateString(ah),               name: "Alla helgons dag", type: "public" },

      // ── Traditional free days (not legally public holidays) ───────────────
      // Midsommarafton: Friday, treated as free day at most workplaces
      { date: toDateString(mid),          name: "Midsommarafton", type: "traditional" },
      // Julafton: December 24
      { date: year + "-12-24",            name: "Julafton",       type: "traditional" },
      // Nyårsafton: December 31
      { date: year + "-12-31",            name: "Nyårsafton",     type: "traditional" },
    ];

    // Sort ascending by date string (ISO format sorts lexicographically)
    days.sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });

    return days;
  }

  // ─── Convenience helpers ──────────────────────────────────────────────────

  /**
   * Check if a given date is a holiday (public or traditional).
   * @param {string} dateString  "YYYY-MM-DD"
   * @returns {boolean}
   */
  function isHoliday(dateString) {
    var year     = parseInt(dateString.split("-")[0], 10);
    var holidays = getHolidays(year);
    return holidays.some(function (h) { return h.date === dateString; });
  }

  /**
   * Get the name of the holiday on a given date, or null if not a holiday.
   * @param {string} dateString  "YYYY-MM-DD"
   * @returns {string|null}
   */
  function getHolidayName(dateString) {
    var year     = parseInt(dateString.split("-")[0], 10);
    var holidays = getHolidays(year);
    var found    = holidays.find(function (h) { return h.date === dateString; });
    return found ? found.name : null;
  }

  /**
   * Check if a given date is a working day.
   * A day is a working day if it is:
   *   - Monday through Friday, AND
   *   - Not a public or traditional holiday.
   *
   * @param {string} dateString  "YYYY-MM-DD"
   * @returns {boolean}
   */
  function isWorkday(dateString) {
    var parts = dateString.split("-");
    var date  = new Date(+parts[0], +parts[1] - 1, +parts[2], 12);
    var dow   = date.getDay();                         // 0=Sun … 6=Sat
    if (dow === 0 || dow === 6) return false;          // weekend
    return !isHoliday(dateString);
  }

  /**
   * Count working days in a month.
   * @param {number} year   Four-digit year.
   * @param {number} month  1-based month (1 = January, 12 = December).
   * @returns {number}
   */
  function countWorkdaysInMonth(year, month) {
    var daysInMonth = new Date(year, month, 0).getDate();   // month is 1-based so this works
    var count = 0;
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = year + "-" + String(month).padStart("2", "0") + "-" + String(d).padStart("2", "0");
      if (isWorkday(dateStr)) count++;
    }
    return count;
  }

  /**
   * Count working days between two dates (inclusive).
   * @param {string} fromDate  "YYYY-MM-DD"
   * @param {string} toDate    "YYYY-MM-DD"
   * @returns {number}
   */
  function countWorkdaysBetween(fromDate, toDate) {
    var parts = fromDate.split("-");
    var cur   = new Date(+parts[0], +parts[1] - 1, +parts[2], 12);
    var end   = new Date(toDate + "T12:00:00");
    var count = 0;
    while (cur <= end) {
      if (isWorkday(toDateString(cur))) count++;
      cur = addDays(cur, 1);
    }
    return count;
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return {
    /** Return all holidays for a year. */
    getHolidays:           getHolidays,
    /** Return true if the date is a holiday. */
    isHoliday:             isHoliday,
    /** Return holiday name or null. */
    getHolidayName:        getHolidayName,
    /** Return true if the date is a regular working day. */
    isWorkday:             isWorkday,
    /** Count working days in a given month. */
    countWorkdaysInMonth:  countWorkdaysInMonth,
    /** Count working days between two dates (inclusive). */
    countWorkdaysBetween:  countWorkdaysBetween,
    /** Exposed for unit testing. */
    _easterSunday:         easterSunday,
  };

})();

// ─── Node.js / CommonJS export ────────────────────────────────────────────────
if (typeof module !== "undefined" && module.exports) {
  module.exports = SwedishHolidays;
}
