import type {BodyPart,Category,Exercise,LibraryType,TrainingType} from '../domain/types.ts';
import {additionalExercises} from './additional-exercises.ts';
import {libraryGroups} from './library-layouts.ts';
export const sources={
  warmup:'https://www.nhs.uk/live-well/exercise/how-to-warm-up-before-exercising/',
  stretch:'https://www.nhs.uk/live-well/exercise/how-to-stretch-after-exercising/',
  aerobic:'https://www.heart.org/en/healthy-living/go-red-get-fit/what-exercise-is-right-for-me',
  strength:'https://www.nhs.uk/live-well/exercise/how-to-improve-strength-flexibility/',
  squat:'https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/',
  pushup:'https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/',
  bridge:'https://www.acefitness.org/resources/everyone/exercise-library/49/glute-bridge/',
  bird:'https://www.acefitness.org/resources/everyone/exercise-library/14/bird-dog/',
  plank:'https://www.acefitness.org/resources/everyone/exercise-library/32/front-plank/',
  row:'https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/',
  lunge:'https://www.acefitness.org/resources/everyone/exercise-library/94/forward-lunge/',
  press:'https://www.acefitness.org/resources/everyone/exercise-library/45/seated-overhead-press/',
  cooldown:'https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/warm-up-cool-down'
};
const all:TrainingType[]=['aerobic','strength','mixed'];
function ex(id:string,name:string,category:Category,equipment:string,countable:boolean,seconds:number,reps:number,cue:string,source:string,types:TrainingType[]=all,weighted=false):Exercise{return {id,name,category,equipment,countable,defaultSeconds:seconds,defaultReps:reps,cue,source,types,weighted};}
// Names and short cues are curated summaries. Defaults are editable UI examples, not prescriptions.
const originalExercises:Exercise[]=[
  ex('march','原地踏步','warmup','徒手',false,60,12,'轻轻踏步，手臂自然摆动。',sources.warmup),
  ex('heel','脚跟前点','warmup','徒手',false,30,12,'交替将脚跟向前点地，保持身体稳定。',sources.warmup),
  ex('knee','交替提膝','warmup','徒手',false,30,12,'缓慢交替抬膝，保持躯干直立。',sources.warmup),
  ex('shoulder','肩部绕环','warmup','徒手',false,30,10,'小幅缓慢绕肩，不要耸肩。',sources.warmup),
  ex('knee-bend','浅蹲热身','warmup','徒手',false,30,10,'轻屈膝、缓慢回正，活动范围以舒适为准。',sources.warmup),
  ex('easy-cycle','轻松骑行','warmup','健身车',false,120,12,'轻阻力开始，逐渐活动身体。',sources.cooldown),
  ex('walk','快走','cardio','徒手',false,300,12,'保持均匀步伐，选择可持续的速度。',sources.aerobic,['aerobic','mixed']),
  ex('jog','慢跑','cardio','徒手',false,180,12,'轻松落地，保持自然呼吸。',sources.aerobic,['aerobic','mixed']),
  ex('dance','有氧踏步','cardio','徒手',false,120,12,'交替向侧方踏步，随自己的节奏移动。',sources.aerobic,['aerobic','mixed']),
  ex('cycle','健身车骑行','cardio','健身车',false,300,12,'平稳踩踏，阻力按自己的能力调节。',sources.aerobic,['aerobic','mixed']),
  ex('treadmill','跑步机快走','cardio','跑步机',false,300,12,'先低速站稳，再逐渐调整步速。',sources.aerobic,['aerobic','mixed']),
  ex('squat','徒手深蹲','strength','徒手',true,30,10,'先向后坐髋，再屈膝下蹲，保持脚掌稳定。',sources.squat,['strength','mixed']),
  ex('pushup','俯卧撑','strength','徒手 / 训练垫',true,30,8,'收紧躯干，身体保持一线，缓慢屈伸手臂。',sources.pushup,['strength','mixed']),
  ex('lunge','交替弓步','strength','徒手',true,40,10,'向前迈步后缓慢屈膝，左右交替；次数按总数。',sources.lunge,['strength','mixed']),
  ex('bridge','臀桥','strength','训练垫',true,30,12,'脚掌贴地，用臀部抬起髋部，避免腰部过伸。',sources.bridge,['strength','mixed']),
  ex('weighted-squat','负重深蹲','strength','哑铃',true,40,10,'稳稳握住负重，选择能保持动作控制的重量。',sources.strength,['strength','mixed'],true),
  ex('db-row','单臂哑铃划船','strength','哑铃 / 稳固支撑',true,40,10,'保持背部稳定，将哑铃拉向身侧；两侧总次数。',sources.row,['strength','mixed'],true),
  ex('db-press','坐姿哑铃推举','strength','哑铃 / 稳固座椅',true,40,10,'坐稳、收紧躯干，缓慢上推并控制回落。',sources.press,['strength','mixed'],true),
  ex('band','弹力带训练','strength','弹力带',true,40,12,'检查弹力带完整和固定位置，缓慢拉伸与回收。',sources.strength,['strength','mixed']),
  ex('plank','平板支撑','core','训练垫',false,30,10,'肘部支撑，保持躯干稳定，持续自然呼吸。',sources.plank,['strength','mixed']),
  ex('bird','鸟狗式','core','训练垫',true,40,10,'交替伸出对侧手脚，保持骨盆水平；次数按总数。',sources.bird,['strength','mixed']),
  ex('standing-rest','站立休息','recovery','无需器械',false,60,0,'放松肩部，等待呼吸恢复平稳。',sources.cooldown),
  ex('slow-walk','慢走放松','recovery','徒手',false,120,0,'逐渐减慢步速，让呼吸平稳下来。',sources.cooldown),
  ex('slow-cycle','缓骑放松','recovery','健身车',false,120,0,'降低速度与阻力，轻松踩踏。',sources.cooldown),
  ex('calf-stretch','小腿拉伸','recovery','徒手 / 墙面',false,30,0,'扶稳支撑，后脚跟贴地；两侧分别保持。',sources.stretch),
  ex('thigh-stretch','大腿前侧拉伸','recovery','徒手 / 稳固支撑',false,30,0,'扶稳支撑，轻柔牵拉腿部；两侧分别保持。',sources.stretch),
  ex('hamstring-stretch','腿后侧拉伸','recovery','徒手',false,30,0,'身体缓慢前倾到舒适范围，不要弹震。',sources.stretch)
];
const legacyParts:Record<string,BodyPart[]>={
  march:['legs','full'],heel:['legs'],knee:['legs','core'],shoulder:['shoulders'],
  'knee-bend':['legs','glutes'],'easy-cycle':['legs'],walk:['legs','full'],jog:['legs','full'],
  dance:['legs','full'],cycle:['legs','glutes'],treadmill:['legs','full'],squat:['legs','glutes','core'],
  pushup:['chest','arms','shoulders'],lunge:['legs','glutes'],bridge:['glutes','legs','core'],
  'weighted-squat':['legs','glutes','core'],'db-row':['back','arms'],'db-press':['shoulders','arms'],
  band:['full'],plank:['core','shoulders'],bird:['core','back','glutes'],
  'standing-rest':['full'],'slow-walk':['legs','full'],'slow-cycle':['legs'],
  'calf-stretch':['legs'],'thigh-stretch':['legs'],'hamstring-stretch':['legs','glutes']
};
const trainingTypes:LibraryType[]=['aerobic','strength'];
export const exercises:Exercise[]=[...originalExercises,...additionalExercises].map(exercise=>({
  ...exercise,
  types:trainingTypes.filter(type=>libraryGroups[type].some(group=>group.exerciseIds.includes(exercise.id))),
  bodyParts:exercise.bodyParts??legacyParts[exercise.id]??['full'],
  equipmentKind:exercise.equipmentKind??(exercise.equipment.startsWith('徒手')||exercise.equipment==='训练垫'||exercise.equipment==='无需器械'?'bodyweight':'equipment'),
  maxWeight:exercise.maxWeight??50,
  weightNote:exercise.weightNote??(exercise.weighted?'重量填写单只器械重量。':undefined)
}));
const exerciseMap=new Map(exercises.map(exercise=>[exercise.id,exercise]));
export const findExercise=(id:string)=>exerciseMap.get(id)!;
