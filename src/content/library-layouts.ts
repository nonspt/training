import type {Category,LibraryType} from '../domain/types.ts';
export interface LibraryGroup {id:string;name:string;category:Category;exerciseIds:readonly string[]}
const group=(id:string,name:string,category:Category,exerciseIds:string[]):LibraryGroup=>({id,name,category,exerciseIds});
// Groups describe browsing intent. Shared activation actions retain their original IDs and targets.
export const libraryGroups:Record<LibraryType,readonly LibraryGroup[]>={
  warmup:[
    group('w-foam-roll','泡沫轴','warmup',['foam-roll-calf','foam-roll-quad','foam-roll-adductor','foam-roll-glute','foam-roll-lat','foam-roll-upper-back']),
    group('w-mobility','关节活动','warmup',['shoulder','ankle-mobility','hip-hinge-drill','scapular-pushup','band-pull-apart','hip-circles','thoracic-rotation']),
    group('w-core-activation','核心激活','warmup',['dead-bug','bird','bridge','plank','side-plank']),
    group('w-dynamic-stretch','动态拉伸','warmup',['march','heel','knee','knee-bend','inchworm','leg-swing','arm-swing','walking-lunge-reach'])
  ],
  aerobic:[
    group('a-lsd','长时慢速长距代谢训练','cardio',['walk','jog','treadmill','treadmill-jog','cycle','rower','elliptical']),
    group('a-tempo','配速/节奏训练','cardio',['incline-walk','dance','step-touch','step-jacks','side-shuffle','aerobic-boxing','step-up-cardio','skater-step','rope-jump','stair-climber']),
    group('a-interval','间歇训练','cardio',['run-walk','cycle-interval','rower-interval','treadmill-interval','jumping-jacks','high-knees','butt-kicks','burpee','step-burpee','mountain-climber','squat-jump','box-jump','battle-rope']),
    group('a-recovery','恢复及拉伸','recovery',['standing-rest','slow-walk','slow-cycle','easy-cycle','calf-stretch','thigh-stretch','hamstring-stretch','chest-stretch','lat-stretch','child-pose','hip-flexor-stretch'])
  ],
  strength:[
    group('s-upper-push','上肢推','strength',['barbell-bench','pushup','knee-pushup','incline-pushup','db-bench','incline-db-bench','cable-fly','chest-press-machine','db-press','lateral-raise','pike-pushup','triceps-pushdown','overhead-triceps','bench-dips','squat-press']),
    group('s-upper-pull','上肢拉','strength',['pullup','assisted-pullup','lat-pulldown','db-row','barbell-row','seated-row','band-row','reverse-fly','face-pull','db-curl','hammer-curl','barbell-curl','renegade-row']),
    group('s-lower','下肢推拉','strength',['barbell-squat','barbell-deadlift','squat','weighted-squat','goblet-squat','bulgarian-split-squat','leg-press','leg-extension','leg-curl','lunge','reverse-lunge','calf-raise','lateral-lunge','step-up-balance','single-leg-balance','bridge','single-leg-bridge','hip-thrust','db-rdl','barbell-rdl','kettlebell-deadlift','band-lateral-walk','kettlebell-swing','squat-curl','lunge-rotation']),
    group('s-core','核心','core',['plank','side-plank','dead-bug','bird','crunch','reverse-crunch','pallof-press','plank-walkup','shoulder-tap','farmer-carry','suitcase-carry','bear-crawl'])
  ]
};
