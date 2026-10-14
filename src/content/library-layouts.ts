import type {Category,LibraryType} from '../domain/types.ts';
export interface LibraryGroup {id:string;name:string;category:Category;exerciseIds:readonly string[]}
const group=(id:string,name:string,category:Category,exerciseIds:string[]):LibraryGroup=>({id,name,category,exerciseIds});
// Each action appears once per library. Shared preparation/recovery actions are intentional.
export const libraryGroups:Record<LibraryType,readonly LibraryGroup[]>={
  aerobic:[
    group('a-warmup','热身 · 节奏与关节','warmup',['march','heel','knee','shoulder','ankle-mobility','easy-cycle']),
    group('a-walk-run','步行与跑步','cardio',['walk','jog','treadmill','treadmill-jog','incline-walk','run-walk']),
    group('a-low-impact','低冲击 · 节奏操','cardio',['dance','step-touch','step-jacks','side-shuffle','aerobic-boxing','step-up-cardio','skater-step']),
    group('a-rhythm','跳跃 · 心肺节奏','cardio',['jumping-jacks','high-knees','rope-jump','butt-kicks']),
    group('a-machines','器械 · 持续耐力','cardio',['cycle','rower','elliptical','stair-climber']),
    group('a-interval','器械 · 分组间歇','cardio',['cycle-interval','rower-interval','treadmill-interval']),
    group('a-conditioning','体能间歇 · 全身发力','cardio',['burpee','step-burpee','mountain-climber','squat-jump','box-jump','battle-rope']),
    group('a-recovery','恢复 · 下肢放松','recovery',['standing-rest','slow-walk','slow-cycle','calf-stretch','thigh-stretch','hamstring-stretch'])
  ],
  strength:[
    group('s-warmup','热身 · 动作激活','warmup',['march','heel','knee','shoulder','knee-bend','hip-hinge-drill','scapular-pushup','band-pull-apart','ankle-mobility']),
    group('s-big-three','力量三大项','strength',['barbell-squat','barbell-bench','barbell-deadlift']),
    group('s-chest','胸部 · 水平推','strength',['pushup','knee-pushup','incline-pushup','db-bench','incline-db-bench','cable-fly','chest-press-machine']),
    group('s-back','背部 · 垂直与水平拉','strength',['pullup','assisted-pullup','lat-pulldown','db-row','barbell-row','seated-row','band-row']),
    group('s-shoulders','肩部 · 推举与外展','strength',['db-press','lateral-raise','reverse-fly','face-pull','pike-pushup']),
    group('s-arms','手臂 · 肱二头与肱三头','strength',['db-curl','hammer-curl','barbell-curl','triceps-pushdown','overhead-triceps','bench-dips']),
    group('s-legs','腿部 · 膝主导与小腿','strength',['squat','weighted-squat','goblet-squat','bulgarian-split-squat','leg-press','leg-extension','leg-curl','lunge','reverse-lunge','calf-raise','lateral-lunge','step-up-balance','single-leg-balance']),
    group('s-glutes','臀部与后链 · 髋主导','strength',['bridge','single-leg-bridge','hip-thrust','db-rdl','barbell-rdl','kettlebell-deadlift','band-lateral-walk']),
    group('s-core','核心 · 稳定与抗旋转','core',['plank','side-plank','dead-bug','bird','crunch','reverse-crunch','pallof-press','plank-walkup','shoulder-tap']),
    group('s-combination','全身复合 · 器械组合','strength',['squat-press','kettlebell-swing','squat-curl','renegade-row','lunge-rotation']),
    group('s-movement','功能移动 · 搬运与爬行','strength',['farmer-carry','suitcase-carry','bear-crawl','inchworm']),
    group('s-recovery','恢复 · 分部位拉伸','recovery',['standing-rest','slow-walk','calf-stretch','thigh-stretch','hamstring-stretch','chest-stretch','lat-stretch','child-pose','hip-flexor-stretch'])
  ]
};
