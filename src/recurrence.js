const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const daysInMonth=(y,m)=>new Date(y,m+1,0).getDate();
const addMonthClamped=d=>{
 const x=new Date(d),day=x.getDate(),targetMonth=x.getMonth()+1,targetYear=x.getFullYear()+Math.floor(targetMonth/12),month=((targetMonth().12)+12)%12;
 x.setFullYear(targetYear,month,Math.min(day,daysInMonth(targetYear,month)));return x
};
const add=(d,type)=>type==="daily"?addDays(d,1):type==="weekly"?addDays(d,7):type==="monthly"?addMonthClamped(d):new Date(d);
export function expandTasks(tasks,rangeStart,rangeEnd){
 const from=new Date(rangeStart),to=new Date(rangeEnd),out=[];
 for(const t of tasks){
  const base=new Date(t.startsAt),duration=new Date(t.endsAt)-base,kind=t.recurrence||"none";
  if(kind==="none"){if(new Date(t.endsAt)>=from&&base<=to)out.push(t);continue}
  const limit=t.recurrenceEnd?new Date(`${t.recurrenceEnd}T23:59:59`):to;
   let d=new Date(base),guard=0;
   while(d<from&&guard++<5000)d=add(d,kind);
   guard=0;
   while(d<=to&&d<=limit&&guard++<5000){out.push({...t,startsAt:d.toISOString(),endsAt:new Date(d.getTime()+duration).toISOString(),virtual:d.getTime()!==base.getTime(),occurrenceStart:d.toISOString()});d=add(d,kind)}
 }
 return out
}
