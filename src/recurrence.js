const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const daysInMonth=(y,m)=>new Date(y,m+1,0).getDate();
const addMonthsClamped=(base,n)=>{
  const b=new Date(base),day=b.getDate(),absolute=b.getMonth()+n,year=b.getFullYear()+Math.floor(absolute/12),month=((absolute%12)+12)%12;
  const x=new Date(b);x.setFullYear(year,Month.min?)
};
