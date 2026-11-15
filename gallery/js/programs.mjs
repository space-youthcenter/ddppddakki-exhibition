/** Stable IDs are data, labels can evolve without moving an artwork. */
export const CATEGORY_INFO = Object.freeze({
 MAKE:{id:'make',label:'MAKE',subtitle:'만들고, 새기고, 남기는 나만의 이야기',color:'#365347'},
 TAKE:{id:'take',label:'TAKE',subtitle:'사진과 소리로 간직하는 우리의 순간',color:'#99583E'},
 WAKE:{id:'wake',label:'WAKE',subtitle:'작은 질문에서 시작하는 내일의 발견',color:'#4B6575'},
 '후기청소년 FabLab':{id:'fablab',label:'FabLab',subtitle:'도구와 생각을 연결하는 창작 실험실',color:'#716850'},
});
export const SOURCES=Object.freeze({experience:'체험 결과물',onsite:'현장 전시 작품',example:'체험 예시 작품'});
export const SOURCE_NOTICE='직접 제작했거나 온라인 공개 권한을 확인한 작품입니다. 현장 전시 작품과 체험 예시도 촬영·공개에 필요한 허락을 확인했습니다.';
export const PROGRAMS=Object.freeze([
 {id:'name-tag',category:'MAKE',name:'새김 네임택',fixtures:['tag-arch','craft-shelf'],type:'object'},
 {id:'station-sign',category:'MAKE',name:'나만의 역명판',fixtures:['sign-arch','craft-shelf'],type:'object'},
 {id:'woodcraft',category:'MAKE',name:'목공·공예 제작물',fixtures:['craft-shelf','table-frames'],type:'object'},
 {id:'make-other',category:'MAKE',name:'기타 MAKE 결과물',fixtures:['craft-shelf','tag-arch','table-frames'],type:'auto'},
 {id:'photo',category:'TAKE',name:'사진·AI 프로필',fixtures:['photo-lines','table-frames'],type:'frame'},
 {id:'movie-poster',category:'TAKE',name:'영화 포스터',fixtures:['poster-stand','table-frames','photo-lines'],type:'frame'},
 {id:'record',category:'TAKE',name:'레코드 스튜디오',fixtures:['record-rack','table-frames'],type:'frame'},
 {id:'take-other',category:'TAKE',name:'기타 영상·미디어 결과물',fixtures:['table-frames','photo-lines','record-rack'],type:'auto'},
 {id:'future-patent',category:'WAKE',name:'AI 미래특허청',fixtures:['card-rack','table-frames'],type:'frame'},
 {id:'coloring',category:'WAKE',name:'색칠탐험',fixtures:['color-panel','table-frames','photo-lines'],type:'frame'},
 {id:'wake-other',category:'WAKE',name:'기타 코딩·AI 창작 결과물',fixtures:['craft-shelf','table-frames','card-rack'],type:'auto'},
 {id:'fablab',category:'후기청소년 FabLab',name:'FabLab 창작 작품',fixtures:['craft-shelf','table-frames','record-rack','photo-lines'],type:'auto'},
]);
export const programFor=id=>PROGRAMS.find(p=>p.id===id);
export const programsFor=category=>PROGRAMS.filter(p=>p.category===category);
export const sourceLabel=work=>SOURCES[work.sourceType]||'기존 전시 작품';
export function validateProgram(category,boothId,sourceType){
 const p=programFor(boothId);
 if(!p||p.category!==category)throw new Error('체험 분야에 맞는 프로그램을 선택해 주세요.');
 if(!Object.hasOwn(SOURCES,sourceType))throw new Error('작품 출처를 선택해 주세요.');
 return p;
}
