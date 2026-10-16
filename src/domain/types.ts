export type TrainingType='aerobic'|'strength'|'mixed';
// mixed remains a stored-plan value for existing plans and backups only.
export type LibraryType='warmup'|Exclude<TrainingType,'mixed'>;
export type Category='warmup'|'cardio'|'strength'|'core'|'recovery';
export type TargetMode='time'|'reps';
export type BodyPart='full'|'chest'|'back'|'shoulders'|'arms'|'legs'|'glutes'|'core';
export interface Exercise {id:string;name:string;category:Category;types:TrainingType[];equipment:string;weighted:boolean;countable:boolean;defaultSeconds:number;defaultReps:number;cue:string;source:string;bodyParts?:BodyPart[];equipmentKind?:'bodyweight'|'equipment';maxWeight?:number;defaultSets?:number;defaultRest?:number;weightNote?:string}
export interface SetTarget {kind:'warmup'|'work';seconds:number;reps:number;weight:number;rest:number;effort:number}
export interface PlanItem {id:string;exerciseId:string;mode:TargetMode;seconds:number;reps:number;weight:number;sets:number;rest:number;effort:number;setTargets?:SetTarget[]}
export interface PlanGroup {id:string;kind:'superset'|'circuit';itemIds:string[];rounds:number;rest:number;transitionRest:number}
export interface DayPlan {day:number;name:string;items:PlanItem[];groups?:PlanGroup[]}
export interface Plan {id:string;name:string;type:TrainingType;weeks:number;days:number[];startDate:string;items:PlanItem[];groups?:PlanGroup[];dayPlans?:DayPlan[];createdAt:string;updatedAt:string;version:number}
export interface Stage {id:string;itemId:string;name:string;category:Category;mode:TargetMode;seconds:number;reps:number;weight:number;effort:number;set:number;sets:number;cue:string;equipment:string;isRest:boolean;setKind?:SetTarget['kind'];groupKind?:PlanGroup['kind'];round?:number;rounds?:number}
export interface Session {id:string;planId:string;planName:string;dayName?:string;scheduledDate:string;stages:Stage[];index:number;stageElapsed:number;elapsed:number;completed:string[];skipped:string[];createdAt:string;updatedAt:string;version:number}
export interface Workout {id:string;planId:string;planName:string;dayName?:string;scheduledDate:string;finishedAt:string;elapsed:number;completed:boolean;completedStages:number;totalStages:number;confirmedReps:number}
export interface State {schemaVersion:1|2;revision:number;onboarded:boolean;activePlanId:string|null;plans:Plan[];draft:Session|null;workouts:Workout[]}
export const emptyState=():State=>({schemaVersion:1,revision:0,onboarded:false,activePlanId:null,plans:[],draft:null,workouts:[]});
export const typeNames:Record<TrainingType,string>={aerobic:'代谢训练',strength:'无氧训练',mixed:'综合训练'};
export const libraryNames:Record<LibraryType,string>={warmup:'热身',aerobic:typeNames.aerobic,strength:typeNames.strength};
export const categoryNames:Record<Category,string>={warmup:'热身准备',cardio:'代谢训练',strength:'力量训练',core:'核心稳定',recovery:'休息与放松'};
export const bodyPartNames:Record<BodyPart,string>={full:'全身',chest:'胸部',back:'背部',shoulders:'肩部',arms:'手臂',legs:'腿部',glutes:'臀部',core:'核心'};
