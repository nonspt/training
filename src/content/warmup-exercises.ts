import type {BodyPart,Exercise} from '../domain/types.ts';

export const warmupSources={
  foam:'https://www.nasm.org/resource-center/blog/recovery/foam-rolling-and-self-myofascial-release-the-trainer-application-guide',
  calf:'https://www.nasm.org/resource-center/exercise-library/foam-roll-calves',
  adductor:'https://www.nasm.org/resource-center/exercise-library/foam-roll-adductors',
  lat:'https://www.nasm.org/resource-center/exercise-library/foam-roll-latissimus-dorsi',
  dynamic:'https://www.acefitness.org/continuing-education/prosource/may-2015/5379/do-it-better-dynamic-warm-ups/'
};

function warmup(id:string,name:string,bodyParts:BodyPart[],equipment:string,countable:boolean,cue:string,source:string):Exercise{
  return {id,name,category:'warmup',types:[],bodyParts,equipment,equipmentKind:equipment.includes('泡沫轴')?'equipment':'bodyweight',weighted:false,countable,defaultSeconds:30,defaultReps:countable?10:0,cue,source};
}

export const warmupExercises:Exercise[]=[
  warmup('foam-roll-calf','泡沫轴滚小腿',['legs'],'泡沫轴 / 训练垫',false,'双手支撑控制压力，缓慢滚动小腿肌肉；避开膝窝与踝关节，两侧均分时间。',warmupSources.calf),
  warmup('foam-roll-quad','泡沫轴滚大腿前侧',['legs'],'泡沫轴 / 训练垫',false,'前臂撑稳，缓慢滚动大腿前侧肌肉；不压膝盖，压力保持舒适，两侧均分时间。',warmupSources.foam),
  warmup('foam-roll-adductor','泡沫轴滚大腿内侧',['legs'],'泡沫轴 / 训练垫',false,'俯撑后将一腿屈髋外展，轻柔滚动大腿内侧肌肉；避开关节，两侧均分时间。',warmupSources.adductor),
  warmup('foam-roll-glute','泡沫轴滚臀部',['glutes'],'泡沫轴 / 训练垫',false,'坐稳并用手脚支撑，缓慢小幅滚动臀部肌肉；避开骨性突起，两侧均分时间。',warmupSources.foam),
  warmup('foam-roll-lat','泡沫轴滚背阔肌',['back','shoulders'],'泡沫轴 / 训练垫',false,'侧卧并以手脚控制压力，缓慢滚动腋下后方背部肌肉；不压肩关节，两侧均分时间。',warmupSources.lat),
  warmup('foam-roll-upper-back','泡沫轴滚上背部',['back'],'泡沫轴 / 训练垫',false,'仰卧屈膝并托住头部，在上背部舒适范围小幅滚动；不滚颈部和腰部。',warmupSources.foam),
  warmup('hip-circles','髋关节绕环',['glutes','legs'],'徒手 / 稳固支撑',false,'扶稳支撑，小幅缓慢绕动髋部，骨盆保持稳定；左右均分时间。',warmupSources.dynamic),
  warmup('thoracic-rotation','胸椎旋转活动',['back','core'],'徒手 / 训练垫',true,'四点跪撑，一手置于头侧，胸部缓慢转向侧上方；骨盆稳定，次数按两侧总数。',warmupSources.dynamic),
  warmup('leg-swing','前后摆腿',['legs','glutes'],'徒手 / 稳固支撑',true,'扶稳支撑，小幅控制腿部前后摆动，避免甩腰；次数按两侧总数。',warmupSources.dynamic),
  warmup('arm-swing','手臂动态开合',['chest','shoulders','back'],'徒手',true,'站稳后自然打开并合拢双臂，幅度以舒适为准，不借力弹震。',warmupSources.dynamic),
  warmup('walking-lunge-reach','行进弓步上伸',['legs','glutes','shoulders','core'],'徒手',true,'向前迈入舒适弓步，同时向上伸展手臂；站稳后换侧，次数按两侧总数。',warmupSources.dynamic)
];
