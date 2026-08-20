const add=(d,type)=>{const x=new Date(d);if(type==="daily")x.setDate(x.getDate()+1);if(type==="weekly")x.setDate(x.getDate()+7);if(type==="monthly")x.setMonth(x.getMonth()+1);return x};
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
