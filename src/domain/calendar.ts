// Date-only arithmetic uses UTC; the application calendar uses Asia/Shanghai.
export function addDays(date:string,days:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function weekday(date:string){return new Date(date+'T12:00:00Z').getUTCDay();}
export function monday(date:string){return addDays(date,-((weekday(date)+6)%7));}
export function today(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function firstTrainingDate(days:number[],from=today()){for(let i=0;i<7;i++){const d=addDays(from,i);if(days.includes(weekday(d)))return d;}return from;}
export function dateLabel(date:string){return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric',weekday:'long'}).format(new Date(date+'T12:00:00+08:00'));}
