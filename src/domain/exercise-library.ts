import type {BodyPart,LibraryType} from './types.ts';
import {findExercise} from '../content/exercises.ts';
import {libraryGroups} from '../content/library-layouts.ts';
export interface LibraryFilter {equipment:'all'|'bodyweight'|'equipment';bodyPart:'all'|BodyPart;group:string}
export function getLibraryGroups(type:LibraryType,filter:LibraryFilter={equipment:'all',bodyPart:'all',group:'all'}){
  return libraryGroups[type].filter(group=>filter.group==='all'||filter.group===group.id).map(group=>({
    ...group,
    exercises:group.exerciseIds.map(findExercise).filter(exercise=>
      (filter.equipment==='all'||exercise.equipmentKind===filter.equipment)&&
      (filter.bodyPart==='all'||exercise.bodyParts?.includes(filter.bodyPart)))
  })).filter(group=>group.exercises.length>0);
}
