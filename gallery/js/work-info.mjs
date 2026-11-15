// Public responses contain only the effective name. Consent evidence stays private.
export const CREATOR_NOTICE='제작자 표시명은 온라인 전시관에 공개됩니다. 실명 대신 별명이나 팀명을 사용할 수 있습니다.';
export const CREATOR_CONSENT_TEXT='입력한 제작자 표시명을 작품과 함께 온라인 전시관에 공개하는 데 동의합니다. (선택)';
export const CREATOR_TYPES={individual:'개인 작품',team:'팀 작품'};
export const DETAIL_COLORS={MAKE:'#DFE8DD',TAKE:'#F3E3D8',WAKE:'#DFEAF3','후기청소년 FabLab':'#F7F3E9'};
export function publicCreator(work){
  const allowed=work.creatorNamePublic===true&&work.creatorConsent?.granted===true;
  return {creatorType:Object.hasOwn(CREATOR_TYPES,work.creatorType)?work.creatorType:null,
    creatorDisplayName:allowed&&work.creatorDisplayName?.trim()?work.creatorDisplayName.trim():'익명 제작자'};
}
// Accept an already-filtered public record; never use this helper on private input.
export function creatorLabel(work){return (work.creatorType==='team'?'팀 · ':'')+(work.creatorDisplayName||'익명 제작자');}
export function detailBackground(work){return /^#[0-9a-f]{6}$/i.test(work.detailBackground||'')?work.detailBackground.toUpperCase():(DETAIL_COLORS[work.category]||'#F7F3E9');}
