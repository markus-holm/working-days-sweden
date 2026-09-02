/**
 * generate-api.js
 * Pre-renders the /work-days JSON endpoints as static files for GitHub Pages.
 * Mirrors the calendar math used by the API tab in arbetsdagar.html exactly,
 * so the live JSON files always match what the page previews.
 *
 * Usage: node scripts/generate-api.js [outDir]
 *   outDir defaults to "work-days" in the current working directory.
 */

const fs = require("fs");
const path = require("path");

const YEAR_MIN = 1990;
const YEAR_MAX = 2100;

const MONTH_NAMES = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];

function easterDate(yr) {
  var a=yr%19,b=Math.floor(yr/100),c=yr%100,d=Math.floor(b/4),e=b%4,
      f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
      h=(19*a+b-d-g+15)%30,ii=Math.floor(c/4),k=c%4,
      l=(32+2*e+2*ii-h-k)%7,mm=Math.floor((a+11*h+22*l)/451),
      mo=Math.floor((h+l-7*mm+114)/31),dy=((h+l-7*mm+114)%31)+1;
  return new Date(yr,mo-1,dy);
}
function addDays(d,n){ return new Date(d.getTime()+n*86400000); }
function toKey(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }

function getMidsommarafton(yr){
  for(var dd=19;dd<=25;dd++){ var dt=new Date(yr,5,dd); if(dt.getDay()===5) return dt; }
  return null;
}
function getAllaHelgonsdag(yr){
  for(var dd=31;dd<=37;dd++){
    var mo=dd>31?10:9, dy=dd>31?dd-31:dd, dt=new Date(yr,mo,dy);
    if(dt.getDay()===6) return dt;
  }
  return null;
}
function getHolidayMap(yr){
  var easter=easterDate(yr), mid=getMidsommarafton(yr), ah=getAllaHelgonsdag(yr), m={};
  m[yr+"-01-01"]="Nyårsdagen";
  m[yr+"-01-06"]="Trettondagen";
  m[toKey(addDays(easter,-2))]="Långfredagen";
  m[toKey(easter)]="Påskdagen";
  m[toKey(addDays(easter,1))]="Annandag påsk";
  m[yr+"-05-01"]="Första maj";
  m[toKey(addDays(easter,39))]="Kristi himmelsfärdsdag";
  m[toKey(addDays(easter,49))]="Pingstdagen";
  m[yr+"-06-06"]="Nationaldagen";
  if(mid){ m[toKey(mid)]="Midsommarafton"; m[toKey(addDays(mid,1))]="Midsommardagen"; }
  if(ah) m[toKey(ah)]="Alla helgons dag";
  m[yr+"-12-24"]="Julafton";
  m[yr+"-12-25"]="Juldagen";
  m[yr+"-12-26"]="Annandag jul";
  m[yr+"-12-31"]="Nyårsafton";
  return m;
}
function calcMonth(yr,mo,hset){
  var dim=new Date(yr,mo+1,0).getDate(), workdays=0, weekends=0, redDays=0;
  for(var d=1;d<=dim;d++){
    var date=new Date(yr,mo,d), key=toKey(date), dow=date.getDay(), isWE=dow===0||dow===6, isH=hset.has(key);
    if(isH){ redDays++; if(isWE) weekends++; }
    else if(isWE){ weekends++; }
    else{ workdays++; }
  }
  return {workdays:workdays,weekends:weekends,redDays:redDays,total:dim};
}

function buildYearJson(yr){
  var hmap=getHolidayMap(yr), hset=new Set(Object.keys(hmap));
  var months=MONTH_NAMES.map(function(name,i){
    var s=calcMonth(yr,i,hset), moNum=i+1, hols=[];
    Object.keys(hmap).forEach(function(k){ if(+k.split("-")[1]===moNum) hols.push({date:k,name:hmap[k]}); });
    hols.sort(function(a,b){ return a.date<b.date?-1:1; });
    return {month:moNum,name:name,total_days:s.total,work_days:s.workdays,work_hours:s.workdays*8,weekend_days:s.weekends,holidays:s.redDays,days_off:s.total-s.workdays,public_holidays:hols};
  });
  var tw=months.reduce(function(a,m){return a+m.work_days;},0);
  var tr=months.reduce(function(a,m){return a+m.holidays;},0);
  var twe=months.reduce(function(a,m){return a+m.weekend_days;},0);
  var td=months.reduce(function(a,m){return a+m.total_days;},0);
  return {year:yr,total_days:td,work_days:tw,work_hours:tw*8,weekend_days:twe,holidays:tr,days_off:td-tw,months:months};
}
function buildMonthJson(yr,mo){
  var hmap=getHolidayMap(yr), hset=new Set(Object.keys(hmap));
  var s=calcMonth(yr,mo-1,hset), hols=[];
  Object.keys(hmap).forEach(function(k){ if(+k.split("-")[1]===mo) hols.push({date:k,name:hmap[k]}); });
  hols.sort(function(a,b){ return a.date<b.date?-1:1; });
  return {year:yr,month:mo,name:MONTH_NAMES[mo-1],total_days:s.total,work_days:s.workdays,work_hours:s.workdays*8,weekend_days:s.weekends,holidays:s.redDays,days_off:s.total-s.workdays,public_holidays:hols};
}

function writeJson(filePath, data){
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function main(){
  const outDir = path.resolve(process.argv[2] || "work-days");
  let fileCount = 0;

  for (let yr = YEAR_MIN; yr <= YEAR_MAX; yr++) {
    writeJson(path.join(outDir, yr + ".json"), buildYearJson(yr));
    fileCount++;
    for (let mo = 1; mo <= 12; mo++) {
      writeJson(path.join(outDir, String(yr), mo + ".json"), buildMonthJson(yr, mo));
      fileCount++;
    }
  }

  console.log("Generated " + fileCount + " JSON files in " + outDir);
}

main();
