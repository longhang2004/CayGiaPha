const PI = Math.PI;

export function jdFromDate(dd: number, mm: number, yy: number): number {
  let a = Math.floor((14 - mm) / 12);
  let y = yy + 4800 - a;
  let m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

export function jdToDate(jd: number): [number, number, number] {
  let a, b, c;
  if (jd > 2299160) {
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor(b * 146097 / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  let d = Math.floor((4 * c + 3) / 1461);
  let e = c - Math.floor(1461 * d / 4);
  let m = Math.floor((5 * e + 2) / 153);
  let day = e - Math.floor((153 * m + 2) / 5) + 1;
  let month = m + 3 - 12 * Math.floor(m / 10);
  let year = b * 100 + d - 4800 + Math.floor(m / 10);
  return [day, month, year];
}

function sunLongitude(jdn: number): number {
  let julianTime = (jdn - 2451545.0) / 36525;
  let squareJulianTime = julianTime * julianTime;
  let dr = PI / 180;
  let meanAnomaly = 357.52910 + 35999.05030 * julianTime - 0.0001559 * squareJulianTime - 0.00000048 * julianTime * squareJulianTime;
  let meanLongitude = 280.46645 + 36000.76983 * julianTime + 0.0003032 * squareJulianTime;
  let dl = (1.914600 - 0.004817 * julianTime - 0.000014 * squareJulianTime) * Math.sin(dr * meanAnomaly);
  dl += (0.019993 - 0.000101 * julianTime) * Math.sin(dr * 2 * meanAnomaly) + 0.000290 * Math.sin(dr * 3 * meanAnomaly);
  let trueLongitude = meanLongitude + dl;
  trueLongitude -= 360 * Math.floor(trueLongitude / 360);
  return trueLongitude;
}

function newMoon(k: number): number {
  let julianTime = k / 1236.85;
  let squareJulianTime = julianTime * julianTime;
  let cubicJulianTime = squareJulianTime * julianTime;
  let dr = PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * squareJulianTime - 0.000000155 * cubicJulianTime;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * julianTime - 0.009173 * squareJulianTime) * dr);
  let sunMeanAnomaly = 359.2242 + 29.10535608 * k - 0.0000333 * squareJulianTime - 0.00000347 * cubicJulianTime;
  let moonMeanAnomaly = 306.0253 + 385.81691806 * k + 0.0107306 * squareJulianTime + 0.00001236 * cubicJulianTime;
  let f = 21.2964 + 390.67050646 * k - 0.0016528 * squareJulianTime - 0.00000239 * cubicJulianTime;
  let c1 = (0.1734 - 0.000393 * julianTime) * Math.sin(sunMeanAnomaly * dr) + 0.0021 * Math.sin(2 * dr * sunMeanAnomaly);
  c1 = c1 - 0.4068 * Math.sin(moonMeanAnomaly * dr) + 0.0161 * Math.sin(dr * 2 * moonMeanAnomaly);
  c1 -= 0.0004 * Math.sin(dr * 3 * moonMeanAnomaly);
  c1 = c1 + 0.0104 * Math.sin(dr * 2 * f) - 0.0051 * Math.sin(dr * (sunMeanAnomaly + moonMeanAnomaly));
  c1 = c1 - 0.0074 * Math.sin(dr * (sunMeanAnomaly - moonMeanAnomaly)) + 0.0004 * Math.sin(dr * (2 * f + sunMeanAnomaly));
  c1 = c1 - 0.0004 * Math.sin(dr * (2 * f - sunMeanAnomaly)) - 0.0006 * Math.sin(dr * (2 * f + moonMeanAnomaly));
  c1 += 0.0010 * Math.sin(dr * (2 * f - moonMeanAnomaly)) + 0.0005 * Math.sin(dr * (2 * moonMeanAnomaly + sunMeanAnomaly));
  let deltAt;
  if (julianTime < -11) {
    deltAt = 0.001 + 0.000839 * julianTime + 0.0002261 * squareJulianTime - 0.00000845 * cubicJulianTime - 0.000000081 * julianTime * cubicJulianTime;
  } else {
    deltAt = -0.000278 + 0.000265 * julianTime + 0.000262 * squareJulianTime;
  }
  return jd1 + c1 - deltAt;
}

function getSunLongitude(dayNumber: number, timeZone: number): number {
  return sunLongitude(dayNumber - 0.5 - timeZone / 24);
}

function getNewMoonDay(k: number, timeZone: number): number {
  let jd = newMoon(k);
  return Math.floor(jd + 0.5 + timeZone / 24);
}

function getLunarMonth11(yy: number, timeZone: number): number {
  let off = jdFromDate(31, 12, yy) - 2415021.076998695;
  let k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  let sunLong = Math.floor(getSunLongitude(nm, timeZone) / 30);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number): number {
  let k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let last;
  let i = 1;
  let arc = Math.floor(getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone) / 30);
  do {
    last = arc;
    i++;
    arc = Math.floor(getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone) / 30);
  } while (arc !== last && i < 14);
  return i - 1;
}

export function convertSolar2Lunar(dd: number, mm: number, yy: number, timeZone: number = 7.0): [number, number, number, number] {
  let lunarDay, lunarMonth, lunarYear, lunarLeap;
  let dayNumber = jdFromDate(dd, mm, yy);
  let k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timeZone);
  }
  lunarDay = dayNumber - monthStart + 1;
  let diff = Math.floor((monthStart - a11) / 29.0);
  lunarLeap = 0;
  lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    let leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = 1;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth -= 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }
  return [lunarDay, lunarMonth, lunarYear, lunarLeap];
}

export function convertLunar2Solar(lunarDay: number, lunarMonth: number, lunarYear: number, lunarLeap: number, timeZone: number = 7.0): [number, number, number] {
  let a11, b11;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, timeZone);
    b11 = getLunarMonth11(lunarYear, timeZone);
  } else {
    a11 = getLunarMonth11(lunarYear, timeZone);
    b11 = getLunarMonth11(lunarYear + 1, timeZone);
  }
  let k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunarMonth - 11;
  if (off < 0) {
    off += 12;
  }
  if (b11 - a11 > 365) {
    let leapOff = getLeapMonthOffset(a11, timeZone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) {
      leapMonth += 12;
    }
    if (lunarLeap !== 0 && lunarMonth !== leapMonth) {
      return [0, 0, 0];
    } else if (lunarLeap !== 0 || off >= leapOff) {
      off += 1;
    }
  } else {
    if (lunarLeap !== 0) {
      return [0, 0, 0];
    }
  }
  let monthStart = getNewMoonDay(k + off, timeZone);
  return jdToDate(monthStart + lunarDay - 1);
}
