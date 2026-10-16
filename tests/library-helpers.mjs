import {libraryGroups} from '../src/content/library-layouts.ts';
import {libraryNames} from '../src/domain/types.ts';

export async function selectLibraryFor(page,id){
  const type=['strength','aerobic','warmup'].find(type=>libraryGroups[type].some(group=>group.exerciseIds.includes(id)));
  if(!type)throw new Error('No library contains '+id);
  await page.getByRole('button',{name:'训练类型'+libraryNames[type],exact:true}).click();
}
