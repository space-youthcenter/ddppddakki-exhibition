/** A measured point in the cropped derivative. It never changes stored slots. */
export function hangingPoint(value){
  return value&&[value.x,value.y].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1)?{x:value.x,y:value.y}:null;
}
export function validatedPixelCrop(value,width,height,sourceWidth,sourceHeight){
  if(value==null)return null;
  const {x,y}=value;
  if(![x,y,width,height,sourceWidth,sourceHeight].every(Number.isInteger)||x<0||y<0||width<1||height<1||value.width!==width||value.height!==height||value.sourceWidth!==sourceWidth||value.sourceHeight!==sourceHeight||x+width>sourceWidth||y+height>sourceHeight)throw new Error('원본과 누끼의 좌표를 확인해 주세요.');
  return {x,y,width,height,sourceWidth,sourceHeight};
}
